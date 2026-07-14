from pydantic import BaseModel

class SentenceRequest(BaseModel):
    sentence: str

class PredictionResponse(BaseModel):
    emotion: str
    confidence: float