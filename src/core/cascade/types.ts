/**
 * @fileOverview Defines the core types for the modular cascade architecture.
 * This establishes the contract for all modules and the engine.
 */

import type { GameState } from '@/lib/types';
import type { GameEvent } from '@/lib/types';

/**
 * The result of a module's execution within the cascade.
 */
export interface ModuleResult {
  success: boolean;
  events?: GameEvent[];
  [key: string]: any; // Allows modules to return custom data
}

/**
 * An instance of a module, containing its logic.
 */
export interface ModuleInstance {
  execute(state: GameState, payload?: any): Promise<ModuleResult>;
}

/**
 * The definition of a module for registration in the cascade system.
 */
export interface CascadeModule {
  name: string;
  dependencies?: string[];
  load(): Promise<ModuleInstance>;
}

/**
 * The final result of a full cascade execution for a given action.
 */
export interface CascadeResult<T = any> {
  success: boolean;
  data?: T;
  errors?: { module: string; message: string }[];
  modules_executed: string[];
}
