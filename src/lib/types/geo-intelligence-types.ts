
/**
 * @fileOverview Types related to the Geospatial AI Analysis feature.
 */

// Based on your architectural document for GeoIntelligence
export interface AreaAnalysis {
  socialClass: 'populaire' | 'bourgeois' | 'bohème' | 'business' | 'mixte' | 'résidentiel' | 'inconnu';
  criminalityLevel: 'très_sûr' | 'calme' | 'normal' | 'tendu' | 'dangereux' | 'inconnu';
  cultureScore: 'faible' | 'modéré' | 'riche' | 'exceptionnel' | 'inconnu';
  economicActivity: string[];
  historicalAnecdote: string; // A brief, interesting historical fact.
  dominantAtmosphere: string; // e.g., "Calme et résidentiel", "Vibrant et touristique", "Affaires et moderne"
}

export interface AIRecommendation {
  bestTimeToVisit: string[];
  idealActivities: string[];
  safetyTips: string[];
  hiddenGems: { name: string, description: string }[];
}

export interface GeoIntelligence {
  areaAnalysis: AreaAnalysis;
  aiRecommendations: AIRecommendation;
}
