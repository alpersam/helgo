/**
 * Unified enhanced scoring pipeline
 */

import { Intent, Place, RecommendationContext } from '../types';
import { ScoringConfig, ScoringBreakdown, EnhancedScoredPlace, SessionState, TFIDFIndex, EmbeddingIndex } from '../types/recommendation';
import { computeSemanticScore } from './tfidf';
import { computeEmbeddingScore } from './embeddings';
import { computeExplorationScore } from './exploration';
import { computeSessionBoost } from './session';
import { adaptiveDistanceScore, getDistance } from './distance';

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  baseWeight: 0.3,
  semanticWeight: 0.25,
  contextWeight: 0.2,
  explorationWeight: 0.15,
  sessionWeight: 0.1,
  temperature: 1.0,
  diversityLambda: 0.7,
  similarityThreshold: 0.3,
};

// Config for natural language queries - boost semantic matching
export const NATURAL_LANGUAGE_CONFIG: ScoringConfig = {
  baseWeight: 0.15,
  semanticWeight: 0.40,
  contextWeight: 0.2,
  explorationWeight: 0.15,
  sessionWeight: 0.1,
  temperature: 1.0,
  diversityLambda: 0.7,
  similarityThreshold: 0.3,
};

/**
 * Detect if the query is a natural language description rather than keyword-based.
 * Natural language queries benefit from higher semantic weight.
 */
export function isNaturalLanguageQuery(intent: Intent): boolean {
  const hasStructuredSignals =
    intent.cuisine.length > 0 ||
    intent.categoryPreference.length > 0;

  const isLongerQuery = intent.raw.length > 25;
  const hasDescriptiveWords = /\b(something|somewhere|place|spot|looking for|want|need|like|good|nice|great)\b/i.test(intent.raw);

  return !hasStructuredSignals && (isLongerQuery || hasDescriptiveWords);
}

/**
 * Get the appropriate scoring config based on query type
 */
export function getScoringConfig(intent: Intent): ScoringConfig {
  if (isNaturalLanguageQuery(intent)) {
    console.info('[scoring] using natural language config (semantic weight: 40%)');
    return NATURAL_LANGUAGE_CONFIG;
  }
  return DEFAULT_SCORING_CONFIG;
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

export function computeBaseScore(place: Place, intent: Intent): number {
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

  score += Math.min(place.tags.length * 2, 12);

  return score;
}

export function computeContextScore(place: Place, context: RecommendationContext): number {
  let score = 0;
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
    score += adaptiveDistanceScore(distanceKm, {
      isEvening: daylight.isEvening,
      isRaining: weather.precipitation > 0.5,
    });
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

  return score;
}

export function generateReason(breakdown: ScoringBreakdown): string {
  const parts: Array<{ label: string; value: number }> = [
    { label: 'intent match', value: breakdown.baseScore },
    { label: 'semantic match', value: breakdown.semanticScore },
    { label: 'context fit', value: breakdown.contextScore },
    { label: 'exploration', value: breakdown.explorationBonus },
    { label: 'personalized', value: breakdown.sessionBoost },
  ];

  parts.sort((a, b) => b.value - a.value);
  const top = parts.slice(0, 2).map(part => part.label);
  return `Strong ${top.join(' + ')}`;
}

export function scorePlaceEnhanced(
  place: Place,
  intent: Intent,
  context: RecommendationContext,
  index: TFIDFIndex | null,
  sessionState: SessionState | null,
  embeddingIndex: EmbeddingIndex | null,
  queryEmbedding: number[] | null,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): EnhancedScoredPlace {
  const baseScore = computeBaseScore(place, intent);
  const usesEmbedding = !!(queryEmbedding && embeddingIndex);
  const semanticScore = usesEmbedding
    ? computeEmbeddingScore(queryEmbedding, place, embeddingIndex)
    : (intent.raw && index ? computeSemanticScore(intent.raw, place, index) : 0);
  const contextScore = computeContextScore(place, context);
  const explorationBonus = computeExplorationScore(place, sessionState);
  const sessionBoost = computeSessionBoost(place, sessionState);

  const finalScore =
    baseScore * config.baseWeight +
    semanticScore * config.semanticWeight +
    contextScore * config.contextWeight +
    explorationBonus * config.explorationWeight +
    sessionBoost * config.sessionWeight;

  const breakdown: ScoringBreakdown = {
    baseScore,
    semanticScore,
    contextScore,
    explorationBonus,
    diversityPenalty: 0,
    sessionBoost,
    finalScore,
  };

  const confidence = Math.min(1, Math.max(0, (Math.max(0, baseScore) + semanticScore) / 200));
  const novelty = Math.min(1, Math.max(0, explorationBonus / 100));

  return {
    place,
    score: finalScore,
    breakdown,
    confidence,
    novelty,
    reason: generateReason(breakdown),
  };
}
