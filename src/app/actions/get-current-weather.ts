
'use server';

import { z } from 'zod';
import * as LucideIcons from 'lucide-react';

// WMO Weather interpretation codes
// Reference: https://open-meteo.com/en/docs
const weatherCodeMap: Record<number, string> = {
  0: 'Ciel dégagé', 1: 'Généralement dégagé', 2: 'Partiellement nuageux', 3: 'Couvert',
  45: 'Brouillard', 48: 'Brouillard givrant',
  51: 'Bruine légère', 53: 'Bruine modérée', 55: 'Bruine dense',
  56: 'Bruine verglaçante légère', 57: 'Bruine verglaçante dense',
  61: 'Pluie faible', 63: 'Pluie modérée', 65: 'Forte pluie',
  66: 'Pluie verglaçante légère', 67: 'Forte pluie verglaçante',
  71: 'Chute de neige faible', 73: 'Chute de neige modérée', 75: 'Forte chute de neige',
  77: 'Grains de neige',
  80: 'Averses de pluie faibles', 81: 'Averses de pluie modérées', 82: 'Averses de pluie violentes',
  85: 'Averses de neige faibles', 86: 'Fortes averses de neige',
  95: 'Orage', 96: 'Orage avec grêle faible', 99: 'Orage avec forte grêle',
};

function interpretWeatherCode(code: number): { description: string, iconName: keyof typeof LucideIcons } {
  const description = weatherCodeMap[code] || 'Condition inconnue';
  let iconName: keyof typeof LucideIcons = 'HelpCircle'; // Default

  if (code === 0 || code === 1) iconName = 'Sun';
  else if (code === 2) iconName = 'Cloudy'; // Partly cloudy, Cloudy is a good generic
  else if (code === 3) iconName = 'Cloud'; // Overcast
  else if (code === 45 || code === 48) iconName = 'CloudFog';
  else if (code >= 51 && code <= 57) iconName = 'CloudRain'; // Drizzle (use CloudRain)
  else if (code >= 61 && code <= 67) iconName = 'CloudRain'; // Rain
  else if (code >= 71 && code <= 77) iconName = 'CloudSnow'; // Snow
  else if (code >= 80 && code <= 82) iconName = 'CloudRain'; // Rain showers (use CloudRain)
  else if (code === 85 || code === 86) iconName = 'CloudSnow'; // Snow showers
  else if (code === 95 || code === 96 || code === 99) iconName = 'CloudLightning';

  if (!(iconName in LucideIcons)) {
    iconName = 'HelpCircle';
  }
  return { description, iconName };
}

const WeatherDataSchema = z.object({
  temperature: z.number(),
  description: z.string(),
  iconName: z.string() as z.ZodType<keyof typeof LucideIcons>,
});
export type WeatherData = z.infer<typeof WeatherDataSchema>;

export async function getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData | { error: string }> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=celsius`
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Open-Meteo API error:', errorText);
      return { error: `Impossible de récupérer les données météo: ${response.status}` };
    }
    const data = await response.json();

    if (data && data.current && typeof data.current.temperature_2m !== 'undefined' && typeof data.current.weather_code !== 'undefined') {
      const temperature = data.current.temperature_2m;
      const weatherCode = data.current.weather_code;
      const { description, iconName } = interpretWeatherCode(weatherCode);

      return {
        temperature: parseFloat(temperature.toFixed(1)),
        description: description,
        iconName: iconName,
      };
    } else {
      console.error('Open-Meteo API response missing current weather data:', data);
      return { error: 'Format de données météo invalide.' };
    }
  } catch (error) {
    console.error('Error in getCurrentWeather action:', error);
    if (error instanceof Error) {
        return { error: `Erreur serveur météo: ${error.message}` };
    }
    return { error: 'Erreur serveur météo inconnue.' };
  }
}
