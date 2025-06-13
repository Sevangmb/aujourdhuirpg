
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface MapDisplayProps {
  latitude: number;
  longitude: number;
  zoom?: number; // Optional zoom level, OSM embed handles this via bbox
  placeName?: string;
}

const MapDisplay: React.FC<MapDisplayProps> = ({
  latitude,
  longitude,
  placeName = "Localisation Actuelle",
}) => {
  // Define a bounding box around the coordinates for a reasonable zoom level
  // These values can be adjusted to change the default zoom/view.
  // For Paris: lat 48.8566, lon 2.3522
  const latOffset = 0.02; // Roughly determines N-S extent
  const lonOffset = 0.05; // Roughly determines E-W extent

  const bbox = `${longitude - lonOffset},${latitude - latOffset},${longitude + lonOffset},${latitude + latOffset}`;
  
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;

  return (
    <Card className="shadow-md border border-border">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-lg font-headline flex items-center text-primary/90">
          <MapPin className="w-5 h-5 mr-2" />
          {placeName}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2 md:px-4 md:pb-4">
        <iframe
          width="100%"
          height="250" // Adjust height as needed
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={mapUrl}
          className="rounded-md"
          title={`Carte de ${placeName}`}
          sandbox="allow-scripts allow-same-origin allow-popups" // Added sandbox for security
        >
        </iframe>
        <p className="text-xs text-muted-foreground mt-1 text-center">
          Carte fournie par <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a>.
        </p>
      </CardContent>
    </Card>
  );
};

export default MapDisplay;
