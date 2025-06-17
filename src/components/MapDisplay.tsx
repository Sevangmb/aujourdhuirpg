
"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, LoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { MapPin, AlertTriangle } from 'lucide-react';
import type { Position } from '@/lib/types/game-types';

interface MapDisplayProps {
  currentLocation: Position;
  nearbyPois?: Position[];
  visitedLocations?: Position[];
  lockedLocations?: Position[];
  zoom?: number;
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const MARKER_COLORS = {
  current: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
  nearby: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
  visited: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
  locked: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
};

const mapContainerStyle = {
  height: '100%',
  width: '100%',
};

const MapDisplay: React.FC<MapDisplayProps> = ({
  currentLocation,
  nearbyPois = [],
  visitedLocations = [],
  lockedLocations = [],
  zoom = 13,
}) => {
  const [activeMarker, setActiveMarker] = useState<Position | null>(null);
  const [scriptLoadError, setScriptLoadError] = useState<Error | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const containerHeight = "h-[150px] sm:h-[170px] md:h-[200px]";

  const handleMarkerClick = (markerPos: Position) => {
    setActiveMarker(markerPos);
  };

  const handleInfoWindowClose = () => {
    setActiveMarker(null);
  };

  const onLoadMap = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleScriptLoadError = useCallback((error: Error) => {
    console.error("Google Maps script load error:", error);
    setScriptLoadError(error);
  }, []);

  useEffect(() => {
    if (mapRef.current && typeof google !== 'undefined' && google.maps && currentLocation) { 
      const bounds = new google.maps.LatLngBounds();
      if (currentLocation && typeof currentLocation.latitude === 'number' && typeof currentLocation.longitude === 'number') {
        bounds.extend({ lat: currentLocation.latitude, lng: currentLocation.longitude });
      }
      
      [...(nearbyPois || []), ...(visitedLocations || []), ...(lockedLocations || [])].forEach(pos => {
        if (pos && typeof pos.latitude === 'number' && typeof pos.longitude === 'number') {
           bounds.extend({ lat: pos.latitude, lng: pos.longitude });
        }
      });

      if (!bounds.isEmpty()) {
        mapRef.current.fitBounds(bounds);
        const currentZoom = mapRef.current.getZoom();
        if (currentZoom && currentZoom > 15 && nearbyPois.length === 0 && visitedLocations.length === 0 && lockedLocations.length === 0) {
            mapRef.current.setZoom(15);
        } else if (currentZoom && currentZoom > 18) { 
            mapRef.current.setZoom(18);
        }
      } else if (currentLocation && typeof currentLocation.latitude === 'number' && typeof currentLocation.longitude === 'number') {
        mapRef.current.setCenter({ lat: currentLocation.latitude, lng: currentLocation.longitude });
        mapRef.current.setZoom(zoom);
      }
    }
  }, [currentLocation, nearbyPois, visitedLocations, lockedLocations, zoom]);


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
      <MapPin className="w-6 h-6 md:w-8 md:h-8 text-primary/90 mb-1 md:mb-2" />
      <p className="text-xs md:text-sm">Chargement de Google Maps...</p>
      {currentLocation?.name && <p className="text-xs mt-1">pour {currentLocation.name}</p>}
    </div>
  );

  if (scriptLoadError) {
    return (
      <div className={`p-2 md:p-3 bg-destructive/10 rounded-lg ${containerHeight} flex flex-col items-center justify-center border border-destructive text-center`}>
        <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-destructive mb-1 md:mb-2" />
        <p className="text-xs md:text-sm text-destructive font-semibold">Erreur de chargement de la carte</p>
        <p className="text-xs text-destructive/80 mt-1">
          Impossible de charger Google Maps.
        </p>
        <p className="text-xs text-destructive/90 mt-0.5 truncate">({scriptLoadError.message})</p>
      </div>
    );
  }

  return (
    <div className={`p-2 md:p-3 bg-background/50 rounded-lg ${containerHeight} flex flex-col`}>
      <div className="text-xs md:text-sm font-headline flex items-center text-primary/90 mb-1 md:mb-1.5">
        <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5 shrink-0" />
        <span className="truncate">{currentLocation?.name || "Localisation actuelle"}</span>
      </div>
      <div className="flex-grow rounded-md overflow-hidden border border-border">
        <LoadScript 
            googleMapsApiKey={API_KEY} 
            loadingElement={loadingElement}
            onError={handleScriptLoadError}
        >
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={currentLocation && typeof currentLocation.latitude === 'number' && typeof currentLocation.longitude === 'number' ? { lat: currentLocation.latitude, lng: currentLocation.longitude } : { lat: 0, lng: 0 }}
            zoom={zoom}
            onLoad={onLoadMap}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              clickableIcons: false, 
            }}
          >
            {currentLocation && typeof currentLocation.latitude === 'number' && typeof currentLocation.longitude === 'number' && (
              <MarkerF
                position={{ lat: currentLocation.latitude, lng: currentLocation.longitude }}
                onClick={() => handleMarkerClick(currentLocation)}
                icon={MARKER_COLORS.current}
                title={currentLocation.name}
              />
            )}
            {(nearbyPois || []).map((poi) => (
               poi && typeof poi.latitude === 'number' && typeof poi.longitude === 'number' && (
                <MarkerF
                  key={`poi-${poi.latitude}-${poi.longitude}-${poi.name}`}
                  position={{ lat: poi.latitude, lng: poi.longitude }}
                  onClick={() => handleMarkerClick(poi)}
                  icon={MARKER_COLORS.nearby}
                  title={poi.name}
                />
              )
            ))}
            {(visitedLocations || []).map((loc) => (
              loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number' && (
                <MarkerF
                  key={`visited-${loc.latitude}-${loc.longitude}-${loc.name}`}
                  position={{ lat: loc.latitude, lng: loc.longitude }}
                  onClick={() => handleMarkerClick(loc)}
                  icon={MARKER_COLORS.visited}
                  title={loc.name}
                />
              )
            ))}
            {(lockedLocations || []).map((loc) => (
              loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number' && (
                <MarkerF
                  key={`locked-${loc.latitude}-${loc.longitude}-${loc.name}`}
                  position={{ lat: loc.latitude, lng: loc.longitude }}
                  onClick={() => handleMarkerClick(loc)}
                  icon={MARKER_COLORS.locked}
                  title={loc.name}
                  opacity={0.7}
                />
              )
            ))}
            {activeMarker && typeof activeMarker.latitude === 'number' && typeof activeMarker.longitude === 'number' && (
              <InfoWindowF
                position={{ lat: activeMarker.latitude, lng: activeMarker.longitude }}
                onCloseClick={handleInfoWindowClose}
                options={{ pixelOffset: typeof window !== 'undefined' && window.google ? new window.google.maps.Size(0, -30) : undefined }}
              >
                <div>
                  <h4 className="font-semibold text-sm">{activeMarker.name}</h4>
                  <p className="text-xs">{activeMarker.summary || activeMarker.description || "Aucune description."}</p>
                </div>
              </InfoWindowF>
            )}
          </GoogleMap>
        </LoadScript>
      </div>
      <p className="text-xs text-muted-foreground mt-1 text-center truncate">
        Carte fournie par Google Maps.
      </p>
    </div>
  );
};

export default MapDisplay;
