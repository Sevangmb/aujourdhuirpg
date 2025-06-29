
import type { Position } from './game-types';

export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment';

// A simplified list of categories for now.
export type TransactionCategory =
  | 'salary'
  | 'quest_reward'
  | 'investment_gains'
  | 'found_money'
  | 'sold_item'
  | 'other_income'
  | 'food_drinks'
  | 'transport'
  | 'shopping'
  | 'rent'
  | 'utilities'
  | 'entertainment'
  | 'quest_expense'
  | 'investment_purchase'
  | 'other_expense';

export interface Transaction {
  id: string; // Unique ID for the transaction
  amount: number; // Positive for income, negative for expense
  type: TransactionType;
  category: TransactionCategory;
  description: string; // "Reward for quest X", "Purchase at Monoprix"
  timestamp: string; // ISO string date
  locationName?: string; // Where the transaction occurred
}
