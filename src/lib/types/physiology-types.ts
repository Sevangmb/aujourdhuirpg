/**
 * @fileOverview Defines the types for the advanced physiology system.
 */

// Placeholder types to be expanded in later phases
export type DietaryPreference = 'végétarien' | 'carnivore' | 'omnivore';
export type FoodMemory = { foodId: string; memoryText: string; };
export type BeverageTolerance = { beverageType: string; toleranceLevel: number; };
export type CircadianState = 'éveillé' | 'somnolent' | 'endormi';
export type EnergySource = 'caféine' | 'sucre' | 'repos';

export interface HungerState {
  level: number; // 0-100 (100 = rassasié)
  satisfaction_quality: number; // Qualité de la satiété
  cultural_craving: string; // Envie de cuisine spécifique
  dietary_preferences: DietaryPreference[];
  food_memories: FoodMemory[]; // Souvenirs culinaires
}

export interface ThirstState {
  level: number; // 0-100 (100 = hydraté)
  hydration_quality: number; // Type d'hydratation nécessaire
  climate_adjustment: number; // Adaptation au climat
  beverage_tolerance: BeverageTolerance[];
  cultural_beverage_preference: string;
}

export interface EnergyState {
  physical_energy: number;    // 0-100 (énergie physique)
  mental_energy: number;      // 0-100 (énergie mentale)
  emotional_energy: number;   // 0-100 (moral/motivation)
  circadian_rhythm: CircadianState; // Rythme biologique
  energy_sources: EnergySource[]; // Sources d'énergie préférées
}

export interface AdvancedPhysiologySystem {
  basic_needs: {
    hunger: HungerState;
    thirst: ThirstState;
    // The existing 'Energie' stat will be used for physical energy for now.
    // Mental and emotional energy can be added later.
  };
  // Future extensions from the design document will go here.
}
