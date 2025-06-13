
'use server';
/**
 * @fileOverview Service for fetching information from Wikipedia.
 */
import { z } from 'genkit'; // For type consistency

// Re-using schema definitions from the tool for consistency in data structure.
// These are not exported from the service itself.
const WikipediaInfoOutputSchemaInternal = z.object({
  title: z.string().describe('The title of the Wikipedia page found.'),
  summary: z.string().describe('A short summary extracted from the Wikipedia page.'),
  pageUrl: z.string().url().describe('The URL of the Wikipedia page.'),
});
export type WikipediaInfoServiceOutput = z.infer<typeof WikipediaInfoOutputSchemaInternal> | null;

const USER_AGENT_WIKIPEDIA = 'AujourdhuiRPG/0.1 (Firebase Studio App; https://firebase.google.com/docs/studio)';

export async function fetchWikipediaSummary(searchTerm: string): Promise<WikipediaInfoServiceOutput> {
  try {
    const searchUrl = `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*`;
    const searchResponse = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT_WIKIPEDIA } });

    if (!searchResponse.ok) {
      console.error(`Wikipedia API search error (wikipedia-service) for "${searchTerm}": ${searchResponse.status} ${searchResponse.statusText}`);
      return null;
    }
    const searchData = await searchResponse.json();

    if (!searchData.query?.search?.length) {
      console.log(`Wikipedia search (wikipedia-service) for "${searchTerm}" yielded no results.`);
      return null;
    }

    const bestResultTitle = searchData.query.search[0].title;

    const extractUrl = `https://fr.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&redirects=1&format=json&origin=*&titles=${encodeURIComponent(bestResultTitle)}`;
    const extractResponse = await fetch(extractUrl, { headers: { 'User-Agent': USER_AGENT_WIKIPEDIA } });

    if (!extractResponse.ok) {
      console.error(`Wikipedia API extract error (wikipedia-service) for "${bestResultTitle}": ${extractResponse.status} ${extractResponse.statusText}`);
      return null;
    }
    const extractData = await extractResponse.json();
    const pages = extractData.query?.pages;
    if (!pages) {
      console.log(`No page data found in extract (wikipedia-service) for "${bestResultTitle}".`);
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
      console.log(`No extract found for page (wikipedia-service) "${bestResultTitle}".`);
      return null;
    }
  } catch (error) {
    console.error(`Error in fetchWikipediaSummary (wikipedia-service) for term "${searchTerm}":`, error);
    return null;
  }
}
