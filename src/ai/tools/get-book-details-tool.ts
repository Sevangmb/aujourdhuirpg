/**
 * @fileOverview A Genkit tool to fetch book details from the Google Books API.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { searchBooks } from '@/data-sources/culture/google-books-api';
import type { BookSearchResult } from '@/lib/types';

const GetBookDetailsInputSchema = z.object({
  query: z.string().describe('The search query for the book (e.g., title, author, ISBN).'),
  limit: z.number().optional().default(5).describe('The maximum number of books to return.'),
});
export type GetBookDetailsInput = z.infer<typeof GetBookDetailsInputSchema>;

const BookDetailsSchema = z.object({
  title: z.string(),
  authors: z.array(z.string()).optional(),
  description: z.string().optional(),
  categories: z.array(z.string()).optional(),
  publisher: z.string().optional(),
  publishedDate: z.string().optional(),
});
export type GetBookDetailsOutput = z.infer<typeof BookDetailsSchema>[];

export const getBookDetailsTool = ai.defineTool(
  {
    name: 'getBookDetailsTool',
    description: 'Searches for real books using the Google Books API. Use this when the player is in a bookstore or library to find books to read or buy.',
    inputSchema: GetBookDetailsInputSchema,
    outputSchema: z.array(BookDetailsSchema),
  },
  async ({ query, limit }): Promise<GetBookDetailsOutput> => {
    const books: BookSearchResult[] = await searchBooks(query, limit);
    return books; // The service returns data in the shape expected by the output schema
  }
);
    