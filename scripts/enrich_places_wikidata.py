import argparse
import json
import math
import time
from pathlib import Path
from typing import Dict, Optional, Tuple
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError


USER_AGENT = "helgo-wikidata-enrich/1.0 (contact: local-script)"
WIKIDATA_API = "https://www.wikidata.org/w/api.php"
WIKIMEDIA_API = "https://commons.wikimedia.org/w/api.php"


def http_get(url: str, params: Dict[str, str], retries: int = 3) -> dict:
    query = urlencode(params)
    req = Request(f"{url}?{query}", headers={"User-Agent": USER_AGENT})
    for attempt in range(retries):
        try:
            with urlopen(req, timeout=60) as resp:
                return json.loads(resp.read())
        except HTTPError as exc:
            if exc.code == 429 and attempt < retries - 1:
                time.sleep(1.5 * (attempt + 1))
                continue
            raise


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def search_wikidata(name: str) -> list[dict]:
    return http_get(
        WIKIDATA_API,
        {
            "action": "wbsearchentities",
            "search": f"{name} Zurich",
            "language": "en",
            "format": "json",
            "limit": "5",
        },
    ).get("search", [])


def get_entity(entity_id: str) -> dict:
    data = http_get(
        WIKIDATA_API,
        {
            "action": "wbgetentities",
            "ids": entity_id,
            "props": "claims",
            "format": "json",
        },
    )
    return data.get("entities", {}).get(entity_id, {})


def get_claim_value(claims: dict, pid: str) -> Optional[str]:
    entries = claims.get(pid)
    if not entries:
        return None
    mainsnak = entries[0].get("mainsnak", {})
    datavalue = mainsnak.get("datavalue", {})
    value = datavalue.get("value")
    if isinstance(value, str):
        return value
    return None


def get_coords(claims: dict) -> Optional[Tuple[float, float]]:
    entries = claims.get("P625")
    if not entries:
        return None
    mainsnak = entries[0].get("mainsnak", {})
    datavalue = mainsnak.get("datavalue", {})
    value = datavalue.get("value")
    if not isinstance(value, dict):
        return None
    return value.get("latitude"), value.get("longitude")


def get_image_url(file_name: str) -> Optional[str]:
    title = f"File:{file_name}"
    data = http_get(
        WIKIMEDIA_API,
        {
            "action": "query",
            "titles": title,
            "prop": "imageinfo",
            "iiprop": "url",
            "format": "json",
        },
    )
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        info = page.get("imageinfo")
        if info:
            return info[0].get("url")
    return None


def best_entity(place: dict, candidates: list[dict], max_km: float) -> Optional[dict]:
    best = None
    best_dist = None
    for candidate in candidates:
        entity = get_entity(candidate["id"])
        claims = entity.get("claims", {})
        coords = get_coords(claims)
        if not coords or coords[0] is None or coords[1] is None:
            continue
        dist = haversine_km(place["lat"], place["lon"], coords[0], coords[1])
        if dist > max_km:
            continue
        if best_dist is None or dist < best_dist:
            best = entity
            best_dist = dist
    return best


def enrich_place(place: dict, max_km: float, sleep_s: float) -> bool:
    needs = any(
        not place.get(field)
        for field in ("photoUrl", "address", "website", "phone")
    )
    if not needs:
        return False

    candidates = search_wikidata(place["name"])
    if not candidates:
        return False
    time.sleep(sleep_s)

    entity = best_entity(place, candidates, max_km)
    if not entity:
        return False

    claims = entity.get("claims", {})
    updated = False

    if not place.get("website"):
        website = get_claim_value(claims, "P856")
        if website:
            place["website"] = website
            updated = True

    if not place.get("phone"):
        phone = get_claim_value(claims, "P1329")
        if phone:
            place["phone"] = phone
            updated = True

    if not place.get("address"):
        address = get_claim_value(claims, "P969") or get_claim_value(claims, "P6375")
        if address:
            place["address"] = address
            updated = True

    if not place.get("photoUrl"):
        image = get_claim_value(claims, "P18")
        if image:
            time.sleep(sleep_s)
            image_url = get_image_url(image)
            if image_url:
                place["photoUrl"] = image_url
                updated = True

    return updated


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich places with Wikidata/Wikimedia.")
    parser.add_argument("--input", default="src/data/places_zurich.json")
    parser.add_argument("--output", default="src/data/places_zurich.json")
    parser.add_argument("--max-km", type=float, default=2.0)
    parser.add_argument("--sleep", type=float, default=0.5)
    parser.add_argument("--limit", type=int, default=200)
    args = parser.parse_args()

    input_path = Path(args.input)
    data = json.loads(input_path.read_text(encoding="utf-8"))
    places = data.get("places", [])

    updated = 0
    scanned = 0
    for place in places:
        if scanned >= args.limit:
            break
        if enrich_place(place, args.max_km, args.sleep):
            updated += 1
        scanned += 1

    output_path = Path(args.output)
    output_path.write_text(
        json.dumps({"places": places}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Enriched {updated} places (scanned {scanned}) -> {output_path}")


if __name__ == "__main__":
    main()
