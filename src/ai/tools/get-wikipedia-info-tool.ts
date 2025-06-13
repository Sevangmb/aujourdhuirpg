
'use server';
/**
 * @fileOverview A Genkit tool to fetch information from Wikipedia.
 *
 * - getWikipediaInfoTool - The tool definition.
 * - WikipediaInfoInput - Input type for the tool.
 * - WikipediaInfoOutput - Output type for the tool (can be null).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const WikipediaInfoInputSchema = z.object({
  searchTerm: z.string().describe('The term to search for on Wikipedia (e.g., "Eiffel Tower", "Louis XIV").'),
});
export type WikipediaInfoInput = z.infer<typeof WikipediaInfoInputSchema>;

const WikipediaInfoOutputSchema = z.object({
  title: z.string().describe('The title of the Wikipedia page found.'),
  summary: z.string().describe('A short summary extracted from the Wikipedia page.'),
  pageUrl: z.string().url().describe('The URL of the Wikipedia page.'),
});
export type WikipediaInfoOutput = z.infer<typeof WikipediaInfoOutputSchema> | null;

const USER_AGENT = 'AujourdhuiRPG/0.1 (Firebase Studio App; https://firebase.google.com/docs/studio)';

export const getWikipediaInfoTool = ai.defineTool(
  {
    name: 'getWikipediaInfoTool',
    description:
      'Fetches a brief summary of a real-world place, person, or concept from Wikipedia. Use this to get factual information to enrich the story.',
    inputSchema: WikipediaInfoInputSchema,
    outputSchema: z.nullable(WikipediaInfoOutputSchema).describe('The Wikipedia information, or null if not found or an error occurs.'),
  },
  async ({ searchTerm }): Promise<WikipediaInfoOutput> => {
    try {
      // Step 1: Search for the term to get a page title
      const searchUrl = `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*`;
      const searchResponse = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT } });

      if (!searchResponse.ok) {
        console.error(`Wikipedia API search error for "${searchTerm}": ${searchResponse.status} ${searchResponse.statusText}`);
        return null;
      }
      const searchData = await searchResponse.json();

      if (!searchData.query?.search?.length) {
        console.log(`Wikipedia search for "${searchTerm}" yielded no results.`);
        return null;
      }

      const bestResultTitle = searchData.query.search[0].title;

      // Step 2: Fetch the extract (summary) for the found page title
      const extractUrl = `https://fr.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&redirects=1&format=json&origin=*&titles=${encodeURIComponent(bestResultTitle)}`;
      const extractResponse = await fetch(extractUrl, { headers: { 'User-Agent': USER_AGENT } });

      if (!extractResponse.ok) {
        console.error(`Wikipedia API extract error for "${bestResultTitle}": ${extractResponse.status} ${extractResponse.statusText}`);
        return null;
      }
      const extractData = await extractResponse.json();
      const pages = extractData.query?.pages;
      if (!pages) {
        console.log(`No page data found in extract for "${bestResultTitle}".`);
        return null;
      }

      const pageId = Object.keys(pages)[0];
      const page = pages[pageId];

      if (page && page.extract) {
        const pageUrl = `https://fr.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`;
        return {
          title: page.title,
          summary: page.extract,
          pageUrl: pageUrl,
        };
      } else {
        console.log(`No extract found for page "${bestResultTitle}".`);
        return null;
      }
    } catch (error) {
      console.error(`Error in getWikipediaInfoTool for term "${searchTerm}":`, error);
      return null;
    }
  }
);
