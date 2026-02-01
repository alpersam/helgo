import argparse
import json
import re
import time
from pathlib import Path
from typing import Optional, Tuple
from urllib.parse import urlencode
from urllib.request import Request, urlopen


DEFAULT_OUTPUT = Path("src/data/places_zurich.json")
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "helgo-osm-import/1.0 (contact: local-script)"

CATEGORY_QUERIES = {
    "restaurant": [
        'node["amenity"="restaurant"]',
        'way["amenity"="restaurant"]',
        'relation["amenity"="restaurant"]',
    ],
    "cafe": [
        'node["amenity"="cafe"]',
        'way["amenity"="cafe"]',
        'relation["amenity"="cafe"]',
    ],
    "bar": [
        'node["amenity"="bar"]',
        'way["amenity"="bar"]',
        'relation["amenity"="bar"]',
        'node["amenity"="pub"]',
        'way["amenity"="pub"]',
        'relation["amenity"="pub"]',
    ],
    "museum": [
        'node["tourism"="museum"]',
        'way["tourism"="museum"]',
        'relation["tourism"="museum"]',
    ],
    "market": [
        'node["amenity"="marketplace"]',
        'way["amenity"="marketplace"]',
        'relation["amenity"="marketplace"]',
    ],
    "park": [
        'node["leisure"="park"]',
        'way["leisure"="park"]',
        'relation["leisure"="park"]',
    ],
    "viewpoint": [
        'node["tourism"="viewpoint"]',
        'way["tourism"="viewpoint"]',
        'relation["tourism"="viewpoint"]',
    ],
    "walk": [
        'relation["route"~"^(hiking|foot|walking|trail)$"]',
    ],
}

CATEGORY_DEFAULTS = {
    "restaurant": {
        "indoorOutdoor": "indoor",
        "durationMins": 90,
        "bestTimeOfDay": "night",
    },
    "cafe": {
        "indoorOutdoor": "indoor",
        "durationMins": 60,
        "bestTimeOfDay": "morning",
    },
    "bar": {
        "indoorOutdoor": "indoor",
        "durationMins": 90,
        "bestTimeOfDay": "night",
    },
    "museum": {
        "indoorOutdoor": "indoor",
        "durationMins": 60,
        "bestTimeOfDay": "afternoon",
    },
    "market": {
        "indoorOutdoor": "indoor",
        "durationMins": 45,
        "bestTimeOfDay": "morning",
    },
    "park": {
        "indoorOutdoor": "outdoor",
        "durationMins": 75,
        "bestTimeOfDay": "afternoon",
    },
    "viewpoint": {
        "indoorOutdoor": "outdoor",
        "durationMins": 45,
        "bestTimeOfDay": "sunset",
    },
    "walk": {
        "indoorOutdoor": "outdoor",
        "durationMins": 75,
        "bestTimeOfDay": "afternoon",
    },
}

ALLOWED_TAGS = {
    "cozy",
    "hip",
    "lake",
    "oldtown",
    "quiet",
    "touristy",
    "romantic",
    "cheap",
    "view",
    "photo",
    "park",
    "green",
    "narrow",
    "bridge",
    "city",
    "street",
    "mexican",
    "italian",
    "sushi",
    "burger",
    "asian",
    "swiss",
    "brunch",
    "coffee",
    "cocktails",
    "beer",
    "wine",
    "vegan",
    "historic",
}

CUISINE_MAP = {
  "mexican": "mexican",
  "tex-mex": "mexican",
  "latin_american": "mexican",
  "latin-american": "mexican",
  "italian": "italian",
  "sushi": "sushi",
  "japanese": "sushi",
  "asian": "asian",
  "thai": "asian",
  "vietnamese": "asian",
  "chinese": "asian",
  "korean": "asian",
  "burger": "burger",
  "swiss": "swiss",
  "vegan": "vegan",
  "vegetarian": "vegan",
    "coffee": "coffee",
    "cafe": "coffee",
    "brunch": "brunch",
}

CATEGORY_TAGS = {
    "restaurant": [],
    "cafe": ["coffee"],
    "bar": ["beer", "cocktails"],
    "museum": ["historic"],
    "market": ["city"],
    "park": ["park", "green"],
    "viewpoint": ["view", "photo"],
    "walk": ["view", "photo", "street"],
}


def http_get(url: str, params: Optional[dict] = None) -> bytes:
    if params:
        url = f"{url}?{urlencode(params)}"
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=60) as resp:
        return resp.read()


def fetch_bbox(city: str, country: str) -> Tuple[float, float, float, float]:
    params = {
        "q": f"{city}, {country}",
        "format": "json",
        "limit": 1,
    }
    data = json.loads(http_get(NOMINATIM_URL, params=params))
    if not data:
        raise RuntimeError("Nominatim returned no results for bbox lookup")
    bbox = data[0]["boundingbox"]
    south, north, west, east = map(float, bbox)
    return south, west, north, east


def build_overpass_query(south: float, west: float, north: float, east: float) -> str:
    parts = []
    for category, queries in CATEGORY_QUERIES.items():
        for query in queries:
            parts.append(f"{query}({south},{west},{north},{east});")
    return f"[out:json][timeout:120];({''.join(parts)});out center tags;"


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip().lower()).strip("-")
    return slug or "place"


def build_address(tags: dict) -> Optional[str]:
    parts = [
        tags.get("addr:street"),
        tags.get("addr:housenumber"),
        tags.get("addr:postcode"),
        tags.get("addr:city"),
    ]
    cleaned = [part for part in parts if part]
    if not cleaned:
        return None
    if len(cleaned) >= 2 and cleaned[1].isdigit():
        cleaned[0] = f"{cleaned[0]} {cleaned[1]}"
        cleaned.pop(1)
    return ", ".join(cleaned)


def extract_cuisine_tags(tags: dict) -> list[str]:
    cuisine = tags.get("cuisine", "")
    if not cuisine:
        return []
    values = re.split(r"[;,]", cuisine.lower())
    mapped = []
    for value in values:
        value = value.strip()
        if not value:
            continue
        mapped_tag = CUISINE_MAP.get(value)
        if mapped_tag:
            mapped.append(mapped_tag)
    return mapped


def element_center(element: dict) -> Optional[Tuple[float, float]]:
    if "lat" in element and "lon" in element:
        return element["lat"], element["lon"]
    center = element.get("center")
    if center and "lat" in center and "lon" in center:
        return center["lat"], center["lon"]
    return None


def maps_url(lat: float, lon: float) -> str:
    return f"https://maps.google.com/?q={lat},{lon}"


def clamp_tags(tags: list[str]) -> list[str]:
    return [tag for tag in tags if tag in ALLOWED_TAGS]


def build_place(element: dict, category: str) -> Optional[dict]:
    center = element_center(element)
    if not center:
        return None
    lat, lon = center
    tags = element.get("tags", {})
    name = tags.get("name")
    if not name:
        return None

    address = build_address(tags)
    cuisine_tags = extract_cuisine_tags(tags)
    combined_tags = CATEGORY_TAGS.get(category, []) + cuisine_tags
    combined_tags = clamp_tags(combined_tags)

    place_id = f"osm-{element['type']}-{element['id']}-{slugify(name)}"
    website = tags.get("website") or tags.get("contact:website")
    phone = tags.get("phone") or tags.get("contact:phone")

    return {
        "id": place_id,
        "name": name,
        "category": category,
        "lat": lat,
        "lon": lon,
        "tags": combined_tags,
        "address": address,
        "website": website,
        "phone": phone,
        "mapsUrl": maps_url(lat, lon),
        "indoorOutdoor": CATEGORY_DEFAULTS[category]["indoorOutdoor"],
        "durationMins": CATEGORY_DEFAULTS[category]["durationMins"],
        "bestTimeOfDay": CATEGORY_DEFAULTS[category]["bestTimeOfDay"],
        "description": tags.get("description"),
        "area": tags.get("addr:suburb") or tags.get("addr:neighbourhood"),
    }


def build_places(elements: list[dict], limit_per_category: int) -> list[dict]:
    places = []
    seen = set()
    per_category = {category: 0 for category in CATEGORY_QUERIES.keys()}

    for element in elements:
        tags = element.get("tags", {})
        category = None
        if tags.get("amenity") == "restaurant":
            category = "restaurant"
        elif tags.get("amenity") == "cafe":
            category = "cafe"
        elif tags.get("amenity") in ("bar", "pub"):
            category = "bar"
        elif tags.get("tourism") == "museum":
            category = "museum"
        elif tags.get("amenity") == "marketplace":
            category = "market"
        elif tags.get("leisure") == "park":
            category = "park"
        elif tags.get("tourism") == "viewpoint":
            category = "viewpoint"
        elif tags.get("route") in ("hiking", "foot", "walking", "trail"):
            category = "walk"

        if not category:
            continue
        if per_category[category] >= limit_per_category:
            continue

        place = build_place(element, category)
        if not place:
            continue
        if place["id"] in seen:
            continue
        seen.add(place["id"])
        places.append(place)
        per_category[category] += 1

    return places


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Zurich places dataset from OpenStreetMap.")
    parser.add_argument("--city", default="Zurich")
    parser.add_argument("--country", default="Switzerland")
    parser.add_argument("--limit-per-category", type=int, default=40)
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--sleep", type=float, default=1.0)
    args = parser.parse_args()

    south, west, north, east = fetch_bbox(args.city, args.country)
    query = build_overpass_query(south, west, north, east)
    time.sleep(args.sleep)
    data = json.loads(http_get(OVERPASS_URL, params={"data": query}))
    elements = data.get("elements", [])
    places = build_places(elements, args.limit_per_category)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps({"places": places}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(places)} places to {output_path}")


if __name__ == "__main__":
    main()
