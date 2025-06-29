
'use server';
/**
 * @fileOverview A Genkit flow to enrich a historical contact with AI-generated knowledge.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GenerateHistoricalContactInputSchema, GenerateHistoricalContactOutputSchema } from './schemas/generate-historical-contact-schemas';

export type GenerateHistoricalContactInput = z.infer<typeof GenerateHistoricalContactInputSchema>;
export type GenerateHistoricalContactOutput = z.infer<typeof GenerateHistoricalContactOutputSchema>;

export async function generateHistoricalContact(input: GenerateHistoricalContactInput): Promise<GenerateHistoricalContactOutput> {
  // Add a check for API key
  if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
    console.warn("Genkit API key is not set. Historical contact enrichment is disabled.");
    // Return a default/empty knowledge object so the game can continue
    return {
        secrets: ["Génération de secrets par l'IA indisponible."],
        historicalFacts: ["Génération de faits par l'IA indisponible."],
        availableQuests: ["Génération de quêtes par l'IA indisponible."]
    };
  }
  return generateHistoricalContactFlow(input);
}

const generateHistoricalContactPrompt = ai.definePrompt({
    name: 'generateHistoricalContactPrompt',
    input: { schema: GenerateHistoricalContactInputSchema },
    output: { schema: GenerateHistoricalContactOutputSchema },
    prompt: `
        Vous êtes un maître de jeu et un scénariste pour un RPG textuel se déroulant dans la France contemporaine.
        Votre tâche est d'enrichir un contact non-joueur (PNJ) en générant des informations fascinantes et des pistes de jeu.

        CONTEXTE :
        Le joueur a rencontré un PNJ moderne qui a un lien avec une personnalité historique.
        - Personnalité Historique : {{{historical.name}}}, {{{historical.occupation.[0]}}} ({{{historical.birth.year}}}-{{{historical.death.year}}}). Résumé : {{{historical.extract}}}
        - Contact Moderne : {{{modern.name}}}, {{{modern.age}}} ans, {{{modern.profession}}}.
        - Type de lien : {{{modern.connectionType}}}
        - Lieu de la rencontre : {{{location}}}

        VOTRE MISSION :
        En vous basant sur ce contexte, générez une sortie JSON contenant les champs suivants :
        1.  **secrets (array of strings)** : Inventez 2 ou 3 secrets intrigants et peu connus que ce contact pourrait connaître. Ils doivent être liés à la personnalité historique mais avec une touche de mystère RPG. (ex: "Renoir avait caché un carnet de croquis secret dans le grenier de cet atelier.")
        2.  **historicalFacts (array of strings)** : Extrayez ou reformulez 2 faits historiques intéressants et vérifiables à partir du résumé fourni, que le contact pourrait partager. (ex: "Saviez-vous que Renoir a vécu ici pendant près de 15 ans ?")
        3.  **availableQuests (array of strings)** : Proposez 2 pistes de quêtes ou de "mini-mystères" que le contact pourrait donner au joueur. Elles doivent être concises et exploitables dans un RPG. (ex: "Retrouver le carnet de croquis perdu de Renoir.", "Découvrir l'identité du modèle d'un de ses tableaux inconnus.")

        RÈGLES :
        - Le ton doit être immersif et mystérieux.
        - Les secrets et les quêtes doivent être des créations originales basées sur le contexte, pas de simples répétitions du résumé.
        - Assurez-vous que la sortie est un objet JSON valide qui correspond parfaitement au schéma de sortie.
    `,
});

const generateHistoricalContactFlow = ai.defineFlow(
    {
        name: 'generateHistoricalContactFlow',
        inputSchema: GenerateHistoricalContactInputSchema,
        outputSchema: GenerateHistoricalContactOutputSchema,
    },
    async (input) => {
        try {
            const { output } = await generateHistoricalContactPrompt(input);
            return output || {
                secrets: [],
                historicalFacts: [],
                availableQuests: []
            };
        } catch (error) {
            console.error("Error in generateHistoricalContactFlow:", error);
            // Return an empty object on error to prevent crashes downstream
            return {
                secrets: [],
                historicalFacts: [],
                availableQuests: []
            };
        }
    }
);
