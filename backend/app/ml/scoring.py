"""Real-time scoring and inference service for LogForge AI/ML Anomaly Detection."""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.anomaly import EventAnomalyModel
from .anomaly_model import model_instance
from .explanations import generate_anomaly_explanation
from .feature_engineering import extract_features_from_dict

logger = logging.getLogger("ulpf.ml.scoring")


def score_event_safely(
    event_dict: Dict[str, Any],
    db: Session,
    auto_commit: bool = True,
) -> Optional[EventAnomalyModel]:
    """
    Safely scores an ingested event using the active ML model and persists to event_anomalies.
    This function MUST NEVER RAISE an uncaught exception, ensuring zero impact on log ingestion.
    """
    if not model_instance.is_trained:
        # Model is not trained yet; silently skip inference
        return None

    event_id = event_dict.get("event_id")
    if not event_id:
        return None

    try:
        # Extract features
        vector, snapshot = extract_features_from_dict(event_dict)

        # Infer score and classification
        score, classification = model_instance.score_single(vector)

        # Generate human-readable explanation
        explanation = generate_anomaly_explanation(
            score=score,
            classification=classification,
            features=snapshot,
            raw_event=event_dict.get("raw_log"),
            source_ip=event_dict.get("source_ip"),
            destination_ip=event_dict.get("destination_ip"),
            action=event_dict.get("action"),
            protocol=event_dict.get("protocol"),
        )

        anomaly_record = EventAnomalyModel(
            event_id=event_id,
            anomaly_score=score,
            classification=classification,
            explanation=explanation,
            model_name=model_instance.model_name,
            model_version=model_instance.model_version,
            features_snapshot=snapshot,
            created_at=datetime.now(timezone.utc),
        )

        db.add(anomaly_record)
        if auto_commit:
            db.commit()
            db.refresh(anomaly_record)

        return anomaly_record

    except Exception as exc:
        logger.warning(
            "Non-blocking ML scoring failure for event '%s': %s",
            event_id,
            str(exc),
            exc_info=False,
        )
        if auto_commit:
            try:
                db.rollback()
            except Exception:
                pass
        return None


import time
import numpy as np


def batch_score_events_safely(
    events: List[Dict[str, Any]],
    db: Session,
) -> int:
    """
    Safely scores a batch of events using vectorized matrix inference and bulk persistence.
    Non-blocking, never raises uncaught exceptions.
    """
    if not model_instance.is_trained or not events:
        return 0

    valid_events = [evt for evt in events if evt.get("event_id")]
    if not valid_events:
        return 0

    try:
        start_time = time.perf_counter()

        # 1. Vectorized feature extraction
        vectors = []
        snapshots = []
        for evt in valid_events:
            v, snap = extract_features_from_dict(evt)
            vectors.append(v)
            snapshots.append(snap)

        X = np.array(vectors, dtype=np.float64)

        # 2. Fast vectorized matrix scoring in a single scikit-learn call
        score_tuples = model_instance.score_matrix(X)

        # 3. Construct persistence models
        records: List[EventAnomalyModel] = []
        now_utc = datetime.now(timezone.utc)

        for idx, (score, classification) in enumerate(score_tuples):
            evt = valid_events[idx]
            snap = snapshots[idx]

            explanation = generate_anomaly_explanation(
                score=score,
                classification=classification,
                features=snap,
                raw_event=evt.get("raw_log"),
                source_ip=evt.get("source_ip"),
                destination_ip=evt.get("destination_ip"),
                action=evt.get("action"),
                protocol=evt.get("protocol"),
            )

            record = EventAnomalyModel(
                event_id=evt["event_id"],
                anomaly_score=score,
                classification=classification,
                explanation=explanation,
                model_name=model_instance.model_name,
                model_version=model_instance.model_version,
                features_snapshot=snap,
                created_at=now_utc,
            )
            records.append(record)

        if records:
            db.add_all(records)
            db.commit()

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.debug("Vectorized AI/ML scored %d events in %.2f ms (%.1f events/sec)", len(records), elapsed_ms, (len(records) / (elapsed_ms / 1000.0) if elapsed_ms > 0 else 0))
        return len(records)

    except Exception as exc:
        logger.warning("Vectorized AI batch scoring error: %s", str(exc))
        try:
            db.rollback()
        except Exception:
            pass
        return 0
