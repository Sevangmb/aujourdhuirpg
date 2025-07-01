
/**
 * @fileOverview A Genkit tool to fetch recent news headlines using NewsAPI.org.
 *
 * - getNewsTool - The tool definition.
 * - GetNewsInput - Input type for the tool.
 * - GetNewsOutput - Output type for the tool.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchTopHeadlines } from '@/data-sources/news/news-api';
import type { GetNewsServiceInput, GetNewsServiceOutput } from '@/data-sources/news/news-api';

const NewsArticleSchema = z.object({
  title: z.string().describe('The headline of the news article.'),
  description: z.string().nullable().describe('A brief description or snippet of the article content.'),
  url: z.string().url().describe('The direct URL to the news article.'),
  sourceName: z.string().describe('The name of the news source (e.g., "Le Monde", "Reuters").'),
});
// No need to export NewsArticle type if not used externally

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


export const getNewsTool = ai.defineTool(
  {
    name: 'getNewsTool',
    description:
      'Fetches recent top news headlines for a given country or category. Useful for grounding the story in current events or providing background context.',
    inputSchema: GetNewsInputSchema,
    outputSchema: GetNewsOutputSchema,
  },
  async (input: GetNewsInput): Promise<GetNewsOutput> => {
    // The input for the tool (GetNewsInput) is compatible with GetNewsServiceInput
    const serviceOutput: GetNewsServiceOutput = await fetchTopHeadlines(input);
    
    // The output from the service (GetNewsServiceOutput) is compatible with GetNewsOutput
    return serviceOutput;
  }
);
