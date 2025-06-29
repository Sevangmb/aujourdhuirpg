
import { z } from 'genkit';

// Simplified for AI output. Timestamp and ID will be added by the game logic.
export const NewTransactionSchema = z.object({
  amount: z.number().describe("The amount of the transaction. Positive for income, negative for expense."),
  type: z.enum(['income', 'expense', 'transfer', 'investment']).describe("The type of transaction."),
  category: z.enum([
    'salary', 'quest_reward', 'investment_gains', 'found_money', 'sold_item', 'other_income',
    'food_drinks', 'transport', 'shopping', 'rent', 'utilities', 'entertainment', 'quest_expense', 'investment_purchase', 'other_expense'
  ]).describe("The category of the transaction."),
  description: z.string().describe("A brief, clear description of the transaction (e.g., 'Payment for completing quest X', 'Purchase of a coffee')."),
});
