"""
Enhanced Entity Resolution Training Pipeline for GA Core Precision Optimization.
Integrates with precision-optimization-train.py for comprehensive ER model training.
"""
from __future__ import annotations
import json
import sys
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple
import logging

from sentence_transformers import SentenceTransformer
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score
from sklearn.ensemble import RandomForestClassifier
import joblib

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# GA Core precision targets
GA_PRECISION_TARGETS = {
    'PERSON': 0.90,   # 90% precision required for GA
    'ORG': 0.88,      # 88% precision required for GA  
    'LOCATION': 0.85,
    'ARTIFACT': 0.82
}

def load_feedback(path: Path):
    """Load user feedback data for training."""
    if not path.exists():
        logger.warning(f"Feedback file {path} not found, returning empty list")
        return []
    
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading feedback from {path}: {e}")
        return []

def load_training_data(data_path: Path = Path('training_data.json')):
    """Load training data for entity resolution."""
    if not data_path.exists():
        logger.warning(f"Training data file {data_path} not found")
        return []
    
    try:
        with open(data_path, 'r') as f:
            data = json.load(f)
        logger.info(f"Loaded {len(data)} training examples")
        return data
    except Exception as e:
        logger.error(f"Error loading training data from {data_path}: {e}")
        return []

def extract_features(entity_a: dict, entity_b: dict) -> np.ndarray:
    """Extract features for entity pair comparison."""
    features = []
    
    # Name-based features
    if entity_a.get('name') and entity_b.get('name'):
        name_a = entity_a['name'].lower().strip()
        name_b = entity_b['name'].lower().strip()
        
        # Exact match
        features.append(1.0 if name_a == name_b else 0.0)
        
        # Length similarity
        len_sim = 1.0 - abs(len(name_a) - len(name_b)) / max(len(name_a), len(name_b), 1)
        features.append(len_sim)
        
        # Character overlap
        set_a = set(name_a.replace(' ', ''))
        set_b = set(name_b.replace(' ', ''))
        overlap = len(set_a & set_b) / max(len(set_a | set_b), 1)
        features.append(overlap)
        
        # Word count similarity
        words_a = name_a.split()
        words_b = name_b.split()
        word_sim = 1.0 - abs(len(words_a) - len(words_b)) / max(len(words_a), len(words_b), 1)
        features.append(word_sim)
    else:
        features.extend([0.0, 0.0, 0.0, 0.0])
    
    # Email-based features
    if entity_a.get('email') and entity_b.get('email'):
        email_a = entity_a['email'].lower().strip()
        email_b = entity_b['email'].lower().strip()
        
        # Exact match
        features.append(1.0 if email_a == email_b else 0.0)
        
        # Domain match
        domain_a = email_a.split('@')[-1] if '@' in email_a else ''
        domain_b = email_b.split('@')[-1] if '@' in email_b else ''
        features.append(1.0 if domain_a == domain_b and domain_a else 0.0)
    else:
        features.extend([0.0, 0.0])
    
    # Phone-based features
    if entity_a.get('phone') and entity_b.get('phone'):
        phone_a = ''.join(c for c in str(entity_a['phone']) if c.isdigit())
        phone_b = ''.join(c for c in str(entity_b['phone']) if c.isdigit())
        
        if phone_a and phone_b:
            features.append(1.0 if phone_a == phone_b else 0.0)
            # Partial phone match (last 7 digits)
            if len(phone_a) >= 7 and len(phone_b) >= 7:
                features.append(1.0 if phone_a[-7:] == phone_b[-7:] else 0.0)
            else:
                features.append(0.0)
        else:
            features.extend([0.0, 0.0])
    else:
        features.extend([0.0, 0.0])
    
    # Additional identifier features
    features.append(1.0 if entity_a.get('url') == entity_b.get('url') and entity_a.get('url') else 0.0)
    features.append(1.0 if bool(entity_a.get('phone')) and bool(entity_b.get('phone')) else 0.0)
    features.append(1.0 if bool(entity_a.get('address')) and bool(entity_b.get('address')) else 0.0)
    
    return np.array(features)

def prepare_training_data(training_data: List[Dict], feedback: List[Dict]) -> Tuple[np.ndarray, np.ndarray]:
    """Prepare feature matrix and labels for training."""
    X = []
    y = []
    
    # Process training data
    for example in training_data:
        entity_a = example.get('entity_a', {})
        entity_b = example.get('entity_b', {})
        label = example.get('is_match', False)
        
        features = extract_features(entity_a, entity_b)
        X.append(features)
        y.append(1 if label else 0)
    
    # Process feedback data
    for example in feedback:
        entity_a = example.get('entity_a', {})
        entity_b = example.get('entity_b', {})
        label = example.get('user_decision') == 'MERGE'
        
        features = extract_features(entity_a, entity_b)
        X.append(features)
        y.append(1 if label else 0)
    
    return np.array(X), np.array(y)

def train_precision_optimized_model(X: np.ndarray, y: np.ndarray, entity_type: str = 'PERSON'):
    """Train a precision-optimized model for entity resolution."""
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if len(np.unique(y)) > 1 else None
    )
    
    # Train Random Forest with precision optimization
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        class_weight='balanced'  # Handle class imbalance
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate on test set
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_pred_proba) if len(np.unique(y_test)) > 1 else 0.5
    
    logger.info(f"Model Performance for {entity_type}:")
    logger.info(f"  Precision: {precision:.4f}")
    logger.info(f"  Recall: {recall:.4f}")
    logger.info(f"  F1 Score: {f1:.4f}")
    logger.info(f"  AUC: {auc:.4f}")
    
    # Check if precision meets GA targets
    target_precision = GA_PRECISION_TARGETS.get(entity_type, 0.85)
    meets_target = precision >= target_precision
    
    logger.info(f"  Target Precision: {target_precision:.4f}")
    logger.info(f"  Meets Target: {'✓' if meets_target else '✗'}")
    
    return model, {
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'auc': auc,
        'meets_target': meets_target,
        'target_precision': target_precision
    }

def optimize_threshold_for_precision(model, X_test: np.ndarray, y_test: np.ndarray, 
                                   target_precision: float = 0.90):
    """Find optimal threshold to achieve target precision."""
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    best_threshold = 0.5
    best_precision = 0.0
    
    # Test thresholds from 0.1 to 0.9
    for threshold in np.arange(0.1, 0.95, 0.05):
        y_pred_thresh = (y_pred_proba >= threshold).astype(int)
        
        if len(np.unique(y_pred_thresh)) > 1:  # Avoid division by zero
            precision = precision_score(y_test, y_pred_thresh)
            
            if precision >= target_precision and precision > best_precision:
                best_precision = precision
                best_threshold = threshold
    
    logger.info(f"Optimal threshold for {target_precision:.2f} precision: {best_threshold:.3f}")
    logger.info(f"Achieved precision: {best_precision:.4f}")
    
    return best_threshold, best_precision

def train_and_save_model(output_model: Path, 
                        feedback_path: Path = Path('feedback.json'),
                        training_data_path: Path = Path('training_data.json'),
                        entity_type: str = 'PERSON'):
    """Main training function with enhanced precision optimization."""
    
    logger.info(f"Starting enhanced ER training for {entity_type}")
    
    # Load data
    feedback = load_feedback(feedback_path)
    training_data = load_training_data(training_data_path)
    
    if not feedback and not training_data:
        logger.error("No training data or feedback available")
        return False
    
    # Prepare training data
    X, y = prepare_training_data(training_data, feedback)
    
    if len(X) == 0:
        logger.error("No valid training examples found")
        return False
    
    logger.info(f"Training with {len(X)} examples, {np.sum(y)} positive matches")
    
    # Train precision-optimized model
    model, metrics = train_precision_optimized_model(X, y, entity_type)
    
    # Save the model
    model_data = {
        'model': model,
        'metrics': metrics,
        'entity_type': entity_type,
        'ga_precision_target': GA_PRECISION_TARGETS.get(entity_type, 0.85),
        'feature_names': [
            'name_exact', 'name_length_sim', 'name_char_overlap', 'name_word_sim',
            'email_exact', 'email_domain', 'phone_exact', 'phone_partial',
            'url_exact', 'has_phone', 'has_address'
        ]
    }
    
    output_model.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model_data, output_model)
    logger.info(f"Enhanced model saved to {output_model}")
    
    # Also save legacy sentence transformer for backward compatibility
    legacy_model = SentenceTransformer('paraphrase-MiniLM-L6-v2')
    legacy_path = output_model.parent / f"legacy-{output_model.name}"
    legacy_model.save(str(legacy_path))
    logger.info(f"Legacy model saved to {legacy_path}")
    
    return metrics['meets_target']

def predict_match(model_path: Path, entity_a: dict, entity_b: dict) -> dict:
    """Predict if two entities match using the trained model."""
    try:
        model_data = joblib.load(model_path)
        model = model_data['model']
        
        # Extract features
        features = extract_features(entity_a, entity_b).reshape(1, -1)
        
        # Predict
        score = model.predict_proba(features)[0, 1]
        
        # Use GA precision target as threshold
        entity_type = model_data.get('entity_type', 'PERSON')
        threshold = GA_PRECISION_TARGETS.get(entity_type, 0.85)
        
        match = score >= threshold
        
        return {
            'score': float(score),
            'match': match,
            'confidence': float(score),
            'explanation': {
                'ml_score': float(score),
                'threshold': threshold,
                'entity_type': entity_type
            }
        }
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return {
            'score': 0.0,
            'match': False,
            'confidence': 0.0,
            'explanation': {'error': str(e)}
        }

def main():
    """Main entry point for training or prediction."""
    if len(sys.argv) < 2:
        print("Usage: entity-resolution-train.py [train|predict] [args...]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'train':
        entity_type = sys.argv[2] if len(sys.argv) > 2 else 'PERSON'
        success = train_and_save_model(
            Path(f'models/er-model-{entity_type.lower()}.joblib'),
            entity_type=entity_type
        )
        
        if success:
            logger.info(f"✓ Training completed successfully for {entity_type}")
            print(json.dumps({'status': 'success', 'entity_type': entity_type}))
        else:
            logger.error(f"✗ Training failed - precision target not met for {entity_type}")
            print(json.dumps({'status': 'failed', 'entity_type': entity_type}))
    
    elif command == 'predict' and len(sys.argv) >= 4:
        entity_a = json.loads(sys.argv[2])
        entity_b = json.loads(sys.argv[3])
        entity_type = sys.argv[4] if len(sys.argv) > 4 else 'PERSON'
        
        model_path = Path(f'models/er-model-{entity_type.lower()}.joblib')
        result = predict_match(model_path, entity_a, entity_b)
        print(json.dumps(result))
    
    else:
        print("Invalid command. Use 'train' or 'predict'")
        sys.exit(1)

if __name__ == '__main__':
    main()
