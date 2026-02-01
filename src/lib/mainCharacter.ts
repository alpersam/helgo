import { CreativeMetrics, SunData } from '../types';

interface MainCharacterInput {
  metrics: CreativeMetrics;
  sun: SunData;
}

/**
 * Computes the Main Character Score (0-100)
 *
 * Combines:
 * - Reflection potential (high impact during wet weather)
 * - Fog escape or dramatic cloudiness
 * - Night glow (weighted more during evening)
 * - Green pocket bonus
 *
 * The score represents how "cinematic" or memorable the visit will be.
 */
export function computeMainCharacterScore(input: MainCharacterInput): number {
  const { metrics, sun } = input;

  // Base weights
  let weights = {
    reflection: 0.25,
    fogEscape: 0.20,
    nightGlow: 0.25,
    greenPocket: 0.15,
    windShelter: 0.15,
  };

  // Adjust weights based on time of day
  if (sun.isEvening || !sun.isDay) {
    // Evening: night glow matters more
    weights.nightGlow = 0.35;
    weights.reflection = 0.25;
    weights.fogEscape = 0.15;
    weights.greenPocket = 0.10;
    weights.windShelter = 0.15;
  }

  if (sun.isGoldenHour) {
    // Golden hour: reflection and views matter most
    weights.reflection = 0.35;
    weights.fogEscape = 0.25;
    weights.nightGlow = 0.15;
    weights.greenPocket = 0.15;
    weights.windShelter = 0.10;
  }

  // Calculate weighted score
  const rawScore =
    metrics.reflectionPotential.score * weights.reflection +
    metrics.fogEscape.score * weights.fogEscape +
    metrics.nightGlow.score * weights.nightGlow +
    metrics.greenPocket.score * weights.greenPocket +
    metrics.windShelter.score * weights.windShelter;

  // Normalize to 0-100 and add some variance
  const normalizedScore = Math.round(rawScore);

  // Clamp to 0-100
  return Math.max(0, Math.min(100, normalizedScore));
}

/**
 * Gets a descriptor for the Main Character Score
 */
export function getScoreDescriptor(score: number): string {
  if (score >= 80) return 'Main character energy';
  if (score >= 60) return 'Great vibes today';
  if (score >= 40) return 'Solid choice';
  if (score >= 20) return 'Quiet moment';
  return 'Hidden gem';
}

/**
 * Gets the score tier for styling
 */
export function getScoreTier(score: number): 'high' | 'medium' | 'low' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
