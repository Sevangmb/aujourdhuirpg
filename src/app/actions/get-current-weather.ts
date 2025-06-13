
'use server';

import { z } from 'zod';
import * as LucideIcons from 'lucide-react';
import { fetchRawWeatherData, interpretWeatherCode } from '@/services/weather-service';
import type { RawWeatherData } from '@/services/weather-service';

const WeatherDataSchema = z.object({
  temperature: z.number(),
  description: z.string(),
  iconName: z.string() as z.ZodType<keyof typeof LucideIcons>,
});
export type WeatherData = z.infer<typeof WeatherDataSchema>;

export async function getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData | { error: string }> {
  const rawDataResult = await fetchRawWeatherData(latitude, longitude);

  if ('error' in rawDataResult) {
    return { error: rawDataResult.error }; // Pass through service error
  }

  const rawData = rawDataResult as RawWeatherData; // Type assertion after error check

  if (rawData && rawData.current && typeof rawData.current.temperature_2m !== 'undefined' && typeof rawData.current.weather_code !== 'undefined') {
    const temperature = rawData.current.temperature_2m;
    const weatherCode = rawData.current.weather_code;
    const { description, iconName } = await interpretWeatherCode(weatherCode);

    return {
      temperature: parseFloat(temperature.toFixed(1)),
      description: description,
      iconName: iconName,
    };
  } else {
    console.error('Open-Meteo API response missing current weather data (action using service):', rawData);
    return { error: 'Format de données météo invalide après appel au service.' };
  }
}
