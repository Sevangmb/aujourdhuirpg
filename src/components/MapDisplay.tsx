
"use client";

import React from 'react';
import { MapPin } from 'lucide-react';

interface MapDisplayProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  placeName?: string;
}

const MapDisplay: React.FC<MapDisplayProps> = ({
  latitude,
  longitude,
  placeName = "Localisation Actuelle",
}) => {
  const latOffset = 0.02; 
  const lonOffset = 0.05; 

  const bbox = `${longitude - lonOffset},${latitude - latOffset},${longitude + lonOffset},${latitude + latOffset}`;
  
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;

  return (
    <div className="p-3 bg-background/50 rounded-lg h-[274px] flex flex-col">
      <div className="text-md font-headline flex items-center text-primary/90 mb-2">
        <MapPin className="w-5 h-5 mr-2 shrink-0" />
        <span className="truncate">{placeName}</span>
      </div>
      <div className="flex-grow rounded-md overflow-hidden border border-border">
        <iframe
          width="100%"
          height="100%" 
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={mapUrl}
          title={`Carte de ${placeName}`}
          sandbox="allow-scripts allow-same-origin allow-popups"
        >
        </iframe>
      </div>
      <p className="text-xs text-muted-foreground mt-1 text-center truncate">
        Carte par <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a>.
      </p>
    </div>
  );
};

export default MapDisplay;
