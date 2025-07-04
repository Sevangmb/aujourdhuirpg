/**
 * @fileOverview Zod schema definitions for the generateLocationImage flow input and output.
 */
import {z} from 'zod';

export const GenerateLocationImageInputSchema = z.object({
  placeName: z.string().describe("The name of the location to generate an image for."),
  era: z.string().describe("The historical era to depict, e.g., 'Renaissance', 'Moyen-Âge'. Defaults to contemporary."),
});

export const GenerateLocationImageOutputSchema = z.object({
  imageUrl: z.string().describe("Data URI of the generated image. Empty if generation failed."),
  error: z.string().optional().describe("Error message if image generation failed."),
});
