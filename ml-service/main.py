from fastapi import FastAPI
from pydantic import BaseModel
import nltk
from nltk.tokenize import word_tokenize
import string

# Download NLTK data (run once)
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

app = FastAPI()

# Simple keyword-based classifier
def classify_incident(text):
    # Tokenize and clean text
    tokens = word_tokenize(text.lower())
    tokens = [t for t in tokens if t not in string.punctuation]

    # Keyword rules
    if any(word in tokens for word in ['engine', 'motor']):
        return 'Engine Failure'
    if any(word in tokens for word in ['turbulence', 'turbulent']):
        return 'Turbulence'
    if any(word in tokens for word in ['human', 'pilot', 'crew']):
        return 'Human Error'
    if any(word in tokens for word in ['weather', 'storm', 'rain']):
        return 'Weather Issue'
    return 'Other'

class TextInput(BaseModel):
    text: str

@app.post("/classify")
async def classify_incident_endpoint(input: TextInput):
    incident_type = classify_incident(input.text)
    return {"incidentType": incident_type}