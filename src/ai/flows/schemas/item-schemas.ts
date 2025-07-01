/**
 * @fileOverview Zod schema definitions for item-related data structures used in scenarios.
 */
import { z } from 'zod';

export const DynamicItemCreationPayloadSchema = z.object({
  baseItemId: z.string().describe("L'ID de l'objet de base à utiliser comme modèle (ex: 'generic_book_01')."),
  overrides: z.object({
    name: z.string().optional().describe("Le nom spécifique de cet objet (ex: 'Maîtriser l'art de la cuisine française')."),
    description: z.string().optional().describe("Une description spécifique pour cet objet."),
    effects: z.record(z.number()).optional().describe("Effets de stat spécifiques (remplace ceux du modèle)."),
    skillModifiers: z.record(z.number()).optional().describe("Modificateurs de compétence spécifiques (remplace ceux du modèle)."),
    physiologicalEffects: z.object({ 
      hunger: z.number().optional(), 
      thirst: z.number().optional() 
    }).optional().describe("Effets physiologiques si l'objet est consommable.")
  }).describe("Les propriétés spécifiques qui écrasent celles du modèle de base."),
});
