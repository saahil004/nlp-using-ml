import joblib
from app.services.text_cleaning import clean_text

model = joblib.load('app/ml_artifacts/model.pkl')
tfidf = joblib.load('app/ml_artifacts/tfidf.pkl')
emotions = joblib.load('app/ml_artifacts/emotions.pkl')

def predict_emotion(sentence: str) -> dict:
    cleaned = clean_text(sentence)
    vec = tfidf.transform([cleaned])
    pred = model.predict(vec)[0]
    proba = model.predict_proba(vec)[0]
    return {
        "emotion": emotions[pred],
        "confidence": float(max(proba))
    }