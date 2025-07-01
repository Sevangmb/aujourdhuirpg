
'use server';
/**
 * @fileOverview Service for fetching information from Wikipedia.
 */
import { z } from 'genkit'; // For type consistency

const WikipediaInfoOutputSchemaInternal = z.object({
  title: z.string().describe('The title of the Wikipedia page found.'),
  summary: z.string().describe('A short summary extracted from the Wikipedia page.'),
  pageUrl: z.string().url().describe('The URL of the Wikipedia page.'),
  latitude: z.number().optional().describe('Latitude of the location.'),
  longitude: z.number().optional().describe('Longitude of the location.'),
  imageUrl: z.string().url().optional().describe('URL of a representative image.'),
});
export type WikipediaInfoServiceOutput = z.infer<typeof WikipediaInfoOutputSchemaInternal> | null;

const WikipediaPersonDetailsSchemaInternal = z.object({
  name: z.string(),
  birthYear: z.number().optional(),
  deathYear: z.number().optional(),
  birthPlace: z.string().optional(),
  deathPlace: z.string().optional(),
  occupation: z.array(z.string()).optional(),
  extract: z.string(),
  url: z.string().url(),
  thumbnail: z.string().url().optional(),
});
export type WikipediaPersonDetails = z.infer<typeof WikipediaPersonDetailsSchemaInternal>;


const USER_AGENT_WIKIPEDIA = 'AujourdhuiRPG/0.1 (Firebase Studio App; https://firebase.google.com/docs/studio)';

/**
 * Searches Wikipedia for pages matching a search term.
 * @param searchTerm The term to search for.
 * @returns A promise that resolves to an array of page titles.
 */
export async function searchWikipedia(searchTerm: string, limit = 5): Promise<string[]> {
  try {
    const searchUrl = `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&srlimit=${limit}&format=json&origin=*`;
    const searchResponse = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT_WIKIPEDIA } });
    if (!searchResponse.ok) return [];
    
    const searchData = await searchResponse.json();
    if (!searchData.query?.search?.length) return [];

    return searchData.query.search.map((result: any) => result.title);
  } catch (error) {
    console.error(`Error in searchWikipedia for term "${searchTerm}":`, error);
    return [];
  }
}

/**
 * Fetches structured details for a specific person from a Wikipedia page title.
 * @param pageTitle The exact title of the Wikipedia page.
 * @returns A promise that resolves to structured details about the person, or null if not found.
 */
export async function fetchPersonDetails(pageTitle: string): Promise<WikipediaPersonDetails | null> {
    try {
        const url = `https://fr.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro&explaintext&redirects=1&format=json&origin=*&pithumbsize=600&titles=${encodeURIComponent(pageTitle)}`;
        const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT_WIKIPEDIA }});
        if (!response.ok) return null;

        const data = await response.json();
        const pages = data.query?.pages;
        if (!pages) return null;

        const pageId = Object.keys(pages)[0];
        const page = pages[pageId];

        if (!page || !page.extract) return null;

        // Basic parsing of the extract for birth/death info. This is brittle but works for many standard formats.
        const extract = page.extract as string;
        const birthMatch = extract.match(/(né(?:e)? le .*?) à ([\w\s'-]+)/);
        const deathMatch = extract.match(/(mort(?:e)? le .*?) à ([\w\s'-]+)/);
        const birthYearMatch = extract.match(/\((\d{4})-\d{4}\)/) || extract.match(/né(?:e)? en (\d{4})/);
        const deathYearMatch = extract.match(/\(\d{4}-(\d{4})\)/) || extract.match(/mort(?:e)? en (\d{4})/);


        return {
            name: page.title,
            extract: extract,
            url: `https://fr.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
            thumbnail: page.thumbnail?.source,
            birthYear: birthYearMatch ? parseInt(birthYearMatch[1], 10) : undefined,
            deathYear: deathYearMatch ? parseInt(deathYearMatch[1], 10) : undefined,
            birthPlace: birthMatch ? birthMatch[2] : undefined,
            deathPlace: deathMatch ? deathMatch[2] : undefined,
            // Occupation parsing is complex, can be added later
        };

    } catch (error) {
        console.error(`Error in fetchPersonDetails for title "${pageTitle}":`, error);
        return null;
    }
}


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

    const extractUrl = `https://fr.wikipedia.org/w/api.php?action=query&prop=extracts|coordinates|pageimages&exintro&explaintext&redirects=1&format=json&origin=*&pithumbsize=600&titles=${encodeURIComponent(bestResultTitle)}`;
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
      const coordinates = page.coordinates?.[0];
      const imageUrl = page.thumbnail?.source;
      
      return {
        title: page.title,
        summary: page.extract,
        pageUrl: pageUrl,
        latitude: coordinates?.lat,
        longitude: coordinates?.lon,
        imageUrl: imageUrl,
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
