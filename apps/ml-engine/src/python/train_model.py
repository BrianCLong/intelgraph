#!/usr/bin/env python3
"""
Model Training Pipeline for Entity Resolution
Trains machine learning models using scikit-learn
"""

import json
import sys
import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple
import pickle
import os
from pathlib import Path

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import joblib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelTrainer:
    """
    Model training pipeline for entity resolution
    """
    
    def __init__(self):
        self.models = {
            'random_forest': RandomForestClassifier,
            'gradient_boosting': GradientBoostingClassifier,
            'svm': SVC,
            'logistic_regression': LogisticRegression
        }
        
        self.default_params = {
            'random_forest': {
                'n_estimators': 100,
                'max_depth': 10,
                'min_samples_split': 2,
                'min_samples_leaf': 1,
                'random_state': 42
            },
            'gradient_boosting': {
                'n_estimators': 100,
                'learning_rate': 0.1,
                'max_depth': 6,
                'random_state': 42
            },
            'svm': {
                'kernel': 'rbf',
                'C': 1.0,
                'gamma': 'scale',
                'probability': True,
                'random_state': 42
            },
            'logistic_regression': {
                'C': 1.0,
                'max_iter': 1000,
                'random_state': 42
            }
        }
    
    def prepare_data(self, examples: List[Dict[str, Any]]) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare training data from examples
        
        Args:
            examples: List of training examples with features
            
        Returns:
            Tuple of (features, labels)
        """
        features_list = []
        labels = []
        
        for example in examples:
            if 'features' not in example:
                logger.error(f"Example missing features: {example}")
                continue
                
            features_list.append(list(example['features'].values()))
            labels.append(1 if example['isMatch'] else 0)
        
        if not features_list:
            raise ValueError("No valid examples with features found")
        
        X = np.array(features_list, dtype=np.float32)
        y = np.array(labels, dtype=np.int32)
        
        logger.info(f"Prepared data: {X.shape[0]} examples, {X.shape[1]} features")
        
        # Handle NaN values
        X = np.nan_to_num(X, nan=0.0)
        
        return X, y
    
    def train_model(
        self, 
        X: np.ndarray, 
        y: np.ndarray, 
        model_type: str, 
        hyperparameters: Dict[str, Any]
    ) -> Pipeline:
        """
        Train a model with given data and parameters
        
        Args:
            X: Feature matrix
            y: Labels
            model_type: Type of model to train
            hyperparameters: Model hyperparameters
            
        Returns:
            Trained model pipeline
        """
        if model_type not in self.models:
            raise ValueError(f"Unknown model type: {model_type}")
        
        # Merge default parameters with provided ones
        params = {**self.default_params.get(model_type, {}), **hyperparameters}
        
        # Create model
        model_class = self.models[model_type]
        model = model_class(**params)
        
        # Create pipeline with scaling (important for SVM and LogisticRegression)
        pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('classifier', model)
        ])
        
        logger.info(f"Training {model_type} model with parameters: {params}")
        
        # Train the model
        pipeline.fit(X, y)
        
        logger.info("Training completed successfully")
        return pipeline
    
    def evaluate_model(
        self, 
        pipeline: Pipeline, 
        X_test: np.ndarray, 
        y_test: np.ndarray
    ) -> Dict[str, Any]:
        """
        Evaluate trained model
        
        Args:
            pipeline: Trained model pipeline
            X_test: Test features
            y_test: Test labels
            
        Returns:
            Dictionary with evaluation metrics
        """
        # Make predictions
        y_pred = pipeline.predict(X_test)
        y_pred_proba = pipeline.predict_proba(X_test)[:, 1] if hasattr(pipeline, 'predict_proba') else None
        
        # Calculate metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, zero_division=0)
        recall = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
        
        metrics = {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1Score': float(f1),
            'confusionMatrix': {
                'truePositives': int(tp),
                'falsePositives': int(fp),
                'trueNegatives': int(tn),
                'falseNegatives': int(fn)
            },
            'totalExamples': int(len(y_test)),
            'predictions': y_pred.tolist() if len(y_pred) < 1000 else None,  # Only include for small datasets
            'probabilities': y_pred_proba.tolist() if y_pred_proba is not None and len(y_pred_proba) < 1000 else None
        }
        
        logger.info(f"Model evaluation completed: Accuracy={accuracy:.4f}, F1={f1:.4f}")
        return metrics
    
    def cross_validate(
        self, 
        X: np.ndarray, 
        y: np.ndarray, 
        model_type: str, 
        hyperparameters: Dict[str, Any], 
        cv: int = 5
    ) -> Dict[str, float]:
        """
        Perform cross-validation
        
        Args:
            X: Feature matrix
            y: Labels
            model_type: Type of model
            hyperparameters: Model parameters
            cv: Number of cross-validation folds
            
        Returns:
            Cross-validation scores
        """
        params = {**self.default_params.get(model_type, {}), **hyperparameters}
        model_class = self.models[model_type]
        model = model_class(**params)
        
        pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('classifier', model)
        ])
        
        # Perform cross-validation
        cv_scores = cross_val_score(pipeline, X, y, cv=cv, scoring='f1')
        
        return {
            'cv_mean': float(np.mean(cv_scores)),
            'cv_std': float(np.std(cv_scores)),
            'cv_scores': cv_scores.tolist()
        }
    
    def save_model(self, pipeline: Pipeline, output_path: str) -> None:
        """
        Save trained model to disk
        
        Args:
            pipeline: Trained model pipeline
            output_path: Path to save the model
        """
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Save model
        joblib.dump(pipeline, output_path)
        logger.info(f"Model saved to: {output_path}")
    
    def load_model(self, model_path: str) -> Pipeline:
        """
        Load model from disk
        
        Args:
            model_path: Path to saved model
            
        Returns:
            Loaded model pipeline
        """
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        pipeline = joblib.load(model_path)
        logger.info(f"Model loaded from: {model_path}")
        return pipeline

def main():
    """
    Main training script
    """
    if len(sys.argv) != 3:
        print("Usage: python train_model.py <training_data_file> <metrics_output_file>")
        sys.exit(1)
    
    training_file = sys.argv[1]
    metrics_file = sys.argv[2]
    
    try:
        # Load training configuration
        with open(training_file, 'r') as f:
            config = json.load(f)
        
        examples = config['examples']
        model_type = config['modelType']
        hyperparameters = config['hyperparameters']
        output_path = config['outputPath']
        
        # Initialize trainer
        trainer = ModelTrainer()
        
        # Prepare data
        X, y = trainer.prepare_data(examples)
        
        # Check if we have enough data
        if len(X) < 10:
            raise ValueError(f"Insufficient training data: {len(X)} examples (minimum 10 required)")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y if len(np.unique(y)) > 1 else None
        )
        
        # Train model
        pipeline = trainer.train_model(X_train, y_train, model_type, hyperparameters)
        
        # Evaluate model
        metrics = trainer.evaluate_model(pipeline, X_test, y_test)
        
        # Add cross-validation scores
        cv_results = trainer.cross_validate(X, y, model_type, hyperparameters)
        metrics.update(cv_results)
        
        # Save model
        trainer.save_model(pipeline, output_path)
        
        # Save metrics
        with open(metrics_file, 'w') as f:
            json.dump(metrics, f, indent=2)
        
        logger.info(f"Training pipeline completed successfully")
        logger.info(f"Model saved to: {output_path}")
        logger.info(f"Metrics saved to: {metrics_file}")
        
    except Exception as e:
        logger.error(f"Training failed: {e}")
        error_metrics = {
            'error': str(e),
            'accuracy': 0.0,
            'precision': 0.0,
            'recall': 0.0,
            'f1Score': 0.0,
            'confusionMatrix': {
                'truePositives': 0,
                'falsePositives': 0,
                'trueNegatives': 0,
                'falseNegatives': 0
            },
            'totalExamples': 0
        }
        
        try:
            with open(metrics_file, 'w') as f:
                json.dump(error_metrics, f, indent=2)
        except:
            pass
        
        sys.exit(1)

if __name__ == "__main__":
    main()