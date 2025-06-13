
'use server';
/**
 * @fileOverview A Genkit tool to fetch recent news headlines using NewsAPI.org.
 *
 * - getNewsTool - The tool definition.
 * - GetNewsInput - Input type for the tool.
 * - GetNewsOutput - Output type for the tool.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const NewsArticleSchema = z.object({
  title: z.string().describe('The headline of the news article.'),
  description: z.string().nullable().describe('A brief description or snippet of the article content.'),
  url: z.string().url().describe('The direct URL to the news article.'),
  sourceName: z.string().describe('The name of the news source (e.g., "Le Monde", "Reuters").'),
});
export type NewsArticle = z.infer<typeof NewsArticleSchema>;

const GetNewsInputSchema = z.object({
  country: z.string().length(2).optional().default('fr').describe('The 2-letter ISO 3166-1 code of the country you want to get headlines for (e.g., "fr", "us"). Default is "fr".'),
  category: z.enum(['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology']).optional().describe('The category to fetch news for.'),
  keywords: z.string().optional().describe('Keywords or a phrase to search for in the news articles.'),
  pageSize: z.number().min(1).max(20).optional().default(5).describe('The number of results to return per page (default 5, max 20 for developer plan).'),
});
export type GetNewsInput = z.infer<typeof GetNewsInputSchema>;

const GetNewsOutputSchema = z.object({
  articles: z.array(NewsArticleSchema).describe('A list of fetched news articles.'),
  status: z.enum(['ok', 'error']).describe('Status of the API call.'),
  message: z.string().optional().describe('An error message if the status is "error".'),
});
export type GetNewsOutput = z.infer<typeof GetNewsOutputSchema>;

const NEWS_API_BASE_URL = 'https://newsapi.org/v2/top-headlines';
// IMPORTANT: You need to get your own API key from https://newsapi.org
// and set it in your .env file as NEWS_API_KEY
const NEWS_API_KEY = process.env.NEWS_API_KEY;

export const getNewsTool = ai.defineTool(
  {
    name: 'getNewsTool',
    description:
      'Fetches recent top news headlines for a given country or category. Useful for grounding the story in current events or providing background context.',
    inputSchema: GetNewsInputSchema,
    outputSchema: GetNewsOutputSchema,
  },
  async ({ country = 'fr', category, keywords, pageSize = 5 }): Promise<GetNewsOutput> => {
    if (!NEWS_API_KEY) {
      console.warn('NEWS_API_KEY is not set in environment variables. getNewsTool will not function.');
      return { articles: [], status: 'error', message: 'NEWS_API_KEY is not configured.' };
    }

    const params = new URLSearchParams({
      country,
      pageSize: String(pageSize),
      apiKey: NEWS_API_KEY,
    });

    if (category) {
      params.append('category', category);
    }
    if (keywords) {
      params.append('q', keywords);
    }

    try {
      const response = await fetch(`${NEWS_API_BASE_URL}?${params.toString()}`, {
        headers: {
            // NewsAPI recommends adding a User-Agent, though it's not strictly for auth
            'User-Agent': 'AujourdhuiRPG/0.1 (Firebase Studio App)',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error(`NewsAPI error: ${response.status}`, errorData);
        return {
          articles: [],
          status: 'error',
          message: `Failed to fetch news from NewsAPI: ${errorData.message || response.statusText}`,
        };
      }

      const data = await response.json();

      if (data.status !== 'ok') {
        return { articles: [], status: 'error', message: data.message || 'Unknown NewsAPI error' };
      }

      const articles: NewsArticle[] = data.articles.map((article: any) => ({
        title: article.title,
        description: article.description,
        url: article.url,
        sourceName: article.source?.name || 'Unknown Source',
      }));

      return { articles, status: 'ok' };
    } catch (error: any) {
      console.error('Error in getNewsTool:', error);
      return { articles: [], status: 'error', message: `An unexpected error occurred while fetching news: ${error.message}` };
    }
  }
);
