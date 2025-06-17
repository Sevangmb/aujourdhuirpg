
"use client";

// IMPORTANT: This component now requires 'react-leaflet' and 'leaflet'.
// Ensure they are installed: npm install react-leaflet leaflet
// Also, install types: npm install @types/leaflet
// You will also need to import Leaflet's CSS in your global styles or main app file:
// import 'leaflet/dist/leaflet.css';

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L, { LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import { MapPin, CheckCircle, XCircle, Lock } from 'lucide-react';
import type { Position } from '@/lib/types/game-types'; // Assuming this path is correct

// Helper to create custom icons using Lucide icons
const createLucideIcon = (IconComponent: React.ElementType, color: string) => {
  // This is a simplified approach. For server-side rendering or more complex scenarios,
  // you might need a more robust way to get the HTML string or use L.divIcon.
  const iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="24" height="24"><path d="${IconComponent === MapPin ? 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' : IconComponent === CheckCircle ? 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' : IconComponent === XCircle ? 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z' : 'M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v3H9V7c0-1.66 1.34-3 3-3zm-1 9h2v2h-2v-2z'}" /></svg>`;
  return L.divIcon({
    html: iconHtml,
    className: 'lucide-leaflet-icon', // Add a class for potential custom styling
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

const playerIcon = createLucideIcon(MapPin, 'red'); // Player's current location
const nearbyPoiIcon = createLucideIcon(MapPin, 'blue'); // Nearby POIs
const visitedLocationIcon = createLucideIcon(CheckCircle, 'green'); // Visited locations
const lockedLocationIcon = createLucideIcon(Lock, 'grey'); // Locked locations


interface MapDisplayProps {
  currentLocation: Position; // Changed from latitude, longitude, placeName
  nearbyPois?: Position[];
  visitedLocations?: Position[];
  lockedLocations?: Position[];
  zoom?: number;
}

// Component to adjust map bounds
const BoundsSetter: React.FC<{ bounds: LatLngBoundsExpression }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && Object.keys(bounds).length > 0) {
      map.fitBounds(bounds);
    }
  }, [map, bounds]);
  return null;
};

const MapDisplay: React.FC<MapDisplayProps> = ({
  currentLocation,
  nearbyPois = [],
  visitedLocations = [],
  lockedLocations = [],
  zoom = 13,
}) => {
  const mapRef = useRef<L.Map | null>(null);

  const allPoints: LatLngExpression[] = [
    [currentLocation.latitude, currentLocation.longitude] as LatLngExpression,
    ...nearbyPois.map(p => [p.latitude, p.longitude] as LatLngExpression),
    ...visitedLocations.map(p => [p.latitude, p.longitude] as LatLngExpression),
    ...lockedLocations.map(p => [p.latitude, p.longitude] as LatLngExpression),
  ];

  let bounds: LatLngBoundsExpression = {};
  if (allPoints.length > 0) {
    bounds = L.latLngBounds(allPoints);
  }


  // Fallback if Leaflet or window is not available (e.g. SSR)
  if (typeof window === 'undefined') {
    return (
      <div className="p-3 bg-background/50 rounded-lg h-[200px] flex flex-col items-center justify-center">
        <MapPin className="w-8 h-8 text-primary/90 mb-2" />
        <p className="text-sm text-muted-foreground">Map loading...</p>
        <p className="text-xs text-muted-foreground mt-1">
          {currentLocation.name || "Current Location"}
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 bg-background/50 rounded-lg h-[300px] md:h-[400px] flex flex-col">
      <div className="text-sm font-headline flex items-center text-primary/90 mb-1.5">
        <MapPin className="w-4 h-4 mr-1.5 shrink-0" />
        <span className="truncate">{currentLocation.name || "Current Location"}</span>
      </div>
      <div className="flex-grow rounded-md overflow-hidden border border-border">
        <MapContainer
          center={[currentLocation.latitude, currentLocation.longitude]}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          whenCreated={mapInstance => { mapRef.current = mapInstance; }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* Current Location Marker */}
          <Marker
            position={[currentLocation.latitude, currentLocation.longitude]}
            icon={playerIcon}
          >
            <Popup>{currentLocation.name || "You are here"}<br/>{currentLocation.summary || ""}</Popup>
          </Marker>

          {/* Nearby POIs Markers */}
          {nearbyPois.map((poi) => (
            <Marker
              key={`poi-${poi.latitude}-${poi.longitude}-${poi.name}`}
              position={[poi.latitude, poi.longitude]}
              icon={nearbyPoiIcon}
            >
              <Popup>{poi.name}<br/>{poi.summary || poi.description || "Nearby point of interest"}</Popup>
            </Marker>
          ))}

          {/* Visited Locations Markers */}
          {visitedLocations.map((loc) => (
            <Marker
              key={`visited-${loc.latitude}-${loc.longitude}-${loc.name}`}
              position={[loc.latitude, loc.longitude]}
              icon={visitedLocationIcon}
            >
              <Popup>{loc.name}<br/>{loc.summary || "Visited location"}</Popup>
            </Marker>
          ))}

          {/* Locked Locations Markers */}
          {lockedLocations.map((loc) => (
            <Marker
              key={`locked-${loc.latitude}-${loc.longitude}-${loc.name}`}
              position={[loc.latitude, loc.longitude]}
              icon={lockedLocationIcon}
              opacity={0.7} // Example: make them slightly transparent
            >
              <Popup>{loc.name}<br/>{loc.summary || "Locked location"}</Popup>
            </Marker>
          ))}

          {Object.keys(bounds).length > 0 && <BoundsSetter bounds={bounds} />}
        </MapContainer>
      </div>
       <p className="text-xs text-muted-foreground mt-1 text-center truncate">
        Map data &copy; <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a> contributors.
      </p>
    </div>
  );
};

export default MapDisplay;

// Basic CSS for Lucide icons if needed (otherwise they might not size correctly)
// This should ideally be in a global CSS file.
const style = document.createElement('style');
style.innerHTML = `
  .lucide-leaflet-icon svg {
    width: 100%;
    height: 100%;
  }
`;
document.head.appendChild(style);
