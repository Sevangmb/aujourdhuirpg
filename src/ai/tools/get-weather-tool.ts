
/**
 * @fileOverview A Genkit tool to fetch current weather information.
 *
 * - getWeatherTool - The tool definition.
 * - GetWeatherInput - Input type for the tool.
 * - GetWeatherOutput - Output type for the tool.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchRawWeatherData, interpretWeatherCode } from '@/data-sources/environment/open-meteo-api';
import type { RawWeatherData } from '@/data-sources/environment/open-meteo-api';

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

export const getWeatherTool = ai.defineTool(
  {
    name: 'getWeatherTool',
    description:
      'Fetches the current weather for a given latitude and longitude. Returns a human-readable summary including temperature and conditions.',
    inputSchema: GetWeatherInputSchema,
    outputSchema: GetWeatherOutputSchema,
  },
  async ({ latitude, longitude }): Promise<GetWeatherOutput> => {
    const rawDataResult = await fetchRawWeatherData(latitude, longitude);

    if ('error' in rawDataResult) {
      console.error('Error from weather service in getWeatherTool:', rawDataResult.error);
      return {
        weatherSummary: `Failed to fetch weather: ${rawDataResult.error}`,
      };
    }
    
    const rawData = rawDataResult as RawWeatherData; // Type assertion

    if (rawData && rawData.current && typeof rawData.current.temperature_2m !== 'undefined' && typeof rawData.current.weather_code !== 'undefined') {
      const temperature = rawData.current.temperature_2m;
      const weatherCode = rawData.current.weather_code;
      const { description } = await interpretWeatherCode(weatherCode); // Icon not needed for summary string
      return {
        weatherSummary: `${description}, ${temperature}°C`,
      };
    } else {
      console.error('Weather service response missing current weather data in getWeatherTool:', rawData);
      return {
        weatherSummary: 'Invalid weather data from the weather service.',
      };
    }
  }
);
