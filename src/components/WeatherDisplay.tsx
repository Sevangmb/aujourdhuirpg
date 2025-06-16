
"use client";

import React from 'react';
import type { WeatherData } from '@/app/actions/get-current-weather';
import * as LucideIcons from 'lucide-react';

interface WeatherDisplayProps {
  weatherData: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  placeName: string;
}

const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ weatherData, isLoading, error, placeName }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-sm text-muted-foreground p-3 h-[274px] bg-background/50 rounded-lg">
        <LucideIcons.Loader2 className="h-6 w-6 animate-spin mb-2" />
        <p>Chargement de la météo...</p>
        <p className="text-xs">à {placeName}</p>
      </div>
    );
  }
  if (error) {
    const displayError = error.length > 70 ? error.substring(0, 70) + "..." : error;
    return (
      <div className="flex flex-col items-center justify-center text-sm text-destructive p-3 h-[274px] bg-destructive/10 rounded-lg">
        <LucideIcons.AlertTriangle className="h-6 w-6 mb-2 text-destructive" />
        <p>Météo indisponible:</p>
        <p className="text-xs text-center">{displayError}</p>
        <p className="text-xs mt-1">({placeName})</p>
      </div>
    );
  }
  if (!weatherData) {
    return (
       <div className="flex flex-col items-center justify-center text-sm text-muted-foreground p-3 h-[274px] bg-background/50 rounded-lg">
        <LucideIcons.HelpCircle className="h-6 w-6 mb-2" />
        <p>Données météo non disponibles</p>
         <p className="text-xs">pour {placeName}</p>
      </div>
    );
  }

  const IconComponent = (LucideIcons as any)[weatherData.iconName] || LucideIcons.HelpCircle;

  return (
    <div className="p-3 bg-background/50 rounded-lg h-[274px] flex flex-col">
      <div className="text-md font-headline flex items-center text-primary/90 mb-2">
        <IconComponent className="w-5 h-5 mr-2 shrink-0" />
        <span className="truncate">Météo à {placeName}</span>
      </div>
      <div className="flex-grow flex flex-col items-center justify-center text-center">
        <IconComponent className="w-16 h-16 text-primary mb-2 opacity-80" />
        <p className="text-2xl font-semibold">{weatherData.temperature}°C</p>
        <p className="text-sm text-foreground/80 capitalize">{weatherData.description}</p>
      </div>
    </div>
  );
};

export default WeatherDisplay;
