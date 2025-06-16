'use server';
/**
 * @fileOverview A Genkit flow to generate an image for a given location name.
 *
 * - generateLocationImage - A function that generates an image based on a place name.
 * - GenerateLocationImageInput - The input type for the generateLocationImage function.
 * - GenerateLocationImageOutput - The return type for the generateLocationImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateLocationImageInputSchema = z.object({
  placeName: z.string().describe("The name of the location to generate an image for."),
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
    try {
      const {media, text} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // IMPORTANT: Model for image generation
        prompt: `Generate a vibrant and picturesque, photorealistic image suitable for an immersive text-based RPG, representing the following location: ${input.placeName}. Capture an iconic or characteristic view of this place. If it's a city, show a street scene or landmark. If it's a natural place, show a landscape. Avoid text overlays on the image. The image should be suitable for a general audience.`,
        config: {
          responseModalities: ['TEXT', 'IMAGE'], // IMPORTANT: Must request IMAGE
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
      return { imageUrl: '', error: e.message || "Erreur inconnue lors de la génération de l'image." };
    }
  }
);
