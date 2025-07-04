'use server';
/**
 * @fileOverview Service for fetching recent news headlines using NewsAPI.org.
 */
import { z } from 'genkit';
import { newsConfig } from '@/lib/config';

// Re-using schema definitions from the tool for consistency in data structure.
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

export async function fetchTopHeadlines(
  { country = 'fr', category, keywords, pageSize = 5 }: GetNewsServiceInput
): Promise<GetNewsServiceOutput> {
  // Vérification de la configuration NewsAPI
  if (!newsConfig.hasApiKey) {
    console.warn('NewsAPI: NEWS_API_KEY is not set in environment variables. News service will not function.');
    return { 
      articles: [], 
      status: 'error', 
      message: 'NewsAPI key is not configured. Add NEWS_API_KEY to your .env.local file.' 
    };
  }

  const params = new URLSearchParams({
    country,
    pageSize: String(pageSize),
    apiKey: newsConfig.apiKey!,
  });

  if (category) params.append('category', category);
  if (keywords) params.append('q', keywords);

  try {
    console.log(`📰 NewsAPI: Fetching headlines for country=${country}, category=${category || 'all'}, keywords=${keywords || 'none'}`);
    
    const response = await fetch(`${NEWS_API_BASE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'AujourdhuiRPG/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`NewsAPI Error: ${response.status} ${response.statusText}`, errorText);
      
      return {
        articles: [],
        status: 'error',
        message: `NewsAPI request failed: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();

    if (data.status !== 'ok') {
      console.error('NewsAPI Error:', data);
      return {
        articles: [],
        status: 'error',
        message: data.message || 'Unknown NewsAPI error'
      };
    }

    // Transform and validate articles
    const articles: NewsArticleInternal[] = (data.articles || [])
      .filter((article: any) => article.title && article.url) // Filter out articles without title or URL
      .map((article: any): NewsArticleInternal => ({
        title: article.title,
        description: article.description || null,
        url: article.url,
        sourceName: article.source?.name || 'Unknown Source',
      }))
      .slice(0, pageSize); // Ensure we don't exceed requested page size

    console.log(`✅ NewsAPI: Successfully fetched ${articles.length} articles`);

    return {
      articles,
      status: 'ok'
    };

  } catch (error) {
    console.error('NewsAPI Fetch Error:', error);
    
    return {
      articles: [],
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown fetch error'
    };
  }
}