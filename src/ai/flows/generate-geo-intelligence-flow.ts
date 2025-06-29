
'use server';
/**
 * @fileOverview A Genkit flow to generate geospatial intelligence for a given location.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  GenerateGeoIntelligenceInputSchema,
  GenerateGeoIntelligenceOutputSchema,
} from './schemas/generate-geo-intelligence-schemas';
import { getWikipediaInfoTool } from '@/ai/tools/get-wikipedia-info-tool';
import { getNearbyPoisTool } from '@/ai/tools/get-nearby-pois-tool';


export type GenerateGeoIntelligenceInput = z.infer<typeof GenerateGeoIntelligenceInputSchema>;
export type GenerateGeoIntelligenceOutput = z.infer<typeof GenerateGeoIntelligenceOutputSchema>;

export async function generateGeoIntelligence(
  input: GenerateGeoIntelligenceInput
): Promise<GenerateGeoIntelligenceOutput | null> {
    if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
    console.warn("Genkit API key is not set. Geo-intelligence generation is disabled.");
    return null;
  }
  return generateGeoIntelligenceFlow(input);
}

const geoIntelligencePrompt = ai.definePrompt({
  name: 'generateGeoIntelligencePrompt',
  tools: [getWikipediaInfoTool, getNearbyPoisTool],
  input: { schema: GenerateGeoIntelligenceInputSchema },
  output: { schema: GenerateGeoIntelligenceOutputSchema },
  prompt: `
    Vous êtes un analyste géospatial expert et un guide local pour un jeu de rôle se déroulant dans la France contemporaine.
    Votre mission est de fournir une analyse détaillée et immersive pour le lieu suivant : {{placeName}} ({{latitude}}, {{longitude}}).

    Utilisez les outils \`getWikipediaInfoTool\` et \`getNearbyPoisTool\` pour rassembler des informations sur le lieu et ses environs afin de remplir tous les champs requis. Si le lieu est un commerce spécifique (comme un restaurant), basez votre analyse sur le quartier général où il se trouve.

    Produisez une réponse JSON structurée qui suit précisément le schéma de sortie fourni.

    ANALYSE DE LA ZONE :
    - socialClass : Quel est le profil social dominant ? (populaire, bourgeois, bohème, business, mixte, résidentiel, inconnu)
    - criminalityLevel : Sur une échelle de 0 (très sûr) à 100 (très dangereux), quel est le niveau de criminalité ressenti ?
    - cultureScore : Sur une échelle de 0 à 100, évaluez la richesse culturelle (musées, théâtres, galeries, etc.).
    - economicActivity : Listez 2-3 activités économiques clés (ex: "Tourisme", "Finance", "Artisanat", "Restauration").
    - historicalAnecdote : Racontez une anecdote historique intéressante et peu connue sur ce lieu ou son quartier.
    - dominantAtmosphere : Décrivez l'ambiance générale en quelques mots (ex: "Vibrant et bruyant", "Calme et verdoyant").

    RECOMMANDATIONS IA :
    - bestTimeToVisit : Quels sont les meilleurs moments pour visiter ? (ex: "En journée", "Le soir en semaine").
    - idealActivities : Suggérez 2-3 activités pertinentes pour un personnage de RPG (ex: "Chercher des informations dans un café", "Rencontrer un contact discret dans le parc").
    - safetyTips : Donnez 2 conseils de sécurité pratiques.
    - hiddenGems : Listez 2 "lieux secrets" ou "trésors cachés" que seuls les locaux connaissent (nom et description).

    Le ton doit être informatif mais immersif.
  `,
});

const generateGeoIntelligenceFlow = ai.defineFlow(
  {
    name: 'generateGeoIntelligenceFlow',
    inputSchema: GenerateGeoIntelligenceInputSchema,
    outputSchema: z.nullable(GenerateGeoIntelligenceOutputSchema),
  },
  async (input) => {
    try {
      const { output } = await geoIntelligencePrompt(input);
      // The prompt might return undefined if it can't generate the structured output.
      // We explicitly return null in that case, which is handled by the UI.
      return output || null;
    } catch (error) {
      console.error(`Error in generateGeoIntelligenceFlow for "${input.placeName}":`, error);
      // In case of error, return null instead of throwing to allow the UI to handle it gracefully.
      return null;
    }
  }
);
