# Python ML Service

A Python-based machine learning microservice for automated grading, providing real ML inference using scikit-learn, with optional TensorFlow/PyTorch support.

## Features

- **Multiple ML Models**: Support for Random Forest, Gradient Boosting, and Neural Network classifiers
- **Real-time Inference**: Fast prediction API with batch processing support
- **Model Training**: Train custom models with your own annotated data
- **Model Persistence**: Save and load trained models to/from disk
- **Health Monitoring**: Health check endpoint for service monitoring

## Quick Start

### Local Development

1. Create virtual environment:

```bash
cd ml-service
python -m venv venv
venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # Linux/Mac
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Run the service:

```bash
uvicorn main:app --reload --port 8001
```

### Docker

```bash
docker build -t academia-ml-service .
docker run -p 8001:8001 academia-ml-service
```

## API Endpoints

### Health Check

```
GET /health
```

### List Models

```
GET /models
```

### Single Prediction

```
POST /predict
{
  "model_id": "model-123",
  "region_id": "region-456",
  "text": "Student answer here",
  "ocr_data": {"confidence": 0.9, "text": "..."},
  "question_type": "SHORT_ANSWER",
  "expected_answer": "Expected answer",
  "max_points": 10.0
}
```

### Batch Prediction

```
POST /predict/batch
{
  "model_id": "model-123",
  "predictions": [...]
}
```

### Train Model

```
POST /train
{
  "model_id": "new-model-id",
  "template_id": "template-123",
  "training_data": [
    {
      "text": "Answer text",
      "question_type": "MCQ",
      "expected_answer": "A",
      "label": "CORRECT",
      "score": 10.0
    }
  ],
  "config": {
    "model_type": "random_forest",
    "n_estimators": 100,
    "validation_split": 0.2
  }
}
```

### Save Model

```
POST /models/{model_id}/save?path=./models
```

### Load Model

```
POST /models/{model_id}/load?path=./models
```

### Delete Model

```
DELETE /models/{model_id}
```

## Configuration

Environment variables:

- `ML_SERVICE_PORT`: Service port (default: 8001)
- `MODEL_STORAGE_PATH`: Path for model persistence (default: ./models)
- `LOG_LEVEL`: Logging level (default: INFO)

## Integration with Backend

Enable Python ML service in backend by setting environment variables:

```bash
USE_PYTHON_ML_SERVICE=true
PYTHON_ML_SERVICE_URL=http://localhost:8001
```

The backend will automatically:

1. Check if Python service is available
2. Use Python service for predictions when available
3. Fall back to TensorFlow.js if Python service fails
4. Fall back to rule-based predictions as last resort

## Model Types

### Random Forest (default)

- Best for: General purpose, robust to overfitting
- Config: `n_estimators`, `max_depth`

### Gradient Boosting

- Best for: Higher accuracy, larger datasets
- Config: `n_estimators`, `learning_rate`, `max_depth`

### Neural Network (MLP)

- Best for: Complex patterns, large datasets
- Config: `hidden_layers`, `learning_rate`, `epochs`

## Feature Extraction

The service automatically extracts 20 features from each answer:

- Text length, word count, average word length
- Character type ratios (alpha, digit, special, uppercase)
- OCR confidence score
- Similarity to expected answer (Jaccard index)
- MCQ/True-False pattern detection
- Completeness indicators (empty, very short, has content)
- Question type one-hot encoding (6 types)

## Production Deployment

For production, consider:

1. Running behind a reverse proxy (nginx)
2. Using gunicorn with multiple workers
3. Implementing model versioning
4. Setting up monitoring and alerting
5. Using Redis for distributed model caching

Example production command:

```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001
```
