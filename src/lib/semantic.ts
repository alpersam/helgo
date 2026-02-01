/**
 * Semantic Matching Engine
 *
 * Provides synonym expansion and text normalization for
 * improved keyword matching beyond exact strings.
 */

import { PlaceCategory } from '../types';

/**
 * Synonym mappings for common descriptive terms
 */
const SYNONYM_MAP: Record<string, string[]> = {
  // Atmosphere/vibe synonyms
  cozy: ['comfy', 'comfortable', 'warm', 'intimate', 'snug', 'homey', 'welcoming'],
  romantic: ['date', 'couple', 'intimate', 'candlelit', 'love', 'enchanting'],
  quiet: ['peaceful', 'calm', 'serene', 'tranquil', 'relaxed', 'low-key', 'chill'],
  lively: ['buzzing', 'energetic', 'vibrant', 'dynamic', 'busy', 'happening'],
  hip: ['trendy', 'cool', 'modern', 'stylish', 'chic', 'fashionable', 'hipster'],
  scenic: ['picturesque', 'beautiful', 'stunning', 'gorgeous', 'breathtaking'],
  chill: ['relaxed', 'laid-back', 'easygoing', 'casual', 'mellow'],

  // Food-related synonyms
  cheap: ['budget', 'affordable', 'inexpensive', 'economical', 'value'],
  fancy: ['upscale', 'elegant', 'posh', 'high-end', 'fine dining', 'luxurious'],
  healthy: ['fresh', 'organic', 'nutritious', 'wholesome', 'clean'],
  tasty: ['delicious', 'yummy', 'good', 'amazing', 'great'],

  // Activity synonyms
  walk: ['stroll', 'wander', 'hike', 'amble', 'trek'],
  view: ['panorama', 'vista', 'lookout', 'overlook', 'scenery'],
  relax: ['unwind', 'chill', 'destress', 'rest', 'leisure'],
  explore: ['discover', 'wander', 'venture', 'roam'],

  // Weather-related
  rainy: ['rain', 'wet', 'drizzle', 'stormy'],
  sunny: ['bright', 'clear', 'warm', 'nice weather'],
};

/**
 * Category-to-semantic-terms mapping
 */
const CATEGORY_SEMANTICS: Record<PlaceCategory, string[]> = {
  cafe: ['coffee', 'espresso', 'latte', 'cappuccino', 'pastry', 'breakfast', 'brunch', 'tea'],
  restaurant: ['dining', 'dinner', 'lunch', 'cuisine', 'food', 'eat', 'meal', 'hungry'],
  bar: ['drinks', 'cocktails', 'beer', 'wine', 'nightlife', 'pub', 'happy hour'],
  viewpoint: ['panorama', 'vista', 'scenery', 'overlook', 'view', 'scenic', 'lookout'],
  walk: ['stroll', 'hike', 'trail', 'path', 'wander', 'explore', 'walking'],
  park: ['green', 'nature', 'outdoors', 'trees', 'grass', 'picnic', 'garden'],
  museum: ['art', 'history', 'culture', 'exhibition', 'gallery', 'exhibit', 'learn'],
  market: ['shopping', 'vendors', 'stalls', 'fresh', 'local', 'produce', 'food hall'],
  activity: ['experience', 'adventure', 'fun', 'entertainment', 'things to do', 'activity'],
  shopping: ['boutique', 'store', 'mall', 'retail', 'fashion', 'goods', 'shop'],
  sport: ['fitness', 'gym', 'athletic', 'exercise', 'workout', 'active', 'sports'],
  wellness: ['spa', 'massage', 'relaxation', 'sauna', 'health', 'rejuvenate', 'yoga'],
  accommodation: ['hotel', 'stay', 'lodging', 'rooms', 'sleep', 'hostel'],
  event: ['concert', 'show', 'festival', 'performance', 'live', 'entertainment'],
  sightseeing: ['landmark', 'attraction', 'monument', 'historic', 'tourist', 'sight'],
};

/**
 * Common stop words to filter out during tokenization
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between',
  'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
  'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just',
  'this', 'that', 'these', 'those', 'it', 'its',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'they', 'them',
  'want', 'looking', 'find', 'something', 'somewhere', 'place', 'spot',
  'like', 'need', 'show', 'give', 'please', 'thanks', 'good', 'nice',
]);

/**
 * Tokenize and normalize text for processing
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .filter(word => !STOP_WORDS.has(word));
}

/**
 * Expand query terms using synonym dictionary
 *
 * @example expandQuery("cozy cafe") -> ["cozy", "comfy", "warm", ..., "cafe", "coffee", ...]
 */
export function expandQuery(query: string): string[] {
  const tokens = tokenize(query);
  const expanded = new Set<string>(tokens);

  for (const token of tokens) {
    // Add synonyms
    if (SYNONYM_MAP[token]) {
      SYNONYM_MAP[token].forEach(syn => expanded.add(syn));
    }

    // Add category semantics if token matches a category
    for (const [category, semantics] of Object.entries(CATEGORY_SEMANTICS)) {
      if (token === category || semantics.includes(token)) {
        semantics.forEach(s => expanded.add(s));
      }
    }
  }

  return Array.from(expanded);
}

/**
 * Get all synonyms for a single term
 */
export function getSynonyms(term: string): string[] {
  const normalized = term.toLowerCase();
  return SYNONYM_MAP[normalized] || [];
}

/**
 * Check if two terms are semantically related
 */
export function areRelated(term1: string, term2: string): boolean {
  const t1 = term1.toLowerCase();
  const t2 = term2.toLowerCase();

  if (t1 === t2) return true;

  // Check if t2 is a synonym of t1
  if (SYNONYM_MAP[t1]?.includes(t2)) return true;

  // Check if t1 is a synonym of t2
  if (SYNONYM_MAP[t2]?.includes(t1)) return true;

  // Check if they share a synonym
  const syns1 = new Set(SYNONYM_MAP[t1] || []);
  const syns2 = SYNONYM_MAP[t2] || [];
  for (const syn of syns2) {
    if (syns1.has(syn)) return true;
  }

  return false;
}

/**
 * Compute semantic overlap between query and place text
 * Returns a score from 0-100
 */
export function computeSemanticOverlap(
  queryTerms: string[],
  placeText: string
): number {
  const expandedQuery = new Set<string>();
  for (const term of queryTerms) {
    expandedQuery.add(term);
    const synonyms = getSynonyms(term);
    synonyms.forEach(s => expandedQuery.add(s));
  }

  const placeTokens = tokenize(placeText);
  let matches = 0;

  for (const token of placeTokens) {
    if (expandedQuery.has(token)) {
      matches++;
    }
  }

  if (expandedQuery.size === 0) return 0;
  return Math.min(100, (matches / expandedQuery.size) * 100);
}
