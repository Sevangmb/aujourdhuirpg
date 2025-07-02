
'use server';
/**
 * @fileOverview A Genkit flow to synthesize investigation clues and documents into a coherent summary.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GenerateInvestigationSummaryInputSchema, GenerateInvestigationSummaryOutputSchema } from './schemas/generate-investigation-summary-schemas';

export type GenerateInvestigationSummaryInput = z.infer<typeof GenerateInvestigationSummaryInputSchema>;
export type GenerateInvestigationSummaryOutput = z.infer<typeof GenerateInvestigationSummaryOutputSchema>;

export async function generateInvestigationSummary(input: GenerateInvestigationSummaryInput): Promise<GenerateInvestigationSummaryOutput> {
  return generateInvestigationSummaryFlow(input);
}

const generateSummaryPrompt = ai.definePrompt({
  name: 'generateInvestigationSummaryPrompt',
  input: { schema: GenerateInvestigationSummaryInputSchema },
  output: { schema: GenerateInvestigationSummaryOutputSchema },
  prompt: `
    Vous êtes un assistant-détective expert pour le joueur et enquêteur, {{playerName}}.
    Votre mission est de synthétiser les informations collectées pour l'aider à y voir plus clair dans son enquête.
    Analysez les indices et documents suivants, et mettez à jour le résumé de l'enquête.

    **Contexte de l'enquête (Quêtes Actives) :**
    {{#if activeQuests}}
      {{#each activeQuests}}
      - {{{this}}}
      {{/each}}
    {{else}}
      Aucune quête d'enquête spécifique n'est active. Concentrez-vous sur les liens entre les pièces à conviction.
    {{/if}}

    **Pièces à Conviction :**

    **Indices :**
    {{#each clues}}
    - **{{title}} (Type: {{type}}):** {{description}}
    {{else}}
      Aucun indice.
    {{/each}}

    **Documents :**
    {{#each documents}}
    - **{{title}} (Type: {{type}}):** {{{content}}}
    {{else}}
      Aucun document.
    {{/each}}

    {{#if previousSummary}}
    **Résumé Précédent (à mettre à jour) :**
    {{{previousSummary}}}
    {{/if}}

    **Votre Tâche :**
    Rédigez un nouveau résumé concis et intelligent. Votre style doit être celui d'un analyste criminel (pensez "profiler").
    1.  **Synthétisez :** Mettez en évidence les liens les plus importants entre les indices et les documents.
    2.  **Identifiez les Incohérences :** Soulignez les contradictions ou les points étranges.
    3.  **Posez les Bonnes Questions :** Formulez 2-3 questions clés qui devraient guider les prochaines actions de l'enquêteur.
    4.  **Suggérez des Pistes :** Proposez une ou deux pistes d'investigation concrètes (ex: "Interroger à nouveau le témoin X sur son alibi", "Fouiller le lieu Y pour trouver l'objet Z").
    5.  **Soyez bref et percutant.** Le texte doit être formaté pour être lisible, avec des paragraphes et des listes si nécessaire.
  `,
});

const generateInvestigationSummaryFlow = ai.defineFlow(
  {
    name: 'generateInvestigationSummaryFlow',
    inputSchema: GenerateInvestigationSummaryInputSchema,
    outputSchema: GenerateInvestigationSummaryOutputSchema,
  },
  async (input) => {
    if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
      return { summary: "Synthèse IA indisponible. Clé API manquante." };
    }
    
    try {
      const { output } = await generateSummaryPrompt(input);
      return output || { summary: "L'IA n'a pas pu générer de résumé pour cette enquête." };
    } catch (error) {
      console.error("Error in generateInvestigationSummaryFlow:", error);
      return { summary: "Erreur lors de la génération du résumé de l'enquête." };
    }
  }
);
