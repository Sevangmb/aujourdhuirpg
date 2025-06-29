
import {
  generateScenario as generateScenarioFlow,
  GenerateScenarioInput,
  GenerateScenarioOutput,
} from '@/ai/flows/generate-scenario';
import {
  generatePlayerAvatar as generatePlayerAvatarFlow,
  GeneratePlayerAvatarInput,
  GeneratePlayerAvatarOutput,
} from '@/ai/flows/generate-player-avatar-flow';
import {
  generateTravelEvent as generateTravelEventFlow,
  GenerateTravelEventInput,
  GenerateTravelEventOutput
} from '@/ai/flows/generate-travel-event-flow';

/**
 * Centralized service for interacting with AI flows.
 */
export const aiService = {
  /**
   * Calls the generateScenario AI flow.
   * @param input The input object for the generateScenario flow.
   * @returns The output from the generateScenario flow.
   */
  generateScenario: async (
    input: GenerateScenarioInput
  ): Promise<GenerateScenarioOutput> => {
    return generateScenarioFlow(input);
  },

  /**
   * Calls the generatePlayerAvatar AI flow.
   * @param input The input object for the generatePlayerAvatar flow.
   * @returns The output from the generatePlayerAvatar flow.
   */
  generatePlayerAvatar: async (
    input: GeneratePlayerAvatarInput
  ): Promise<GeneratePlayerAvatarOutput> => {
    return generatePlayerAvatarFlow(input);
  },

  /**
   * Calls the generateTravelEvent AI flow.
   * @param input The input for generating a travel event.
   * @returns The output from the generateTravelEvent flow.
   */
  generateTravelEvent: async (
    input: GenerateTravelEventInput
  ): Promise<GenerateTravelEventOutput> => {
    return generateTravelEventFlow(input);
  },
};
