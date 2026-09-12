"""Training service for LogForge AI/ML Anomaly Detection Model."""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.event import EventModel
from ..models.anomaly import EventAnomalyModel
from .anomaly_model import model_instance
from .explanations import generate_anomaly_explanation
from .feature_engineering import build_feature_matrix, extract_features_from_dict

logger = logging.getLogger("ulpf.ml.training")

MIN_TRAINING_SAMPLES = 5


def train_model_from_database(
    db: Session,
    contamination: float = 0.1,
    max_samples: int = 50000,
    rescore_existing: bool = True,
) -> Dict[str, Any]:
    """
    Trains the Isolation Forest model using events currently stored in the database.
    Optionally scores existing events in the database so anomaly statistics immediately populate.
    """
    # Fetch events from database
    stmt = (
        select(EventModel)
        .order_by(EventModel.created_at.desc())
        .limit(max_samples)
    )
    events = db.execute(stmt).scalars().all()
    sample_count = len(events)

    if sample_count < MIN_TRAINING_SAMPLES:
        raise ValueError(
            f"Insufficient training samples ({sample_count}). "
            f"At least {MIN_TRAINING_SAMPLES} events are required to train the baseline model."
        )

    # Build feature matrix
    X, snapshots = build_feature_matrix(events)

    # Fit model
    now_iso = datetime.now(timezone.utc).isoformat()
    model_instance.contamination = contamination
    model_instance.fit(
        X,
        metadata={
            "trained_at": now_iso,
            "sample_count": sample_count,
            "contamination": contamination,
        },
    )
    logger.info("Isolation Forest model trained on %d events.", sample_count)

    scored_count = 0
    if rescore_existing:
        # Score existing events and persist into event_anomalies
        scores_and_classes = model_instance.score_matrix(X)
        for evt, (score, classification), snapshot in zip(events, scores_and_classes, snapshots):
            # Check if anomaly record already exists
            existing_anomaly = db.execute(
                select(EventAnomalyModel).where(EventAnomalyModel.event_id == evt.event_id)
            ).scalar_one_or_none()

            explanation = generate_anomaly_explanation(
                score=score,
                classification=classification,
                features=snapshot,
                raw_event=evt.raw_event,
                source_ip=evt.source_ip,
                destination_ip=evt.destination_ip,
                action=evt.action,
                protocol=evt.protocol,
            )

            if existing_anomaly:
                existing_anomaly.anomaly_score = score
                existing_anomaly.classification = classification
                existing_anomaly.explanation = explanation
                existing_anomaly.model_name = model_instance.model_name
                existing_anomaly.model_version = model_instance.model_version
                existing_anomaly.features_snapshot = snapshot
            else:
                record = EventAnomalyModel(
                    event_id=evt.event_id,
                    anomaly_score=score,
                    classification=classification,
                    explanation=explanation,
                    model_name=model_instance.model_name,
                    model_version=model_instance.model_version,
                    features_snapshot=snapshot,
                    created_at=evt.created_at or datetime.now(timezone.utc),
                )
                db.add(record)
            scored_count += 1

        db.commit()
        logger.info("Scored and persisted %d anomalies in database.", scored_count)

    return {
        "status": "success",
        "message": f"Successfully trained model on {sample_count} events.",
        "model_name": model_instance.model_name,
        "model_version": model_instance.model_version,
        "events_trained": sample_count,
        "anomalies_scored": scored_count,
        "contamination": contamination,
        "trained_at": now_iso,
    }
