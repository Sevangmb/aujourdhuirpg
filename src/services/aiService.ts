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
};
