"use client";

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const placeholderImage = `https://placehold.co/600x400.png`;
  // Attempt to extract one or two keywords from placeName for data-ai-hint
  const placeNameParts = placeName.split(/,|\s+/).filter(part => part.length > 2);
  const hintKeywords = placeNameParts.length > 1 
    ? `${placeNameParts[0]} ${placeNameParts[1]}` 
    : placeNameParts.length === 1 
    ? placeNameParts[0] 
    : "location view";


  return (
    <Card className="shadow-md border border-border">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-lg font-headline flex items-center text-primary/90">
          <ImageIcon className="w-5 h-5 mr-2" />
          Vue de {placeName}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2 md:px-4 md:pb-4">
        <div className="aspect-video relative bg-muted rounded-md overflow-hidden h-[250px]">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-xs">Génération de l'image...</p>
            </div>
          )}
          {!isLoading && error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive p-2">
              <AlertTriangle className="w-8 h-8 mb-2" />
              <p className="text-xs text-center">Erreur image: {error.substring(0,100)}</p>
              <Image
                src={placeholderImage}
                alt={`Placeholder pour ${placeName} suite à une erreur`}
                fill={true}
                className="object-cover opacity-20"
                data-ai-hint={hintKeywords}
                priority 
              />
            </div>
          )}
          {!isLoading && !error && imageUrl && (
            <Image
              src={imageUrl}
              alt={`Image de ${placeName}`}
              fill={true}
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          )}
          {!isLoading && !error && !imageUrl && (
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
      </CardContent>
    </Card>
  );
};

export default LocationImageDisplay;
