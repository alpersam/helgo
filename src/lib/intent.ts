import { Intent, IndoorPreference, PhotoMode, PlaceCategory, AreaFilter } from '../types';

const CUISINE_KEYWORDS: Record<string, string[]> = {
  mexican: ['mexican', 'taco', 'tacos', 'burrito', 'mezcal', 'tex-mex', 'tex mex', 'taqueria'],
  italian: ['italian', 'pasta', 'pizza', 'risotto'],
  sushi: ['sushi', 'japanese', 'ramen'],
  asian: ['asian', 'thai', 'vietnamese', 'chinese', 'korean'],
  burger: ['burger', 'burgers', 'fries'],
  swiss: ['swiss', 'fondue', 'raclette', 'rösti'],
  vegan: ['vegan', 'vegetarian', 'plant-based'],
  brunch: ['brunch', 'breakfast', 'eggs'],
  coffee: ['coffee', 'café', 'cafe', 'espresso', 'latte'],
  turkish: ['turkish', 'turk', 'kebab', 'doner', 'döner', 'pide', 'lahmacun'],
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
  activity: ['activity', 'things to do', 'experience'],
  shopping: ['shopping', 'shop', 'boutique', 'mall'],
  sport: ['sport', 'gym', 'fitness', 'climb', 'swim', 'tennis'],
  wellness: ['spa', 'wellness', 'sauna', 'massage', 'relax'],
  accommodation: ['hotel', 'hostel', 'stay', 'accommodation'],
  event: ['event', 'concert', 'festival', 'show', 'theatre'],
  sightseeing: ['sight', 'sightseeing', 'attraction', 'landmark'],
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

// Zurich area/district keywords mapped to postal codes
const AREA_KEYWORDS: Record<string, { postalCodes: string[]; name: string }> = {
  // City center / Old town
  'old town': { postalCodes: ['8001'], name: 'Old Town' },
  'oldtown': { postalCodes: ['8001'], name: 'Old Town' },
  'altstadt': { postalCodes: ['8001'], name: 'Altstadt' },
  'niederdorf': { postalCodes: ['8001'], name: 'Niederdorf' },
  'city center': { postalCodes: ['8001'], name: 'City Center' },
  'city centre': { postalCodes: ['8001'], name: 'City Center' },
  'downtown': { postalCodes: ['8001'], name: 'Downtown' },
  'center': { postalCodes: ['8001'], name: 'City Center' },
  // Enge
  'enge': { postalCodes: ['8002'], name: 'Enge' },
  'kreis 2': { postalCodes: ['8002'], name: 'Kreis 2' },
  'district 2': { postalCodes: ['8002'], name: 'Kreis 2' },
  // Wiedikon / Sihlfeld
  'wiedikon': { postalCodes: ['8003'], name: 'Wiedikon' },
  'sihlfeld': { postalCodes: ['8003'], name: 'Sihlfeld' },
  'kreis 3': { postalCodes: ['8003'], name: 'Kreis 3' },
  'district 3': { postalCodes: ['8003'], name: 'Kreis 3' },
  // Aussersihl / Langstrasse / Kreis 4
  'langstrasse': { postalCodes: ['8004'], name: 'Langstrasse' },
  'langstr': { postalCodes: ['8004'], name: 'Langstrasse' },
  'aussersihl': { postalCodes: ['8004'], name: 'Aussersihl' },
  'kreis 4': { postalCodes: ['8004'], name: 'Kreis 4' },
  'district 4': { postalCodes: ['8004'], name: 'Kreis 4' },
  // Gewerbeschule / Kreis 5 / Limmatplatz
  'kreis 5': { postalCodes: ['8005'], name: 'Kreis 5' },
  'district 5': { postalCodes: ['8005'], name: 'Kreis 5' },
  'limmatplatz': { postalCodes: ['8005'], name: 'Limmatplatz' },
  'escher wyss': { postalCodes: ['8005'], name: 'Escher Wyss' },
  'hardbrücke': { postalCodes: ['8005'], name: 'Hardbrücke' },
  'viadukt': { postalCodes: ['8005'], name: 'Viadukt' },
  'im viadukt': { postalCodes: ['8005'], name: 'Im Viadukt' },
  // Unterstrass / Oberstrass / Kreis 6
  'kreis 6': { postalCodes: ['8006'], name: 'Kreis 6' },
  'district 6': { postalCodes: ['8006'], name: 'Kreis 6' },
  'unterstrass': { postalCodes: ['8006'], name: 'Unterstrass' },
  'oberstrass': { postalCodes: ['8006'], name: 'Oberstrass' },
  // Fluntern / Hottingen / Kreis 7
  'kreis 7': { postalCodes: ['8032', '8044'], name: 'Kreis 7' },
  'district 7': { postalCodes: ['8032', '8044'], name: 'Kreis 7' },
  'fluntern': { postalCodes: ['8044'], name: 'Fluntern' },
  'hottingen': { postalCodes: ['8032'], name: 'Hottingen' },
  'zoo': { postalCodes: ['8044'], name: 'Zoo' },
  // Seefeld / Riesbach / Kreis 8
  'seefeld': { postalCodes: ['8008'], name: 'Seefeld' },
  'riesbach': { postalCodes: ['8008'], name: 'Riesbach' },
  'kreis 8': { postalCodes: ['8008'], name: 'Kreis 8' },
  'district 8': { postalCodes: ['8008'], name: 'Kreis 8' },
  // Altstetten / Albisrieden / Kreis 9
  'altstetten': { postalCodes: ['8048'], name: 'Altstetten' },
  'albisrieden': { postalCodes: ['8047'], name: 'Albisrieden' },
  'kreis 9': { postalCodes: ['8047', '8048'], name: 'Kreis 9' },
  'district 9': { postalCodes: ['8047', '8048'], name: 'Kreis 9' },
  // Höngg / Wipkingen / Kreis 10
  'höngg': { postalCodes: ['8049'], name: 'Höngg' },
  'hongg': { postalCodes: ['8049'], name: 'Höngg' },
  'wipkingen': { postalCodes: ['8037'], name: 'Wipkingen' },
  'kreis 10': { postalCodes: ['8037', '8049'], name: 'Kreis 10' },
  'district 10': { postalCodes: ['8037', '8049'], name: 'Kreis 10' },
  // Affoltern / Oerlikon / Seebach / Kreis 11
  'oerlikon': { postalCodes: ['8050'], name: 'Oerlikon' },
  'affoltern': { postalCodes: ['8046'], name: 'Affoltern' },
  'seebach': { postalCodes: ['8052'], name: 'Seebach' },
  'kreis 11': { postalCodes: ['8046', '8050', '8052'], name: 'Kreis 11' },
  'district 11': { postalCodes: ['8046', '8050', '8052'], name: 'Kreis 11' },
  // Schwamendingen / Kreis 12
  'schwamendingen': { postalCodes: ['8051'], name: 'Schwamendingen' },
  'kreis 12': { postalCodes: ['8051'], name: 'Kreis 12' },
  'district 12': { postalCodes: ['8051'], name: 'Kreis 12' },
  // Landmarks / special areas
  'hauptbahnhof': { postalCodes: ['8001'], name: 'Hauptbahnhof' },
  'hb': { postalCodes: ['8001'], name: 'Hauptbahnhof' },
  'bahnhofstrasse': { postalCodes: ['8001'], name: 'Bahnhofstrasse' },
  'bellevue': { postalCodes: ['8001', '8008'], name: 'Bellevue' },
  'stadelhofen': { postalCodes: ['8001', '8008'], name: 'Stadelhofen' },
  'eth': { postalCodes: ['8006', '8092'], name: 'ETH' },
  'university': { postalCodes: ['8006'], name: 'University' },
  'uni': { postalCodes: ['8006'], name: 'University' },
  'uetliberg': { postalCodes: ['8143'], name: 'Uetliberg' },
  'lake': { postalCodes: ['8002', '8008'], name: 'Lake Area' },
  'lakeside': { postalCodes: ['8002', '8008'], name: 'Lakeside' },
  'by the lake': { postalCodes: ['8002', '8008'], name: 'Lakeside' },
};

// Center coordinates for proximity-based queries
const AREA_CENTERS: Record<string, { lat: number; lon: number }> = {
  'old town': { lat: 47.3717, lon: 8.5423 },
  'altstadt': { lat: 47.3717, lon: 8.5423 },
  'hauptbahnhof': { lat: 47.3779, lon: 8.5402 },
  'hb': { lat: 47.3779, lon: 8.5402 },
  'langstrasse': { lat: 47.3781, lon: 8.5262 },
  'kreis 4': { lat: 47.3781, lon: 8.5262 },
  'kreis 5': { lat: 47.3875, lon: 8.5180 },
  'limmatplatz': { lat: 47.3855, lon: 8.5305 },
  'seefeld': { lat: 47.3576, lon: 8.5537 },
  'enge': { lat: 47.3649, lon: 8.5316 },
  'wiedikon': { lat: 47.3702, lon: 8.5195 },
  'oerlikon': { lat: 47.4105, lon: 8.5446 },
  'bellevue': { lat: 47.3667, lon: 8.5456 },
  'lake': { lat: 47.3600, lon: 8.5400 },
  'lakeside': { lat: 47.3600, lon: 8.5400 },
  'by the lake': { lat: 47.3600, lon: 8.5400 },
  'eth': { lat: 47.3764, lon: 8.5479 },
  'university': { lat: 47.3764, lon: 8.5479 },
  'uni': { lat: 47.3764, lon: 8.5479 },
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

function detectAreaFilter(text: string): AreaFilter | undefined {
  const lowerText = text.toLowerCase();

  // Check for proximity-based queries ("near X", "around X", "close to X")
  const proximityPatterns = [
    /\bnear\s+(the\s+)?(\w+(?:\s+\w+)?)/i,
    /\baround\s+(the\s+)?(\w+(?:\s+\w+)?)/i,
    /\bclose\s+to\s+(the\s+)?(\w+(?:\s+\w+)?)/i,
    /\bby\s+(the\s+)?(\w+(?:\s+\w+)?)/i,
  ];

  for (const pattern of proximityPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      const areaName = match[2]?.toLowerCase().trim();
      if (areaName && AREA_CENTERS[areaName]) {
        const center = AREA_CENTERS[areaName];
        return {
          centerLat: center.lat,
          centerLon: center.lon,
          radiusKm: 0.8,
          areaName: AREA_KEYWORDS[areaName]?.name ?? areaName,
        };
      }
    }
  }

  // Check for "in X" patterns
  const inPatterns = [
    /\bin\s+(the\s+)?(\w+(?:\s+\w+)?)/i,
    /\bat\s+(the\s+)?(\w+(?:\s+\w+)?)/i,
  ];

  for (const pattern of inPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      const areaName = match[2]?.toLowerCase().trim();
      if (areaName && AREA_KEYWORDS[areaName]) {
        const areaInfo = AREA_KEYWORDS[areaName];
        // For "in X" queries, use postal codes for exact filtering
        if (AREA_CENTERS[areaName]) {
          return {
            postalCodes: areaInfo.postalCodes,
            centerLat: AREA_CENTERS[areaName].lat,
            centerLon: AREA_CENTERS[areaName].lon,
            radiusKm: 1.0,
            areaName: areaInfo.name,
          };
        }
        return {
          postalCodes: areaInfo.postalCodes,
          areaName: areaInfo.name,
        };
      }
    }
  }

  // Check for direct area mentions without prepositions (longest match first)
  const sortedAreaKeys = Object.keys(AREA_KEYWORDS).sort((a, b) => b.length - a.length);
  for (const areaKey of sortedAreaKeys) {
    if (lowerText.includes(areaKey)) {
      const areaInfo = AREA_KEYWORDS[areaKey];
      if (AREA_CENTERS[areaKey]) {
        return {
          postalCodes: areaInfo.postalCodes,
          centerLat: AREA_CENTERS[areaKey].lat,
          centerLon: AREA_CENTERS[areaKey].lon,
          radiusKm: 1.0,
          areaName: areaInfo.name,
        };
      }
      return {
        postalCodes: areaInfo.postalCodes,
        areaName: areaInfo.name,
      };
    }
  }

  return undefined;
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

  let cuisine = matchKeywords(text, CUISINE_KEYWORDS);
  const vibes = matchKeywords(text, VIBE_KEYWORDS);
  const categoryPreference = matchCategories(text);
  const constraints = detectConstraints(text);
  const areaFilter = detectAreaFilter(text);

  if (categoryPreference.includes('cafe')) {
    cuisine = cuisine.filter(item => item !== 'coffee');
  }

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
    areaFilter,
  };
}

