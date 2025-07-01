
/**
 * @fileOverview A Genkit tool to fetch information from Wikipedia.
 *
 * - getWikipediaInfoTool - The tool definition.
 * - WikipediaInfoInput - Input type for the tool.
 * - WikipediaInfoOutput - Output type for the tool (can be null).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchWikipediaSummary } from '@/data-sources/culture/wikipedia-api';
import type { WikipediaInfoServiceOutput } from '@/data-sources/culture/wikipedia-api';

const WikipediaInfoInputSchema = z.object({
  searchTerm: z.string().describe('The term to search for on Wikipedia (e.g., "Eiffel Tower", "Louis XIV").'),
});
export type WikipediaInfoInput = z.infer<typeof WikipediaInfoInputSchema>;

// The output schema for the tool must match what the service returns, or be adapted.
// In this case, WikipediaInfoServiceOutput (which is WikipediaInfoOutputSchemaInternal | null)
// is compatible with z.nullable(WikipediaInfoOutputSchema).
const WikipediaInfoOutputSchema = z.object({
  title: z.string().describe('The title of the Wikipedia page found.'),
  summary: z.string().describe('A short summary extracted from the Wikipedia page.'),
  pageUrl: z.string().url().describe('The URL of the Wikipedia page.'),
});
export type WikipediaInfoOutput = z.infer<typeof WikipediaInfoOutputSchema> | null;


export const getWikipediaInfoTool = ai.defineTool(
  {
    name: 'getWikipediaInfoTool',
    description:
      'Fetches a brief summary of a real-world place, person, or concept from Wikipedia. Use this to get factual information to enrich the story.',
    inputSchema: WikipediaInfoInputSchema,
    outputSchema: z.nullable(WikipediaInfoOutputSchema).describe('The Wikipedia information, or null if not found or an error occurs.'),
  },
  async ({ searchTerm }): Promise<WikipediaInfoOutput> => {
    const serviceOutput: WikipediaInfoServiceOutput = await fetchWikipediaSummary(searchTerm);
    // The service output is already in the correct shape (WikipediaInfoOutputSchemaInternal | null)
    // which is compatible with the tool's outputSchema after z.nullable().
    return serviceOutput;
  }
);
