
/**
 * @fileOverview Zod schema definitions for the generatePlayerAvatar flow input and output.
 */
import {z} from 'genkit';

export const GeneratePlayerAvatarInputSchema = z.object({
  name: z.string().describe("The character's name."),
  gender: z.string().describe("The character's gender."),
  age: z.number().describe("The character's approximate age."),
  origin: z.string().describe("The character's origin (social, geographical)."),
  playerBackground: z.string().describe("The character's background, history, or style description."),
});

export const GeneratePlayerAvatarOutputSchema = z.object({
  imageUrl: z.string().describe("Data URI of the generated avatar image. Empty if generation failed."),
  error: z.string().optional().describe("Error message if image generation failed."),
});
