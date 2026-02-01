/**
 * TF-IDF (Term Frequency - Inverse Document Frequency) Implementation
 *
 * Mathematical basis:
 * - TF(t,d) = count(t in d) / |d|           (normalized term frequency)
 * - IDF(t) = log((N + 1) / (df(t) + 1)) + 1 (smoothed inverse document frequency)
 * - TF-IDF(t,d) = TF(t,d) * IDF(t)
 *
 * Cosine Similarity:
 * - cos(A,B) = (A · B) / (||A|| * ||B||)    (dot product of normalized vectors)
 */

import { Place } from '../types';
import { TFIDFIndex } from '../types/recommendation';
import { tokenize, expandQuery } from './semantic';

/**
 * Build TF-IDF index from places data
 * Should be called once at app startup and cached
 *
 * Time complexity: O(N * D) where N = places, D = avg description length
 * Space complexity: O(V * N) where V = vocabulary size
 */
export function buildTFIDFIndex(places: Place[]): TFIDFIndex {
  const documentTokens: Map<string, string[]> = new Map();
  const vocabulary: Map<string, number> = new Map();
  const documentFrequency: Map<string, number> = new Map();

  // First pass: tokenize all documents and build vocabulary
  for (const place of places) {
    const text = `${place.name} ${place.description ?? ''} ${place.tags.join(' ')} ${place.category}`;
    const tokens = tokenize(text);
    documentTokens.set(place.id, tokens);

    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      if (!vocabulary.has(token)) {
        vocabulary.set(token, vocabulary.size);
      }
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  const vocabSize = vocabulary.size;
  const N = places.length;

  // Compute IDF values with smoothing
  const idf = new Float32Array(vocabSize);
  for (const [term, index] of vocabulary) {
    const df = documentFrequency.get(term) ?? 1;
    idf[index] = Math.log((N + 1) / (df + 1)) + 1;
  }

  // Compute TF-IDF vectors for each document
  const documentVectors: Map<string, Float32Array> = new Map();

  for (const place of places) {
    const tokens = documentTokens.get(place.id) ?? [];
    const vector = new Float32Array(vocabSize);

    // Count term frequencies
    const termCounts: Map<string, number> = new Map();
    for (const token of tokens) {
      termCounts.set(token, (termCounts.get(token) ?? 0) + 1);
    }

    // Compute TF-IDF
    const docLength = tokens.length || 1;
    for (const [term, count] of termCounts) {
      const index = vocabulary.get(term);
      if (index !== undefined) {
        const tf = count / docLength;
        vector[index] = tf * idf[index];
      }
    }

    // L2 normalize the vector for efficient cosine similarity
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= norm;
    }

    documentVectors.set(place.id, vector);
  }

  return {
    vocabulary,
    idf,
    documentVectors,
    lastUpdated: Date.now(),
  };
}

/**
 * Convert query string to TF-IDF vector
 */
export function queryToVector(query: string, index: TFIDFIndex): Float32Array {
  const tokens = tokenize(query);
  const vector = new Float32Array(index.vocabulary.size);

  const termCounts: Map<string, number> = new Map();
  for (const token of tokens) {
    termCounts.set(token, (termCounts.get(token) ?? 0) + 1);
  }

  const queryLength = tokens.length || 1;
  for (const [term, count] of termCounts) {
    const idx = index.vocabulary.get(term);
    if (idx !== undefined) {
      const tf = count / queryLength;
      vector[idx] = tf * index.idf[idx];
    }
  }

  // L2 normalize
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  for (let i = 0; i < vector.length; i++) {
    vector[i] /= norm;
  }

  return vector;
}

/**
 * Compute cosine similarity between two vectors
 * Since vectors are pre-normalized, this is just the dot product
 *
 * @returns Similarity score in range [0, 1]
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
  }
  return Math.max(0, dot);
}

/**
 * Compute semantic similarity between query and place
 * Combines TF-IDF cosine similarity with expanded query matching
 *
 * @returns Similarity score in range [0, 100]
 */
export function computeSemanticScore(
  query: string,
  place: Place,
  index: TFIDFIndex,
  expandedQueryTerms?: string[]
): number {
  // TF-IDF cosine similarity (0-1)
  const queryVector = queryToVector(query, index);
  const placeVector = index.documentVectors.get(place.id);

  if (!placeVector) return 0;

  const tfidfScore = cosineSimilarity(queryVector, placeVector);

  // Expanded query matching bonus
  const expanded = expandedQueryTerms ?? expandQuery(query);
  const placeText = `${place.name} ${place.description ?? ''} ${place.tags.join(' ')}`.toLowerCase();

  let expansionMatches = 0;
  for (const term of expanded) {
    if (placeText.includes(term)) {
      expansionMatches++;
    }
  }
  const expansionScore = expanded.length > 0
    ? Math.min(1, expansionMatches / expanded.length)
    : 0;

  // Weighted combination: 60% TF-IDF, 40% expansion matching
  const combinedScore = (tfidfScore * 0.6 + expansionScore * 0.4) * 100;

  return Math.round(combinedScore);
}

/**
 * Find top-k most similar places to a query
 */
export function findSimilarPlaces(
  query: string,
  places: Place[],
  index: TFIDFIndex,
  k: number = 10
): Array<{ place: Place; score: number }> {
  const queryVector = queryToVector(query, index);
  const expanded = expandQuery(query);

  const scored = places.map(place => ({
    place,
    score: computeSemanticScore(query, place, index, expanded),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
