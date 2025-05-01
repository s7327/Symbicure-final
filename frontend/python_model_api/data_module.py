import os
import re
import pickle
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset
from sklearn.preprocessing import LabelEncoder
from transformers import AutoTokenizer, AutoModel
from tqdm import tqdm
# ─── Configuration ─────────────────────────────────────────────────────────────
DATASET_PATH = r"frontend\python_model_api\reduced200final.csv"
OUTPUT_DIR   = r"frontend\python_model_api"
TOKENIZED_PKL = os.path.join(OUTPUT_DIR, "tokenized_data112.pkl")
LABEL_ENCODER_PKL = os.path.join(OUTPUT_DIR, "label_encoder112.pkl")
MAX_LENGTH   = 64
DEVICE       = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ─── Tokenizer ─────────────────────────────────────────────────────────────────
tokenizer = AutoTokenizer.from_pretrained(
    "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext"
)

# ─── Text Processing ──────────────────────────────────────────────────────────
def clean_medical_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^a-zA-Z0-9\-\s]', '', text)
    return re.sub(r'\s+', ' ', text).strip()

def extract_symptom_keywords(text: str) -> list[str]:
    keywords = [
        'pain','ache','fever','swelling','nausea','vomiting','headache',
        'cough','dizziness','fatigue','anxiety','depression','shortness',
        'breath','insomnia','palpitations','chest','nervousness'
    ]
    return [kw for kw in keywords if kw in text]

def batch_tokenize(texts: list[str], batch_size: int = 500):
    tokenized = []
    for i in tqdm(range(0, len(texts), batch_size), desc="Tokenizing"):
        out = tokenizer(
            texts[i:i+batch_size],
            padding="max_length",
            truncation=True,
            max_length=MAX_LENGTH,
            return_tensors="pt"
        )
        tokenized.extend(zip(
            out["input_ids"].tolist(),
            out["attention_mask"].tolist()
        ))
    return tokenized

# ─── Data Loading ─────────────────────────────────────────────────────────────
def load_and_preprocess_data():
    df = pd.read_csv(DATASET_PATH)

    # Clean and extract keywords
    df['symptoms_text_cleaned'] = df['symptoms_text'].apply(clean_medical_text)
    df['symptom_keywords'] = df['symptoms_text_cleaned'].apply(
        lambda t: ','.join(extract_symptom_keywords(t))
    )

    # Tokenize and optionally load/save from/to .pkl
    if os.path.exists(TOKENIZED_PKL):
        with open(TOKENIZED_PKL, "rb") as f:
            df["tokenized"] = pickle.load(f)
    else:
        df["tokenized"] = batch_tokenize(df["symptoms_text_cleaned"].tolist())
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        with open(TOKENIZED_PKL, "wb") as f:
            pickle.dump(df["tokenized"].tolist(), f)

    # Label encode the target variable
    le = LabelEncoder()
    df["label"] = le.fit_transform(df["disease"])
    with open(LABEL_ENCODER_PKL, "wb") as f:
        pickle.dump(le, f)

    # Create dataset to extract keyword mappings
    dataset = SymptomDataset(df)
    
    # Save keyword-to-index mapping
    KW_TO_IDX_PATH = os.path.join(OUTPUT_DIR, "kw_to_idx.pkl")  # Add this line
    with open(KW_TO_IDX_PATH, "wb",encoding="utf-8") as f:
        pickle.dump(dataset.kw_to_idx, f)

        print(dataset)

    return df, le

# ─── Dataset ─────────────────────────────────────────────────────────────────
class SymptomDataset(Dataset):
    def __init__(self, df: pd.DataFrame):
        self.tokenized = df["tokenized"].tolist()
        self.labels    = df["label"].tolist()
        self.keywords  = [k.split(',') for k in df["symptom_keywords"]]
        all_k = {kw for kws in self.keywords for kw in kws if kw}
        self.kw_to_idx = {kw:i for i, kw in enumerate(sorted(all_k))}
        self.num_keywords = len(self.kw_to_idx)

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        input_ids, attention_mask = self.tokenized[idx]
        input_ids = torch.tensor(input_ids)
        attention_mask = torch.tensor(attention_mask)

        kw_feat = torch.zeros(self.num_keywords)
        for kw in self.keywords[idx]:
            if kw: kw_feat[self.kw_to_idx[kw]] = 1.0

        label = torch.tensor(self.labels[idx], dtype=torch.long)
        return {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "keyword_features": kw_feat,
            "label": label

        }
    
class SymptomInferenceDataset(Dataset):
    def __init__(self, df: pd.DataFrame, tokenizer, kw_to_idx: dict, max_length: int = 64):
        self.tokenizer = tokenizer
        self.texts = df["symptoms_text_cleaned"]
        self.keywords = [k.split(',') for k in df["symptom_keywords"]]
        self.kw_to_idx = kw_to_idx
        self.num_keywords = len(kw_to_idx)
        self.max_length = max_length

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        enc = self.tokenizer(
            self.texts.iloc[idx],
            padding="max_length",
            truncation=True,
            max_length=self.max_length,
            return_tensors="pt"
        )
        input_ids = enc["input_ids"].squeeze(0)
        attention_mask = enc["attention_mask"].squeeze(0)

        kw_feat = torch.zeros(self.num_keywords)
        for kw in self.keywords[idx]:
            if kw in self.kw_to_idx:
                kw_feat[self.kw_to_idx[kw]] = 1.0

        return {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "keyword_features": kw_feat
        }


# ─── Model ────────────────────────────────────────────────────────────────────


class PubMedBERTClassifier(nn.Module):
    def __init__(self, num_labels: int, num_keywords: int):
        super().__init__()
        # --- Base BERT Model ---
        # NOTE: The checkpoint expects a vocab size of 119547, but this model has ~30522.
        # Loading with strict=False will skip this layer, but it might affect performance
        # if the tokenizer vocabulary doesn't align with the checkpoint's vocabulary.
        # Ensure the tokenizer used NOW matches the one used when CREATING the checkpoint.
        self.bert = AutoModel.from_pretrained(
            "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext"
        )

        # --- Freezing Early Layers (Optional but keep consistent with training) ---
        # Assuming the checkpoint was trained with the first 4 layers frozen.
        # If not, comment this part out.
        num_layers_to_freeze = 4
        # Each BERT layer typically has multiple parameter groups (self-attention, output, intermediate, etc.)
        # A common approximation is 12-16 parameter groups per layer. Let's use 12 for simplicity.
        # Adjust if you know the exact structure or number used during training.
        parameters_per_layer_approx = 12
        freeze_limit = num_layers_to_freeze * parameters_per_layer_approx
        for i, p in enumerate(self.bert.parameters()):
             if i < freeze_limit:
                 p.requires_grad = False
             else:
                 # Ensure layers meant for fine-tuning *are* trainable if loading for inference
                 # (though it doesn't matter much if model.eval() is called later)
                 p.requires_grad = True

        # --- Keyword Feature Processing ---
        # Checkpoint expects output size 32
        keyword_output_dim = 32 # <<< CORRECTED from 48
        self.keyword_fc = nn.Linear(num_keywords, keyword_output_dim)

        # --- Combined Feature Projection ---
        # Checkpoint expects output size 128 and input size 768 + 32 = 800
        bert_hidden_size = self.bert.config.hidden_size  # Should be 768
        combined_input_dim = bert_hidden_size + keyword_output_dim # 768 + 32 = 800
        combined_output_dim = 128 # <<< CORRECTED from 192
        self.fc = nn.Linear(combined_input_dim, combined_output_dim)

        # --- Dropout (Keep consistent with training) ---
        self.dropout = nn.Dropout(0.2) # Assuming 0.2 was used in training

        # --- Final Classifier ---
        # Checkpoint expects input size 128
        classifier_input_dim = combined_output_dim # 128
        self.classifier = nn.Linear(classifier_input_dim, num_labels)

    def forward(self, input_ids, attention_mask, keyword_features):
        # BERT pooled output -> [batch, 768]
        bert_outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled_output = bert_outputs.pooler_output

        # Keyword branch -> [batch, 32]
        keyword_output = torch.relu(self.keyword_fc(keyword_features))

        # Concatenate features -> [batch, 800]
        combined_features = torch.cat([pooled_output, keyword_output], dim=1)

        # Project combined features -> [batch, 128]
        projected_features = torch.relu(self.fc(combined_features))
        projected_features = self.dropout(projected_features)

        # Final classification logits -> [batch, num_labels]
        logits = self.classifier(projected_features)
        return logits

# ─── Main Execution Block ─────────────────────────────────────────────────────
if __name__ == "__main__":
    # Run preprocessing pipeline
    print("Starting data preprocessing...")
    df, le = load_and_preprocess_data()
    
    print("\nSuccessfully created:")
    print(f"- {TOKENIZED_PKL}")
    print(f"- {LABEL_ENCODER_PKL}")
    print(f"- {os.path.join(OUTPUT_DIR, 'kw_to_idx.pkl')}")
    
    # Verify keyword mappings
    with open(os.path.join(OUTPUT_DIR, "kw_to_idx.pkl"), "rb") as f:
        kw_mappings = pickle.load(f)
    
    print("\nSample keyword mappings:")
    for i, (kw, idx) in enumerate(kw_mappings.items()):
        if i >= 5: break
        print(f"{kw}: {idx}")