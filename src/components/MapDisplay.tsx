"use client";

import React from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { MapPin, AlertTriangle, Loader2, MousePointerClick } from 'lucide-react';
import { mapsConfig } from '@/lib/config';
import type { Position } from '@/lib/types/game-types';

interface MapDisplayProps {
  currentLocation: Position;
  nearbyPois?: Position[];
  visitedLocations?: Position[];
  onPoiClick?: (poi: Position) => void;
  zoom?: number;
}

const mapContainerStyle = {
  height: '100%',
  width: '100%',
  cursor: 'default',
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

  // Vérification de la configuration Google Maps
  if (!mapsConfig.hasApiKey) {
    return (
      <div className={`${containerHeight} bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600`}>
        <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Carte non disponible
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-1">
          Clé API Google Maps manquante
        </p>
        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-red-500 mt-2 text-center">
            Ajoutez NEXT_PUBLIC_GOOGLE_MAPS_API_KEY à votre .env.local
          </p>
        )}
      </div>
    );
  }

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: mapsConfig.apiKey!,
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
        mapRef.current.fitBounds(bounds);
        const finalZoom = mapRef.current.getZoom();
        if (finalZoom && finalZoom > zoom) {
          mapRef.current.setZoom(zoom);
        }
      }
    }
  }, [isLoaded, currentLocation, nearbyPois, visitedLocations, zoom]);

  if (loadError) {
    return (
      <div className={`${containerHeight} bg-red-50 dark:bg-red-900/20 rounded-lg flex flex-col items-center justify-center p-4 border border-red-200 dark:border-red-800`}>
        <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
        <p className="text-sm text-red-600 dark:text-red-400 text-center">
          Erreur de chargement de la carte
        </p>
        <p className="text-xs text-red-500 dark:text-red-500 text-center mt-1">
          Vérifiez votre clé API Google Maps
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`${containerHeight} bg-gray-50 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center p-4`}>
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Chargement de la carte...
        </p>
      </div>
    );
  }

  if (!currentLocation?.latitude || !currentLocation?.longitude) {
    return (
      <div className={`${containerHeight} bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600`}>
        <MapPin className="w-8 h-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Position non disponible
        </p>
      </div>
    );
  }

  return (
    <div className={`${containerHeight} rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm`}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={{
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
        }}
        zoom={zoom}
        onLoad={onLoadMap}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        }}
      >
        {/* Current Location Marker */}
        <MarkerF
          position={{
            lat: currentLocation.latitude,
            lng: currentLocation.longitude,
          }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#3B82F6",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#FFFFFF",
          }}
          title={currentLocation.name || "Position actuelle"}
        />

        {/* Nearby POIs */}
        {nearbyPois.map((poi, index) => (
          poi?.latitude && poi?.longitude && (
            <MarkerF
              key={`poi-${index}`}
              position={{
                lat: poi.latitude,
                lng: poi.longitude,
              }}
              icon={{
                path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: 6,
                fillColor: "#10B981",
                fillOpacity: 0.8,
                strokeWeight: 1,
                strokeColor: "#FFFFFF",
              }}
              title={poi.name || `Point d'intérêt ${index + 1}`}
              onClick={() => onPoiClick?.(poi)}
              options={{
                cursor: onPoiClick ? 'pointer' : 'default',
              }}
            />
          )
        ))}

        {/* Visited Locations */}
        {visitedLocations.map((location, index) => (
          location?.latitude && location?.longitude && (
            <MarkerF
              key={`visited-${index}`}
              position={{
                lat: location.latitude,
                lng: location.longitude,
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 4,
                fillColor: "#8B5CF6",
                fillOpacity: 0.6,
                strokeWeight: 1,
                strokeColor: "#FFFFFF",
              }}
              title={location.name || `Lieu visité ${index + 1}`}
            />
          )
        ))}
      </GoogleMap>

      {/* Interactive Hint */}
      {onPoiClick && nearbyPois.length > 0 && (
        <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <MousePointerClick className="w-3 h-3 mr-1" />
            <span>Cliquez sur les marqueurs verts</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapDisplay;