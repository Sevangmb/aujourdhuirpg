
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
        Vous êtes un maître de jeu et un scénariste pour un RPG textuel se déroulant à l'époque : **{{playerEra}}**.
        Votre tâche est d'enrichir un contact non-joueur (PNJ) en générant des informations fascinantes et des pistes de jeu.

        Le joueur a rencontré le contact suivant :
        - **Nom du Contact** : {{{modern.name}}} ({{{modern.age}}} ans)
        - **Profession** : {{{modern.profession}}}
        - **Lieu de la rencontre** : {{{location}}}

        Ce contact est lié à l'histoire de la manière suivante :
        - **Type de lien** : {{modern.connectionType}}
        - **Personnalité Historique Associée** : {{{historical.name}}} ({{{historical.occupation.[0]}}})
        - **Extrait biographique de référence** : {{{historical.extract}}}

        VOTRE MISSION :
        En vous basant sur ce contexte, et en tenant compte que si le type de lien est "self", le contact EST la personnalité historique, générez une sortie JSON contenant :
        1.  **secrets (array of strings)** : Inventez 2 ou 3 secrets intrigants et peu connus que ce contact pourrait connaître.
        2.  **historicalFacts (array of strings)** : Extrayez ou reformulez 2 faits historiques intéressants et vérifiables que le contact pourrait partager.
        3.  **availableQuests (array of strings)** : Proposez 2 pistes de quêtes ou de "mini-mystères" que le contact pourrait donner au joueur.

        RÈGLES :
        - Le ton doit être immersif et mystérieux.
        - Si le contact est la personnalité historique elle-même (lien "self"), les secrets et faits doivent sonner comme des souvenirs personnels. Sinon, ils doivent être présentés comme des connaissances héritées ou découvertes.
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
