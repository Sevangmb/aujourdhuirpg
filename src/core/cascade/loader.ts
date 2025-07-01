/**
 * @fileOverview Handles the loading of module instances.
 * In the future, this could support dynamic imports for lazy loading.
 */
import type { ModuleInstance } from './types';
import { moduleRegistry } from './registry';

class ModuleLoader {
  private instances = new Map<string, ModuleInstance>();

  async load(moduleName: string): Promise<ModuleInstance> {
    // Check cache first
    if (this.instances.has(moduleName)) {
      return this.instances.get(moduleName)!;
    }

    const moduleDefinition = moduleRegistry.get(moduleName);
    if (!moduleDefinition) {
      throw new Error(`Module [${moduleName}] not found in registry.`);
    }

    // Load the module instance (e.g., dynamic import)
    const instance = await moduleDefinition.load();
    this.instances.set(moduleName, instance);
    
    return instance;
  }
}

// Export a singleton instance
export const moduleLoader = new ModuleLoader();
