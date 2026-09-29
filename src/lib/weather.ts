import { APP_TIMEZONE } from './config';

export interface WeatherContext {
  temperatureF: number;
  apparentF: number;
  conditions: string;
  windMph: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  month: string;
}

// WMO Weather Code → human-readable label
function describeWeatherCode(code: number): string {
  if (code === 0) return 'clear sky';
  if (code === 1) return 'mainly clear';
  if (code === 2) return 'partly cloudy';
  if (code === 3) return 'overcast';
  if (code >= 45 && code <= 48) return 'foggy';
  if (code >= 51 && code <= 55) return 'drizzle';
  if (code >= 56 && code <= 57) return 'freezing drizzle';
  if (code >= 61 && code <= 65) return 'rain';
  if (code >= 66 && code <= 67) return 'freezing rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'rain showers';
  if (code >= 85 && code <= 86) return 'snow showers';
  if (code >= 95 && code <= 99) return 'thunderstorm';
  return 'mixed conditions';
}

function getSeason(month: number): WeatherContext['season'] {
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

function getTimeOfDay(hour: number): WeatherContext['timeOfDay'] {
  if (hour >= 6 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 16) return 'afternoon';
  if (hour >= 17 && hour <= 20) return 'evening';
  return 'night';
}

export async function getSeattleWeather(): Promise<WeatherContext> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    '?latitude=47.6062&longitude=-122.3321' +
    '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation' +
    '&temperature_unit=fahrenheit' +
    '&wind_speed_unit=mph' +
    `&timezone=${encodeURIComponent(APP_TIMEZONE)}`;

  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`Open-Meteo fetch failed: ${res.status}`);

  const data = await res.json();
  const c = data.current;

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: APP_TIMEZONE }));
  const hour = now.getHours();
  const month = now.getMonth(); // 0-indexed

  return {
    temperatureF: Math.round(c.temperature_2m),
    apparentF: Math.round(c.apparent_temperature),
    conditions: describeWeatherCode(c.weather_code),
    windMph: Math.round(c.wind_speed_10m),
    timeOfDay: getTimeOfDay(hour),
    season: getSeason(month),
    month: now.toLocaleString('en-US', { month: 'long' }),
  };
}
