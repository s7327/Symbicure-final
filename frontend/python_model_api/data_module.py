from huggingface_hub import hf_hub_download
import os
import pickle
import pandas as pd
import torch
import re
from sklearn.preprocessing import LabelEncoder
from transformers import AutoTokenizer, AutoModel
from torch.utils.data import Dataset
from tqdm import tqdm
import torch.nn as nn

# ─── Hugging Face Config ──────────────────────────────────────────────────────
REPO_ID = "s7327/symbicure-rendery"  # Replace with your repo name
FILENAME_CSV = "reduced200final.csv"
FILENAME_TOKENIZED = "tokenized_data.pkl"
FILENAME_ENCODER = "label_encoder.pkl"
FILENAME_KW2IDX = "kw_to_idx.pkl"

MAX_LENGTH = 64
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ─── Tokenizer ─────────────────────────────────────────────────────────────────
tokenizer = AutoTokenizer.from_pretrained(
    "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext"
)

# ─── Text Processing ───────────────────────────────────────────────────────────
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

# ─── Tokenization ──────────────────────────────────────────────────────────────
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

# ─── Dataset ───────────────────────────────────────────────────────────────────
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

# ─── Data Loading from Hugging Face ────────────────────────────────────────────
def load_and_preprocess_data():
    # Download files from Hugging Face Hub
    csv_path = hf_hub_download(repo_id=REPO_ID, filename=FILENAME_CSV)
    tokenized_path = hf_hub_download(repo_id=REPO_ID, filename=FILENAME_TOKENIZED)
    encoder_path = hf_hub_download(repo_id=REPO_ID, filename=FILENAME_ENCODER)
    kw_to_idx_path = hf_hub_download(repo_id=REPO_ID, filename=FILENAME_KW2IDX)

    # Load CSV and preprocess
    df = pd.read_csv(csv_path)
    df['symptoms_text_cleaned'] = df['symptoms_text'].apply(clean_medical_text)
    df['symptom_keywords'] = df['symptoms_text_cleaned'].apply(
        lambda t: ','.join(extract_symptom_keywords(t))
    )

    # Load tokenized data
    with open(tokenized_path, "rb") as f:
        df["tokenized"] = pickle.load(f)

    # Load label encoder
    with open(encoder_path, "rb") as f:
        le = pickle.load(f)
        df["label"] = le.transform(df["disease"])

    # Create dataset to verify keyword mapping
    dataset = SymptomDataset(df)

    # Save keyword mapping
    with open(kw_to_idx_path, "rb") as f:
        kw_to_idx = pickle.load(f)

    print("Sample keyword mappings:")
    for i, (kw, idx) in enumerate(kw_to_idx.items()):
        if i >= 5: break
        print(f"{kw}: {idx}")

    return df, le, kw_to_idx



from transformers import AutoModel

class PubMedBERTClassifier(nn.Module):
    def __init__(self, num_labels: int, num_keywords: int):
        super().__init__()
        self.bert = AutoModel.from_pretrained(
            "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext"
        )
        # (optional) freeze early layers if you like
        for p in list(self.bert.parameters())[:4*12]:
            p.requires_grad = False

        # ✏️ keyword_fc: 18 inputs → 48 outputs
        self.keyword_fc = nn.Linear(num_keywords, 48)

        # ✏️ fc: (768 + 48) → 192
        hidden_size = self.bert.config.hidden_size  # 768
        self.fc = nn.Linear(hidden_size + 48, 192)

        self.dropout = nn.Dropout(0.2)

        # ✏️ classifier: 192 → num_labels (265)
        self.classifier = nn.Linear(192, num_labels)

    def forward(self, input_ids, attention_mask, keyword_features):
        # BERT pooled output is [batch, 768]
        pooled = self.bert(input_ids=input_ids, attention_mask=attention_mask).pooler_output

        # keyword branch -> [batch, 48]
        kw_out = torch.relu(self.keyword_fc(keyword_features))

        # concat -> [batch, 768+48=816]
        x = torch.cat([pooled, kw_out], dim=1)

        # project -> [batch, 192]
        x = torch.relu(self.fc(x))
        x = self.dropout(x)

        # final logits -> [batch, 265]
        return self.classifier(x)



# ─── Main Execution ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Loading from Hugging Face Hub...")
    df, le, kw_to_idx = load_and_preprocess_data()
