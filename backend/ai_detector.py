import logging
import numpy as np
from sklearn.ensemble import IsolationForest
import threading
import time

class AIDetector:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(AIDetector, cls).__new__(cls)
                cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        self.model = IsolationForest(contamination=0.02, random_state=42)
        self.is_trained = False
        self.history_buffer = []
        self.max_buffer_size = 2000
        self.train_lock = threading.Lock()
        self._initialized = True
        logging.info("AI Anomaly Detector initialized with IsolationForest.")

    def train(self, magnitudes):
        """Fit the model on historical motion magnitude data."""
        if len(magnitudes) < 10:
            print(f"DEBUG AI: Not enough data to train ({len(magnitudes)}/10 required).")
            return
        
        with self.train_lock:
            try:
                data = np.array(magnitudes).reshape(-1, 1)
                self.model.fit(data)
                self.is_trained = True
                print(f"DEBUG AI: Model trained successfully on {len(magnitudes)} points.")
            except Exception:
                logging.exception("AI Detector: Failed to train model.")

    def predict(self, magnitude):
        """Detect if a magnitude is anomalous. Returns (score, is_anomaly)."""
        # Always return a default result if not yet trained
        if not self.is_trained:
            # Simple heuristic while model is warming up: anomalies > 20 m/s^2 (violent shaking)
            is_anomaly = magnitude > 25.0
            return 0.0, is_anomaly

        try:
            data = np.array([[magnitude]])
            # decision_function returns anomaly score (negative values are outliers)
            # We normalize it to 0-1 range where higher is "more anomalous"
            raw_score = self.model.decision_function(data)[0]
            # IsolationForest decision_function: lower is more anomalous
            # Let's map it: score = max(0, -raw_score * 5) or similar
            # A more robust way: use model.predict which returns -1 for anomaly
            prediction = self.model.predict(data)[0]
            norm_score = max(0.0, min(1.0, 0.5 - raw_score))
            is_anomaly = prediction == -1
            
            if is_anomaly:
                print(f"DEBUG AI: ANOMALY DETECTED! mag={magnitude:.2f}, score={norm_score:.4f}, raw={raw_score:.4f}")
            
            return float(norm_score), bool(is_anomaly)
        except Exception:
            logging.exception("AI Detector: Prediction failed.")
            return 0.0, False

    def add_to_buffer(self, magnitude):
        """Add data point to rolling buffer for periodic retraining."""
        with self.train_lock:
            self.history_buffer.append(magnitude)
            if len(self.history_buffer) > self.max_buffer_size:
                self.history_buffer.pop(0)

detector = AIDetector()
