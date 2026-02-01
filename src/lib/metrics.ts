import { Place, WeatherData, SunData, CreativeMetrics } from '../types';

interface MetricInput {
  place: Place;
  weather: WeatherData;
  sun: SunData;
  userElevation: number;
}

export function computeFogEscape(input: MetricInput): CreativeMetrics['fogEscape'] {
  const { place, weather, userElevation } = input;
  const elevationGain = (place.elevation ?? 408) - userElevation;
  const isHighCloudCover = weather.cloudCover > 70;

  // High elevation + foggy conditions = great fog escape potential
  if (isHighCloudCover && elevationGain > 100) {
    return {
      score: Math.min(100, 60 + elevationGain / 10),
      label: 'Above-fog escape',
      emoji: '🌤',
    };
  }

  if (elevationGain > 200) {
    return {
      score: 70,
      label: 'High ground advantage',
      emoji: '⛰️',
    };
  }

  if (isHighCloudCover) {
    return {
      score: 30,
      label: 'Fog bowl',
      emoji: '☁️',
    };
  }

  return {
    score: 50,
    label: 'Clear skies',
    emoji: '☀️',
  };
}

export function computeReflectionPotential(input: MetricInput): CreativeMetrics['reflectionPotential'] {
  const { place, weather } = input;
  const hasWater = place.tags.includes('lake') || place.tags.includes('bridge');
  const recentRain = weather.precipitation > 0;
  const coolTemp = weather.temperature >= 0 && weather.temperature <= 10;
  const lowWind = weather.windSpeed < 10;

  let score = 40;
  let label = 'Reflection chance: low';

  if (hasWater) {
    score += 20;
  }

  if (recentRain && coolTemp) {
    score += 30;
    label = 'Reflection chance: high';
  } else if (recentRain || (lowWind && hasWater)) {
    score += 15;
    label = 'Reflection chance: medium';
  }

  if (score >= 70) {
    return { score, label: 'Reflection chance: high', emoji: '🪞' };
  }
  if (score >= 50) {
    return { score, label: 'Reflection chance: medium', emoji: '🪞' };
  }
  return { score, label: 'Reflection chance: low', emoji: '💧' };
}

export function computeNightGlow(input: MetricInput): CreativeMetrics['nightGlow'] {
  const { place, sun } = input;
  const isEvening = sun.isEvening || !sun.isDay;
  const hasNightVibes = place.tags.includes('oldtown') ||
                        place.tags.includes('city') ||
                        place.tags.includes('bridge') ||
                        place.tags.includes('street');

  if (isEvening && hasNightVibes) {
    return {
      score: 85,
      label: 'Night glow: alive',
      emoji: '🌙',
    };
  }

  if (isEvening) {
    return {
      score: 60,
      label: 'Night glow: calm',
      emoji: '🌙',
    };
  }

  if (hasNightVibes) {
    return {
      score: 50,
      label: 'Night potential',
      emoji: '🌆',
    };
  }

  return {
    score: 30,
    label: 'Daytime spot',
    emoji: '☀️',
  };
}

export function computeGreenPocket(input: MetricInput): CreativeMetrics['greenPocket'] {
  const { place } = input;
  const greenTags = ['park', 'lake', 'green'];
  const hasGreen = place.tags.some(tag => greenTags.includes(tag));

  if (hasGreen) {
    return {
      score: 80,
      label: 'Green reset nearby',
      emoji: '🌿',
    };
  }

  return {
    score: 30,
    label: 'Urban vibes',
    emoji: '🏙️',
  };
}

export function computeWindShelter(input: MetricInput): CreativeMetrics['windShelter'] {
  const { place, weather } = input;
  const isWindy = weather.windSpeed > 20;
  const hasShelter = place.tags.includes('oldtown') ||
                     place.tags.includes('narrow') ||
                     place.tags.includes('cozy') ||
                     place.indoorOutdoor === 'indoor';

  if (isWindy && hasShelter) {
    return {
      score: 80,
      label: 'Feels sheltered',
      emoji: '🧥',
    };
  }

  if (hasShelter) {
    return {
      score: 60,
      label: 'Protected spot',
      emoji: '🏠',
    };
  }

  if (isWindy) {
    return {
      score: 20,
      label: 'Exposed to wind',
      emoji: '💨',
    };
  }

  return {
    score: 50,
    label: 'Moderate exposure',
    emoji: '🌬️',
  };
}

export function computeAllMetrics(
  place: Place,
  weather: WeatherData,
  sun: SunData,
  userElevation: number
): CreativeMetrics {
  const input: MetricInput = { place, weather, sun, userElevation };

  return {
    fogEscape: computeFogEscape(input),
    reflectionPotential: computeReflectionPotential(input),
    nightGlow: computeNightGlow(input),
    greenPocket: computeGreenPocket(input),
    windShelter: computeWindShelter(input),
  };
}
