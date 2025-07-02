import type { GetNewsServiceOutput } from '@/data-sources/news/news-api';

// The specific type of quest that can be generated from a news article
export type NewsQuestType = 'INVESTIGATION' | 'CULTURAL' | 'SOCIAL' | 'DISCOVERY' | 'ECONOMIC' | 'SEASONAL';

// Re-export NewsArticle type for convenience within the module
export type { GetNewsServiceOutput as NewsServiceOutput } from '@/data-sources/news/news-api';
export type NewsArticle = NewsServiceOutput['articles'][0];

    