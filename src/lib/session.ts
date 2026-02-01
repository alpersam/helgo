/**
 * Session-based preference learning
 */

import { Place, PlaceCategory } from '../types';
import { BetaPrior, SessionState } from '../types/recommendation';

function createPrior(alpha = 1, beta = 1): BetaPrior {
  return { alpha, beta };
}

function ensureCategoryPrior(state: SessionState, category: PlaceCategory): BetaPrior {
  const existing = state.categoryPriors.get(category);
  if (existing) return existing;
  const prior = createPrior();
  state.categoryPriors.set(category, prior);
  return prior;
}

function ensureTagPrior(state: SessionState, tag: string): BetaPrior {
  const existing = state.tagPriors.get(tag);
  if (existing) return existing;
  const prior = createPrior();
  state.tagPriors.set(tag, prior);
  return prior;
}

export function createSession(): SessionState {
  return {
    sessionId: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: Date.now(),
    shownPlaces: new Set(),
    selectedPlaces: [],
    rejectedCategories: new Set(),
    categoryPriors: new Map(),
    tagPriors: new Map(),
    queryCount: 0,
    lastQueryTime: Date.now(),
  };
}

export function recordShownPlaces(state: SessionState, places: Place[]): void {
  for (const place of places) {
    state.shownPlaces.add(place.id);
  }
}

export function recordPositiveInteraction(state: SessionState, place: Place): void {
  state.selectedPlaces.push(place.id);
  const categoryPrior = ensureCategoryPrior(state, place.category);
  categoryPrior.alpha += 1;

  for (const tag of place.tags) {
    const tagPrior = ensureTagPrior(state, tag);
    tagPrior.alpha += 1;
  }
}

export function recordNegativeInteraction(state: SessionState, place: Place): void {
  const categoryPrior = ensureCategoryPrior(state, place.category);
  categoryPrior.beta += 1;
  state.rejectedCategories.add(place.category);

  for (const tag of place.tags) {
    const tagPrior = ensureTagPrior(state, tag);
    tagPrior.beta += 1;
  }
}

function meanPrior(prior: BetaPrior): number {
  const denom = prior.alpha + prior.beta;
  if (denom === 0) return 0.5;
  return prior.alpha / denom;
}

export function computeSessionBoost(place: Place, state: SessionState | null): number {
  if (!state) return 0;
  const categoryPrior = state.categoryPriors.get(place.category);
  const categoryMean = categoryPrior ? meanPrior(categoryPrior) : 0.5;

  const tagMeans: number[] = [];
  for (const tag of place.tags) {
    const prior = state.tagPriors.get(tag);
    if (prior) {
      tagMeans.push(meanPrior(prior));
    }
  }

  const tagMean = tagMeans.length > 0
    ? tagMeans.reduce((sum, v) => sum + v, 0) / tagMeans.length
    : 0.5;

  const combined = categoryMean * 0.6 + tagMean * 0.4;
  return Math.round(combined * 100);
}
