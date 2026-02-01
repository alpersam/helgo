import { Place, PlaceCategory, PlaceTag } from './index';

/**
 * Pre-computed TF-IDF index for semantic matching
 * Built once at app startup from places data
 */
export interface TFIDFIndex {
  vocabulary: Map<string, number>;
  idf: Float32Array;
  documentVectors: Map<string, Float32Array>;
  lastUpdated: number;
}

/**
 * Pre-computed embedding index for semantic matching
 */
export interface EmbeddingIndex {
  dimension: number;
  vectors: Map<string, Float32Array>;
  lastUpdated: number;
}

/**
 * Beta distribution prior for Thompson Sampling
 */
export interface BetaPrior {
  alpha: number;
  beta: number;
}

/**
 * Session state for preference learning within a user session
 */
export interface SessionState {
  sessionId: string;
  startedAt: number;

  // Interaction tracking
  shownPlaces: Set<string>;
  selectedPlaces: string[];
  rejectedCategories: Set<PlaceCategory>;

  // Learned weights (Thompson Sampling posteriors)
  categoryPriors: Map<PlaceCategory, BetaPrior>;
  tagPriors: Map<string, BetaPrior>;

  // Temporal patterns
  queryCount: number;
  lastQueryTime: number;
}

/**
 * Scoring components breakdown for debugging and transparency
 */
export interface ScoringBreakdown {
  baseScore: number;
  semanticScore: number;
  contextScore: number;
  explorationBonus: number;
  diversityPenalty: number;
  sessionBoost: number;
  finalScore: number;
}

/**
 * Enhanced recommendation result with full metadata
 */
export interface EnhancedScoredPlace {
  place: Place;
  score: number;
  breakdown: ScoringBreakdown;
  confidence: number;
  novelty: number;
  reason: string;
}

/**
 * Diversity metrics for evaluating result set quality
 */
export interface DiversityMetrics {
  categoryEntropy: number;
  tagCoverage: number;
  geographicSpread: number;
  experientialDistance: number;
}

/**
 * Configuration for scoring weights (tunable for A/B testing)
 */
export interface ScoringConfig {
  baseWeight: number;
  semanticWeight: number;
  contextWeight: number;
  explorationWeight: number;
  sessionWeight: number;
  temperature: number;
  diversityLambda: number;
  similarityThreshold: number;
}
