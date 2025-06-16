
"use client";

import React from 'react';
import type { WeatherData } from '@/app/actions/get-current-weather';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      // Removed mb-4 from here, as parent grid will handle gaps
      <div className="flex items-center text-sm text-muted-foreground p-3 bg-card rounded-lg shadow-md border border-border">
        <LucideIcons.Loader2 className="h-4 w-4 animate-spin mr-2" />
        Chargement de la météo à {placeName}...
      </div>
    );
  }
  if (error) {
    const displayError = error.length > 70 ? error.substring(0, 70) + "..." : error;
    return (
      // Removed mb-4
      <div className="flex items-center text-sm text-destructive p-3 bg-destructive/10 border border-destructive/30 rounded-lg shadow-md">
        <LucideIcons.AlertTriangle className="h-4 w-4 mr-2 text-destructive" />
        Météo ({placeName}) indisponible: {displayError}
      </div>
    );
  }
  if (!weatherData) {
    return null;
  }

  const IconComponent = (LucideIcons as any)[weatherData.iconName] || LucideIcons.HelpCircle;

  return (
    // Removed mb-4
    <Card className="shadow-md border border-border h-full"> {/* Added h-full to try and match height with others */}
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-lg font-headline flex items-center text-primary/90">
          <IconComponent className="w-5 h-5 mr-2" />
          Météo à {placeName}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm px-4 pb-3 text-foreground/90">
        {weatherData.temperature}°C, {weatherData.description}
      </CardContent>
    </Card>
  );
};

export default WeatherDisplay;
