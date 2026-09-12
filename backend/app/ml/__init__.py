"""LogForge Machine Learning & Anomaly Detection Package."""
from .anomaly_model import AnomalyDetectionModel, model_instance
from .explanations import generate_anomaly_explanation
from .feature_engineering import FEATURE_NAMES, build_feature_matrix, extract_features_from_dict
from .scoring import batch_score_events_safely, score_event_safely
from .training import MIN_TRAINING_SAMPLES, train_model_from_database

__all__ = [
    "AnomalyDetectionModel",
    "model_instance",
    "FEATURE_NAMES",
    "extract_features_from_dict",
    "build_feature_matrix",
    "generate_anomaly_explanation",
    "score_event_safely",
    "batch_score_events_safely",
    "train_model_from_database",
    "MIN_TRAINING_SAMPLES",
]
