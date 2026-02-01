import argparse
import html
import json
import re
import time
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import urlencode
from urllib.request import Request, urlopen


BASE_URL = "https://www.zuerich.com/en/api/v2/data"
USER_AGENT = "helgo-zurich-open-data/1.0 (contact: local-script)"

DEFAULT_OUTPUT = Path("src/data/places_zurich.json")

CATEGORY_DEFAULTS = {
    "restaurant": {"indoorOutdoor": "indoor", "durationMins": 90, "bestTimeOfDay": "night"},
    "cafe": {"indoorOutdoor": "indoor", "durationMins": 60, "bestTimeOfDay": "morning"},
    "bar": {"indoorOutdoor": "indoor", "durationMins": 90, "bestTimeOfDay": "night"},
    "museum": {"indoorOutdoor": "indoor", "durationMins": 60, "bestTimeOfDay": "afternoon"},
    "market": {"indoorOutdoor": "indoor", "durationMins": 60, "bestTimeOfDay": "morning"},
    "park": {"indoorOutdoor": "outdoor", "durationMins": 75, "bestTimeOfDay": "afternoon"},
    "viewpoint": {"indoorOutdoor": "outdoor", "durationMins": 45, "bestTimeOfDay": "sunset"},
    "walk": {"indoorOutdoor": "outdoor", "durationMins": 75, "bestTimeOfDay": "afternoon"},
    "activity": {"indoorOutdoor": "mixed", "durationMins": 90, "bestTimeOfDay": "afternoon"},
    "shopping": {"indoorOutdoor": "indoor", "durationMins": 60, "bestTimeOfDay": "afternoon"},
    "sport": {"indoorOutdoor": "mixed", "durationMins": 90, "bestTimeOfDay": "afternoon"},
    "wellness": {"indoorOutdoor": "indoor", "durationMins": 90, "bestTimeOfDay": "afternoon"},
    "accommodation": {"indoorOutdoor": "indoor", "durationMins": 120, "bestTimeOfDay": "night"},
    "event": {"indoorOutdoor": "mixed", "durationMins": 120, "bestTimeOfDay": "night"},
    "sightseeing": {"indoorOutdoor": "outdoor", "durationMins": 60, "bestTimeOfDay": "afternoon"},
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


def http_get(url: str, params: Optional[Dict[str, str]] = None) -> dict:
    if params:
        url = f"{url}?{urlencode(params)}"
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def text_value(value: object) -> Optional[str]:
    if isinstance(value, dict):
        return value.get("en") or value.get("de") or value.get("default")
    if isinstance(value, str):
        return value
    return None


def strip_html(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = re.sub(r"<[^>]+>", "", value)
    return html.unescape(cleaned).strip()


def maps_url(lat: float, lon: float) -> str:
    return f"https://maps.google.com/?q={lat},{lon}"


def category_from_type(types: List[str], categories: List[str]) -> str:
    lower_categories = [cat.lower() for cat in categories]

    def has_any(values: List[str]) -> bool:
        return any(any(value in cat for value in values) for cat in lower_categories)

    if has_any(["hotel", "accommodation", "hostel", "lodging"]):
        return "accommodation"
    if has_any(["event", "festival", "concert", "show", "theatre", "theater", "exhibition", "performance"]):
        return "event"
    if has_any(["restaurant", "gastronomy", "dinner", "lunch", "breakfast", "meal", "cuisine"]):
        return "restaurant"
    if has_any(["cafe", "coffee", "tea room", "coffee house"]):
        return "cafe"
    if has_any(["bar", "pub", "nightlife", "club", "disco", "cocktail", "lounge"]):
        return "bar"
    if has_any(["museum", "gallery"]):
        return "museum"
    if has_any(["market"]):
        return "market"
    if has_any(["park", "garden", "nature", "water", "lake", "river"]):
        return "park"
    if has_any(["view", "panorama", "lookout", "vantage"]):
        return "viewpoint"
    if has_any(["walk", "hiking", "trail", "route"]):
        return "walk"
    if has_any(["shopping", "shop", "boutique", "mall", "store"]):
        return "shopping"
    if has_any(["sport", "fitness", "gym", "swimming", "climbing", "ice rink", "tennis"]):
        return "sport"
    if has_any(["wellness", "spa", "sauna", "massage", "bath"]):
        return "wellness"
    if has_any(["sight", "sightseeing", "attraction", "landmark", "historic"]):
        return "sightseeing"

    if "restaurant" in types:
        return "restaurant"
    if "cafeorcoffeeshop" in types:
        return "cafe"
    if "barorpub" in types or "bar" in types:
        return "bar"
    if "museum" in types:
        return "museum"
    if "hotel" in types or "lodgingbusiness" in types or "hostel" in types:
        return "accommodation"

    return "activity"


def tags_from_categories(categories: List[str]) -> List[str]:
    tags = []
    for category in categories:
        value = category.lower()
        if "gastro" in value or "restaurant" in value:
            tags.append("city")
        if "mexic" in value or "tex-mex" in value or "latin" in value:
            tags.append("mexican")
        if "ital" in value:
            tags.append("italian")
        if "sushi" in value or "japan" in value:
            tags.append("sushi")
        if "asian" in value or "thai" in value or "korean" in value or "chinese" in value:
            tags.append("asian")
        if "burger" in value:
            tags.append("burger")
        if "american" in value:
            tags.append("burger")
        if "swiss" in value:
            tags.append("swiss")
        if "vegan" in value or "vegetarian" in value:
            tags.append("vegan")
        if "coffee" in value or "cafe" in value:
            tags.append("coffee")
        if "brunch" in value:
            tags.append("brunch")
        if "bar" in value or "cocktail" in value or "nightlife" in value:
            tags.append("cocktails")
        if "wine" in value:
            tags.append("wine")
        if "beer" in value or "brew" in value:
            tags.append("beer")
        if "park" in value or "garden" in value:
            tags.append("park")
            tags.append("green")
        if "view" in value or "panorama" in value:
            tags.append("view")
            tags.append("photo")
        if "historic" in value or "heritage" in value:
            tags.append("historic")
        if "quiet" in value:
            tags.append("quiet")
        if "romantic" in value:
            tags.append("romantic")
        if "lake" in value or "river" in value or "water" in value:
            tags.append("lake")
        if "old town" in value or "oldtown" in value:
            tags.append("oldtown")
    return [tag for tag in tags if tag in ALLOWED_TAGS]


def extract_image_url(image: object) -> Optional[str]:
    if isinstance(image, str):
        return image
    if isinstance(image, dict):
        url = image.get("url")
        if isinstance(url, str):
            return url
    if isinstance(image, list) and image:
        return extract_image_url(image[0])
    return None


def build_address(address: dict) -> Optional[str]:
    if not isinstance(address, dict):
        return None
    parts = [
        address.get("streetAddress"),
        address.get("postalCode"),
        address.get("addressLocality"),
    ]
    return ", ".join([part for part in parts if part])


def fetch_categories() -> List[dict]:
    data = http_get(BASE_URL)
    if isinstance(data, list):
        return data
    return []


def fetch_objects(category_id: str) -> List[dict]:
    data = http_get(BASE_URL, params={"id": category_id})
    if isinstance(data, list):
        return data
    return []


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Zurich places dataset from Zurich Open Data API.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--sleep", type=float, default=0.3)
    parser.add_argument("--limit-categories", type=int, default=None)
    args = parser.parse_args()

    categories = fetch_categories()
    if args.limit_categories:
        categories = categories[: args.limit_categories]

    places_by_id: Dict[str, dict] = {}

    for category in categories:
        category_id = category.get("id")
        if not category_id:
            continue
        time.sleep(args.sleep)
        objects = fetch_objects(category_id)
        for obj in objects:
            identifier = obj.get("identifier") or obj.get("id")
            if not identifier:
                continue
            geo = obj.get("geoCoordinates") or obj.get("geo") or {}
            lat = geo.get("latitude")
            lon = geo.get("longitude")
            if lat is None or lon is None:
                continue

            name = text_value(obj.get("name")) or text_value(obj.get("headline")) or obj.get("title")
            if not name:
                continue

            category_names = list((obj.get("category") or {}).keys())
            types = obj.get("@type")
            if isinstance(types, str):
                type_list = [types.lower()]
            elif isinstance(types, list):
                type_list = [str(value).lower() for value in types]
            else:
                type_list = []

            place_category = category_from_type(type_list, category_names)
            description = strip_html(
                text_value(obj.get("disambiguatingDescription"))
                or text_value(obj.get("description"))
                or text_value(obj.get("textTeaser"))
                or text_value(obj.get("titleTeaser"))
            )
            address = build_address(obj.get("address") or {})
            website = obj.get("url")
            if not website and isinstance(obj.get("address"), dict):
                website = obj.get("address", {}).get("url")
            phone = obj.get("telephone")
            if not phone and isinstance(obj.get("address"), dict):
                phone = obj.get("address", {}).get("telephone")
            photo_url = extract_image_url(obj.get("image")) or extract_image_url(obj.get("photo"))

            tags = tags_from_categories(category_names)

            if identifier not in places_by_id:
                defaults = CATEGORY_DEFAULTS.get(place_category, CATEGORY_DEFAULTS["activity"])
                places_by_id[identifier] = {
                    "id": f"zurich-{identifier}",
                    "name": name,
                    "category": place_category,
                    "lat": lat,
                    "lon": lon,
                    "tags": tags,
                    "address": address,
                    "website": website,
                    "phone": phone,
                    "photoUrl": photo_url,
                    "mapsUrl": maps_url(lat, lon),
                    "indoorOutdoor": defaults["indoorOutdoor"],
                    "durationMins": defaults["durationMins"],
                    "bestTimeOfDay": defaults["bestTimeOfDay"],
                    "description": description,
                }
            else:
                existing = places_by_id[identifier]
                existing["tags"] = list({*existing.get("tags", []), *tags})
                if not existing.get("photoUrl") and photo_url:
                    existing["photoUrl"] = photo_url
                if not existing.get("address") and address:
                    existing["address"] = address
                if not existing.get("website") and website:
                    existing["website"] = website
                if not existing.get("phone") and phone:
                    existing["phone"] = phone

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps({"places": list(places_by_id.values())}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {len(places_by_id)} places to {output_path}")


if __name__ == "__main__":
    main()
