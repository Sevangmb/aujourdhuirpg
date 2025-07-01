
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
import { getNewsTool } from '@/ai/tools/get-news-tool';


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
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getWikipediaInfoTool, getNearbyPoisTool, getNewsTool],
  input: { schema: GenerateGeoIntelligenceInputSchema },
  output: { schema: GenerateGeoIntelligenceOutputSchema },
  prompt: `
    Vous êtes un analyste géospatial expert et un guide local pour un jeu de rôle se déroulant dans la France contemporaine.
    Votre mission est de fournir une analyse détaillée et immersive pour le lieu suivant : {{placeName}} ({{latitude}}, {{longitude}}).

    **Instructions Clés :**
    1.  **Utilisez les outils :** Interrogez les outils \`getWikipediaInfoTool\`, \`getNearbyPoisTool\` et \`getNewsTool\` pour obtenir des informations factuelles sur le lieu, ses environs et l'actualité locale. Pour l'outil \`getNewsTool\`, utilisez le \`placeName\` comme mot-clé ('keywords').
    2.  **Analysez le quartier :** Si le lieu est un commerce spécifique (comme "Pomme de Pain", un café, etc.), basez votre analyse sur le quartier général où il se trouve, en utilisant les informations des outils pour le contexte.
    3.  **Plan de secours :** Si les outils ne retournent aucune information utile ou si le lieu est très générique, utilisez vos connaissances générales sur les villes françaises pour fournir une analyse plausible et crédible. Ne laissez PAS la réponse vide.
    4.  **Formatage :** Produisez une réponse JSON structurée qui suit précisément le schéma de sortie fourni, sans aucune exception.

    **Champs à remplir :**

    ANALYSE DE LA ZONE :
    - socialClass : Quel est le profil social dominant ? (populaire, bourgeois, bohème, business, mixte, résidentiel, inconnu)
    - criminalityLevel : Quel est le niveau de criminalité ressenti ? Choisissez parmi : très_sûr, calme, normal, tendu, dangereux, inconnu.
    - cultureScore : Évaluez la richesse culturelle. Choisissez parmi : faible, modéré, riche, exceptionnel, inconnu.
    - economicActivity : Listez 2-3 activités économiques clés (ex: "Tourisme", "Finance", "Artisanat", "Restauration").
    - historicalAnecdote : Racontez une anecdote historique intéressante et peu connue sur ce lieu ou son quartier.
    - dominantAtmosphere : Décrivez l'ambiance générale en quelques mots (ex: "Vibrant et bruyant", "Calme et verdoyant").
    - currentEvents : Listez 1-2 titres d'actualité pertinents pour le lieu, tirés de l'outil \`getNewsTool\`. S'il n'y a rien de pertinent, laissez le tableau vide.

    RECOMMANDATIONS IA :
    - bestTimeToVisit : Quels sont les meilleurs moments pour visiter ? (ex: "En journée", "Le soir en semaine").
    - idealActivities : Suggérez 2-3 activités pertinentes pour un personnage de RPG (ex: "Chercher des informations dans un café", "Rencontrer un contact discret dans le parc").
    - safetyTips : Donnez 2 conseils de sécurité pratiques.
    - hiddenGems : Listez 2 "lieux secrets" ou "trésors cachés" que seuls les locaux connaissent (nom et description).

    Le ton doit être informatif mais immersif.
  `,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    ],
  },
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
