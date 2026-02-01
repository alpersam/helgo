/**
 * Distance Decay Functions
 *
 * Implements various decay models for distance-based scoring.
 * Exponential and Gaussian decays better match real-world behavior
 * compared to linear decay.
 */

/**
 * Exponential decay: f(d) = A * exp(-d / lambda)
 *
 * @param distance - Distance in km
 * @param maxScore - Maximum score at distance 0
 * @param lambda - Decay constant (distance at which score = maxScore/e)
 */
export function exponentialDecay(
  distance: number,
  maxScore: number = 25,
  lambda: number = 1.5
): number {
  return maxScore * Math.exp(-distance / lambda);
}

/**
 * Gaussian decay: f(d) = A * exp(-d^2 / (2 * sigma^2))
 *
 * @param distance - Distance in km
 * @param maxScore - Maximum score at distance 0
 * @param sigma - Standard deviation (spread of the curve)
 */
export function gaussianDecay(
  distance: number,
  maxScore: number = 25,
  sigma: number = 2.0
): number {
  return maxScore * Math.exp(-(distance ** 2) / (2 * sigma ** 2));
}

/**
 * Logarithmic decay: f(d) = A * (1 - log(1 + d) / log(1 + d_max))
 * Slower falloff for short distances, useful for walkable areas.
 *
 * @param distance - Distance in km
 * @param maxScore - Maximum score at distance 0
 * @param maxDistance - Distance at which score = 0
 */
export function logarithmicDecay(
  distance: number,
  maxScore: number = 25,
  maxDistance: number = 10
): number {
  if (distance >= maxDistance) return 0;
  return maxScore * (1 - Math.log(1 + distance) / Math.log(1 + maxDistance));
}

/**
 * Sigmoid decay: f(d) = A / (1 + exp(k * (d - d_mid)))
 * Sharp cutoff at threshold distance.
 *
 * @param distance - Distance in km
 * @param maxScore - Maximum score
 * @param midpoint - Distance at which score = maxScore/2
 * @param steepness - How sharp the transition is
 */
export function sigmoidDecay(
  distance: number,
  maxScore: number = 25,
  midpoint: number = 2.0,
  steepness: number = 2.0
): number {
  return maxScore / (1 + Math.exp(steepness * (distance - midpoint)));
}

/**
 * Context-aware distance scoring
 * - Evening: prefer closer places
 * - Rainy: prefer closer places but boost indoor nearby
 *
 * @param distance - Distance in km
 * @param context - Current context factors
 */
export function adaptiveDistanceScore(
  distance: number,
  context: {
    isEvening: boolean;
    isRaining: boolean;
    userWalkingPreference?: 'short' | 'medium' | 'long';
  }
): number {
  let maxScore = 25;
  let lambda = 1.5;

  if (context.isEvening) {
    lambda *= 0.7;
    maxScore = 20;
  }

  if (context.isRaining) {
    lambda *= 0.6;
    maxScore = 30;
  }

  if (context.userWalkingPreference === 'short') {
    lambda *= 0.8;
  } else if (context.userWalkingPreference === 'long') {
    lambda *= 1.5;
  }

  return exponentialDecay(distance, maxScore, lambda);
}

/**
 * Haversine distance between two coordinates
 */
export function getDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
