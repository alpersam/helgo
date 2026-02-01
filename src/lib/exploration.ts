/**
 * Exploration utilities (Thompson Sampling + Softmax)
 */

import { Place } from '../types';
import { SessionState } from '../types/recommendation';

type RNG = () => number;

function sampleGamma(shape: number, rng: RNG): number {
  if (shape <= 0) return 0;
  if (shape < 1) {
    const u = rng();
    return sampleGamma(shape + 1, rng) * Math.pow(u, 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number;
    let v: number;
    do {
      const u1 = Math.max(rng(), 1e-12);
      const u2 = rng();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = rng();

    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function sampleBetaAccurate(alpha: number, beta: number, rng: RNG = Math.random): number {
  const x = sampleGamma(alpha, rng);
  const y = sampleGamma(beta, rng);
  const denom = x + y;
  if (denom === 0) return 0.5;
  return x / denom;
}

export function computeExplorationScore(
  place: Place,
  sessionState: SessionState | null,
  rng: RNG = Math.random
): number {
  if (!sessionState) return 0;

  const categoryPrior = sessionState.categoryPriors.get(place.category);
  const categorySample = categoryPrior
    ? sampleBetaAccurate(categoryPrior.alpha, categoryPrior.beta, rng)
    : sampleBetaAccurate(1, 1, rng);

  const tagSamples: number[] = [];
  for (const tag of place.tags) {
    const prior = sessionState.tagPriors.get(tag);
    const sample = prior
      ? sampleBetaAccurate(prior.alpha, prior.beta, rng)
      : sampleBetaAccurate(1, 1, rng);
    tagSamples.push(sample);
  }

  const tagMean = tagSamples.length > 0
    ? tagSamples.reduce((sum, v) => sum + v, 0) / tagSamples.length
    : 0.5;

  const combined = categorySample * 0.7 + tagMean * 0.3;
  return Math.round(combined * 100);
}

export function softmaxSelect<T>(
  items: Array<{ item: T; score: number }>,
  temperature: number,
  count: number,
  rng: RNG = Math.random
): T[] {
  if (items.length === 0) return [];
  const temp = Math.max(0.1, temperature);
  const working = [...items];
  const selected: T[] = [];

  while (selected.length < count && working.length > 0) {
    const maxScore = Math.max(...working.map(entry => entry.score));
    const expScores = working.map(entry => Math.exp((entry.score - maxScore) / temp));
    const sum = expScores.reduce((total, v) => total + v, 0) || 1;
    const probs = expScores.map(v => v / sum);

    let r = rng();
    let pickIndex = 0;
    for (let i = 0; i < probs.length; i++) {
      r -= probs[i];
      if (r <= 0) {
        pickIndex = i;
        break;
      }
    }

    selected.push(working[pickIndex].item);
    working.splice(pickIndex, 1);
  }

  return selected;
}
