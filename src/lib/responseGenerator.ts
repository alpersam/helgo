/**
 * Context-aware response generation for the chatbot.
 * Replaces hardcoded response arrays with dynamic, personalized messages.
 */

import { Intent, Itinerary, WeatherData, DaylightData } from '../types';

export type QueryType = 'search' | 'refinement' | 'exploration' | 'clarification';

export interface ResponseContext {
  intent: Intent;
  itineraries: Itinerary[];
  weather: WeatherData;
  daylight: DaylightData;
  isFollowUp: boolean;
  queryType: QueryType;
  previousQueryType?: QueryType;
}

/**
 * Detect the type of query based on intent and conversation context
 */
export function detectQueryType(intent: Intent, isFollowUp: boolean): QueryType {
  const refinementKeywords = /\b(more|another|different|else|instead|other|quieter|closer|cheaper|budget|indoor|outdoor)\b/i;

  if (isFollowUp && refinementKeywords.test(intent.raw)) {
    return 'refinement';
  }

  const hasStructuredIntent =
    intent.cuisine.length > 0 ||
    intent.categoryPreference.length > 0 ||
    intent.vibes.length > 0 ||
    intent.areaFilter !== undefined;

  if (!hasStructuredIntent && intent.raw.length < 15) {
    return 'clarification';
  }

  if (!hasStructuredIntent) {
    return 'exploration';
  }

  return 'search';
}

/**
 * Generate a contextual bridge message that acknowledges user intent
 */
export function generateBridge(ctx: ResponseContext): string {
  const { intent, itineraries } = ctx;
  const count = itineraries.length;

  // Handle area-specific responses
  if (intent.areaFilter?.areaName) {
    const area = intent.areaFilter.areaName;
    if (intent.cuisine.length > 0) {
      return `Found ${count} ${intent.cuisine[0]} spot${count !== 1 ? 's' : ''} in ${area}.`;
    }
    if (intent.categoryPreference.length > 0) {
      const cat = intent.categoryPreference[0];
      return `Here's what's good in ${area} for ${cat === 'restaurant' ? 'food' : cat}.`;
    }
    return `Found ${count} option${count !== 1 ? 's' : ''} in ${area}.`;
  }

  // Handle cuisine-specific responses
  if (intent.cuisine.length > 0) {
    const cuisine = intent.cuisine[0];
    if (intent.vibes.length > 0) {
      return `Found some ${intent.vibes[0]} ${cuisine} spots.`;
    }
    return `Got ${count} ${cuisine} pick${count !== 1 ? 's' : ''} for you.`;
  }

  // Handle vibe-specific responses
  if (intent.vibes.length > 0) {
    const vibe = intent.vibes[0];
    if (intent.categoryPreference.length > 0) {
      return `Here are some ${vibe} ${intent.categoryPreference[0]} options.`;
    }
    return `Found ${count} ${vibe} spot${count !== 1 ? 's' : ''}.`;
  }

  // Handle category-specific responses
  if (intent.categoryPreference.length > 0) {
    const cat = intent.categoryPreference[0];
    const catLabel = cat === 'restaurant' ? 'places to eat' : cat === 'cafe' ? 'cafes' : `${cat}s`;
    return `Here are ${count} ${catLabel} nearby.`;
  }

  // Handle constraint-specific responses
  if (intent.constraints.includes('budget')) {
    return `Found ${count} budget-friendly option${count !== 1 ? 's' : ''}.`;
  }

  if (intent.constraints.includes('quiet')) {
    return `Here are some quieter spots.`;
  }

  // Default responses based on query type
  return `Here's what I found.`;
}

/**
 * Generate a response suffix based on context (weather, time of day)
 */
export function generateContextSuffix(ctx: ResponseContext): string {
  const { weather, daylight } = ctx;

  if (daylight.isGoldenHour) {
    return "Great timing - it's golden hour.";
  }

  if (daylight.isEvening) {
    return "Perfect for the evening.";
  }

  if (weather.precipitation > 0.5) {
    return "I picked spots that work in the rain.";
  }

  if (weather.temperature > 25) {
    return "Nice day to be outside.";
  }

  return '';
}

/**
 * Generate response for refinement queries
 */
export function generateRefinementResponse(ctx: ResponseContext): string {
  const { intent } = ctx;
  const raw = intent.raw.toLowerCase();

  if (raw.includes('more') || raw.includes('another')) {
    return 'Here are some more options.';
  }

  if (raw.includes('quieter') || raw.includes('quiet')) {
    return 'Found some quieter alternatives.';
  }

  if (raw.includes('closer') || raw.includes('nearby')) {
    return 'Here are closer options.';
  }

  if (raw.includes('budget') || raw.includes('cheaper')) {
    return 'Found some more affordable spots.';
  }

  if (raw.includes('indoor')) {
    return 'Switching to indoor options.';
  }

  if (raw.includes('outdoor')) {
    return 'Here are some outdoor spots instead.';
  }

  if (raw.includes('different') || raw.includes('else')) {
    return 'How about these instead?';
  }

  return 'Adjusted based on your feedback.';
}

/**
 * Generate response when no results are found
 */
export function generateNoResultsResponse(ctx: ResponseContext): string {
  const { intent } = ctx;

  if (intent.areaFilter?.areaName) {
    return `I couldn't find anything matching in ${intent.areaFilter.areaName}. Try a nearby area?`;
  }

  if (intent.cuisine.length > 0) {
    return `No ${intent.cuisine[0]} spots matched your criteria. Want to try something similar?`;
  }

  return "I couldn't find anything matching. Want to adjust your search?";
}

/**
 * Main response generation function
 */
export function generateResponse(ctx: ResponseContext): string {
  const { itineraries, queryType } = ctx;

  // Handle no results
  if (itineraries.length === 0) {
    return generateNoResultsResponse(ctx);
  }

  // Generate based on query type
  let response = '';

  switch (queryType) {
    case 'refinement':
      response = generateRefinementResponse(ctx);
      break;
    case 'clarification':
      response = 'Here are some suggestions to get started.';
      break;
    case 'exploration':
      response = generateBridge(ctx);
      break;
    case 'search':
    default:
      response = generateBridge(ctx);
      break;
  }

  // Add context suffix if meaningful
  const suffix = generateContextSuffix(ctx);
  if (suffix && queryType === 'search') {
    response = `${response} ${suffix}`;
  }

  return response;
}

/**
 * Generate follow-up prompt based on results
 */
export function generateFollowUpPrompt(ctx: ResponseContext): string | null {
  const { intent, daylight, weather } = ctx;

  // Context-aware follow-ups
  if (daylight.isGoldenHour && !intent.categoryPreference.includes('viewpoint')) {
    return "Want a viewpoint for the sunset?";
  }

  if (weather.precipitation > 0.5 && intent.indoorPreference !== 'indoor') {
    return "Want some indoor alternatives?";
  }

  if (intent.categoryPreference.includes('restaurant') || intent.cuisine.length > 0) {
    return "Something to do after?";
  }

  return null;
}
