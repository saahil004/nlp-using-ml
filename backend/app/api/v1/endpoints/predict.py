from fastapi import APIRouter
from app.schemas.prediction import SentenceRequest, PredictionResponse
from app.models.ml_model import predict_emotion

router = APIRouter()

@router.post("/predict", response_model=PredictionResponse)
def predict(req: SentenceRequest):
    return predict_emotion(req.sentence)