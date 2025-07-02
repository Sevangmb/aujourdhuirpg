
'use server';

import { generateInvestigationSummary } from '@/ai/flows/generate-investigation-summary-flow';
import type { GenerateInvestigationSummaryInput } from '@/ai/flows/generate-investigation-summary-flow';

// This server action is a simple wrapper around the Genkit flow.
export async function runInvestigationSynthesis(input: GenerateInvestigationSummaryInput): Promise<{ summary: string | null; error?: string }> {
  try {
    const result = await generateInvestigationSummary(input);
    return { summary: result.summary };
  } catch (error) {
    console.error("Error running investigation synthesis action:", error);
    return { summary: null, error: (error as Error).message || "An unknown error occurred during synthesis." };
  }
}
