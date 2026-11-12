import os
import sys
import joblib
import pandas as pd
import numpy as np

# Try importing torch; if not available, gracefully fallback
try:
    import torch
    from neural_model import DeepFraudMLP, FraudAutoencoder
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

class FraudDetector:
    """
    VeriFund FraudDetector supports:
    - 'NEURAL': PyTorch Deep Tabular MLP with Focal Loss + Autoencoder Anomaly Score
    - 'RANDOM_FOREST': Scikit-Learn Balanced Random Forest Pipeline
    - 'HYBRID': Consensus Ensemble of Neural + Tree Models
    
    Risk Level Rules (Calibrated Multi-Tier Thresholds):
    - HIGH Risk: Probability score >= 0.35 (or Anomaly Score > 1.5)
    - MEDIUM Risk: 0.15 <= Probability score < 0.35
    - LOW Risk: Probability score < 0.15
    """
    def __init__(self, mode="NEURAL", model_path=None):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.mode = mode.upper()
        
        # Paths
        self.rf_model_path = os.path.join(self.base_dir, "models", "fraud_detection_model.joblib")
        self.neural_model_path = os.path.join(self.base_dir, "models", "neural_fraud_model.pt")
        self.neural_prep_path = os.path.join(self.base_dir, "models", "neural_preprocessor.joblib")
        
        self.rf_pipeline = None
        self.high_threshold = 0.35
        self.med_threshold = 0.15
        self.features = ['step', 'type', 'amount']
        
        # 1. Load Random Forest model if available
        if os.path.exists(self.rf_model_path):
            try:
                rf_data = joblib.load(self.rf_model_path)
                self.rf_pipeline = rf_data.get('pipeline')
                self.features = rf_data.get('features', self.features)
            except Exception as e:
                print(f"Warning: Could not load Random Forest model: {e}")
                
        # 2. Load PyTorch Neural Network if available
        self.neural_model = None
        self.autoencoder = None
        self.neural_preprocessor = None
        
        if TORCH_AVAILABLE and os.path.exists(self.neural_model_path) and os.path.exists(self.neural_prep_path):
            try:
                self.neural_preprocessor = joblib.load(self.neural_prep_path)
                checkpoint = torch.load(self.neural_model_path, map_location=torch.device('cpu'))
                
                input_dim = checkpoint.get('input_dim', 7)
                
                # Instantiate and load DeepFraudMLP
                self.neural_model = DeepFraudMLP(input_dim=input_dim)
                self.neural_model.load_state_dict(checkpoint['model_state_dict'])
                self.neural_model.eval()
                
                # Instantiate and load FraudAutoencoder if present
                if 'autoencoder_state_dict' in checkpoint:
                    self.autoencoder = FraudAutoencoder(input_dim=input_dim)
                    self.autoencoder.load_state_dict(checkpoint['autoencoder_state_dict'])
                    self.autoencoder.eval()
            except Exception as e:
                print(f"Warning: Could not load Neural Network model: {e}")
                self.neural_model = None
                
        # If Neural is requested but not ready, fallback to Random Forest
        if self.mode in ["NEURAL", "HYBRID"] and self.neural_model is None:
            if self.rf_pipeline is not None:
                print("Notice: Neural model not ready, falling back to Random Forest.")
                self.mode = "RANDOM_FOREST"
            else:
                raise FileNotFoundError("Neither Neural nor Random Forest model weights found. Run training first.")

    def predict(self, input_data):
        """
        Predict fraud risk for given transaction data.
        input_data: Can be a dict, a list of dicts, or a pandas DataFrame.
        """
        if isinstance(input_data, dict):
            df = pd.DataFrame([input_data])
            is_single = True
        elif isinstance(input_data, list):
            df = pd.DataFrame(input_data)
            is_single = False
        elif isinstance(input_data, pd.DataFrame):
            df = input_data.copy()
            is_single = False
        else:
            raise TypeError("Input must be a dictionary, list of dictionaries, or a pandas DataFrame.")

        # Check required features
        for feature in self.features:
            if feature not in df.columns:
                raise ValueError(f"Validation Error: Missing required feature column '{feature}'")
            if df[feature].isna().any():
                raise ValueError(f"Validation Error: Column '{feature}' contains missing or NaN values")

        # Type conversion & validation
        try:
            df['step'] = pd.to_numeric(df['step'], errors='raise')
            df['amount'] = pd.to_numeric(df['amount'], errors='raise')
        except Exception:
            raise TypeError("Validation Error: 'step' and 'amount' must be numeric values")

        if (df['amount'] < 0).any():
            raise ValueError("Validation Error: Transaction 'amount' cannot be negative")

        df_model = df[self.features]
        
        neural_probs = None
        rf_probs = None
        anomaly_scores = None
        
        # 1. Neural Prediction
        if self.mode in ["NEURAL", "HYBRID"] and self.neural_model is not None:
            X_proc = self.neural_preprocessor.transform(df_model)
            tensor_x = torch.tensor(X_proc, dtype=torch.float32)
            with torch.no_grad():
                neural_probs = self.neural_model(tensor_x).numpy().flatten()
                if self.autoencoder is not None:
                    anomaly_scores = self.autoencoder.anomaly_score(tensor_x).numpy().flatten()
                    
        # 2. Random Forest Prediction
        if self.mode in ["RANDOM_FOREST", "HYBRID"] and self.rf_pipeline is not None:
            rf_probs = self.rf_pipeline.predict_proba(df_model)[:, 1]
            
        # 3. Final Probability Consensus
        if self.mode == "NEURAL" and neural_probs is not None:
            final_probs = neural_probs
            active_engine = "Deep Neural Network (PyTorch MLP)"
        elif self.mode == "RANDOM_FOREST" and rf_probs is not None:
            final_probs = rf_probs
            active_engine = "Random Forest Classifier"
        elif self.mode == "HYBRID" and neural_probs is not None and rf_probs is not None:
            final_probs = 0.5 * neural_probs + 0.5 * rf_probs
            active_engine = "Hybrid Consensus (Neural + Random Forest)"
        else:
            final_probs = rf_probs if rf_probs is not None else neural_probs
            active_engine = "Fallback Classifier"

        results = []
        for i, prob in enumerate(final_probs):
            prob_float = float(prob)
            prediction = 1 if prob_float >= self.high_threshold else 0

            # Set calibrated risk levels
            if prob_float >= self.high_threshold:
                risk_level = "HIGH"
            elif prob_float >= self.med_threshold:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"

            res = {
                "prediction": prediction,
                "probability": round(prob_float, 4),
                "risk_level": risk_level,
                "engine": active_engine,
                "threshold": self.high_threshold
            }
            if anomaly_scores is not None:
                res["anomaly_score"] = round(float(anomaly_scores[i]), 4)
                
            results.append(res)

        return results[0] if is_single else results
