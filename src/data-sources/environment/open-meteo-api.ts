
'use server';
/**
 * @fileOverview Service for fetching weather information from Open-Meteo API.
 */

import type { WeatherData } from '@/app/actions/get-current-weather'; // Re-using this type for now
import * as LucideIcons from 'lucide-react'; // For icon mapping

// WMO Weather interpretation codes (consistent with get-current-weather.ts and getWeatherTool)
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

// Icon mapping logic (consistent with get-current-weather.ts)
function getWeatherIconName(code: number): keyof typeof LucideIcons {
  let iconName: keyof typeof LucideIcons = 'HelpCircle'; 
  if (code === 0 || code === 1) iconName = 'Sun';
  else if (code === 2) iconName = 'Cloudy';
  else if (code === 3) iconName = 'Cloud';
  else if (code === 45 || code === 48) iconName = 'CloudFog';
  else if (code >= 51 && code <= 57) iconName = 'CloudRain';
  else if (code >= 61 && code <= 67) iconName = 'CloudRain';
  else if (code >= 71 && code <= 77) iconName = 'CloudSnow';
  else if (code >= 80 && code <= 82) iconName = 'CloudRain';
  else if (code === 85 || code === 86) iconName = 'CloudSnow';
  else if (code === 95 || code === 96 || code === 99) iconName = 'CloudLightning';
  
  return (iconName in LucideIcons) ? iconName : 'HelpCircle';
}


export async function interpretWeatherCode(code: number): Promise<{ description: string, iconName: keyof typeof LucideIcons }> {
  const description = weatherCodeMap[code] || 'Condition inconnue';
  const iconName = getWeatherIconName(code);
  return { description, iconName };
}

export interface RawWeatherData {
    current: {
        temperature_2m: number;
        weather_code: number;
        // Add other fields if needed by any consumer
    };
    // Add other top-level fields if needed
}

export async function fetchRawWeatherData(latitude: number, longitude: number): Promise<RawWeatherData | { error: string }> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=celsius`
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Open-Meteo API error (weather-service):', errorText);
      return { error: `Impossible de récupérer les données météo du service: ${response.status}` };
    }
    const data = await response.json();

    if (data && data.current && typeof data.current.temperature_2m !== 'undefined' && typeof data.current.weather_code !== 'undefined') {
      return data as RawWeatherData;
    } else {
      console.error('Open-Meteo API response missing current weather data (weather-service):', data);
      return { error: 'Format de données météo invalide du service.' };
    }
  } catch (error) {
    console.error('Error in fetchRawWeatherData (weather-service):', error);
    if (error instanceof Error) {
        return { error: `Erreur interne du service météo: ${error.message}` };
    }
    return { error: 'Erreur interne du service météo inconnue.' };
  }
}
