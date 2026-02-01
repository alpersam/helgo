export type PlaceCategory =
  | 'cafe'
  | 'restaurant'
  | 'viewpoint'
  | 'walk'
  | 'bar'
  | 'museum'
  | 'market'
  | 'park'
  | 'activity'
  | 'shopping'
  | 'sport'
  | 'wellness'
  | 'accommodation'
  | 'event'
  | 'sightseeing';

export type PlaceTag =
  | 'cozy' | 'hip' | 'lake' | 'oldtown' | 'quiet' | 'touristy'
  | 'romantic' | 'cheap' | 'view' | 'photo' | 'park' | 'green'
  | 'narrow' | 'bridge' | 'city' | 'street' | 'mexican' | 'italian'
  | 'sushi' | 'burger' | 'asian' | 'swiss' | 'brunch' | 'coffee'
  | 'cocktails' | 'beer' | 'wine' | 'vegan' | 'historic' | 'turkish';

export type IndoorOutdoor = 'indoor' | 'outdoor' | 'mixed';
export type PriceLevel = 'budget' | 'mid' | 'high';
export type TimeOfDay = 'morning' | 'afternoon' | 'sunset' | 'night';

export type PhotoSpot =
  | { lat: number; lon: number }
  | { placeId: string };

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lon: number;
  elevation?: number; // meters above sea level
  tags: PlaceTag[];
  address?: string;
  website?: string;
  phone?: string;
  photoUrl?: string;
  gettingThere?: string;
  mapsUrl: string;
  indoorOutdoor: IndoorOutdoor;
  durationMins: number;
  price?: PriceLevel;
  bestTimeOfDay?: TimeOfDay;
  area?: string;
  photoSpots?: PhotoSpot[];
  description?: string;
  isOpen?: boolean;
  popularity?: number; // 0-100
  seasonality?: {
    startMonth: number; // 1-12
    endMonth: number; // 1-12
  };
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

export interface DaylightData extends SunData {
  sunrise: Date;
  sunset: Date;
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
  why: string;
  metrics: CreativeMetrics;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  text?: string;
  itineraries?: Itinerary[];
  timestamp: Date;
}

export type GroupContext = 'solo' | 'couple' | 'friends' | 'family';
export type PhotoMode = 'none' | 'casual' | 'focused';
export type IndoorPreference = 'indoor' | 'outdoor' | 'mixed' | 'no-preference';

export interface Intent {
  raw: string;
  cuisine: string[];
  categoryPreference: PlaceCategory[];
  vibes: string[];
  constraints: string[];
  timeBudgetMins?: number;
  groupContext?: GroupContext;
  photoMode: PhotoMode;
  indoorPreference: IndoorPreference;
}

export interface RecommendationContext {
  userLocation?: { lat: number; lon: number };
  now: Date;
  weather: WeatherData;
  daylight: DaylightData;
}
