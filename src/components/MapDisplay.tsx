"use client";

import React from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { MapPin, AlertTriangle, Loader2, MousePointerClick } from 'lucide-react';
import type { Position } from '@/lib/types/game-types';

interface MapDisplayProps {
  currentLocation: Position;
  nearbyPois?: Position[];
  visitedLocations?: Position[];
  onPoiClick?: (poi: Position) => void; // Make travel interactive
  zoom?: number;
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const mapContainerStyle = {
  height: '100%',
  width: '100%',
  cursor: 'default', // Set a default cursor
};

const MapDisplay: React.FC<MapDisplayProps> = ({
  currentLocation,
  nearbyPois = [],
  visitedLocations = [],
  onPoiClick,
  zoom = 13,
}) => {
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const containerHeight = "h-[150px] sm:h-[170px] md:h-[200px]";

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: API_KEY || "",
  });

  const onLoadMap = React.useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  React.useEffect(() => {
    if (isLoaded && mapRef.current && typeof google !== 'undefined' && google.maps && currentLocation) {
      const bounds = new google.maps.LatLngBounds();
      if (currentLocation?.latitude && currentLocation?.longitude) {
        bounds.extend({ lat: currentLocation.latitude, lng: currentLocation.longitude });
      }
      
      [...(nearbyPois || []), ...(visitedLocations || [])].forEach(pos => {
         if (pos?.latitude && pos?.longitude) {
           bounds.extend({ lat: pos.latitude, lng: pos.longitude });
         }
      });

      if (!bounds.isEmpty()) {
        mapRef.current.fitBounds(bounds, 50); // Add padding
        const currentMapZoom = mapRef.current.getZoom();
        if (currentMapZoom && currentMapZoom > 15 && nearbyPois.length === 0 && visitedLocations.length === 0) {
            mapRef.current.setZoom(15);
        } else if (currentMapZoom && currentMapZoom > 18) { 
            mapRef.current.setZoom(18);
        }
      } else if (currentLocation?.latitude && currentLocation?.longitude) {
        mapRef.current.setCenter({ lat: currentLocation.latitude, lng: currentLocation.longitude });
        mapRef.current.setZoom(zoom);
      }
    }
  }, [isLoaded, currentLocation, nearbyPois, visitedLocations, zoom]);


  if (!API_KEY) {
    return (
      <div className={`p-2 md:p-3 bg-destructive/10 rounded-lg ${containerHeight} flex flex-col items-center justify-center border border-destructive`}>
        <MapPin className="w-6 h-6 md:w-8 md:h-8 text-destructive mb-1 md:mb-2" />
        <p className="text-xs md:text-sm text-destructive font-semibold">Google Maps API Key manquant.</p>
        <p className="text-xs text-destructive/80 mt-1 text-center">
          Configurez NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
        </p>
      </div>
    );
  }

  const loadingElement = (
    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
      <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-primary/90 animate-spin mb-1 md:mb-2" />
      <p className="text-xs md:text-sm">Chargement de Google Maps...</p>
      {currentLocation?.name && <p className="text-xs mt-1">pour {currentLocation.name}</p>}
    </div>
  );

  if (loadError) {
    return (
      <div className={`p-2 md:p-3 bg-destructive/10 rounded-lg ${containerHeight} flex flex-col items-center justify-center border border-destructive text-center`}>
        <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-destructive mb-1 md:mb-2" />
        <p className="text-xs md:text-sm text-destructive font-semibold">Erreur de chargement de la carte</p>
        <p className="text-xs text-destructive/80 mt-1 truncate">
          {loadError.message}
        </p>
      </div>
    );
  }

  const renderLoadedMap = () => {
    // Because this is only called when isLoaded is true, 'google' will be defined.
    const clickableIcon = {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 5,
      fillColor: "blue",
      fillOpacity: 0.8,
      strokeWeight: 2,
      strokeColor: "white",
    };

    return (
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={currentLocation?.latitude && currentLocation?.longitude ? { lat: currentLocation.latitude, lng: currentLocation.longitude } : { lat: 0, lng: 0 }}
        onLoad={onLoadMap}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        }}
      >
        {currentLocation?.latitude && currentLocation?.longitude && (
          <MarkerF
            position={{ lat: currentLocation.latitude, lng: currentLocation.longitude }}
            title={currentLocation.name}
          />
        )}
        {(nearbyPois || []).map((poi) => (
           poi?.latitude && poi?.longitude && (
            <MarkerF
              key={`poi-${poi.latitude}-${poi.longitude}-${poi.name}`}
              position={{ lat: poi.latitude, lng: poi.longitude }}
              onClick={() => onPoiClick && onPoiClick(poi)}
              title={`Voyager vers ${poi.name}`}
              options={{
                icon: onPoiClick ? clickableIcon : undefined,
                label: {
                  text: " ", // Empty label to provide a larger click area
                  color: "transparent",
                  fontSize: "24px",
                },
              }}
              cursor={onPoiClick ? 'pointer' : 'default'}
            />
          )
        ))}
      </GoogleMap>
    );
  };

  return (
    <div className={`p-2 md:p-3 bg-background/50 rounded-lg ${containerHeight} flex flex-col`}>
      <div className="text-xs md:text-sm font-headline flex items-center text-primary/90 mb-1 md:mb-1.5">
        <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5 shrink-0" />
        <span className="truncate">{currentLocation?.name || "Localisation actuelle"}</span>
      </div>
      <div className="flex-grow rounded-md overflow-hidden border border-border">
        {!isLoaded ? loadingElement : renderLoadedMap()}
      </div>
      {isLoaded && onPoiClick && <p className="text-[10px] text-muted-foreground mt-1 text-center truncate flex items-center justify-center gap-1">
        <MousePointerClick className="w-2.5 h-2.5" />Cliquez sur un point pour voyager.
      </p>}
    </div>
  );
};

export default MapDisplay;
