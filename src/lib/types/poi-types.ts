import type { Position } from './game-types';

// Placeholder types for fields not fully defined in the plan
export type OpeningHours = string; // e.g., "Mo-Fr 09:00-17:00"
export type PriceRange = number; // e.g., 1-5
export type AccessibilityInfo = 'wheelchair_accessible' | 'limited_access';
export type ContactInfo = { phone?: string; website?: string; };
export type ServiceRequirement = { type: string; value: string | number; };
export type ServiceAvailability = { openingHours?: string; daysOfWeek?: string; };

export type EstablishmentType = 
  | 'food_beverage'     // Restaurant, café, boulangerie
  | 'retail'            // Magasins, boutiques
  | 'accommodation'     // Hôtels, auberges
  | 'services'          // Banque, agence immo, coiffeur
  | 'entertainment'     // Cinéma, musée, parc
  | 'transport'         // Gare, métro, taxi
  | 'health'            // Pharmacie, médecin
  | 'education'         // École, bibliothèque
  | 'religious'         // Église, mosquée
  | 'government'        // Mairie, poste
  | 'unknown';          // Default fallback

export interface POIService {
  id: string;
  name: string;
  description: string;
  cost: { min: number; max: number };
  duration: number; // minutes
  requirements?: ServiceRequirement[];
  availability: ServiceAvailability;
  resultingItemId?: string; // ID of the item received after the service
}

export interface EnhancedPOI extends Position {
  osmId: string;
  establishmentType: EstablishmentType;
  subCategory: string;
  openingHours?: OpeningHours;
  priceRange?: PriceRange;
  services: POIService[];
  accessibility?: AccessibilityInfo;
  contactInfo?: ContactInfo;
  averageTransactionTime: number; // minutes
  qualityRating?: number; // 1-5
}


// Mapping OSM → Types d'établissements
export const OSM_ESTABLISHMENT_MAPPING: Record<string, { type: EstablishmentType; subCategory: string }> = {
  // Alimentation
  'amenity=restaurant': { type: 'food_beverage', subCategory: 'restaurant' },
  'amenity=cafe': { type: 'food_beverage', subCategory: 'cafe' },
  'shop=bakery': { type: 'food_beverage', subCategory: 'boulangerie' },
  'shop=butcher': { type: 'food_beverage', subCategory: 'boucherie' },
  'amenity=fast_food': { type: 'food_beverage', subCategory: 'fast_food' },
  'amenity=bar': { type: 'food_beverage', subCategory: 'bar' },
  'shop=supermarket': { type: 'retail', subCategory: 'supermarche' },
  
  // Commerce
  'shop=clothes': { type: 'retail', subCategory: 'vetements' },
  'shop=furniture': { type: 'retail', subCategory: 'meubles' },
  'shop=books': { type: 'retail', subCategory: 'librairie' },
  'shop=electronics': { type: 'retail', subCategory: 'electronique' },
  'shop=art': { type: 'retail', subCategory: 'galerie_art' },
  'shop=jewelry': { type: 'retail', subCategory: 'bijouterie' },
  
  // Hébergement
  'tourism=hotel': { type: 'accommodation', subCategory: 'hotel' },
  'tourism=hostel': { type: 'accommodation', subCategory: 'auberge' },
  'tourism=guest_house': { type: 'accommodation', subCategory: 'chambre_hote' },
  
  // Services
  'amenity=bank': { type: 'services', subCategory: 'banque' },
  'office=estate_agent': { type: 'services', subCategory: 'agence_immo' },
  'shop=hairdresser': { type: 'services', subCategory: 'coiffeur' },
  'amenity=post_office': { type: 'services', subCategory: 'poste' },
  'office=lawyer': { type: 'services', subCategory: 'avocat' },
  
  // Divertissement
  'amenity=cinema': { type: 'entertainment', subCategory: 'cinema' },
  'tourism=museum': { type: 'entertainment', subCategory: 'musee' },
  'leisure=park': { type: 'entertainment', subCategory: 'parc' },
  'amenity=theatre': { type: 'entertainment', subCategory: 'theatre' },
  'amenity=library': { type: 'education', subCategory: 'bibliotheque' },
  
  // Transport
  'amenity=fuel': { type: 'transport', subCategory: 'station_essence' },
  'public_transport=station': { type: 'transport', subCategory: 'gare' },
  'amenity=taxi': { type: 'transport', subCategory: 'taxi' },
  
  // Santé
  'amenity=pharmacy': { type: 'health', subCategory: 'pharmacie' },
  'amenity=hospital': { type: 'health', subCategory: 'hopital' },
  'amenity=dentist': { type: 'health', subCategory: 'dentiste' },
  
  // Éducation
  'amenity=school': { type: 'education', subCategory: 'ecole' },
  'amenity=university': { type: 'education', subCategory: 'universite' },
  
  // Religieux
  'amenity=place_of_worship': { type: 'religious', subCategory: 'lieu_culte' },
  
  // Gouvernement
  'amenity=townhall': { type: 'government', subCategory: 'mairie' }
};
