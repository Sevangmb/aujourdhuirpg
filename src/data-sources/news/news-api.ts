
'use server';
/**
 * @fileOverview Service for fetching recent news headlines using NewsAPI.org.
 */
import { z } from 'genkit'; // For type consistency

// Re-using schema definitions from the tool for consistency in data structure.
// These are not exported from the service itself.
const NewsArticleSchemaInternal = z.object({
  title: z.string().describe('The headline of the news article.'),
  description: z.string().nullable().describe('A brief description or snippet of the article content.'),
  url: z.string().url().describe('The direct URL to the news article.'),
  sourceName: z.string().describe('The name of the news source (e.g., "Le Monde", "Reuters").'),
});
type NewsArticleInternal = z.infer<typeof NewsArticleSchemaInternal>;

const GetNewsInputSchemaInternal = z.object({
  country: z.string().length(2).optional().default('fr').describe('The 2-letter ISO 3166-1 code of the country you want to get headlines for (e.g., "fr", "us"). Default is "fr".'),
  category: z.enum(['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology']).optional().describe('The category to fetch news for.'),
  keywords: z.string().optional().describe('Keywords or a phrase to search for in the news articles.'),
  pageSize: z.number().min(1).max(20).optional().default(5).describe('The number of results to return per page (default 5, max 20 for developer plan).'),
});
export type GetNewsServiceInput = z.infer<typeof GetNewsInputSchemaInternal>;

export type GetNewsServiceOutput = {
  articles: NewsArticleInternal[];
  status: 'ok' | 'error';
  message?: string;
};

const NEWS_API_BASE_URL = 'https://newsapi.org/v2/top-headlines';
const NEWS_API_KEY = process.env.NEWS_API_KEY; // Service will access the env var

export async function fetchTopHeadlines(
  { country = 'fr', category, keywords, pageSize = 5 }: GetNewsServiceInput
): Promise<GetNewsServiceOutput> {
  if (!NEWS_API_KEY) {
    console.warn('NEWS_API_KEY is not set in environment variables. News service will not function.');
    return { articles: [], status: 'error', message: 'NEWS_API_KEY is not configured for the service.' };
  }

  const params = new URLSearchParams({
    country,
    pageSize: String(pageSize),
    apiKey: NEWS_API_KEY,
  });

  if (category) params.append('category', category);
  if (keywords) params.append('q', keywords);

  try {
    const response = await fetch(`${NEWS_API_BASE_URL}?${params.toString()}`, {
      headers: { 'User-Agent': 'AujourdhuiRPG/0.1 (Firebase Studio App Service)' }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error(`NewsAPI error (news-service): ${response.status}`, errorData);
      return {
        articles: [],
        status: 'error',
        message: `Failed to fetch news from NewsAPI (service): ${errorData.message || response.statusText}`,
      };
    }

    const data = await response.json();

    if (data.status !== 'ok') {
      return { articles: [], status: 'error', message: data.message || 'Unknown NewsAPI error (service)' };
    }

    const articles: NewsArticleInternal[] = data.articles.map((article: any) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      sourceName: article.source?.name || 'Unknown Source',
    }));

    return { articles, status: 'ok' };
  } catch (error: any) {
    console.error('Error in fetchTopHeadlines (news-service):', error);
    return { articles: [], status: 'error', message: `An unexpected error occurred while fetching news (service): ${error.message}` };
  }
}
