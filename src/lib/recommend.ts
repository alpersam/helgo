import {
  Place,
  PlaceCategory,
  UserQuery,
  Itinerary,
  WeatherData,
  SunData,
  CreativeMetrics,
} from '../types';
import PlaceDB from '../data/PlaceDB.json';
import { computeAllMetrics } from './metrics';
import { computeMainCharacterScore } from './mainCharacter';

const places: Place[] = PlaceDB.places as Place[];

// Keyword dictionaries
const CUISINE_KEYWORDS: Record<string, string[]> = {
  mexican: ['mexican', 'tacos', 'taco', 'burrito', 'mezcal'],
  italian: ['italian', 'pasta', 'pizza', 'risotto'],
  sushi: ['sushi', 'japanese', 'ramen', 'asian'],
  burger: ['burger', 'burgers', 'fries'],
  asian: ['asian', 'chinese', 'thai', 'vietnamese'],
  swiss: ['swiss', 'fondue', 'raclette', 'rösti'],
  vegan: ['vegan', 'vegetarian', 'veggie', 'plant-based'],
  brunch: ['brunch', 'breakfast', 'eggs'],
  coffee: ['coffee', 'café', 'cafe', 'espresso'],
};

const VIBE_KEYWORDS: Record<string, string[]> = {
  hip: ['hip', 'trendy', 'cool', 'hipster', 'modern'],
  cozy: ['cozy', 'warm', 'comfortable', 'intimate'],
  romantic: ['romantic', 'date', 'couple', 'love'],
  quiet: ['quiet', 'peaceful', 'calm', 'relax', 'chill'],
  cheap: ['cheap', 'budget', 'affordable', 'inexpensive'],
  view: ['view', 'panorama', 'scenic', 'overlook', 'skyline'],
  lake: ['lake', 'water', 'lakeside', 'waterfront'],
  oldtown: ['oldtown', 'old town', 'historic', 'traditional', 'charming'],
  photo: ['photo', 'instagram', 'instagrammable', 'photogenic', 'pictures'],
  walk: ['walk', 'stroll', 'wander', 'explore'],
  green: ['green', 'nature', 'park', 'garden', 'trees'],
};

const CATEGORY_KEYWORDS: Record<PlaceCategory, string[]> = {
  cafe: ['café', 'cafe', 'coffee', 'tea'],
  restaurant: ['restaurant', 'eat', 'food', 'lunch', 'dinner', 'hungry'],
  viewpoint: ['viewpoint', 'view', 'lookout', 'panorama'],
  walk: ['walk', 'stroll', 'hike', 'wander'],
};

/**
 * Parse user input to extract search criteria
 */
export function parseUserQuery(input: string): UserQuery {
  const lower = input.toLowerCase();

  const cuisines: string[] = [];
  const vibes: string[] = [];
  const categories: PlaceCategory[] = [];

  // Match cuisines
  for (const [cuisine, keywords] of Object.entries(CUISINE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      cuisines.push(cuisine);
    }
  }

  // Match vibes
  for (const [vibe, keywords] of Object.entries(VIBE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      vibes.push(vibe);
    }
  }

  // Match categories
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      categories.push(category as PlaceCategory);
    }
  }

  // Check for time constraint
  const hasTimeConstraint =
    /\d+\s*(hour|hr|minute|min)/.test(lower) ||
    lower.includes('quick') ||
    lower.includes('short');

  return {
    raw: input,
    cuisines,
    vibes,
    categories,
    hasTimeConstraint,
  };
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Score a place based on query match
 */
function scorePlace(place: Place, query: UserQuery): number {
  let score = 0;

  // Cuisine match (high weight)
  for (const cuisine of query.cuisines) {
    if (place.tags.includes(cuisine as any)) {
      score += 50;
    }
  }

  // Vibe match
  for (const vibe of query.vibes) {
    if (place.tags.includes(vibe as any)) {
      score += 30;
    }
  }

  // Category match
  if (query.categories.length > 0) {
    if (query.categories.includes(place.category)) {
      score += 40;
    }
  } else {
    // Default boost for restaurants/cafes when no category specified
    if (place.category === 'restaurant' || place.category === 'cafe') {
      score += 10;
    }
  }

  // Time constraint bonus for walks
  if (query.hasTimeConstraint && place.category === 'walk') {
    score += 20;
  }

  // Base score for having any tags (variety bonus)
  score += Math.min(place.tags.length * 2, 10);

  return score;
}

/**
 * Select a satellite place for an anchor
 */
function selectSatellite(
  anchor: Place,
  metrics: CreativeMetrics,
  weather: WeatherData,
  sun: SunData
): { satellite: Place; reason: string } {
  const candidates: { place: Place; score: number; reason: string }[] = [];

  for (const place of places) {
    if (place.id === anchor.id) continue;

    const distance = getDistance(anchor.lat, anchor.lon, place.lat, place.lon);

    // Only consider nearby places (within 2km for walks)
    if (distance > 2) continue;

    let score = 100 - distance * 50; // Closer is better
    let reason = '';

    // Match satellite to conditions
    if (metrics.reflectionPotential.score >= 60 &&
        (place.tags.includes('oldtown') || place.tags.includes('street') || place.tags.includes('bridge'))) {
      score += 30;
      reason = 'for reflections on wet streets';
    }

    if (metrics.fogEscape.score >= 60 && place.category === 'viewpoint') {
      score += 35;
      reason = 'to rise above the fog';
    }

    if (metrics.greenPocket.score >= 60 &&
        (place.tags.includes('park') || place.tags.includes('lake') || place.tags.includes('green'))) {
      score += 25;
      reason = 'for a green escape';
    }

    if (metrics.nightGlow.score >= 70 &&
        (place.tags.includes('bridge') || place.tags.includes('oldtown'))) {
      score += 30;
      reason = 'for evening lights';
    }

    // Photo spots are always good satellites
    if (place.tags.includes('photo') || place.tags.includes('view')) {
      score += 15;
      if (!reason) reason = 'for photos';
    }

    // Walks are good satellites
    if (place.category === 'walk' || place.category === 'viewpoint') {
      score += 10;
      if (!reason) reason = 'for a peaceful moment';
    }

    if (!reason) {
      reason = `to explore ${place.name}`;
    }

    candidates.push({ place, score, reason });
  }

  // Sort by score and pick best
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length > 0) {
    const chosen = candidates[0];
    return { satellite: chosen.place, reason: chosen.reason };
  }

  // Fallback: return Lindenhof as default satellite
  const lindenhof = places.find(p => p.id === 'lindenhof');
  return {
    satellite: lindenhof || anchor,
    reason: 'for a moment of reflection',
  };
}

/**
 * Generate itineraries based on user query
 */
export function generateItineraries(
  query: UserQuery,
  weather: WeatherData,
  sun: SunData,
  userElevation: number
): Itinerary[] {
  // Score all places
  const scoredPlaces = places.map(place => ({
    place,
    score: scorePlace(place, query),
  }));

  // Sort by score
  scoredPlaces.sort((a, b) => b.score - a.score);

  // Take top candidates (more than 3 to allow diversity)
  const topCandidates = scoredPlaces.slice(0, 10);

  // Select 3 diverse anchors
  const selectedAnchors: Place[] = [];
  const usedCategories = new Set<PlaceCategory>();

  for (const candidate of topCandidates) {
    if (selectedAnchors.length >= 3) break;

    // Try to get diverse categories
    if (selectedAnchors.length < 2 || !usedCategories.has(candidate.place.category)) {
      selectedAnchors.push(candidate.place);
      usedCategories.add(candidate.place.category);
    }
  }

  // Fill remaining slots if needed
  for (const candidate of topCandidates) {
    if (selectedAnchors.length >= 3) break;
    if (!selectedAnchors.includes(candidate.place)) {
      selectedAnchors.push(candidate.place);
    }
  }

  // Generate itineraries
  const itineraries: Itinerary[] = selectedAnchors.map(anchor => {
    const metrics = computeAllMetrics(anchor, weather, sun, userElevation);
    const { satellite, reason } = selectSatellite(anchor, metrics, weather, sun);
    const mainCharacterScore = computeMainCharacterScore({ metrics, sun });

    return {
      anchor,
      satellite,
      anchorReason: `Matches your ${query.vibes.join(', ') || 'vibe'}`,
      satelliteReason: reason,
      mainCharacterScore,
      metrics,
    };
  });

  // Sort by main character score
  itineraries.sort((a, b) => b.mainCharacterScore - a.mainCharacterScore);

  return itineraries.slice(0, 3);
}

/**
 * Generate a greeting response with random suggestions
 */
export function generateGreetingItineraries(
  weather: WeatherData,
  sun: SunData,
  userElevation: number
): Itinerary[] {
  // Pick random diverse places for greeting
  const cafes = places.filter(p => p.category === 'cafe');
  const viewpoints = places.filter(p => p.category === 'viewpoint');
  const walks = places.filter(p => p.category === 'walk');

  const randomPick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const anchors = [
    randomPick(cafes),
    randomPick(viewpoints),
    randomPick(walks),
  ].filter(Boolean);

  return anchors.map(anchor => {
    const metrics = computeAllMetrics(anchor, weather, sun, userElevation);
    const { satellite, reason } = selectSatellite(anchor, metrics, weather, sun);
    const mainCharacterScore = computeMainCharacterScore({ metrics, sun });

    return {
      anchor,
      satellite,
      anchorReason: 'Perfect for right now',
      satelliteReason: reason,
      mainCharacterScore,
      metrics,
    };
  });
}
