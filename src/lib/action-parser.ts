/**
 * @fileOverview Basic player action parser.
 * This module will be responsible for interpreting the player's textual input
 * into a structured format that the game system can understand and act upon.
 */

// import type { GameState } from './types'; // GameState might be needed for more complex parsing

export type ActionType =
  | 'UNKNOWN'
  | 'USE_ITEM'
  | 'TALK_TO_PNJ'
  | 'EXAMINE'
  | 'MOVE_TO'
  | 'APPLY_SKILL'
  | 'TAKE_ITEM';

export interface ParsedAction {
  actionType: ActionType;
  primaryTarget?: string; // Main subject of the action (item name, PNJ name, object, skill target)
  secondaryTarget?: string; // Object of an item interaction, etc. (e.g. what is being used on the primaryTarget)
  itemUsed?: string; // Specific item being used in the action
  skillUsed?: string; // Specific skill being applied
  fullInput: string; // The original player input string
}

/**
 * Parses the player's textual input to determine the intended action and its parameters.
 * This is a basic implementation and will be expanded with more sophisticated parsing,
 * potentially using NLP or more complex pattern matching, and considering game state.
 *
 * @param playerChoice The raw string input from the player.
 * @param _gameState The current game state (currently unused, reserved for future enhancements).
 * @returns A promise that resolves to a ParsedAction object.
 */
export async function parsePlayerAction(
  playerChoice: string,
  /* _gameState?: GameState */ // Commented out for now
): Promise<ParsedAction> {
  const normalizedInput = playerChoice.trim().toLowerCase();
  const result: ParsedAction = { actionType: 'UNKNOWN', fullInput: playerChoice };

  // Pattern: EXAMINE
  const examineKeywords = ["examine", "look at", "inspect", "regarder", "observer", "inspecter", "chercher"];
  for (const keyword of examineKeywords) {
    if (normalizedInput.startsWith(keyword + " ")) {
      result.actionType = 'EXAMINE';
      result.primaryTarget = playerChoice.substring(keyword.length + 1).trim();
      return result;
    }
  }
  if (examineKeywords.includes(normalizedInput)) { // Handles "examine" or "look" alone
     result.actionType = 'EXAMINE';
     result.primaryTarget = undefined; // Examining the general vicinity or current focus
     return result;
  }


  // Pattern: TAKE_ITEM
  const takeKeywords = ["take", "pick up", "grab", "prendre", "ramasser", "saisir"];
  for (const keyword of takeKeywords) {
    if (normalizedInput.startsWith(keyword + " ")) {
      result.actionType = 'TAKE_ITEM';
      result.primaryTarget = playerChoice.substring(keyword.length + 1).trim();
      return result;
    }
  }

  // Pattern: TALK_TO_PNJ
  // "talk to {target}", "speak with {target}", "parler à {target}"
  const talkToRegex = /^(talk to|speak with|parler à|discuter avec)\s+(.+)$/i;
  const talkMatch = playerChoice.match(talkToRegex);
  if (talkMatch && talkMatch[2]) {
    result.actionType = 'TALK_TO_PNJ';
    result.primaryTarget = talkMatch[2].trim();
    return result;
  }

  // Pattern: USE_ITEM (Stretch goal)
  // "use {item} on {target}" or "utilise {item} sur {target}"
  const useItemOnTargetRegex = /^(use|utilise|utiliser)\s+(.+?)\s+(on|sur)\s+(.+)$/i;
  const useItemMatch = playerChoice.match(useItemOnTargetRegex);
  if (useItemMatch && useItemMatch[2] && useItemMatch[4]) {
    result.actionType = 'USE_ITEM';
    result.itemUsed = useItemMatch[2].trim();
    result.primaryTarget = useItemMatch[4].trim(); // The thing the item is used on
    return result;
  }

  // Pattern: USE_ITEM (Simpler version: "use {item}" or "utilise {item}")
  const useItemSimpleRegex = /^(use|utilise|utiliser)\s+(.+)$/i;
  const useItemSimpleMatch = playerChoice.match(useItemSimpleRegex);
  if (useItemSimpleMatch && useItemSimpleMatch[2]) {
      result.actionType = 'USE_ITEM';
      result.itemUsed = useItemSimpleMatch[2].trim();
      // primaryTarget might be implicit or determined by context later
      return result;
  }


  // If no patterns match, return UNKNOWN
  return result;
}
