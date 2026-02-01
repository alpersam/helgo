"""
Generate embeddings for Zurich places using OpenAI Batch API.

Flow:
1) Build a JSONL batch input file (one request per place).
2) Upload as a file with purpose=batch.
3) Create a batch and poll until completion.
4) Download the output file and merge embeddings into the dataset.

Usage:
  python scripts/embed_places_openai_batch.py build \
    --input src/data/places_zurich.json \
    --jsonl scripts/batch_embeddings.jsonl

  python scripts/embed_places_openai_batch.py submit \
    --jsonl scripts/batch_embeddings.jsonl

  python scripts/embed_places_openai_batch.py poll --batch-id <batch_id>

  python scripts/embed_places_openai_batch.py download \
    --file-id <output_file_id> \
    --out scripts/batch_embeddings_results.jsonl

  python scripts/embed_places_openai_batch.py merge \
    --input src/data/places_zurich.json \
    --output src/data/places_zurich.json \
    --results scripts/batch_embeddings_results.jsonl

Requires:
  - OPENAI_API_KEY in environment
"""

import argparse
import json
import os
import time
from pathlib import Path
from typing import Dict, Optional

import requests


API_BASE = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com")
API_KEY = os.environ.get("OPENAI_API_KEY", "")

MODEL_ID = "text-embedding-3-small"


def build_text(place: Dict) -> str:
    name = place.get("name", "")
    category = place.get("category", "")
    tags = ", ".join(place.get("tags", []))
    desc = place.get("aiDescription") or place.get("description", "")
    parts = [name, category, tags, desc]
    return " | ".join([part for part in parts if part])


def require_key() -> None:
    if not API_KEY:
        raise SystemExit("Missing OPENAI_API_KEY in environment.")


def post_json(path: str, payload: Dict) -> Dict:
    require_key()
    url = f"{API_BASE}{path}"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    response = requests.post(url, headers=headers, json=payload, timeout=60)
    response.raise_for_status()
    return response.json()


def get_json(path: str) -> Dict:
    require_key()
    url = f"{API_BASE}{path}"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    response = requests.get(url, headers=headers, timeout=60)
    response.raise_for_status()
    return response.json()


def upload_file(jsonl_path: Path) -> str:
    require_key()
    url = f"{API_BASE}/v1/files"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    with jsonl_path.open("rb") as handle:
        files = {"file": (jsonl_path.name, handle, "application/jsonl")}
        data = {"purpose": "batch"}
        response = requests.post(url, headers=headers, files=files, data=data, timeout=120)
    response.raise_for_status()
    return response.json()["id"]


def download_file(file_id: str, out_path: Path) -> None:
    require_key()
    url = f"{API_BASE}/v1/files/{file_id}/content"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    with requests.get(url, headers=headers, stream=True, timeout=120) as response:
        response.raise_for_status()
        out_path.write_bytes(response.content)


def build_jsonl(input_path: Path, jsonl_path: Path) -> None:
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    places = payload["places"]
    lines = []
    for place in places:
        custom_id = place["id"]
        body = {
            "model": MODEL_ID,
            "input": build_text(place),
        }
        lines.append({
            "custom_id": custom_id,
            "method": "POST",
            "url": "/v1/embeddings",
            "body": body,
        })

    jsonl_path.write_text("\n".join(json.dumps(line) for line in lines), encoding="utf-8")


def submit_batch(jsonl_path: Path) -> str:
    file_id = upload_file(jsonl_path)
    batch = post_json("/v1/batches", {
        "input_file_id": file_id,
        "endpoint": "/v1/embeddings",
        "completion_window": "24h",
    })
    return batch["id"]


def poll_batch(batch_id: str, interval_sec: int = 10) -> Dict:
    while True:
        batch = get_json(f"/v1/batches/{batch_id}")
        status = batch.get("status")
        print(f"status={status}")
        if status in ("completed", "failed", "expired", "canceled"):
            return batch
        time.sleep(interval_sec)


def extract_embedding_from_response(body: Dict) -> Optional[list]:
    if "data" in body and body["data"]:
        return body["data"][0].get("embedding")
    return None


def merge_results(input_path: Path, output_path: Path, results_path: Path) -> None:
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    places = payload["places"]
    place_map = {place["id"]: place for place in places}

    for line in results_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        record = json.loads(line)
        custom_id = record.get("custom_id")
        body = None
        if "response" in record and isinstance(record["response"], dict):
            body = record["response"].get("body")
        if body is None and "body" in record:
            body = record["body"]
        if not custom_id or not body:
            continue
        embedding = extract_embedding_from_response(body)
        if embedding and custom_id in place_map:
            place_map[custom_id]["embedding"] = embedding

    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)

    build_cmd = sub.add_parser("build")
    build_cmd.add_argument("--input", required=True)
    build_cmd.add_argument("--jsonl", required=True)

    submit_cmd = sub.add_parser("submit")
    submit_cmd.add_argument("--jsonl", required=True)

    poll_cmd = sub.add_parser("poll")
    poll_cmd.add_argument("--batch-id", required=True)

    merge_cmd = sub.add_parser("merge")
    merge_cmd.add_argument("--input", required=True)
    merge_cmd.add_argument("--output", required=True)
    merge_cmd.add_argument("--results", required=True)

    download_cmd = sub.add_parser("download")
    download_cmd.add_argument("--file-id", required=True)
    download_cmd.add_argument("--out", required=True)

    args = parser.parse_args()

    if args.cmd == "build":
        build_jsonl(Path(args.input), Path(args.jsonl))
        return
    if args.cmd == "submit":
        batch_id = submit_batch(Path(args.jsonl))
        print(batch_id)
        return
    if args.cmd == "poll":
        result = poll_batch(args.batch_id)
        print(json.dumps(result, indent=2))
        return
    if args.cmd == "download":
        download_file(args.file_id, Path(args.out))
        return
    if args.cmd == "merge":
        merge_results(Path(args.input), Path(args.output), Path(args.results))
        return


if __name__ == "__main__":
    main()
