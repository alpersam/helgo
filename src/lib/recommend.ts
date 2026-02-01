import {
  Place,
  Intent,
  Itinerary,
  RecommendationContext,
  CreativeMetrics,
  AreaFilter,
} from '../types';
import { EmbeddingIndex, EnhancedScoredPlace, SessionState, TFIDFIndex } from '../types/recommendation';
import { getPlaces, PlacesSource } from './places';
import { getDistance } from './distance';
import { buildTFIDFIndex } from './tfidf';
import { createSession, recordNegativeInteraction, recordPositiveInteraction, recordShownPlaces } from './session';
import { softmaxSelect } from './exploration';
import { experientialDistance, isTooSimilar, mmrSelect } from './diversity';
import { DEFAULT_SCORING_CONFIG, scorePlaceEnhanced, getScoringConfig } from './scoring';
import { buildEmbeddingIndex } from './embeddings';

function countSharedTags(a: Place, b: Place): number {
  const tags = new Set(a.tags);
  return b.tags.filter(tag => tags.has(tag)).length;
}

let tfidfIndex: TFIDFIndex | null = null;
let sessionState: SessionState | null = null;
let indexUpdatedAt: number | null = null;
let embeddingIndex: EmbeddingIndex | null = null;

function ensureRecommendationEngine(places: Place[], updatedAt?: Date) {
  const updatedMs = updatedAt?.getTime() ?? null;
  const shouldRebuild =
    !tfidfIndex ||
    (updatedMs !== null && (!indexUpdatedAt || updatedMs > indexUpdatedAt));

  if (shouldRebuild) {
    tfidfIndex = buildTFIDFIndex(places);
    embeddingIndex = buildEmbeddingIndex(places);
    indexUpdatedAt = updatedMs ?? Date.now();
  }

  if (!sessionState) {
    sessionState = createSession();
  }
}

export async function initializeRecommendationEngine(): Promise<{ status: 'ready' | 'error'; error?: string }> {
  const placesResult = await getPlaces();
  if (placesResult.status === 'error') {
    return { status: 'error', error: placesResult.error ?? 'Unable to load places' };
  }

  ensureRecommendationEngine(placesResult.places, placesResult.updatedAt);
  return { status: 'ready' };
}

export function recordSessionPositiveInteraction(place: Place): void {
  if (!sessionState) {
    sessionState = createSession();
  }
  recordPositiveInteraction(sessionState, place);
}

export function recordSessionNegativeInteraction(place: Place): void {
  if (!sessionState) {
    sessionState = createSession();
  }
  recordNegativeInteraction(sessionState, place);
}

export function scorePlace(
  place: Place,
  intent: Intent,
  context: RecommendationContext
): number {
  const scored = scorePlaceEnhanced(
    place,
    intent,
    context,
    tfidfIndex,
    sessionState,
    embeddingIndex,
    null,
    DEFAULT_SCORING_CONFIG
  );
  return scored.score;
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

function extractPostalCode(address: string | undefined): string | null {
  if (!address) return null;
  // Match Swiss postal codes (4 digits starting with 8 for Zurich)
  const match = address.match(/\b(8\d{3})\b/);
  return match ? match[1] : null;
}

function filterByArea(places: Place[], areaFilter: AreaFilter): Place[] {
  let filtered = places;

  // Filter by postal codes if specified
  if (areaFilter.postalCodes && areaFilter.postalCodes.length > 0) {
    filtered = places.filter(place => {
      const postalCode = extractPostalCode(place.address);
      return postalCode && areaFilter.postalCodes!.includes(postalCode);
    });

    // If postal code filtering returned results, use them
    if (filtered.length > 0) {
      console.info(`[area-filter] filtered to ${filtered.length} places in postal codes: ${areaFilter.postalCodes.join(', ')}`);
      return filtered;
    }

    // Fall back to proximity-based filtering if no postal code matches
    console.info('[area-filter] no postal code matches, falling back to proximity');
  }

  // Proximity-based filtering
  if (areaFilter.centerLat !== undefined && areaFilter.centerLon !== undefined) {
    const radiusKm = areaFilter.radiusKm ?? 1.0;
    filtered = places.filter(place => {
      const distanceKm = getDistance(
        areaFilter.centerLat!,
        areaFilter.centerLon!,
        place.lat,
        place.lon
      );
      return distanceKm <= radiusKm;
    });

    // If too few results, expand the radius
    if (filtered.length < 3) {
      const expandedRadius = radiusKm * 2;
      filtered = places.filter(place => {
        const distanceKm = getDistance(
          areaFilter.centerLat!,
          areaFilter.centerLon!,
          place.lat,
          place.lon
        );
        return distanceKm <= expandedRadius;
      });
      console.info(`[area-filter] expanded radius to ${expandedRadius}km, found ${filtered.length} places`);
    } else {
      console.info(`[area-filter] found ${filtered.length} places within ${radiusKm}km of ${areaFilter.areaName ?? 'center'}`);
    }
  }

  return filtered.length > 0 ? filtered : places;
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

  const satelliteScoringConfig = getScoringConfig(intent);
  const scored = pool.map(({ candidate, distance }) => {
    let score = scorePlaceEnhanced(
      candidate,
      intent,
      context,
      tfidfIndex,
      sessionState,
      embeddingIndex,
      null,
      satelliteScoringConfig
    ).score + Math.max(0, 20 - distance * 15);
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

function emptyMetrics(): CreativeMetrics {
  return {
    fogEscape: { score: 0, label: 'Fog escape', emoji: '🌫️' },
    reflectionPotential: { score: 0, label: 'Reflection', emoji: '💧' },
    nightGlow: { score: 0, label: 'Night glow', emoji: '🌙' },
    greenPocket: { score: 0, label: 'Green pocket', emoji: '🌿' },
    windShelter: { score: 0, label: 'Wind shelter', emoji: '🛡️' },
  };
}

function isSimilar(place: Place, selected: Place[]): boolean {
  return selected.some(existing =>
    isTooSimilar(place, existing, DEFAULT_SCORING_CONFIG.similarityThreshold)
  );
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
  options?: { limit?: number; queryEmbedding?: number[] }
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

  if (sessionState && sessionState.shownPlaces.size > 0) {
    console.info('[repeat-filter] shownPlaces', sessionState.shownPlaces.size, 'candidates', candidates.length);
    const unseen = candidates.filter(place => !sessionState!.shownPlaces.has(place.id));
    console.info('[repeat-filter] unseen candidates', unseen.length);
    if (unseen.length >= 3) {
      candidates = unseen;
      console.info('[repeat-filter] applied unseen filter');
    } else {
      console.info('[repeat-filter] not enough unseen, skipping filter');
    }
  } else {
    console.info('[repeat-filter] no session state or empty shownPlaces');
  }

  if (intent.categoryPreference.length > 0 && strictCategoryLocation) {
    candidates = candidates.filter(place => intent.categoryPreference.includes(place.category));
  }
  if (intent.cuisine.length > 0) {
    const allowCafe = intent.cuisine.includes('coffee');
    const cuisineFiltered = candidates.filter(place => {
      const isFoodCategory = place.category === 'restaurant' || (allowCafe && place.category === 'cafe');
      return isFoodCategory && matchesCuisine(place, intent.cuisine);
    });
    if (cuisineFiltered.length === 0) {
      return {
        status: 'error',
        itineraries: [],
        error: `I couldn't find ${intent.cuisine.join('/')} restaurants or cafes in the dataset yet. Try another cuisine or ask for a different category.`,
        source: placesResult.source,
      };
    }
    candidates = cuisineFiltered;
  }

  // Apply area filtering if specified
  if (intent.areaFilter) {
    const beforeCount = candidates.length;
    candidates = filterByArea(candidates, intent.areaFilter);
    console.info(`[area-filter] applied: ${beforeCount} -> ${candidates.length} candidates`);

    if (candidates.length === 0) {
      const areaName = intent.areaFilter.areaName ?? 'that area';
      return {
        status: 'error',
        itineraries: [],
        error: `I couldn't find anything matching your request in ${areaName}. Try a nearby area or broaden your search.`,
        source: placesResult.source,
      };
    }
  }

  ensureRecommendationEngine(places, placesResult.updatedAt);
  if (options?.queryEmbedding && embeddingIndex) {
    console.info('[embeddings] using query embedding for scoring');
  } else if (options?.queryEmbedding && !embeddingIndex) {
    console.warn('[embeddings] query embedding provided but embedding index is missing');
  } else if (!options?.queryEmbedding) {
    console.info('[embeddings] no query embedding; using TF-IDF fallback');
  }

  // Use dynamic scoring config based on query type
  const scoringConfig = getScoringConfig(intent);

  const scoredPlaces: EnhancedScoredPlace[] = candidates.map(place => {
    if (strictCategoryLocation) {
      const distanceScore = distanceOnlyScore(place, context);
      return {
        place,
        score: distanceScore,
        breakdown: {
          baseScore: 0,
          semanticScore: 0,
          contextScore: 0,
          explorationBonus: 0,
          diversityPenalty: 0,
          sessionBoost: 0,
          finalScore: distanceScore,
        },
        confidence: 0,
        novelty: 0,
        reason: 'Distance match',
      };
    }
    return scorePlaceEnhanced(
      place,
      intent,
      context,
      tfidfIndex,
      sessionState,
      embeddingIndex,
      options?.queryEmbedding ?? null,
      scoringConfig
    );
  });

  scoredPlaces.sort((a, b) => b.score - a.score);

  const candidatePool = scoredPlaces.slice(0, Math.min(20, scoredPlaces.length));
  const softmaxPool = softmaxSelect(
    candidatePool.map(candidate => ({ item: candidate, score: candidate.score })),
    DEFAULT_SCORING_CONFIG.temperature,
    Math.min(12, candidatePool.length)
  );

  const diversified = mmrSelect(
    softmaxPool.map(candidate => ({ item: candidate, score: candidate.score })),
    3,
    DEFAULT_SCORING_CONFIG.diversityLambda,
    (a, b) => 1 - experientialDistance(a.place, b.place)
  );

  const selectedAnchors: Place[] = diversified.map(item => item.place);

  for (const candidate of scoredPlaces) {
    if (selectedAnchors.length >= 3) break;
    if (isSimilar(candidate.place, selectedAnchors)) continue;
    if (!selectedAnchors.includes(candidate.place)) {
      selectedAnchors.push(candidate.place);
    }
  }

  const itineraries = selectedAnchors.map(anchor => {
    const metrics = emptyMetrics();
    const { satellite, reason } = selectSatellite(anchor, intent, context, places);
    const mainCharacterScore = 0;

    return {
      anchor,
      satellite,
      anchorReason: buildAnchorReason(intent, anchor),
      satelliteReason: reason,
      mainCharacterScore,
      why: '',
      metrics,
    };
  });

  itineraries.sort((a, b) => b.mainCharacterScore - a.mainCharacterScore);

  if (sessionState) {
    recordShownPlaces(sessionState, itineraries.map(itinerary => itinerary.anchor));
    recordShownPlaces(sessionState, itineraries.map(itinerary => itinerary.satellite));
  }

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
  ensureRecommendationEngine(places, placesResult.updatedAt);

  const scoredPlaces: EnhancedScoredPlace[] = places.map(place =>
    scorePlaceEnhanced(
      place,
      { ...intentFallback, raw: '' },
      context,
      tfidfIndex,
      sessionState,
      embeddingIndex,
      null,
      DEFAULT_SCORING_CONFIG
    )
  );

  scoredPlaces.sort((a, b) => b.score - a.score);
  const candidatePool = scoredPlaces.slice(0, Math.min(16, scoredPlaces.length));
  const softmaxPool = softmaxSelect(
    candidatePool.map(candidate => ({ item: candidate, score: candidate.score })),
    DEFAULT_SCORING_CONFIG.temperature,
    Math.min(8, candidatePool.length)
  );

  const diversified = mmrSelect(
    softmaxPool.map(candidate => ({ item: candidate, score: candidate.score })),
    3,
    DEFAULT_SCORING_CONFIG.diversityLambda,
    (a, b) => 1 - experientialDistance(a.place, b.place)
  );

  const anchors: Place[] = diversified.map(item => item.place);

  for (const candidate of scoredPlaces) {
    if (anchors.length >= 3) break;
    if (!isSimilar(candidate.place, anchors)) {
      anchors.push(candidate.place);
    }
  }

  const itineraries = anchors.map(anchor => {
    const metrics = emptyMetrics();
    const { satellite, reason } = selectSatellite(anchor, { ...intentFallback, raw: '' }, context, places);
    const mainCharacterScore = 0;

    return {
      anchor,
      satellite,
      anchorReason: 'Perfect for right now',
      satelliteReason: reason,
      mainCharacterScore,
      why: '',
      metrics,
    };
  });

  if (sessionState) {
    recordShownPlaces(sessionState, itineraries.map(itinerary => itinerary.anchor));
    recordShownPlaces(sessionState, itineraries.map(itinerary => itinerary.satellite));
  }

  const limit = options?.limit ?? itineraries.length;
  return {
    status: 'ready',
    itineraries: itineraries.slice(0, limit),
    source: placesResult.source,
    updatedAt: placesResult.updatedAt,
  };
}
