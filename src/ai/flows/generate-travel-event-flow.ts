
'use server';
/**
 * @fileOverview A Genkit flow to generate a brief narrative event for travel.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GenerateTravelEventInputSchema, GenerateTravelEventOutputSchema } from './schemas/generate-travel-event-schemas';
import type { GenerateTravelEventInput as TypegenInput, GenerateTravelEventOutput as TypegenOutput } from './schemas/generate-travel-event-schemas';


export type GenerateTravelEventInput = TypegenInput;
export type GenerateTravelEventOutput = TypegenOutput;

export async function generateTravelEvent(input: GenerateTravelEventInput): Promise<GenerateTravelEventOutput> {
  // Add a check for API key to avoid unnecessary calls if not configured.
  if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
    return { narrative: "" }; // Return empty narrative if AI is disabled
  }
  return generateTravelEventFlow(input);
}

const generateTravelEventPrompt = ai.definePrompt({
  name: 'generateTravelEventPrompt',
  input: { schema: GenerateTravelEventInputSchema },
  output: { schema: GenerateTravelEventOutputSchema },
  prompt: `
    Vous êtes un narrateur pour un JDR textuel se déroulant dans la France contemporaine.
    Le joueur voyage de "{{origin.name}}" à "{{destination.name}}" en utilisant le mode de transport "{{travelMode}}".

    **Contexte du joueur :**
    - **Stats Clés :** Perception : {{playerStats.Perception}}, Énergie : {{playerStats.Energie}}
    - **Compétence Clé :** Orientation (Survie) : {{playerSkills.survie.orientation}}

    **Heure de la journée :**
    L'heure actuelle est déterminée par 'gameTimeInMinutes' (0-1440) : {{gameTimeInMinutes}}.
    - 0-360 : petit matin
    - 361-720 : matinée
    - 721-1080 : après-midi
    - 1081-1440 : soirée/nuit

    **Votre mission :**
    Générez UN SEUL paragraphe HTML court, intéressant mais non critique, décrivant un petit événement ou une observation pendant le trajet. Ce doit être un texte d'ambiance, sans interaction possible pour le joueur.

    **Adaptez la narration au contexte :**
    - Si la **Perception** est élevée (>60), l'observation est plus fine, plus détaillée.
    - Si l'**Énergie** est basse (<30), l'événement peut être perçu de manière plus négative ou pesante.
    - Si la compétence en **Orientation** est faible (<10), le joueur pourrait avoir un léger sentiment de désorientation.
    - Adaptez l'événement au **mode de transport** et à l'**heure de la journée**.

    **Exemples :**
    - **Marche (Énergie basse) :** "<p>Chaque pas pèse une tonne. Le bruit de la ville vous semble assourdissant, et vous vous pressez d'arriver à destination, ignorant les vitrines animées.</p>"
    - **Métro (Perception élevée) :** "<p>Au milieu du brouhaha de la rame, votre regard est attiré par un détail inhabituel : un homme lit un journal dont la date est vieille de plusieurs années. Il vous jette un regard fugace avant de replier vivement sa gazette.</p>"
    - **Taxi (Orientation faible) :** "<p>Le chauffeur de taxi emprunte une série de ruelles qui vous semblent complètement inconnues. Pendant un instant, vous vous demandez s'il ne fait pas un détour, avant de reconnaître enfin une avenue familière.</p>"

    **IMPORTANT :** Il y a 70% de chance qu'AUCUN événement ne se produise. Dans ce cas, le champ "narrative" DOIT être une chaîne vide : "". N'écrivez PAS de texte comme "Le trajet se déroule sans incident.". Retournez simplement une chaîne vide.

    Générez la sortie. La sortie DOIT être un objet JSON valide correspondant au schéma fourni. Votre sortie ne doit JAMAIS contenir de syntaxe de template comme {{{...}}} ou {{...}}.
  `,
});

const generateTravelEventFlow = ai.defineFlow(
  {
    name: 'generateTravelEventFlow',
    inputSchema: GenerateTravelEventInputSchema,
    outputSchema: GenerateTravelEventOutputSchema,
  },
  async (input) => {
    try {
      // Add a random chance to skip the AI call entirely, fulfilling the "70% chance of nothing"
      if (Math.random() < 0.7) {
        return { narrative: "" };
      }
      const { output } = await generateTravelEventPrompt(input);
      return output || { narrative: "" }; // Ensure it never returns undefined
    } catch (error) {
      console.error("Error in generateTravelEventFlow:", error);
      // Return an empty narrative on error to not block the travel.
      return { narrative: "" };
    }
  }
);
