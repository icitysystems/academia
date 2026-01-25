"""
ML Service - Python-based Machine Learning Microservice
Provides real ML inference for automated grading using scikit-learn and optionally TensorFlow/PyTorch
"""

import os
from typing import List, Optional, Dict, Any
from datetime import datetime
import numpy as np
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import joblib
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Academia ML Service",
    description="Machine Learning microservice for automated grading",
    version="1.0.0"
)

# In-memory model storage (in production, use Redis or file-based storage)
models: Dict[str, Any] = {}
scalers: Dict[str, StandardScaler] = {}
label_encoders: Dict[str, LabelEncoder] = {}


# ============ Pydantic Models ============

class FeatureInput(BaseModel):
    text_length: float
    word_count: float
    avg_word_length: float
    alpha_ratio: float
    digit_ratio: float
    special_ratio: float
    uppercase_ratio: float
    ocr_confidence: float
    similarity_score: float
    has_mcq_answer: int
    has_true_false: int
    is_empty: int
    is_very_short: int
    has_content: int
    question_type_mcq: int
    question_type_true_false: int
    question_type_short_answer: int
    question_type_long_answer: int
    question_type_numeric: int
    question_type_other: int


class PredictionRequest(BaseModel):
    model_id: str
    region_id: str
    text: str
    ocr_data: Dict[str, Any]
    question_type: str
    expected_answer: Optional[str] = None
    max_points: float = 10.0


class PredictionResponse(BaseModel):
    region_id: str
    predicted_correctness: str
    confidence: float
    assigned_score: float
    explanation: str
    needs_review: bool
    inference_time_ms: float


class BatchPredictionRequest(BaseModel):
    model_id: str
    predictions: List[PredictionRequest]


class TrainingDataPoint(BaseModel):
    text: str
    question_type: str
    expected_answer: Optional[str] = None
    label: str  # CORRECT, PARTIAL, INCORRECT, SKIPPED
    score: float


class TrainingRequest(BaseModel):
    model_id: str
    template_id: str
    training_data: List[TrainingDataPoint]
    config: Optional[Dict[str, Any]] = None


class TrainingResponse(BaseModel):
    model_id: str
    accuracy: float
    validation_accuracy: float
    confusion_matrix: List[List[int]]
    training_time_seconds: float


class ModelInfo(BaseModel):
    model_id: str
    template_id: str
    accuracy: float
    created_at: str
    model_type: str


# ============ Feature Extraction ============

def extract_features(text: str, question_type: str, ocr_confidence: float = 0.5, 
                     expected_answer: Optional[str] = None) -> np.ndarray:
    """Extract numerical features from text and context"""
    normalized_text = text.lower().strip()
    words = [w for w in normalized_text.split() if w]
    
    # Basic text features
    text_length = min(len(text) / 500, 1)
    word_count = min(len(words) / 100, 1)
    avg_word_length = sum(len(w) for w in words) / max(len(words), 1) / 10
    
    # Character distribution
    alpha_count = sum(1 for c in text if c.isalpha())
    digit_count = sum(1 for c in text if c.isdigit())
    special_count = sum(1 for c in text if not c.isalnum() and not c.isspace())
    uppercase_count = sum(1 for c in text if c.isupper())
    
    text_len = max(len(text), 1)
    alpha_ratio = alpha_count / text_len
    digit_ratio = digit_count / text_len
    special_ratio = special_count / text_len
    uppercase_ratio = uppercase_count / text_len
    
    # Similarity to expected answer
    similarity_score = 0.0
    if expected_answer:
        expected_words = set(expected_answer.lower().split())
        text_words = set(normalized_text.split())
        if expected_words or text_words:
            intersection = expected_words & text_words
            union = expected_words | text_words
            similarity_score = len(intersection) / max(len(union), 1)
    
    # MCQ-specific features
    has_mcq_answer = 1 if normalized_text.strip() in ['a', 'b', 'c', 'd'] else 0
    has_true_false = 1 if normalized_text.strip() in ['true', 'false', 't', 'f'] else 0
    
    # Completeness indicators
    is_empty = 1 if len(text.strip()) == 0 else 0
    is_very_short = 1 if len(text.strip()) < 5 else 0
    has_content = 1 if len(text.strip()) >= 10 else 0
    
    # Question type encoding (one-hot)
    question_types = ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'LONG_ANSWER', 'NUMERIC', 'OTHER']
    question_type_encoding = [1 if qt == question_type else 0 for qt in question_types]
    
    return np.array([
        text_length, word_count, avg_word_length,
        alpha_ratio, digit_ratio, special_ratio, uppercase_ratio,
        ocr_confidence, similarity_score,
        has_mcq_answer, has_true_false,
        is_empty, is_very_short, has_content,
        *question_type_encoding
    ])


def calculate_score(correctness: str, max_points: float, confidence: float) -> float:
    """Calculate score based on prediction"""
    score_multipliers = {
        'CORRECT': 1.0,
        'PARTIAL': 0.5,
        'INCORRECT': 0.0,
        'SKIPPED': 0.0
    }
    multiplier = score_multipliers.get(correctness, 0.0)
    return round(max_points * multiplier, 2)


def generate_explanation(text: str, question_type: str, 
                        correctness: str, confidence: float) -> str:
    """Generate human-readable explanation for prediction"""
    if correctness == 'SKIPPED':
        return "No answer detected in this region."
    
    if correctness == 'CORRECT':
        if confidence > 0.9:
            return f"Answer is correct with high confidence ({confidence:.1%}). All key elements present."
        return f"Answer appears correct ({confidence:.1%}). Most key elements identified."
    
    if correctness == 'PARTIAL':
        return f"Partial answer detected ({confidence:.1%}). Some elements correct but incomplete or partially incorrect."
    
    if correctness == 'INCORRECT':
        if question_type == 'MCQ':
            return f"Selected option does not match expected answer ({confidence:.1%})."
        return f"Answer does not match expected criteria ({confidence:.1%}). Review recommended."
    
    return f"Prediction made with {confidence:.1%} confidence."


# ============ API Endpoints ============

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "models_loaded": len(models)
    }


@app.get("/models", response_model=List[ModelInfo])
async def list_models():
    """List all loaded models"""
    return [
        ModelInfo(
            model_id=mid,
            template_id=info.get('template_id', 'unknown'),
            accuracy=info.get('accuracy', 0.0),
            created_at=info.get('created_at', datetime.utcnow().isoformat()),
            model_type=info.get('model_type', 'unknown')
        )
        for mid, info in models.items()
        if isinstance(info, dict) and 'model' in info
    ]


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Make a single prediction"""
    start_time = datetime.utcnow()
    
    # Get or create model
    model_info = models.get(request.model_id)
    if not model_info or 'model' not in model_info:
        # Create default model if not exists
        model_info = await create_default_model(request.model_id)
    
    model = model_info['model']
    scaler = scalers.get(request.model_id)
    label_encoder = label_encoders.get(request.model_id)
    
    # Extract features
    ocr_confidence = request.ocr_data.get('confidence', 0.5)
    features = extract_features(
        request.text, 
        request.question_type, 
        ocr_confidence,
        request.expected_answer
    )
    
    # Scale features if scaler exists
    if scaler:
        features = scaler.transform(features.reshape(1, -1))[0]
    
    # Make prediction
    features_2d = features.reshape(1, -1)
    probabilities = model.predict_proba(features_2d)[0]
    predicted_class_idx = np.argmax(probabilities)
    confidence = float(probabilities[predicted_class_idx])
    
    # Decode label
    class_labels = ['CORRECT', 'PARTIAL', 'INCORRECT', 'SKIPPED']
    if label_encoder:
        predicted_correctness = label_encoder.inverse_transform([predicted_class_idx])[0]
    else:
        predicted_correctness = class_labels[predicted_class_idx % len(class_labels)]
    
    # Calculate score and generate explanation
    assigned_score = calculate_score(predicted_correctness, request.max_points, confidence)
    explanation = generate_explanation(
        request.text, request.question_type, predicted_correctness, confidence
    )
    
    inference_time = (datetime.utcnow() - start_time).total_seconds() * 1000
    
    return PredictionResponse(
        region_id=request.region_id,
        predicted_correctness=predicted_correctness,
        confidence=confidence,
        assigned_score=assigned_score,
        explanation=explanation,
        needs_review=confidence < 0.75,
        inference_time_ms=round(inference_time, 2)
    )


@app.post("/predict/batch", response_model=List[PredictionResponse])
async def predict_batch(request: BatchPredictionRequest):
    """Make batch predictions for multiple regions"""
    results = []
    for pred_request in request.predictions:
        pred_request.model_id = request.model_id
        result = await predict(pred_request)
        results.append(result)
    return results


@app.post("/train", response_model=TrainingResponse)
async def train_model(request: TrainingRequest, background_tasks: BackgroundTasks):
    """Train a new model with provided data"""
    start_time = datetime.utcnow()
    
    if len(request.training_data) < 10:
        raise HTTPException(
            status_code=400, 
            detail="At least 10 training samples required"
        )
    
    # Extract features and labels
    X = []
    y = []
    for data_point in request.training_data:
        features = extract_features(
            data_point.text,
            data_point.question_type,
            0.8,  # Assume good OCR for training data
            data_point.expected_answer
        )
        X.append(features)
        y.append(data_point.label)
    
    X = np.array(X)
    y = np.array(y)
    
    # Encode labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Split data
    config = request.config or {}
    test_size = config.get('validation_split', 0.2)
    X_train, X_val, y_train, y_val = train_test_split(
        X_scaled, y_encoded, test_size=test_size, random_state=42
    )
    
    # Choose model type
    model_type = config.get('model_type', 'random_forest')
    
    if model_type == 'gradient_boosting':
        model = GradientBoostingClassifier(
            n_estimators=config.get('n_estimators', 100),
            learning_rate=config.get('learning_rate', 0.1),
            max_depth=config.get('max_depth', 5),
            random_state=42
        )
    elif model_type == 'neural_network':
        model = MLPClassifier(
            hidden_layer_sizes=config.get('hidden_layers', (64, 32)),
            learning_rate_init=config.get('learning_rate', 0.001),
            max_iter=config.get('epochs', 200),
            random_state=42
        )
    else:  # Default: random_forest
        model = RandomForestClassifier(
            n_estimators=config.get('n_estimators', 100),
            max_depth=config.get('max_depth', 10),
            random_state=42
        )
    
    # Train model
    model.fit(X_train, y_train)
    
    # Evaluate
    train_accuracy = accuracy_score(y_train, model.predict(X_train))
    val_accuracy = accuracy_score(y_val, model.predict(X_val))
    val_predictions = model.predict(X_val)
    conf_matrix = confusion_matrix(y_val, val_predictions).tolist()
    
    # Store model
    models[request.model_id] = {
        'model': model,
        'template_id': request.template_id,
        'accuracy': float(val_accuracy),
        'created_at': datetime.utcnow().isoformat(),
        'model_type': model_type
    }
    scalers[request.model_id] = scaler
    label_encoders[request.model_id] = label_encoder
    
    training_time = (datetime.utcnow() - start_time).total_seconds()
    
    return TrainingResponse(
        model_id=request.model_id,
        accuracy=float(train_accuracy),
        validation_accuracy=float(val_accuracy),
        confusion_matrix=conf_matrix,
        training_time_seconds=round(training_time, 2)
    )


@app.delete("/models/{model_id}")
async def delete_model(model_id: str):
    """Delete a model"""
    if model_id in models:
        del models[model_id]
        if model_id in scalers:
            del scalers[model_id]
        if model_id in label_encoders:
            del label_encoders[model_id]
        return {"message": f"Model {model_id} deleted"}
    raise HTTPException(status_code=404, detail="Model not found")


@app.post("/models/{model_id}/save")
async def save_model(model_id: str, path: str = "./models"):
    """Save model to disk"""
    if model_id not in models:
        raise HTTPException(status_code=404, detail="Model not found")
    
    os.makedirs(path, exist_ok=True)
    model_info = models[model_id]
    
    joblib.dump(model_info['model'], f"{path}/{model_id}_model.joblib")
    if model_id in scalers:
        joblib.dump(scalers[model_id], f"{path}/{model_id}_scaler.joblib")
    if model_id in label_encoders:
        joblib.dump(label_encoders[model_id], f"{path}/{model_id}_encoder.joblib")
    
    return {"message": f"Model {model_id} saved to {path}"}


@app.post("/models/{model_id}/load")
async def load_model(model_id: str, path: str = "./models"):
    """Load model from disk"""
    model_path = f"{path}/{model_id}_model.joblib"
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail="Model file not found")
    
    model = joblib.load(model_path)
    scaler_path = f"{path}/{model_id}_scaler.joblib"
    encoder_path = f"{path}/{model_id}_encoder.joblib"
    
    models[model_id] = {
        'model': model,
        'template_id': 'loaded',
        'accuracy': 0.0,
        'created_at': datetime.utcnow().isoformat(),
        'model_type': type(model).__name__
    }
    
    if os.path.exists(scaler_path):
        scalers[model_id] = joblib.load(scaler_path)
    if os.path.exists(encoder_path):
        label_encoders[model_id] = joblib.load(encoder_path)
    
    return {"message": f"Model {model_id} loaded from {path}"}


async def create_default_model(model_id: str) -> Dict[str, Any]:
    """Create a default random forest model"""
    # Create a simple pre-trained model with synthetic data
    np.random.seed(42)
    n_samples = 100
    n_features = 20
    
    X = np.random.randn(n_samples, n_features)
    y = np.random.choice(['CORRECT', 'PARTIAL', 'INCORRECT', 'SKIPPED'], n_samples)
    
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    model = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)
    model.fit(X_scaled, y_encoded)
    
    models[model_id] = {
        'model': model,
        'template_id': 'default',
        'accuracy': 0.0,
        'created_at': datetime.utcnow().isoformat(),
        'model_type': 'RandomForestClassifier'
    }
    scalers[model_id] = scaler
    label_encoders[model_id] = label_encoder
    
    return models[model_id]


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("ML_SERVICE_PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
