
'use server';
/**
 * @fileOverview A Genkit flow to generate a player avatar image based on character details.
 *
 * - generatePlayerAvatar - A function that generates an avatar image.
 * - GeneratePlayerAvatarInput - The input type for the function.
 * - GeneratePlayerAvatarOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import type { z } from 'genkit'; // Import z as a type
import { 
  GeneratePlayerAvatarInputSchema, 
  GeneratePlayerAvatarOutputSchema 
} from './schemas/generate-player-avatar-schemas'; // Import schemas

// Export types derived from the imported schemas
export type GeneratePlayerAvatarInput = z.infer<typeof GeneratePlayerAvatarInputSchema>;
export type GeneratePlayerAvatarOutput = z.infer<typeof GeneratePlayerAvatarOutputSchema>;

export async function generatePlayerAvatar(input: GeneratePlayerAvatarInput): Promise<GeneratePlayerAvatarOutput> {
  return generatePlayerAvatarFlow(input);
}

const generatePlayerAvatarFlow = ai.defineFlow(
  {
    name: 'generatePlayerAvatarFlow',
    inputSchema: GeneratePlayerAvatarInputSchema, // Use imported schema
    outputSchema: GeneratePlayerAvatarOutputSchema, // Use imported schema
  },
  async (input) => {
    if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
      console.warn("Genkit API key (GOOGLE_API_KEY or GEMINI_API_KEY) is not set. AI avatar generation is disabled.");
      return {
        imageUrl: "",
        error: "Génération d'avatar par l'IA indisponible. La clé API (GOOGLE_API_KEY ou GEMINI_API_KEY) est manquante.",
      };
    }

    try {
      const {media, text} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation', 
        prompt: `Generate a character portrait for a text-based RPG.
Character Details:
- Name: ${input.name}
- Gender: ${input.gender}
- Approximate Age: ${input.age}
- Era: ${input.era}
- Origin (Social/Geographical): ${input.origin}
- Background/Style/Vibe: ${input.playerBackground}

Instructions for the image:
- Style: Aim for a grounded, realistic, or slightly stylized realistic portrait. Avoid overly cartoonish or anime styles.
- Composition: Focus on the character's face and upper body (bust or portrait shot, square aspect ratio).
- Expression: Reflect a neutral, thoughtful, or subtly expressive mood suitable for an RPG character. Avoid overly dramatic or exaggerated expressions unless implied by the background.
- Details: Subtly incorporate elements from their origin, background, and era into their appearance (e.g., clothing style, minor accessories, hints of their past experiences if visually representable).
- NO TEXT or overlays on the image.
- Image should be SFW (suitable for a general audience).
- Ensure the image is square.`,
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

      if (media && media.url && media.url.startsWith('data:image')) {
        return { imageUrl: media.url };
      } else if (text) {
        console.warn(`Avatar generation for "${input.name}" produced text instead of image: ${text}`);
        return { imageUrl: '', error: `L'IA a répondu par du texte au lieu d'une image pour l'avatar: ${text.substring(0,100)}...` };
      }
      console.warn(`No image media returned for avatar generation of "${input.name}". Full response object:`, {media, text});
      return { imageUrl: '', error: "Aucune image n'a été générée par l'IA pour l'avatar." };
    } catch (e: any) {
      console.error(`Error in generatePlayerAvatarFlow for "${input.name}":`, e);
      let errorMessage = e.message || "Erreur inconnue lors de la génération de l'avatar.";
      if (e.message) {
        if (e.message.includes('FAILED_PRECONDITION')) {
          errorMessage = "Génération d'avatar par l'IA indisponible. Problème de configuration de la clé API (GOOGLE_API_KEY/GEMINI_API_KEY).";
        } else if (e.message.includes('API key not valid') || e.message.includes('API_KEY_INVALID') || e.message.includes('permission to access')) {
          errorMessage = "Clé API invalide ou permissions manquantes pour la génération d'avatar.";
        }
      }
      return { imageUrl: '', error: errorMessage };
    }
  }
);
