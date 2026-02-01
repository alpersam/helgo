export type PlaceCategory = 'cafe' | 'restaurant' | 'viewpoint' | 'walk';

export type PlaceTag =
  | 'cozy' | 'hip' | 'lake' | 'oldtown' | 'quiet' | 'touristy'
  | 'romantic' | 'cheap' | 'view' | 'photo' | 'park' | 'green'
  | 'narrow' | 'bridge' | 'city' | 'street' | 'mexican' | 'italian'
  | 'sushi' | 'burger' | 'asian' | 'swiss' | 'brunch' | 'coffee'
  | 'cocktails' | 'beer' | 'wine' | 'vegan' | 'historic';

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lon: number;
  elevation?: number; // meters above sea level
  tags: PlaceTag[];
  tiktok_url: string;
  maps_url: string;
  description?: string;
}

export interface WeatherData {
  cloudCover: number;        // 0-100%
  temperature: number;       // Celsius
  windSpeed: number;         // km/h
  precipitation: number;     // mm in last hour
  humidity: number;          // 0-100%
}

export interface SunData {
  altitude: number;          // degrees above horizon
  isDay: boolean;
  isEvening: boolean;        // 1 hour before/after sunset
  isGoldenHour: boolean;
}

export interface CreativeMetrics {
  fogEscape: {
    score: number;           // 0-100
    label: string;
    emoji: string;
  };
  reflectionPotential: {
    score: number;
    label: string;
    emoji: string;
  };
  nightGlow: {
    score: number;
    label: string;
    emoji: string;
  };
  greenPocket: {
    score: number;
    label: string;
    emoji: string;
  };
  windShelter: {
    score: number;
    label: string;
    emoji: string;
  };
}

export interface Itinerary {
  anchor: Place;
  satellite: Place;
  anchorReason: string;
  satelliteReason: string;
  mainCharacterScore: number;
  metrics: CreativeMetrics;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  text?: string;
  itineraries?: Itinerary[];
  timestamp: Date;
}

export interface UserQuery {
  raw: string;
  cuisines: string[];
  vibes: string[];
  categories: PlaceCategory[];
  hasTimeConstraint: boolean;
}
