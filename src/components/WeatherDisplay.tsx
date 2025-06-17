
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
  const containerHeight = "h-[160px] md:h-[180px] lg:h-[200px]";

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center text-xs text-muted-foreground p-3 ${containerHeight} bg-background/50 rounded-lg`}>
        <LucideIcons.Loader2 className="h-5 w-5 animate-spin mb-1.5" />
        <p>Chargement météo...</p>
        <p className="text-xs">à {placeName}</p>
      </div>
    );
  }
  if (error) {
    const displayError = error.length > 60 ? error.substring(0, 60) + "..." : error;
    return (
      <div className={`flex flex-col items-center justify-center text-xs text-destructive p-3 ${containerHeight} bg-destructive/10 rounded-lg text-center`}>
        <LucideIcons.AlertTriangle className="h-5 w-5 mb-1.5 text-destructive" />
        <p>Météo indisponible:</p>
        <p className="text-xs">{displayError}</p>
        <p className="text-xs mt-0.5">({placeName})</p>
      </div>
    );
  }
  if (!weatherData) {
    return (
       <div className={`flex flex-col items-center justify-center text-xs text-muted-foreground p-3 ${containerHeight} bg-background/50 rounded-lg`}>
        <LucideIcons.HelpCircle className="h-5 w-5 mb-1.5" />
        <p>Données météo absentes</p>
         <p className="text-xs">pour {placeName}</p>
      </div>
    );
  }

  const IconComponent = (LucideIcons as any)[weatherData.iconName] || LucideIcons.HelpCircle;

  return (
    <div className={`p-2 md:p-3 bg-background/50 rounded-lg ${containerHeight} flex flex-col`}>
      <div className="text-xs md:text-sm font-headline flex items-center text-primary/90 mb-1 md:mb-1.5">
        <IconComponent className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5 shrink-0" />
        <span className="truncate">Météo à {placeName}</span>
      </div>
      <div className="flex-grow flex flex-col items-center justify-center text-center">
        <IconComponent className="w-10 h-10 md:w-12 md:h-12 text-primary mb-0.5 md:mb-1 opacity-80" />
        <p className="text-lg md:text-xl font-semibold">{weatherData.temperature}°C</p>
        <p className="text-xs text-foreground/80 capitalize">{weatherData.description}</p>
      </div>
    </div>
  );
};

export default WeatherDisplay;
