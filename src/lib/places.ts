import { Place } from '../types';
import FallbackPlaceDB from '../data/places_zurich.json';

const FALLBACK_PLACES = (FallbackPlaceDB as { places: Place[] }).places;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

type PlacesPayload = {
  places: Place[];
  updatedAt?: string;
  ttlSeconds?: number;
};

export type PlacesSource = 'network' | 'cache' | 'fallback';

export type PlacesResult = {
  status: 'ready' | 'error';
  places: Place[];
  source: PlacesSource;
  updatedAt?: Date;
  error?: string;
};

type CacheState = {
  places: Place[];
  fetchedAt: number;
  expiresAt: number;
  etag?: string;
  updatedAt?: Date;
};

let cache: CacheState | null = null;
let inFlight: Promise<PlacesResult> | null = null;

function getApiUrl(): string | null {
  return process.env.EXPO_PUBLIC_PLACES_API_URL ?? null;
}

function parseCacheTtlMs(payload: PlacesPayload, cacheControl: string | null): number {
  if (payload.ttlSeconds && payload.ttlSeconds > 0) {
    return payload.ttlSeconds * 1000;
  }
  if (cacheControl) {
    const match = cacheControl.match(/max-age=(\d+)/);
    if (match) {
      const seconds = Number(match[1]);
      if (!Number.isNaN(seconds) && seconds > 0) {
        return seconds * 1000;
      }
    }
  }
  return DEFAULT_CACHE_TTL_MS;
}

function normalizePlaces(payload: PlacesPayload | Place[]): PlacesPayload {
  if (Array.isArray(payload)) {
    return { places: payload };
  }
  return payload;
}

function fallbackResult(error?: string): PlacesResult {
  cache = {
    places: FALLBACK_PLACES,
    fetchedAt: Date.now(),
    expiresAt: Date.now() + DEFAULT_CACHE_TTL_MS,
  };
  return {
    status: 'ready',
    places: FALLBACK_PLACES,
    source: 'fallback',
    error,
  };
}

async function fetchPlacesFromApi(): Promise<PlacesResult> {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    return fallbackResult('Missing EXPO_PUBLIC_PLACES_API_URL');
  }

  const headers: Record<string, string> = {};
  if (cache?.etag) {
    headers['If-None-Match'] = cache.etag;
  }

  const response = await fetch(apiUrl, { headers });
  if (response.status === 304 && cache) {
    const ttlMs = parseCacheTtlMs({ places: cache.places }, response.headers.get('cache-control'));
    cache = {
      ...cache,
      fetchedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };
    return {
      status: 'ready',
      places: cache.places,
      source: 'cache',
      updatedAt: cache.updatedAt,
    };
  }

  if (!response.ok) {
    return fallbackResult(`Places API error: ${response.status}`);
  }

  const payload = normalizePlaces(await response.json());
  const ttlMs = parseCacheTtlMs(payload, response.headers.get('cache-control'));
  const updatedAt = payload.updatedAt ? new Date(payload.updatedAt) : undefined;
  const etag = response.headers.get('etag') ?? undefined;

  cache = {
    places: payload.places,
    fetchedAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
    etag,
    updatedAt,
  };

  return {
    status: 'ready',
    places: payload.places,
    source: 'network',
    updatedAt,
  };
}

export async function getPlaces(options?: { forceRefresh?: boolean }): Promise<PlacesResult> {
  const now = Date.now();
  if (!options?.forceRefresh && cache && cache.expiresAt > now) {
    return {
      status: 'ready',
      places: cache.places,
      source: 'cache',
      updatedAt: cache.updatedAt,
    };
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = fetchPlacesFromApi()
    .catch(error => ({
      status: 'error',
      places: cache?.places ?? FALLBACK_PLACES,
      source: cache ? 'cache' : 'fallback',
      error: error instanceof Error ? error.message : 'Unknown places error',
    }))
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
