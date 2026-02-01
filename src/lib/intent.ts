import { Intent, IndoorPreference, PhotoMode, PlaceCategory } from '../types';

const CUISINE_KEYWORDS: Record<string, string[]> = {
  mexican: ['mexican', 'taco', 'tacos', 'burrito', 'mezcal'],
  italian: ['italian', 'pasta', 'pizza', 'risotto'],
  sushi: ['sushi', 'japanese', 'ramen'],
  asian: ['asian', 'thai', 'vietnamese', 'chinese', 'korean'],
  burger: ['burger', 'burgers', 'fries'],
  swiss: ['swiss', 'fondue', 'raclette', 'rösti'],
  vegan: ['vegan', 'vegetarian', 'plant-based'],
  brunch: ['brunch', 'breakfast', 'eggs'],
  coffee: ['coffee', 'café', 'cafe', 'espresso', 'latte'],
};

const CATEGORY_KEYWORDS: Record<PlaceCategory, string[]> = {
  cafe: ['cafe', 'café', 'coffee'],
  restaurant: ['restaurant', 'lunch', 'dinner', 'food', 'eat'],
  viewpoint: ['view', 'lookout', 'panorama', 'viewpoint'],
  walk: ['walk', 'stroll', 'wander', 'hike'],
  bar: ['bar', 'cocktail', 'beer', 'wine'],
  museum: ['museum', 'gallery'],
  market: ['market', 'food hall', 'market hall'],
  park: ['park', 'garden', 'green'],
};

const VIBE_KEYWORDS: Record<string, string[]> = {
  cozy: ['cozy', 'warm', 'intimate'],
  romantic: ['romantic', 'date', 'couple'],
  chill: ['chill', 'relax', 'calm', 'quiet'],
  lively: ['lively', 'buzz', 'busy', 'energetic'],
  scenic: ['scenic', 'view', 'panorama', 'lake', 'water'],
  historic: ['historic', 'oldtown', 'old town', 'heritage'],
  local: ['local', 'neighborhood', 'non-touristy'],
  budget: ['budget', 'cheap', 'affordable'],
};

const INDOOR_KEYWORDS = ['indoor', 'inside', 'indoors', 'museum', 'cozy'];
const OUTDOOR_KEYWORDS = ['outdoor', 'outside', 'walk', 'hike', 'view', 'lake', 'park'];
const PHOTO_KEYWORDS = ['photo', 'instagram', 'instagrammable', 'photogenic', 'pics', 'pictures'];
const GROUP_KEYWORDS: Record<string, string[]> = {
  solo: ['solo', 'alone', 'by myself'],
  couple: ['date', 'couple', 'romantic'],
  friends: ['friends', 'group', 'mates'],
  family: ['family', 'kids', 'children'],
};

function extractTimeBudget(text: string): number | undefined {
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs)\b/);
  if (hourMatch) {
    return Math.round(parseFloat(hourMatch[1]) * 60);
  }
  const minMatch = text.match(/(\d+)\s*(minute|minutes|min|mins)\b/);
  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }
  if (text.includes('quick') || text.includes('short')) {
    return 60;
  }
  if (text.includes('half day')) {
    return 240;
  }
  return undefined;
}

function detectIndoorPreference(text: string): IndoorPreference {
  const hasIndoor = INDOOR_KEYWORDS.some(keyword => text.includes(keyword));
  const hasOutdoor = OUTDOOR_KEYWORDS.some(keyword => text.includes(keyword));
  if (hasIndoor && hasOutdoor) return 'mixed';
  if (hasIndoor) return 'indoor';
  if (hasOutdoor) return 'outdoor';
  return 'no-preference';
}

function detectPhotoMode(text: string): PhotoMode {
  if (PHOTO_KEYWORDS.some(keyword => text.includes(keyword))) {
    if (text.includes('photoshoot') || text.includes('shoot')) {
      return 'focused';
    }
    return 'casual';
  }
  return 'none';
}

function detectGroupContext(text: string): Intent['groupContext'] {
  for (const [context, keywords] of Object.entries(GROUP_KEYWORDS)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return context as Intent['groupContext'];
    }
  }
  return undefined;
}

function detectConstraints(text: string): string[] {
  const constraints: string[] = [];
  if (text.includes('accessible') || text.includes('wheelchair')) {
    constraints.push('accessible');
  }
  if (text.includes('low budget') || text.includes('cheap') || text.includes('budget')) {
    constraints.push('budget');
  }
  if (text.includes('quiet') || text.includes('no crowds')) {
    constraints.push('quiet');
  }
  if (text.includes('rain') || text.includes('raining')) {
    constraints.push('rain');
  }
  if (text.includes('kid') || text.includes('family')) {
    constraints.push('family-friendly');
  }
  return constraints;
}

function matchKeywords(text: string, dictionary: Record<string, string[]>): string[] {
  const matches: string[] = [];
  for (const [key, keywords] of Object.entries(dictionary)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      matches.push(key);
    }
  }
  return matches;
}

function matchCategories(text: string): PlaceCategory[] {
  const matches: PlaceCategory[] = [];
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      matches.push(category as PlaceCategory);
    }
  }
  return matches;
}

/**
 * parseIntent()
 * Examples (unit-test-like):
 * - "Quick sunset walk by the lake for photos" ->
 *   { categoryPreference: ['walk'], vibes: ['scenic'], timeBudgetMins: 60, photoMode: 'casual', indoorPreference: 'outdoor' }
 * - "Cozy Italian dinner for a date night" ->
 *   { cuisine: ['italian'], categoryPreference: ['restaurant'], vibes: ['cozy','romantic'], groupContext: 'couple' }
 * - "Rainy day, indoor museum with kids" ->
 *   { categoryPreference: ['museum'], constraints: ['rain','family-friendly'], indoorPreference: 'indoor', groupContext: 'family' }
 */
export function parseIntent(userText: string): Intent {
  const text = userText.toLowerCase();

  const cuisine = matchKeywords(text, CUISINE_KEYWORDS);
  const vibes = matchKeywords(text, VIBE_KEYWORDS);
  const categoryPreference = matchCategories(text);
  const constraints = detectConstraints(text);

  return {
    raw: userText,
    cuisine,
    categoryPreference,
    vibes,
    constraints,
    timeBudgetMins: extractTimeBudget(text),
    groupContext: detectGroupContext(text),
    photoMode: detectPhotoMode(text),
    indoorPreference: detectIndoorPreference(text),
  };
}
