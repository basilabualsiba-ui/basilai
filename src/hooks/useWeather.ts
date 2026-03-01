import { useState, useEffect } from 'react';

interface WeatherData {
  temperature: number;
  high: number;
  low: number;
  weatherCode: number;
  isDay: boolean;
}

const CACHE_KEY = 'weather_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const getWeatherIcon = (code: number, isDay: boolean) => {
  if (code === 0) return isDay ? '☀️' : '🌙';
  if (code <= 3) return isDay ? '⛅' : '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌧️';
  if (code <= 86) return '❄️';
  return '⛈️';
};

const getWeatherCondition = (code: number) => {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow Showers';
  return 'Thunderstorm';
};

export type WeatherCategory = 'cold' | 'mild' | 'hot' | 'rainy';

const getWeatherCategory = (temp: number, code: number): WeatherCategory => {
  if (code >= 51 && code <= 82) return 'rainy';
  if (temp < 15) return 'cold';
  if (temp > 28) return 'hot';
  return 'mild';
};

export const useWeather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      // Check cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setWeather(data);
          setIsLoading(false);
          return;
        }
      }

      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=32.46&longitude=35.30&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=Asia/Jerusalem'
        );
        const json = await res.json();
        
        const data: WeatherData = {
          temperature: Math.round(json.current_weather.temperature),
          high: Math.round(json.daily.temperature_2m_max[0]),
          low: Math.round(json.daily.temperature_2m_min[0]),
          weatherCode: json.current_weather.weathercode,
          isDay: json.current_weather.is_day === 1,
        };

        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
        setWeather(data);
      } catch (err) {
        setError('Failed to fetch weather');
        // Try cached data even if expired
        if (cached) {
          setWeather(JSON.parse(cached).data);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeather();
  }, []);

  return {
    weather,
    isLoading,
    error,
    icon: weather ? getWeatherIcon(weather.weatherCode, weather.isDay) : '🌡️',
    condition: weather ? getWeatherCondition(weather.weatherCode) : 'Loading...',
    category: weather ? getWeatherCategory(weather.temperature, weather.weatherCode) : 'mild' as WeatherCategory,
  };
};
