/**
 * Diversity and similarity utilities
 */

import { Place } from '../types';
import { getDistance } from './distance';

export function jaccardSimilarity(tagsA: string[], tagsB: string[]): number {
  if (tagsA.length === 0 && tagsB.length === 0) return 0;
  const setA = new Set(tagsA);
  const setB = new Set(tagsB);
  let intersection = 0;
  for (const tag of setA) {
    if (setB.has(tag)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  if (union === 0) return 0;
  return intersection / union;
}

export function experientialDistance(a: Place, b: Place): number {
  const tagSim = jaccardSimilarity(a.tags, b.tags);
  const categorySim = a.category === b.category ? 1 : 0;
  const distanceKm = getDistance(a.lat, a.lon, b.lat, b.lon);
  const geoSim = Math.exp(-distanceKm / 2);

  const similarity = tagSim * 0.45 + categorySim * 0.35 + geoSim * 0.2;
  return Math.min(1, Math.max(0, 1 - similarity));
}

export function isTooSimilar(a: Place, b: Place, similarityThreshold: number): boolean {
  const tagSim = jaccardSimilarity(a.tags, b.tags);
  const categorySim = a.category === b.category ? 1 : 0;
  const areaMatch = a.area && b.area && a.area === b.area;
  const similarity = tagSim * 0.6 + categorySim * 0.4;

  return similarity >= similarityThreshold || !!areaMatch;
}

export function mmrSelect<T>(
  candidates: Array<{ item: T; score: number }>,
  k: number,
  lambda: number,
  similarity: (a: T, b: T) => number
): T[] {
  if (candidates.length === 0 || k <= 0) return [];
  const selected: T[] = [];
  const remaining = [...candidates];
  const maxScore = Math.max(...remaining.map(entry => entry.score)) || 1;

  while (selected.length < k && remaining.length > 0) {
    let bestIndex = 0;
    let bestValue = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i].item;
      const relevance = remaining[i].score / maxScore;
      const maxSimilarity = selected.length === 0
        ? 0
        : Math.max(...selected.map(sel => similarity(candidate, sel)));
      const mmr = lambda * relevance - (1 - lambda) * maxSimilarity;
      if (mmr > bestValue) {
        bestValue = mmr;
        bestIndex = i;
      }
    }

    selected.push(remaining[bestIndex].item);
    remaining.splice(bestIndex, 1);
  }

  return selected;
}
