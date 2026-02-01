/**
 * Vector embedding utilities
 */

import { Place } from '../types';
import { EmbeddingIndex } from '../types/recommendation';

function normalizeVector(values: number[]): Float32Array {
  const vector = new Float32Array(values.length);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    vector[i] = v;
    sum += v * v;
  }
  const norm = Math.sqrt(sum) || 1;
  for (let i = 0; i < vector.length; i++) {
    vector[i] /= norm;
  }
  return vector;
}

export function buildEmbeddingIndex(places: Place[]): EmbeddingIndex | null {
  const vectors: Map<string, Float32Array> = new Map();
  let dimension = 0;

  for (const place of places) {
    if (!place.embedding || place.embedding.length === 0) continue;
    if (dimension === 0) {
      dimension = place.embedding.length;
    }
    if (place.embedding.length !== dimension) continue;
    vectors.set(place.id, normalizeVector(place.embedding));
  }

  if (vectors.size === 0 || dimension === 0) return null;

  return {
    dimension,
    vectors,
    lastUpdated: Date.now(),
  };
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
  }
  return Math.max(0, dot);
}

export function computeEmbeddingScore(
  queryEmbedding: number[],
  place: Place,
  index: EmbeddingIndex
): number {
  const placeVector = index.vectors.get(place.id);
  if (!placeVector) return 0;

  if (queryEmbedding.length !== index.dimension) return 0;

  const queryVector = normalizeVector(queryEmbedding);
  const score = cosineSimilarity(queryVector, placeVector);
  return Math.round(score * 100);
}
