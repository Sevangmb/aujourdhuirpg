
import { z } from 'genkit';

// Simplified for AI output. Timestamp and ID will be added by the game logic.
export const NewTransactionSchema = z.object({
  amount: z.number().describe("Le montant de la transaction. Positif pour un revenu, négatif pour une dépense."),
  type: z.enum(['income', 'expense', 'transfer', 'investment']).describe("Le type de transaction."),
  category: z.enum([
    'salary', 'quest_reward', 'investment_gains', 'found_money', 'sold_item', 'freelance_gig', 'other_income',
    'food_drinks', 'transport', 'shopping', 'rent', 'utilities', 'entertainment', 'quest_expense', 'investment_purchase', 'bribe', 'other_expense'
  ]).describe("La catégorie de la transaction."),
  description: z.string().describe("Description brève et claire de la transaction (ex: 'Paiement pour la quête X', 'Achat d'un café')."),
});
