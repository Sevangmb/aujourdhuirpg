/**
 * @fileOverview The main engine that orchestrates the execution of modules in a cascade.
 */
import type { GameState } from '@/lib/types';
import type { CascadeModule, CascadeResult, ModuleInstance } from './types';
import { moduleRegistry } from './registry';
import { moduleLoader } from './loader';

class CascadeEngine {
  
  registerModule(module: CascadeModule): void {
    moduleRegistry.register(module);
  }

  async loadModule(moduleName: string): Promise<ModuleInstance> {
    return moduleLoader.load(moduleName);
  }

  /**
   * Executes a cascade of modules based on dependencies.
   * @param action The entry point action or module name.
   * @param state The current game state.
   * @param payload Additional data for the action.
   * @returns The aggregated result of the cascade.
   */
  async execute(action: string, state: GameState, payload: any): Promise<CascadeResult> {
    console.log(`[CascadeEngine] Executing action: ${action}`);
    
    const executionOrder = await this.resolveExecutionOrder(action);
    const results: CascadeResult = {
      success: true,
      modules_executed: [],
      errors: [],
      data: {},
    };

    // Create a mutable copy of the state for this execution context
    let currentState = JSON.parse(JSON.stringify(state));

    for (const moduleName of executionOrder) {
      try {
        const moduleInstance = await this.loadModule(moduleName);
        const moduleResult = await moduleInstance.execute(currentState, payload);
        results.modules_executed.push(moduleName);

        if (!moduleResult.success) {
          results.success = false;
          results.errors?.push({ module: moduleName, message: 'Module execution failed.' });
          // Optionally, stop the cascade on failure
          // break; 
        }

        // Apply events from the module to the state for the next module in the chain
        if (moduleResult.events && moduleResult.events.length > 0) {
            // Here we would need a reducer to apply events.
            // For now, we'll just log it.
            console.log(`[CascadeEngine] Module ${moduleName} produced ${moduleResult.events.length} events.`);
        }

        // Merge data from modules
        results.data[moduleName] = moduleResult;

      } catch (error) {
        console.error(`[CascadeEngine] Error executing module ${moduleName}:`, error);
        results.success = false;
        results.errors?.push({ module: moduleName, message: (error as Error).message });
      }
    }

    return results;
  }

  /**
   * Resolves the order of execution using topological sort.
   * @param startModule The name of the initial module to execute.
   * @returns An array of module names in the correct execution order.
   */
  private async resolveExecutionOrder(startModule: string): Promise<string[]> {
    const sortedList: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const visit = (moduleName: string) => {
      if (recursionStack.has(moduleName)) {
        throw new Error(`Circular dependency detected: ${moduleName}`);
      }
      if (visited.has(moduleName)) {
        return;
      }

      visited.add(moduleName);
      recursionStack.add(moduleName);

      const moduleDef = moduleRegistry.get(moduleName);
      if (moduleDef?.dependencies) {
        for (const dep of moduleDef.dependencies) {
          visit(dep);
        }
      }
      
      recursionStack.delete(moduleName);
      sortedList.push(moduleName);
    };

    visit(startModule);
    return sortedList;
  }
}

// Export a singleton instance of the engine
export const cascadeEngine = new CascadeEngine();
