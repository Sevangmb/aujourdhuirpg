
"use client";

import React from 'react';
import Image from 'next/image';
import { ImageIcon, Loader2, AlertTriangle } from 'lucide-react';

interface LocationImageDisplayProps {
  imageUrl: string | null;
  placeName: string;
  isLoading: boolean;
  error: string | null;
}

const LocationImageDisplay: React.FC<LocationImageDisplayProps> = ({
  imageUrl,
  placeName,
  isLoading,
  error,
}) => {
  const containerHeight = "h-[150px] sm:h-[170px] md:h-[200px]";
  const placeholderImage = `https://placehold.co/600x400.png`;
  const placeNameParts = placeName ? placeName.split(/,|\s+/).filter(part => part.length > 2) : [];
  const hintKeywords = placeNameParts.length > 1
    ? `${placeNameParts[0]} ${placeNameParts[1]}`
    : placeNameParts.length === 1
    ? placeNameParts[0]
    : "location view";

  const isParis = placeName && (placeName.toLowerCase().includes('paris') && !placeName.toLowerCase().includes('parisian'));
  const parisImageUrl = 'https://placehold.co/600x400.png'; 

  return (
    <div className={`p-2 md:p-3 bg-background/50 rounded-lg ${containerHeight} flex flex-col`}>
      <div className="text-xs md:text-sm font-headline flex items-center text-primary/90 mb-1 md:mb-1.5">
        <ImageIcon className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5 shrink-0" />
        <span className="truncate">Vue de {placeName || "lieu inconnu"}</span>
      </div>
      <div className="flex-grow relative bg-muted rounded-md overflow-hidden border border-border">
        {isLoading && !isParis && ( 
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-background/70">
            <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin mb-1 md:mb-1.5" />
            <p className="text-xs">Génération image...</p>
          </div>
        )}
        {!isLoading && error && !isParis && ( 
          <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive p-2 text-center bg-background/70">
            <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 mb-1 md:mb-1.5" />
            <p className="text-xs">Erreur image:</p>
            <p className="text-xs">{error.substring(0,100)}</p>
            <Image
              src={placeholderImage}
              alt={`Placeholder pour ${placeName} suite à une erreur`}
              fill={true}
              className="object-cover opacity-20 -z-10"
              data-ai-hint={hintKeywords}
              priority
            />
          </div>
        )}
        {isParis ? (
          <Image
            src={parisImageUrl}
            alt={`Image de Paris`}
            fill={true}
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint="Paris landmark eiffel tower" 
            priority
          />
        ) : !isLoading && !error && imageUrl ? (
          <Image
            src={imageUrl}
            alt={`Image de ${placeName}`}
            fill={true}
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : !isLoading && !error && !imageUrl && ( 
           <Image
              src={placeholderImage}
              alt={`Image placeholder pour ${placeName}`}
              fill={true}
              className="object-cover"
              data-ai-hint={hintKeywords}
              priority
            />
        )}
      </div>
    </div>
  );
};

export default LocationImageDisplay;
