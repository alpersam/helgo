import {
  Place,
  PlaceCategory,
  Intent,
  Itinerary,
  RecommendationContext,
  CreativeMetrics,
} from '../types';
import { computeAllMetrics } from './metrics';
import { computeMainCharacterScore } from './mainCharacter';
import { getPlaces, PlacesSource } from './places';

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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

function countSharedTags(a: Place, b: Place): number {
  const tags = new Set(a.tags);
  return b.tags.filter(tag => tags.has(tag)).length;
}

function isInSeason(
  seasonality: { startMonth: number; endMonth: number },
  date: Date
): boolean {
  const month = date.getMonth() + 1;
  if (seasonality.startMonth <= seasonality.endMonth) {
    return month >= seasonality.startMonth && month <= seasonality.endMonth;
  }
  return month >= seasonality.startMonth || month <= seasonality.endMonth;
}

export function scorePlace(
  place: Place,
  intent: Intent,
  context: RecommendationContext
): number {
  let score = 0;

  if (intent.categoryPreference.length > 0) {
    score += intent.categoryPreference.includes(place.category) ? 40 : -10;
  }

  for (const cuisine of intent.cuisine) {
    if (place.tags.includes(cuisine as any)) {
      score += 35;
    }
  }

  for (const vibe of intent.vibes) {
    if (place.tags.includes(vibe as any)) {
      score += 20;
    }
  }

  if (intent.constraints.includes('budget')) {
    if (place.price === 'budget') score += 15;
    if (place.price === 'high') score -= 10;
  }

  if (intent.constraints.includes('quiet') && place.tags.includes('quiet')) {
    score += 10;
  }

  if (intent.constraints.includes('rain')) {
    score += place.indoorOutdoor === 'indoor' ? 20 : -5;
  }

  if (intent.constraints.includes('family-friendly')) {
    if (place.tags.includes('park') || place.tags.includes('green')) {
      score += 10;
    }
  }

  if (intent.indoorPreference !== 'no-preference') {
    if (place.indoorOutdoor === intent.indoorPreference) score += 20;
    if (place.indoorOutdoor === 'mixed') score += 10;
    if (place.indoorOutdoor !== 'mixed' && place.indoorOutdoor !== intent.indoorPreference) score -= 10;
  }

  if (intent.timeBudgetMins) {
    const diff = Math.abs(place.durationMins - intent.timeBudgetMins);
    if (diff <= 30) score += 15;
    else if (diff <= 60) score += 5;
    else score -= 5;
  }

  if (intent.photoMode !== 'none') {
    const hasPhoto = place.tags.includes('photo') || place.tags.includes('view') || !!place.photoSpots?.length;
    score += hasPhoto ? 20 : -5;
  }

  const { weather, daylight, userLocation } = context;

  if (place.isOpen === false) {
    score -= 50;
  }

  if (place.popularity !== undefined) {
    score += (place.popularity - 50) / 5;
  }

  if (place.seasonality && !isInSeason(place.seasonality, context.now)) {
    score -= 15;
  }

  if (userLocation) {
    const distanceKm = getDistance(userLocation.lat, userLocation.lon, place.lat, place.lon);
    score += Math.max(0, 18 - distanceKm * 6);
  }

  if (weather.precipitation > 0.5 && place.indoorOutdoor === 'indoor') {
    score += 15;
  }

  if (weather.precipitation < 0.2 && place.indoorOutdoor === 'outdoor') {
    score += 10;
  }

  if (daylight.isEvening && (place.bestTimeOfDay === 'night' || place.bestTimeOfDay === 'sunset')) {
    score += 10;
  }

  if (daylight.isGoldenHour && place.bestTimeOfDay === 'sunset') {
    score += 10;
  }

  score += Math.min(place.tags.length * 2, 12);

  return score;
}

function isStrictCategoryLocation(intent: Intent): boolean {
  return (
    intent.vibes.length === 0 &&
    intent.constraints.length === 0 &&
    !intent.timeBudgetMins &&
    !intent.groupContext &&
    intent.photoMode === 'none' &&
    intent.indoorPreference === 'no-preference'
  );
}

function distanceOnlyScore(place: Place, context: RecommendationContext): number {
  if (!context.userLocation) return 0;
  const distanceKm = getDistance(
    context.userLocation.lat,
    context.userLocation.lon,
    place.lat,
    place.lon
  );
  return Math.max(0, 100 - distanceKm * 20);
}

function buildAnchorReason(intent: Intent, anchor: Place): string {
  if (intent.vibes.length > 0) {
    return `Matches your ${intent.vibes[0]} vibe`;
  }
  if (intent.cuisine.length > 0 && anchor.tags.includes(intent.cuisine[0] as any)) {
    return `Great for ${intent.cuisine[0]} cravings`;
  }
  if (intent.categoryPreference.length > 0) {
    return `Solid ${anchor.category} pick`;
  }
  return 'Fits the moment';
}

function buildWhy(metrics: CreativeMetrics): string {
  const metricPairs: Array<{ key: string; score: number; label: string }> = [
    { key: 'fog', score: metrics.fogEscape.score, label: metrics.fogEscape.label },
    { key: 'reflection', score: metrics.reflectionPotential.score, label: metrics.reflectionPotential.label },
    { key: 'night', score: metrics.nightGlow.score, label: metrics.nightGlow.label },
    { key: 'green', score: metrics.greenPocket.score, label: metrics.greenPocket.label },
    { key: 'wind', score: metrics.windShelter.score, label: metrics.windShelter.label },
  ];

  metricPairs.sort((a, b) => b.score - a.score);
  const top = metricPairs.slice(0, 2).map(metric => metric.label.toLowerCase());
  return `Why now: ${top.join(' + ')}`;
}

function selectSatellite(
  anchor: Place,
  intent: Intent,
  context: RecommendationContext,
  places: Place[]
): { satellite: Place; reason: string } {
  const candidates = places.filter(place => place.id !== anchor.id);
  const withDistance = candidates.map(candidate => ({
    candidate,
    distance: getDistance(anchor.lat, anchor.lon, candidate.lat, candidate.lon),
  }));

  const nearby = withDistance.filter(entry => entry.distance <= 1);
  let pool = nearby.length > 0 ? nearby : withDistance;

  if (anchor.category === 'restaurant') {
    const diverseNearby = pool.filter(
      entry =>
        entry.candidate.category !== 'restaurant' &&
        countSharedTags(anchor, entry.candidate) <= 1
    );
    if (diverseNearby.length > 0) {
      pool = diverseNearby;
    } else {
      const nonRestaurant = pool.filter(entry => entry.candidate.category !== 'restaurant');
      if (nonRestaurant.length > 0) {
        pool = nonRestaurant;
      }
    }
  }

  const scored = pool.map(({ candidate, distance }) => {
    let score = scorePlace(candidate, intent, context) + Math.max(0, 20 - distance * 15);
    if (candidate.category !== anchor.category) score += 8;
    if (countSharedTags(anchor, candidate) <= 2) score += 5;
    return { candidate, score, distance };
  });

  scored.sort((a, b) => b.score - a.score);
  const chosen = scored[0]?.candidate ?? anchor;

  let reason = 'for a nearby bonus stop';
  if (chosen.tags.includes('photo') || chosen.tags.includes('view')) {
    reason = 'for extra photo angles';
  } else if (chosen.category === 'walk') {
    reason = 'for a short stroll';
  } else if (chosen.indoorOutdoor === 'indoor' && context.weather.precipitation > 0.5) {
    reason = 'to stay warm and dry';
  }

  return { satellite: chosen, reason };
}

function isSimilar(place: Place, selected: Place[]): boolean {
  return selected.some(existing => {
    const sharedTags = countSharedTags(place, existing);
    const sameCategory = place.category === existing.category;
    const sameArea = place.area && existing.area && place.area === existing.area;
    return (sameCategory && sharedTags >= 3) || sameArea;
  });
}

const CUISINE_NAME_KEYWORDS: Record<string, string[]> = {
  mexican: ['mexican', 'taco', 'taqueria', 'burrito', 'cantina', 'quesadilla', 'mezcal', 'margarita', 'nacho'],
  italian: ['italian', 'pasta', 'pizza', 'trattoria', 'osteria', 'ristorante'],
  sushi: ['sushi', 'ramen', 'izakaya', 'omakase'],
  asian: ['asian', 'thai', 'vietnam', 'chinese', 'korean', 'bao', 'noodle'],
  burger: ['burger', 'grill', 'steakhouse'],
  swiss: ['swiss', 'fondue', 'raclette', 'roesti', 'rösti'],
  vegan: ['vegan', 'vegetarian', 'plant', 'green'],
  brunch: ['brunch', 'breakfast', 'eggs'],
  coffee: ['coffee', 'cafe', 'café', 'espresso'],
};

function matchesCuisine(place: Place, cuisines: string[]): boolean {
  return cuisines.some(cuisine => place.tags.includes(cuisine as any));
}

const intentFallback: Intent = {
  raw: '',
  cuisine: [],
  categoryPreference: [],
  vibes: [],
  constraints: [],
  photoMode: 'none',
  indoorPreference: 'no-preference',
};

export type RecommendationResult = {
  status: 'ready' | 'error';
  itineraries: Itinerary[];
  error?: string;
  source?: PlacesSource;
  updatedAt?: Date;
};

export async function generateItineraries(
  intent: Intent,
  context: RecommendationContext,
  userElevation: number,
  options?: { limit?: number }
): Promise<RecommendationResult> {
  const placesResult = await getPlaces();
  if (placesResult.status === 'error') {
    return {
      status: 'error',
      itineraries: [],
      error: placesResult.error ?? 'Unable to load places',
      source: placesResult.source,
    };
  }

  const places = placesResult.places;
  let candidates = places;
  const strictCategoryLocation = isStrictCategoryLocation(intent);

  if (intent.categoryPreference.length > 0 && strictCategoryLocation) {
    candidates = candidates.filter(place => intent.categoryPreference.includes(place.category));
  }
  if (intent.cuisine.length > 0) {
    const cuisineFiltered = places.filter(
      place => place.category === 'restaurant' && matchesCuisine(place, intent.cuisine)
    );
    if (cuisineFiltered.length === 0) {
      return {
        status: 'error',
        itineraries: [],
        error: `I couldn't find ${intent.cuisine.join('/')} restaurants in the dataset yet. Try another cuisine or ask for a restaurant.`,
        source: placesResult.source,
      };
    }
    candidates = cuisineFiltered;
  }

  const scoredPlaces = candidates.map(place => ({
    place,
    score: strictCategoryLocation ? distanceOnlyScore(place, context) : scorePlace(place, intent, context),
  }));

  scoredPlaces.sort((a, b) => b.score - a.score);

  const selectedAnchors: Place[] = [];
  const usedCategories = new Set<PlaceCategory>();

  for (const candidate of scoredPlaces) {
    if (selectedAnchors.length >= 3) break;
    if (isSimilar(candidate.place, selectedAnchors)) continue;
    if (selectedAnchors.length < 2 || !usedCategories.has(candidate.place.category)) {
      selectedAnchors.push(candidate.place);
      usedCategories.add(candidate.place.category);
    }
  }

  for (const candidate of scoredPlaces) {
    if (selectedAnchors.length >= 3) break;
    if (!selectedAnchors.includes(candidate.place)) {
      selectedAnchors.push(candidate.place);
    }
  }

  const itineraries = selectedAnchors.map(anchor => {
    const metrics = computeAllMetrics(anchor, context.weather, context.daylight, userElevation);
    const { satellite, reason } = selectSatellite(anchor, intent, context, places);
    const mainCharacterScore = computeMainCharacterScore({ metrics, sun: context.daylight });

    return {
      anchor,
      satellite,
      anchorReason: buildAnchorReason(intent, anchor),
      satelliteReason: reason,
      mainCharacterScore,
      why: buildWhy(metrics),
      metrics,
    };
  });

  itineraries.sort((a, b) => b.mainCharacterScore - a.mainCharacterScore);

  const limit = options?.limit ?? 3;
  return {
    status: 'ready',
    itineraries: itineraries.slice(0, limit),
    source: placesResult.source,
    updatedAt: placesResult.updatedAt,
  };
}

export async function generateGreetingItineraries(
  context: RecommendationContext,
  userElevation: number,
  options?: { limit?: number }
): Promise<RecommendationResult> {
  const placesResult = await getPlaces();
  if (placesResult.status === 'error') {
    return {
      status: 'error',
      itineraries: [],
      error: placesResult.error ?? 'Unable to load places',
      source: placesResult.source,
    };
  }

  const places = placesResult.places;
  const sample = [...places]
    .sort(() => Math.random() - 0.5)
    .slice(0, 6);

  const anchors: Place[] = [];
  for (const candidate of sample) {
    if (anchors.length >= 3) break;
    if (!isSimilar(candidate, anchors)) {
      anchors.push(candidate);
    }
  }

  const itineraries = anchors.map(anchor => {
    const metrics = computeAllMetrics(anchor, context.weather, context.daylight, userElevation);
    const { satellite, reason } = selectSatellite(anchor, { ...intentFallback, raw: '' }, context, places);
    const mainCharacterScore = computeMainCharacterScore({ metrics, sun: context.daylight });

    return {
      anchor,
      satellite,
      anchorReason: 'Perfect for right now',
      satelliteReason: reason,
      mainCharacterScore,
      why: buildWhy(metrics),
      metrics,
    };
  });

  const limit = options?.limit ?? itineraries.length;
  return {
    status: 'ready',
    itineraries: itineraries.slice(0, limit),
    source: placesResult.source,
    updatedAt: placesResult.updatedAt,
  };
}
