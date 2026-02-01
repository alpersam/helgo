"""
Generate AI descriptions for Zurich places using a local Qwen2.5-0.5B-Instruct model.

Usage:
  python scripts/generate_descriptions.py --input src/data/places_zurich.json --output src/data/places_zurich.json
"""

import argparse
import json
from pathlib import Path
from typing import Dict

import torch
from tqdm import tqdm
from transformers import AutoModelForCausalLM, AutoTokenizer


MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"


def build_prompt(place: Dict) -> str:
    name = place.get("name", "")
    category = place.get("category", "")
    tags = ", ".join(place.get("tags", []))
    desc = place.get("description", "")
    return (
        "Write a compact, vivid, single-sentence description for a Zurich place.\n"
        f"Name: {name}\n"
        f"Category: {category}\n"
        f"Tags: {tags}\n"
        f"Notes: {desc}\n"
        "Tone: helpful, travel-guide style."
    )


def generate_description(tokenizer, model, prompt: str, device: str) -> str:
    inputs = tokenizer(prompt, return_tensors="pt").to(device)
    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=60,
            temperature=0.4,
            do_sample=True,
        )
    text = tokenizer.decode(output[0], skip_special_tokens=True)
    return text.split("\n")[-1].strip()


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
    model = AutoModelForCausalLM.from_pretrained(MODEL_ID).to(device)

    for place in tqdm(places, desc="Generating descriptions", unit="place"):
        prompt = build_prompt(place)
        place["aiDescription"] = generate_description(tokenizer, model, prompt, device)

    output_path = Path(args.output)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
