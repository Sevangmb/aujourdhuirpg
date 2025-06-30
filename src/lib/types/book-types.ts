/**
 * @fileOverview Defines the types for the book and reading systems.
 */

export interface BookSearchResult {
  title: string;
  authors?: string[];
  description?: string;
  categories?: string[];
  publisher?: string;
  publishedDate?: string;
}

    