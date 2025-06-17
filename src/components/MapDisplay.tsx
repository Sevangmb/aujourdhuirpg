"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, LoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { MapPin } from 'lucide-react'; // Still used for the header
import type { Position } from '@/lib/types/game-types';

interface MapDisplayProps {
  currentLocation: Position;
  nearbyPois?: Position[];
  visitedLocations?: Position[];
  lockedLocations?: Position[];
  zoom?: number; // Will be used as initial zoom, bounds will override
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Standard Google Maps marker colors
const MARKER_COLORS = {
  current: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png', // Red for current location
  nearby: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png', // Blue for nearby POIs
  visited: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png', // Green for visited
  locked: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png', // Yellow for locked (or grey if preferred)
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
  const mapRef = useRef<google.maps.Map | null>(null);

  const handleMarkerClick = (markerPos: Position) => {
    setActiveMarker(markerPos);
  };

  const handleInfoWindowClose = () => {
    setActiveMarker(null);
  };

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      const bounds = new google.maps.LatLngBounds();
      if (currentLocation) {
        bounds.extend({ lat: currentLocation.latitude, lng: currentLocation.longitude });
      }
      [...nearbyPois, ...visitedLocations, ...lockedLocations].forEach(pos => {
        bounds.extend({ lat: pos.latitude, lng: pos.longitude });
      });

      if (bounds.isEmpty() && currentLocation) {
         // Center on current location if no other points, or if only one point
        mapRef.current.setCenter({ lat: currentLocation.latitude, lng: currentLocation.longitude });
        mapRef.current.setZoom(zoom); // Use initial zoom
      } else if (!bounds.isEmpty()) {
        mapRef.current.fitBounds(bounds);
      }
    }
  }, [currentLocation, nearbyPois, visitedLocations, lockedLocations, zoom]);


  if (!API_KEY) {
    return (
      <div className="p-3 bg-destructive/10 rounded-lg h-[200px] flex flex-col items-center justify-center border border-destructive">
        <MapPin className="w-8 h-8 text-destructive mb-2" />
        <p className="text-sm text-destructive font-semibold">Google Maps API Key manquant.</p>
        <p className="text-xs text-destructive/80 mt-1 text-center">
          Veuillez configurer NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
        </p>
      </div>
    );
  }

  // Fallback for SSR or if Google Maps script hasn't loaded yet
  if (typeof window === 'undefined' || !window.google || !window.google.maps) {
     return (
      <div className="p-3 bg-background/50 rounded-lg h-[300px] md:h-[400px] flex flex-col items-center justify-center">
        <MapPin className="w-8 h-8 text-primary/90 mb-2" />
        <p className="text-sm text-muted-foreground">Chargement de la carte...</p>
        <p className="text-xs text-muted-foreground mt-1">
          {currentLocation?.name || "Localisation actuelle"}
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 bg-background/50 rounded-lg h-[300px] md:h-[400px] flex flex-col">
      <div className="text-sm font-headline flex items-center text-primary/90 mb-1.5">
        <MapPin className="w-4 h-4 mr-1.5 shrink-0" />
        <span className="truncate">{currentLocation?.name || "Localisation actuelle"}</span>
      </div>
      <div className="flex-grow rounded-md overflow-hidden border border-border">
        <LoadScript googleMapsApiKey={API_KEY} loadingElement={<div>Chargement de Google Maps...</div>}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={{ lat: currentLocation.latitude, lng: currentLocation.longitude }}
            zoom={zoom}
            onLoad={onLoad}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
            }}
          >
            {/* Current Location Marker */}
            {currentLocation && (
              <MarkerF
                position={{ lat: currentLocation.latitude, lng: currentLocation.longitude }}
                onClick={() => handleMarkerClick(currentLocation)}
                icon={MARKER_COLORS.current}
                title={currentLocation.name}
              />
            )}

            {/* Nearby POIs Markers */}
            {nearbyPois.map((poi) => (
              <MarkerF
                key={`poi-${poi.latitude}-${poi.longitude}-${poi.name}`}
                position={{ lat: poi.latitude, lng: poi.longitude }}
                onClick={() => handleMarkerClick(poi)}
                icon={MARKER_COLORS.nearby}
                title={poi.name}
              />
            ))}

            {/* Visited Locations Markers */}
            {visitedLocations.map((loc) => (
              <MarkerF
                key={`visited-${loc.latitude}-${loc.longitude}-${loc.name}`}
                position={{ lat: loc.latitude, lng: loc.longitude }}
                onClick={() => handleMarkerClick(loc)}
                icon={MARKER_COLORS.visited}
                title={loc.name}
              />
            ))}

            {/* Locked Locations Markers */}
            {lockedLocations.map((loc) => (
              <MarkerF
                key={`locked-${loc.latitude}-${loc.longitude}-${loc.name}`}
                position={{ lat: loc.latitude, lng: loc.longitude }}
                onClick={() => handleMarkerClick(loc)}
                icon={MARKER_COLORS.locked}
                title={loc.name}
                opacity={0.7}
              />
            ))}

            {activeMarker && (
              <InfoWindowF
                position={{ lat: activeMarker.latitude, lng: activeMarker.longitude }}
                onCloseClick={handleInfoWindowClose}
                options={{
                  // Pixel offset to position InfoWindow above the marker
                  pixelOffset: new google.maps.Size(0, -30)
                }}
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
