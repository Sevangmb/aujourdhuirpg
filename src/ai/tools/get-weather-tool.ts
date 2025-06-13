
'use server';
/**
 * @fileOverview A Genkit tool to fetch current weather information.
 *
 * - getWeatherTool - The tool definition.
 * - GetWeatherInput - Input type for the tool.
 * - GetWeatherOutput - Output type for the tool.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetWeatherInputSchema = z.object({
  latitude: z.number().describe('The latitude for the weather forecast.'),
  longitude: z.number().describe('The longitude for the weather forecast.'),
});
export type GetWeatherInput = z.infer<typeof GetWeatherInputSchema>;

const GetWeatherOutputSchema = z.object({
  weatherSummary: z
    .string()
    .describe(
      "A brief summary of the current weather, e.g., 'Clear sky, 25°C' or 'Light rain, 15°C'."
    ),
});
export type GetWeatherOutput = z.infer<typeof GetWeatherOutputSchema>;

// WMO Weather interpretation codes
// Reference: https://open-meteo.com/en/docs
const weatherCodeMap: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

function interpretWeatherCode(code: number): string {
  return weatherCodeMap[code] || 'Unknown weather condition';
}

export const getWeatherTool = ai.defineTool(
  {
    name: 'getWeatherTool',
    description:
      'Fetches the current weather for a given latitude and longitude. Returns a human-readable summary including temperature and conditions.',
    inputSchema: GetWeatherInputSchema,
    outputSchema: GetWeatherOutputSchema,
  },
  async ({ latitude, longitude }): Promise<GetWeatherOutput> => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=celsius`
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Open-Meteo API error:', errorText);
        // Return a valid structure for GetWeatherOutputSchema even on API error
        return {
          weatherSummary: `Failed to fetch weather: ${response.status}`,
        };
      }
      const data = await response.json();

      if (data && data.current && typeof data.current.temperature_2m !== 'undefined' && typeof data.current.weather_code !== 'undefined') {
        const temperature = data.current.temperature_2m;
        const weatherCode = data.current.weather_code;
        const description = interpretWeatherCode(weatherCode);
        return {
          weatherSummary: `${description}, ${temperature}°C`,
        };
      } else {
        console.error('Open-Meteo API response missing current weather data:', data);
        return {
          weatherSummary: 'Invalid weather data from Open-Meteo.',
        };
      }
    } catch (error) {
      console.error('Error in getWeatherTool:', error);
      return {
        weatherSummary: 'Unable to fetch current weather information.',
      };
    }
  }
);
