import { WeatherData, SunData } from '../types';

// Zürich coordinates
const ZURICH_LAT = 47.3769;
const ZURICH_LON = 8.5417;

// Simple sun position calculation (no external lib needed for basic altitude)
function calculateSunPosition(lat: number, lon: number, date: Date): SunData {
  // Convert to radians
  const latRad = (lat * Math.PI) / 180;

  // Day of year
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Solar declination (approximate)
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * (Math.PI / 180));
  const declinationRad = (declination * Math.PI) / 180;

  // Hour angle
  const hours = date.getHours() + date.getMinutes() / 60;
  // Adjust for Zürich timezone (CET = UTC+1, CEST = UTC+2)
  const utcHours = hours - 1; // Simplified, assumes CET
  const hourAngle = (utcHours - 12) * 15; // 15 degrees per hour
  const hourAngleRad = (hourAngle * Math.PI) / 180;

  // Solar altitude angle
  const sinAltitude =
    Math.sin(latRad) * Math.sin(declinationRad) +
    Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  const altitude = Math.asin(sinAltitude) * (180 / Math.PI);

  // Approximate sunset/sunrise
  const cosHourAngleSunset = -Math.tan(latRad) * Math.tan(declinationRad);
  const hourAngleSunset = Math.acos(Math.max(-1, Math.min(1, cosHourAngleSunset))) * (180 / Math.PI) / 15;
  const sunsetHour = 12 + hourAngleSunset + 1; // Adjust for CET
  const sunriseHour = 12 - hourAngleSunset + 1;

  const isDay = altitude > 0;
  const isEvening = hours >= sunsetHour - 1 && hours <= sunsetHour + 1;
  const isGoldenHour = (hours >= sunriseHour - 0.5 && hours <= sunriseHour + 1) ||
                       (hours >= sunsetHour - 1 && hours <= sunsetHour + 0.5);

  return {
    altitude,
    isDay,
    isEvening,
    isGoldenHour,
  };
}

export async function fetchWeather(): Promise<WeatherData> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${ZURICH_LAT}&longitude=${ZURICH_LON}&current=temperature_2m,relative_humidity_2m,precipitation,cloud_cover,wind_speed_10m&timezone=Europe/Zurich`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.current) {
      return {
        cloudCover: data.current.cloud_cover ?? 50,
        temperature: data.current.temperature_2m ?? 15,
        windSpeed: data.current.wind_speed_10m ?? 10,
        precipitation: data.current.precipitation ?? 0,
        humidity: data.current.relative_humidity_2m ?? 60,
      };
    }

    // Fallback defaults
    return getDefaultWeather();
  } catch (error) {
    console.warn('Weather fetch failed, using defaults:', error);
    return getDefaultWeather();
  }
}

function getDefaultWeather(): WeatherData {
  return {
    cloudCover: 50,
    temperature: 12,
    windSpeed: 15,
    precipitation: 0,
    humidity: 65,
  };
}

export function getSunData(): SunData {
  return calculateSunPosition(ZURICH_LAT, ZURICH_LON, new Date());
}

// User's approximate location (defaults to Zürich center)
export function getUserElevation(): number {
  // Zürich city center is ~408m
  return 408;
}

export { ZURICH_LAT, ZURICH_LON };
