from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import torch.nn as nn
import pickle
import pandas as pd
import re
from data_module import PubMedBERTClassifier
from transformers import AutoTokenizer

import google.generativeai as genai

GEMINI_API_KEY="AIzaSyAaSpkiPU_6R9GXByu21NdzXsIWkRoD6W8"
genai.configure(api_key=GEMINI_API_KEY)

try:
    models = genai.list_models()  # Correct method to get available models
    print(models)
except Exception as e:
    print(f"Error fetching models: {e}")


def get_gemini_explanation(disease, symptoms):
    prompt = (
    f"The following is the output from my healthcare model: '{disease}'.\n"
    f"Write a single, empathetic, and informative paragraph that a healthcare assistant chatbot can directly send to a patient.\n"
    f"The paragraph should be clear, human-like, and helpful, explaining what '{disease}' means in layman terms.\n"
    f"Do not say things like 'waiting for input' or 'tell me more'. Instead, give a ready response that reassures the patient and encourages them to consult a doctor if needed.\n"
    f"Keep the tone kind and supportive."
)


    try:
        model = genai.GenerativeModel(model_name='models/gemini-2.5-flash-preview-04-17')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print("Gemini API error:", e)
        return "Sorry, no explanation could be retrieved at the moment."
    
    

# Inside the /predict endpoint (after pred_label and confidence)

# ─── Configuration ───────────────────────────────────────────────────
MODEL_PATH = r"frontend\python_model_api\best_model2200.pt"

# Inspect checkpoint shapes (for debugging)
import torch as _torch
_state = _torch.load(MODEL_PATH, map_location='cpu')
for k, v in _state.items():
    print(f"Checkpoint param {k} : {v.shape}")

LABEL_ENCODER_PATH = r"frontend\python_model_api\label_encoder.pkl"
KW_TO_IDX_PATH = r"frontend\python_model_api\kw_to_idx.pkl"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ─── App Initialization ─────────────────────────────────────────
app = Flask(__name__)
CORS(app)

# ─── Load Encoders and Mappings ────────────────────────────────────────
with open(LABEL_ENCODER_PATH, "rb") as f:
    label_encoder = pickle.load(f)
with open(KW_TO_IDX_PATH.strip(), "rb") as f:
    kw_to_idx = pickle.load(f)

# ─── Load Model Checkpoint and Build Model ───────────────────────────
state_dict = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=False)
model = PubMedBERTClassifier(num_labels=265, num_keywords=18)
model.load_state_dict(state_dict, strict=False)
model.to(DEVICE)
model.eval()

# ─── Helper Functions ────────────────────────────────────
def clean_text(text: str) -> str:
    text = re.sub(r'[^a-zA-Z0-9\-\s]', '', text.lower())
    return re.sub(r'\s+', ' ', text).strip()

def extract_keywords(text: str) -> list:
    keywords = [
        'pain', 'ache', 'fever', 'swelling', 'nausea', 'vomiting', 'headache',
        'cough', 'dizziness', 'fatigue', 'anxiety', 'depression', 'shortness',
        'breath', 'insomnia', 'palpitations', 'chest', 'nervousness',""
    ]
    return [kw for kw in keywords if kw in text]

# ─── Prediction Endpoint ────────────────────────────────────
# ─── Prediction Endpoint ────────────────────────────────────
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        symptoms = data.get('symptoms', [])

        print(f"Received symptoms input: {symptoms}")

        if not symptoms:
            return jsonify({"error": "'symptoms' field is required"}), 400

        full_text = " ".join(symptoms).lower()
        cleaned_text = clean_text(full_text)
        matched_keywords = extract_keywords(cleaned_text)

        print(f"Matched keywords: {matched_keywords}")

        if not matched_keywords:
            return jsonify({"error": "No matching keywords found"}), 404

        tokenizer = AutoTokenizer.from_pretrained(
            "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext"
        )

        keyword_features = torch.zeros(len(kw_to_idx))
        for kw in matched_keywords:
            if kw in kw_to_idx:
                keyword_features[kw_to_idx[kw]] = 1.0

        inputs = tokenizer(
            cleaned_text,
            padding="max_length",
            truncation=True,
            max_length=64,
            return_tensors="pt"
        )

        batch = {
            "input_ids": inputs["input_ids"].to(DEVICE),
            "attention_mask": inputs["attention_mask"].to(DEVICE),
            "keyword_features": keyword_features.unsqueeze(0).to(DEVICE)
        }

        with torch.no_grad():
            logits = model(
                input_ids=batch['input_ids'],
                attention_mask=batch['attention_mask'],
                keyword_features=batch['keyword_features']
            )
            pred_idx = torch.argmax(logits, dim=-1).item()
            pred_label = label_encoder.inverse_transform([pred_idx])[0]
            confidence = torch.softmax(logits, dim=-1)[0][pred_idx].item()

        # ✅ Get Gemini explanation only AFTER pred_label is defined
        gemini_explanation = get_gemini_explanation(pred_label, symptoms)

        print(f"Prediction result → Disease: {pred_label}, Confidence: {confidence}")
        print(f"Gemini explanation: {gemini_explanation}")

        return jsonify({
            "matched_keywords": matched_keywords,
            "predicted_disease": pred_label,
            "confidence": confidence,
            "explanation": gemini_explanation
        })

    except Exception as e:
        print("Error during prediction:", str(e))
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
