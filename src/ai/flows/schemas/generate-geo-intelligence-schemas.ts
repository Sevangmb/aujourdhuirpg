
/**
 * @fileOverview Zod schema definitions for the generateGeoIntelligence flow input and output.
 */
import { z } from 'zod';

export const GenerateGeoIntelligenceInputSchema = z.object({
  placeName: z.string().describe("The name of the location to analyze."),
  latitude: z.number().describe("The latitude of the location."),
  longitude: z.number().describe("The longitude of the location."),
});

const AreaAnalysisSchema = z.object({
  socialClass: z.enum(['populaire', 'bourgeois', 'bohème', 'business', 'mixte', 'résidentiel', 'inconnu']).describe("Classification sociale dominante du quartier."),
  criminalityLevel: z.number().min(0).max(100).describe("Estimation du niveau de criminalité (0=très sûr, 100=très dangereux)."),
  cultureScore: z.number().min(0).max(100).describe("Score représentant la richesse culturelle du lieu (musées, théâtres, etc.)."),
  economicActivity: z.array(z.string()).describe("Liste des types d'activités économiques dominantes (ex: 'Tourisme', 'Finance', 'Artisanat')."),
  historicalAnecdote: z.string().describe("Une anecdote historique ou un fait marquant sur le lieu."),
  dominantAtmosphere: z.string().describe("Description de l'ambiance générale du quartier (ex: 'Calme et résidentiel', 'Vibrant et touristique')."),
  currentEvents: z.array(z.string()).optional().describe("Liste des titres d'actualités récents et pertinents pour le lieu."),
});

const AIRecommendationSchema = z.object({
  bestTimeToVisit: z.array(z.string()).describe("Périodes idéales pour visiter (ex: 'En journée', 'Le week-end', 'Au printemps')."),
  idealActivities: z.array(z.string()).describe("Activités recommandées pour un personnage dans ce quartier."),
  safetyTips: z.array(z.string()).describe("Conseils de sécurité spécifiques au lieu."),
  hiddenGems: z.array(z.object({
    name: z.string().describe("Nom du lieu caché ou méconnu."),
    description: z.string().describe("Courte description de ce lieu.")
  })).describe("Liste de 2-3 'trésors cachés' ou lieux secrets à découvrir."),
});

export const GenerateGeoIntelligenceOutputSchema = z.object({
  areaAnalysis: AreaAnalysisSchema,
  aiRecommendations: AIRecommendationSchema,
});
