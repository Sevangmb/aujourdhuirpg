
'use server';
/**
 * @fileOverview A Genkit flow to generate a brief summary for a save game file.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GenerateSaveSummaryInputSchema, GenerateSaveSummaryOutputSchema } from './schemas/generate-save-summary-schemas';

export type GenerateSaveSummaryInput = z.infer<typeof GenerateSaveSummaryInputSchema>;
export type GenerateSaveSummaryOutput = z.infer<typeof GenerateSaveSummaryOutputSchema>;

export async function generateSaveSummary(input: GenerateSaveSummaryInput): Promise<GenerateSaveSummaryOutput> {
  return generateSaveSummaryFlow(input);
}

const generateSaveSummaryPrompt = ai.definePrompt({
  name: 'generateSaveSummaryPrompt',
  input: { schema: GenerateSaveSummaryInputSchema },
  output: { schema: GenerateSaveSummaryOutputSchema },
  prompt: `
    You are an expert at writing concise save game summaries.
    Based on the following player data, write a very short, one-sentence summary of their current situation.
    The summary should be evocative and quickly remind the player what they were doing.
    It must be in French.

    Player Name: {{{playerName}}}
    Level: {{{level}}}
    Location: {{{locationName}}}

    Active Quests:
    {{#each questLogSummary}}
    - {{{this}}}
    {{/each}}

    Recent Events (Journal):
    {{#each lastJournalEntries}}
    - {{{this}}}
    {{/each}}

    Generate the summary.
  `,
});

const generateSaveSummaryFlow = ai.defineFlow(
  {
    name: 'generateSaveSummaryFlow',
    inputSchema: GenerateSaveSummaryInputSchema,
    outputSchema: GenerateSaveSummaryOutputSchema,
  },
  async (input) => {
    // Basic check for API key to prevent unnecessary calls
    if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
      return { summary: "Résumé IA indisponible." };
    }
    
    try {
      const { output } = await generateSaveSummaryPrompt(input);
      return output || { summary: "Le joueur continue son aventure." };
    } catch (error) {
      console.error("Error in generateSaveSummaryFlow:", error);
      // Return a generic summary on error to not block the save process.
      return { summary: "Le joueur continue son aventure." };
    }
  }
);
