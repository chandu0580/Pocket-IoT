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

    def train(self, features_list):
        """Fit the model on historical multi-variate sensor data.
        Expected features_list: list of [mag, noise, gx, gy, gz]
        """
        if len(features_list) < 10:
            print(f"DEBUG AI: Not enough data to train ({len(features_list)}/10 required).")
            return
        
        with self.train_lock:
            try:
                data = np.array(features_list)
                self.model.fit(data)
                self.is_trained = True
                print(f"DEBUG AI: Model trained successfully on {len(features_list)} points with 5 features.")
            except Exception:
                logging.exception("AI Detector: Failed to train model.")

    def predict(self, features):
        """Detect if a sensor packet is anomalous. 
        Features: [mag, noise, gx, gy, gz]
        Returns (score, is_anomaly).
        """
        mag = features[0]
        # Always return a default result if not yet trained
        if not self.is_trained:
            # Simple heuristic while model is warming up
            is_anomaly = mag > 25.0
            return 0.0, is_anomaly

        try:
            data = np.array([features])
            raw_score = self.model.decision_function(data)[0]
            prediction = self.model.predict(data)[0]
            norm_score = max(0.0, min(1.0, 0.5 - raw_score))
            is_anomaly = prediction == -1
            
            if is_anomaly:
                print(f"DEBUG AI: ANOMALY DETECTED! features={features}, score={norm_score:.4f}")
            
            return float(norm_score), bool(is_anomaly)
        except Exception:
            logging.exception("AI Detector: Prediction failed.")
            return 0.0, False

    def add_to_buffer(self, features):
        """Add multi-variate data point to rolling buffer."""
        with self.train_lock:
            self.history_buffer.append(features)
            if len(self.history_buffer) > self.max_buffer_size:
                self.history_buffer.pop(0)

detector = AIDetector()
