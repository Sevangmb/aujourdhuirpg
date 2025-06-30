
'use server';

import type { BookSearchResult } from '@/lib/types';

const GOOGLE_BOOKS_API_BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

/**
 * Searches for books using the Google Books API.
 * This function does not require an API key for public searches.
 * @param query The search term (title, author, etc.).
 * @param limit The maximum number of results to return.
 * @returns A promise that resolves to an array of BookSearchResult.
 */
export async function searchBooks(query: string, limit: number = 5): Promise<BookSearchResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      maxResults: String(limit),
      langRestrict: 'fr', // Prioritize French results where available
      printType: 'books', // Search only for books
    });

    const response = await fetch(`${GOOGLE_BOOKS_API_BASE_URL}?${params.toString()}`);

    if (!response.ok) {
      console.error(`Google Books API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    const results: BookSearchResult[] = data.items.map((item: any) => {
      const volumeInfo = item.volumeInfo;
      return {
        title: volumeInfo.title,
        authors: volumeInfo.authors,
        description: volumeInfo.description,
        categories: volumeInfo.categories,
        publisher: volumeInfo.publisher,
        publishedDate: volumeInfo.publishedDate,
      };
    });

    return results;
  } catch (error) {
    console.error('Error in searchBooks service:', error);
    return [];
  }
}

    