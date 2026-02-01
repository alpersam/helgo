import { DaylightData, RecommendationContext } from '../types';
import { fetchWeather, ZURICH_LAT, ZURICH_LON } from './weather';

function calculateDaylight(lat: number, lon: number, date: Date): DaylightData {
  const latRad = (lat * Math.PI) / 180;

  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * (Math.PI / 180));
  const declinationRad = (declination * Math.PI) / 180;

  const hours = date.getHours() + date.getMinutes() / 60;
  const utcHours = hours - 1;
  const hourAngle = (utcHours - 12) * 15;
  const hourAngleRad = (hourAngle * Math.PI) / 180;

  const sinAltitude =
    Math.sin(latRad) * Math.sin(declinationRad) +
    Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  const altitude = Math.asin(sinAltitude) * (180 / Math.PI);

  const cosHourAngleSunset = -Math.tan(latRad) * Math.tan(declinationRad);
  const hourAngleSunset = Math.acos(Math.max(-1, Math.min(1, cosHourAngleSunset))) * (180 / Math.PI) / 15;
  const sunsetHour = 12 + hourAngleSunset + 1;
  const sunriseHour = 12 - hourAngleSunset + 1;

  const sunrise = new Date(date);
  sunrise.setHours(Math.floor(sunriseHour), Math.round((sunriseHour % 1) * 60), 0, 0);

  const sunset = new Date(date);
  sunset.setHours(Math.floor(sunsetHour), Math.round((sunsetHour % 1) * 60), 0, 0);

  const isDay = altitude > 0;
  const isEvening = hours >= sunsetHour - 1 && hours <= sunsetHour + 1;
  const isGoldenHour =
    (hours >= sunriseHour - 0.5 && hours <= sunriseHour + 1) ||
    (hours >= sunsetHour - 1 && hours <= sunsetHour + 0.5);

  return {
    altitude,
    isDay,
    isEvening,
    isGoldenHour,
    sunrise,
    sunset,
  };
}

export function getDaylightData(lat?: number, lon?: number, date = new Date()): DaylightData {
  const resolvedLat = lat ?? ZURICH_LAT;
  const resolvedLon = lon ?? ZURICH_LON;
  return calculateDaylight(resolvedLat, resolvedLon, date);
}

export async function buildRecommendationContext(
  userLocation?: { lat: number; lon: number }
): Promise<RecommendationContext> {
  const now = new Date();
  const weather = await fetchWeather();
  const daylight = getDaylightData(userLocation?.lat, userLocation?.lon, now);

  return {
    userLocation,
    now,
    weather,
    daylight,
  };
}
