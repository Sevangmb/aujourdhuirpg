
'use server';
/**
 * @fileOverview A Genkit flow to generate an image for a given location name and era.
 *
 * - generateLocationImage - A function that generates an image based on a place name and era.
 * - GenerateLocationImageInput - The input type for the generateLocationImage function.
 * - GenerateLocationImageOutput - The return type for the generateLocationImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { GameEra } from '@/lib/types';

const GenerateLocationImageInputSchema = z.object({
  placeName: z.string().describe("The name of the location to generate an image for."),
  era: z.string().describe("The historical era to depict, e.g., 'Renaissance', 'Moyen-Âge'. Defaults to contemporary."),
});
export type GenerateLocationImageInput = z.infer<typeof GenerateLocationImageInputSchema>;

const GenerateLocationImageOutputSchema = z.object({
  imageUrl: z.string().describe("Data URI of the generated image. Empty if generation failed."),
  error: z.string().optional().describe("Error message if image generation failed."),
});
export type GenerateLocationImageOutput = z.infer<typeof GenerateLocationImageOutputSchema>;

export async function generateLocationImage(input: GenerateLocationImageInput): Promise<GenerateLocationImageOutput> {
  return generateLocationImageFlow(input);
}

const generateLocationImageFlow = ai.defineFlow(
  {
    name: 'generateLocationImageFlow',
    inputSchema: GenerateLocationImageInputSchema,
    outputSchema: GenerateLocationImageOutputSchema,
  },
  async (input) => {
    if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
      console.warn("Genkit API key (GOOGLE_API_KEY or GEMINI_API_KEY) is not set in environment variables. AI image generation is disabled.");
      return {
        imageUrl: "",
        error: "Génération d'image par l'IA indisponible. La clé API (GOOGLE_API_KEY ou GEMINI_API_KEY) est manquante dans la configuration du serveur.",
      };
    }

    try {
      const {media, text} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation', 
        prompt: `Generate a vibrant and picturesque, photorealistic image suitable for an immersive text-based RPG. The image must represent the following location: ${input.placeName}. The visual style should strongly reflect the historical period of: ${input.era || 'Époque Contemporaine'}. If the era is 'Époque Contemporaine', show a modern-day scene. If it's a historical era like 'Moyen-Âge' or 'Renaissance', the architecture, clothing of any visible people, and overall atmosphere must match that period. Capture an iconic or characteristic view. Avoid text overlays. The image should be suitable for a general audience.`,
        config: {
          responseModalities: ['TEXT', 'IMAGE'], 
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
           ],
        },
      });

      if (media && media.url) {
        return { imageUrl: media.url };
      } else if (text) {
        console.warn(`Image generation for "${input.placeName}" produced text instead of image: ${text}`);
        return { imageUrl: '', error: `L'IA a répondu par du texte au lieu d'une image: ${text.substring(0,100)}...` };
      }
      console.warn(`No image media returned for "${input.placeName}". Full response object:`, {media, text});
      return { imageUrl: '', error: "Aucune image n'a été générée par l'IA." };
    } catch (e: any) {
      console.error(`Error in generateLocationImageFlow for "${input.placeName}":`, e);
      let errorMessage = e.message || "Erreur inconnue lors de la génération de l'image.";

      if (e.message) {
        if (e.message.includes('FAILED_PRECONDITION')) {
          errorMessage = "Génération d'image par l'IA indisponible. Problème de configuration de la clé API (vérifiez la clé et les permissions, ou la variable d'environnement GOOGLE_API_KEY/GEMINI_API_KEY).";
        } else if (e.message.includes('API key not valid') || e.message.includes('API_KEY_INVALID') || e.message.includes('permission to access')) {
          errorMessage = "Clé API invalide ou permissions manquantes pour la génération d'image.";
        }
      }
      return { imageUrl: '', error: errorMessage };
    }
  }
);
