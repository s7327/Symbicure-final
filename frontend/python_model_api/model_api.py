import os
import re
import pickle
import torch
import torch.nn as nn
from flask import Flask, request, jsonify # Added Flask imports
from flask_cors import CORS             # Added CORS import
from transformers import AutoTokenizer, AutoModel
import numpy as np                      # Good practice import

# --- Configuration (Updated with your filenames) ---
# Assuming model_api.py is in the 'python_model_api' directory
MODEL_ARTIFACTS_DIR = os.path.dirname(os.path.abspath(__file__)) # Gets the directory of the current script

MODEL_PATH = os.path.join(MODEL_ARTIFACTS_DIR, "best_model200112.pt")
LABEL_ENCODER_PATH = os.path.join(MODEL_ARTIFACTS_DIR, "label_encoder112.pkl")
KW_TO_IDX_PATH = os.path.join(MODEL_ARTIFACTS_DIR, "kw_to_idx112.pkl")
# We don't need the CSV or tokenized data path for the API itself

MAX_LENGTH = 64  # Should match the training configuration
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print(f"API Script Directory: {MODEL_ARTIFACTS_DIR}")
print(f"Using device: {DEVICE}")
print(f"Model path: {MODEL_PATH}")
print(f"Label Encoder path: {LABEL_ENCODER_PATH}")
print(f"Keyword Map path: {KW_TO_IDX_PATH}")

# --- Helper Functions (Copied from previous script/training) ---
def clean_medical_text(text):
    text = text.lower()
    text = re.sub(r'[^a-zA-Z0-9\-\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_symptom_keywords(text):
    # Use the same keyword list as your training script
    symptom_keywords = [
        'pain', 'ache', 'fever', 'swelling', 'nausea', 'vomiting', 'headache',
        'cough', 'dizziness', 'fatigue', 'anxiety', 'depression', 'shortness',
        'breath', 'insomnia', 'palpitations', 'chest', 'nervousness'
    ]
    present_keywords = [keyword for keyword in symptom_keywords if keyword in text.lower()]
    return present_keywords # Return list

# --- Model Definition (Should EXACTLY match the trained model's class) ---
# Using OptimizedPubMedBERTClassifier as per your training script
# --- Model Definition (CORRECTED TO MATCH CHECKPOINT EXPECTATIONS) ---
class OptimizedPubMedBERTClassifier(nn.Module):
    def __init__(self, num_labels, num_keywords):
        super(OptimizedPubMedBERTClassifier, self).__init__()
        # Use the same base model as training
        self.bert = AutoModel.from_pretrained("microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext")

        # --- Corrected Layer Dimensions ---
        bert_hidden_size = self.bert.config.hidden_size # Should be 768
        keyword_output_dim = 32  # <<< CORRECTED: Checkpoint expects 32
        fc_output_dim = 128      # <<< CORRECTED: Checkpoint expects 128
        fc_input_dim = bert_hidden_size + keyword_output_dim # 768 + 32 = 800

        # Layer dimensions MUST match the *saved* model state dict exactly
        self.keyword_fc = nn.Linear(num_keywords, keyword_output_dim) # Use 32
        self.fc = nn.Linear(fc_input_dim, fc_output_dim) # Use 800 -> 128
        self.dropout = nn.Dropout(0.2) # Assuming 0.2 was used in training
        self.classifier = nn.Linear(fc_output_dim, num_labels) # Input is 128
        # --- End of Corrections ---

        print(f"📊 Model definition loaded (Corrected for Checkpoint).")

    def forward(self, input_ids, attention_mask, keyword_features):
        # --- Forward pass using corrected layer sizes ---
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled_output = outputs.pooler_output # [batch, 768]

        keyword_output = torch.relu(self.keyword_fc(keyword_features)) # [batch, 32]

        combined = torch.cat((pooled_output, keyword_output), dim=1) # [batch, 800]

        combined = torch.relu(self.fc(combined)) # [batch, 128]

        dropped = self.dropout(combined) # Dropout automatically skipped in model.eval()
        logits = self.classifier(dropped) # [batch, num_labels]
        return logits

# --- Load Global Resources (Run once when the script starts) ---
try:
    print("Loading tokenizer...")
    # This specific tokenizer likely doesn't strictly require sentencepiece
    # If you get an error here related to sentencepiece, you *will* need to install it
    tokenizer = AutoTokenizer.from_pretrained("microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext")
    print("Tokenizer loaded.")

    print("Loading label encoder...")
    with open(LABEL_ENCODER_PATH, "rb") as f:
        label_encoder = pickle.load(f)
    num_labels = len(label_encoder.classes_)
    print(f"Label encoder loaded ({num_labels} classes).")

    print("Loading keyword mapping...")
    with open(KW_TO_IDX_PATH, "rb") as f:
        kw_to_idx = pickle.load(f)
    num_keywords = len(kw_to_idx)
    print(f"Keyword mapping loaded ({num_keywords} keywords).")

    print("Instantiating model structure...")
    # Instantiate the model with the loaded number of labels and keywords
    model = OptimizedPubMedBERTClassifier(num_labels=num_labels, num_keywords=num_keywords)
    print("Model structure instantiated.")

    print("Loading trained model weights...")
    # Load state dict from file into a dictionary first
    state_dict = torch.load(MODEL_PATH, map_location=DEVICE)
    print(f"Loaded state_dict from file. Contains {len(state_dict)} keys.")

    # --- Manual Workaround for Embedding Mismatch ---
    problematic_key = "bert.embeddings.word_embeddings.weight"
    if problematic_key in state_dict:
        print(f"Manually removing problematic key '{problematic_key}' from loaded state_dict due to size mismatch.")
        del state_dict[problematic_key]
    else:
         # This shouldn't happen based on previous errors, but good to check
        print(f"Warning: Expected problematic key '{problematic_key}' not found in state_dict.")
    # --- End of Workaround ---

    # Now load the modified state_dict with strict=False
    # strict=False is still needed to handle unexpected/missing keys like transformer vs encoder naming
    print("Attempting to load modified state_dict with strict=False...")
    model.load_state_dict(state_dict, strict=False)
    print("Model weights loaded successfully using modified state_dict and strict=False.")

    # The rest remains the same
    model.to(DEVICE)  # Move the model to the appropriate device (GPU or CPU)
    model.eval()      # Set the model to evaluation mode (important!)
    print("Model moved to device and set to evaluation mode.")

except FileNotFoundError as e:
    print(f"ERROR: Could not find required file: {e}. Ensure paths are correct and artifacts exist.")
    exit()
except Exception as e:
    print(f"ERROR during initialization: {e}")
    import traceback
    traceback.print_exc() # Print full traceback for debugging
    exit()


# --- Flask App Initialization ---
app = Flask(__name__)
CORS(app) # Enable Cross-Origin Resource Sharing

# --- Prediction Endpoint ---
@app.route('/predict', methods=['POST'])
def predict_route(): # Renamed function to avoid conflict with any potential 'predict' variable
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    print(f"\nReceived request data: {data}") # Log received data

    # Input Validation
    if 'symptoms' not in data:
        return jsonify({"error": "Missing 'symptoms' key in JSON data"}), 400

    symptoms_list = data['symptoms']
    # Ensure it's a list, handle potential string input from frontend just in case
    if isinstance(symptoms_list, str):
        symptoms_list = [s.strip() for s in symptoms_list.split(',') if s.strip()]
    elif not isinstance(symptoms_list, list):
        return jsonify({"error": "'symptoms' must be a list of strings (e.g., ['fever', 'cough']) or a comma-separated string"}), 400

    if not symptoms_list:
         return jsonify({"error": "Symptom list/string cannot be empty"}), 400

    # Join the list into a single string for consistent processing
    symptoms_text = ", ".join(symptoms_list)
    print(f"Processing symptoms text: '{symptoms_text}'")

    try:
        # 1. Preprocessing Input Text
        cleaned_text = clean_medical_text(symptoms_text)
        keywords_found = extract_symptom_keywords(cleaned_text)
        print(f"Cleaned text: '{cleaned_text}'")
        print(f"Keywords found: {keywords_found}")

        # 2. Tokenization
        encoding = tokenizer(
            cleaned_text,
            padding="max_length",
            truncation=True,
            max_length=MAX_LENGTH,
            return_tensors="pt" # Return PyTorch tensors
        )
        input_ids = encoding["input_ids"].to(DEVICE)
        attention_mask = encoding["attention_mask"].to(DEVICE)

        # 3. Keyword Feature Vector Creation
        # Create a tensor of zeros with shape (1, num_keywords) for the single input sample
        keyword_features = torch.zeros(1, num_keywords, dtype=torch.float).to(DEVICE)
        for keyword in keywords_found:
            if keyword in kw_to_idx:
                # Set the corresponding index to 1.0
                keyword_features[0, kw_to_idx[keyword]] = 1.0
            else:
                 print(f"  Info: Keyword '{keyword}' extracted but not in training keyword map.")


        # 4. Model Prediction
        with torch.no_grad(): # Ensure gradients are not calculated during inference
            outputs = model(input_ids=input_ids, attention_mask=attention_mask, keyword_features=keyword_features)
            # Apply softmax to get probabilities
            probabilities = torch.softmax(outputs, dim=1)
            # Get the highest probability and the corresponding index
            confidence, predicted_idx = torch.max(probabilities, dim=1)

            predicted_label_index = predicted_idx.item() # Get the index as a Python int
            prediction_confidence = confidence.item()    # Get the confidence as a Python float

        # 5. Decode Prediction Index to Disease Name
        predicted_disease = label_encoder.inverse_transform([predicted_label_index])[0]

        print(f"Prediction successful: {predicted_disease} (Confidence: {prediction_confidence:.4f})")

        # 6. Return Result
        return jsonify({
            "predicted_disease": predicted_disease,
            "confidence": prediction_confidence
        })

    except Exception as e:
        print(f"ERROR during prediction processing: {e}")
        import traceback
        traceback.print_exc() # Print full traceback for debugging server-side
        # Return a generic error to the client
        return jsonify({"error": f"An internal error occurred during prediction."}), 500

# --- Main Execution Block (Runs the Flask server) ---
if __name__ == '__main__':
    # NOTE: The data preprocessing part from the original script is REMOVED here.
    # This block now only starts the API server.
    print("Starting Flask server...")
    # Use host='0.0.0.0' to make the server accessible on your network
    # debug=True reloads server on code changes and provides better error pages (good for dev)
    # Set debug=False for production deployment
    app.run(host='0.0.0.0', port=5000, debug=True)