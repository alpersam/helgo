"""
Offline embedding pipeline for Zurich places using a small Qwen-based embedding model.

Usage (example):
  python scripts/embed_places_qwen.py --input src/data/places_zurich.json --output src/data/places_zurich.json

Notes:
- This script expects a local HF cache with the model already downloaded.
- It updates each place with:
  - aiDescription: string (synthetic description built from fields)
  - embedding: list[float]
"""

import argparse
import json
from pathlib import Path
from typing import Dict, List

import torch
from tqdm import tqdm
from transformers import AutoModel, AutoTokenizer


MODEL_ID = "HIT-TMG/KaLM-embedding-multilingual-mini-instruct-v1"


def build_description(place: Dict) -> str:
    name = place.get("name", "")
    category = place.get("category", "")
    tags = ", ".join(place.get("tags", []))
    desc = place.get("aiDescription") or place.get("description", "")
    parts = [name, category, tags, desc]
    return " | ".join([part for part in parts if part])


def embed_text(tokenizer, model, text: str, device: str) -> List[float]:
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512).to(device)
    with torch.no_grad():
        outputs = model(**inputs)
    embeddings = outputs.last_hidden_state.mean(dim=1).squeeze(0)
    embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=0)
    return embeddings.cpu().tolist()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    input_path = Path(args.input)
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    places = payload["places"]

    device = "cuda" if torch.cuda.is_available() else "cpu"
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    model = AutoModel.from_pretrained(MODEL_ID).to(device)

    for place in tqdm(places, desc="Embedding places", unit="place"):
        ai_description = build_description(place)
        embedding = embed_text(tokenizer, model, ai_description, device)
        place["aiDescription"] = ai_description
        place["embedding"] = embedding

    output_path = Path(args.output)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
