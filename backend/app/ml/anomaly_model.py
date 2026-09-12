"""Isolation Forest Model Wrapper for Security Log Anomaly Scoring."""
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

from .feature_engineering import FEATURE_NAMES

MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "models"
MODEL_FILE = MODEL_DIR / "isolation_forest_v1.joblib"


class AnomalyDetectionModel:
    """Production wrapper for scikit-learn Isolation Forest with persistence."""

    def __init__(
        self,
        contamination: float = 0.1,
        n_estimators: int = 100,
        random_state: int = 42,
        model_version: str = "v1.0.0",
    ):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.model_version = model_version
        self.model_name = "IsolationForest"
        self.model: Optional[IsolationForest] = None
        self.is_trained: bool = False
        self.training_metadata: Dict[str, Any] = {}

        # Attempt to load existing model artifact if present
        self.load_model()

    def fit(self, X: np.ndarray, metadata: Optional[Dict[str, Any]] = None) -> "AnomalyDetectionModel":
        """Fits the Isolation Forest on a numerical feature matrix."""
        if X.shape[0] < 5:
            raise ValueError(f"Insufficient training samples ({X.shape[0]}). Minimum 5 events required.")

        clf = IsolationForest(
            contamination=self.contamination,
            n_estimators=self.n_estimators,
            random_state=self.random_state,
            n_jobs=-1,
        )
        clf.fit(X)

        self.model = clf
        self.is_trained = True
        self.training_metadata = {
            "samples_count": int(X.shape[0]),
            "features_count": int(X.shape[1]),
            "feature_names": FEATURE_NAMES,
            "trained_at": metadata.get("trained_at") if metadata else None,
            "version": self.model_version,
            "contamination": self.contamination,
        }
        self.save_model()
        return self

    def score_single(self, vector: List[float]) -> Tuple[float, str]:
        """Scores a single 1D feature vector, returning (anomaly_score, classification)."""
        if not self.is_trained or self.model is None:
            raise RuntimeError("Model is not trained. Call fit() or train via API first.")

        X = np.array([vector], dtype=np.float64)
        return self.score_matrix(X)[0]

    def score_matrix(self, X: np.ndarray) -> List[Tuple[float, str]]:
        """Scores a 2D feature matrix and returns a list of (score, classification) tuples."""
        if not self.is_trained or self.model is None:
            raise RuntimeError("Model is not trained. Call fit() or train via API first.")

        # decision_function: positive for normal inliers, negative for anomalous outliers
        df = self.model.decision_function(X)

        results = []
        for val in df:
            # Map decision function (-0.3 .. +0.3) into normalized range [0.0, 1.0]
            # When val = +0.2 -> score ~ 0.25 (Normal)
            # When val = 0.0  -> score = 0.50 (Suspicious threshold boundary)
            # When val = -0.2 -> score ~ 0.75 (Highly Anomalous)
            raw_score = 0.5 - (float(val) * 1.25)
            norm_score = max(0.0, min(1.0, round(raw_score, 4)))

            if norm_score >= 0.70:
                classification = "Highly Anomalous"
            elif norm_score >= 0.40:
                classification = "Suspicious"
            else:
                classification = "Normal"

            results.append((norm_score, classification))

        return results

    def save_model(self, path: Optional[Path] = None) -> Path:
        """Saves model state and metadata to disk."""
        target_path = path or MODEL_FILE
        target_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "model": self.model,
            "is_trained": self.is_trained,
            "metadata": self.training_metadata,
            "version": self.model_version,
            "name": self.model_name,
        }
        joblib.dump(payload, target_path)
        return target_path

    def load_model(self, path: Optional[Path] = None) -> bool:
        """Loads model artifact from disk if it exists."""
        target_path = path or MODEL_FILE
        if not target_path.exists():
            self.is_trained = False
            self.model = None
            return False

        try:
            payload = joblib.load(target_path)
            self.model = payload.get("model")
            self.is_trained = payload.get("is_trained", False)
            self.training_metadata = payload.get("metadata", {})
            self.model_version = payload.get("version", "v1.0.0")
            return True
        except Exception:
            self.is_trained = False
            self.model = None
            return False


# Singleton model instance for fast in-process scoring
model_instance = AnomalyDetectionModel()
