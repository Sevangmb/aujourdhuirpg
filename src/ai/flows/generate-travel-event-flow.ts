
'use server';
/**
 * @fileOverview A Genkit flow to generate a brief narrative event for travel.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GenerateTravelEventInputSchema, GenerateTravelEventOutputSchema } from './schemas/generate-travel-event-schemas';

export type GenerateTravelEventInput = z.infer<typeof GenerateTravelEventInputSchema>;
export type GenerateTravelEventOutput = z.infer<typeof GenerateTravelEventOutputSchema>;

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
    You are a narrator for a text-based RPG set in modern-day France.
    A player is traveling from "{{origin.name}}" to "{{destination.name}}" using "{{travelMode}}".
    The time of day is determined by 'gameTimeInMinutes': 0-360 is early morning, 361-720 is morning, 721-1080 is afternoon, 1081-1440 is evening/night. Current time: {{gameTimeInMinutes}}.

    Based on the travel mode, generate a SINGLE, short, interesting, but non-critical HTML paragraph describing a small event or observation during the journey.
    This should be a brief color text, not a major plot point. The player cannot interact with it.
    - If 'walk': Describe something they see, hear, or smell in the streets. A fleeting moment. (e.g., "<p>En chemin, l'odeur du pain chaud s'échappant d'une boulangerie vous met l'eau à la bouche.</p>")
    - If 'metro': Describe the atmosphere, a snippet of conversation overheard, an interesting poster. (e.g., "<p>Dans la rame de métro bondée, vous surprenez deux personnes discutant à voix basse d'une étrange affaire de vol de bijoux.</p>")
    - If 'taxi': The driver might say something interesting about the city, or you might see something notable through the window. (e.g., "<p>Le chauffeur de taxi, un homme bavard, se plaint des nouvelles pistes cyclables qui, selon lui, paralysent la ville.</p>")
    
    IMPORTANT: There is a 70% chance that NOTHING happens. In that case, the "narrative" field MUST be an empty string: "".
    Do not add any text like "Le trajet se déroule sans incident.". Just return an empty string.

    Generate the output. The output MUST be a valid JSON object matching the provided schema.
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
