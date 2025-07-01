/**
 * @fileOverview A simple registry to store module definitions.
 */
import type { CascadeModule } from './types';

class ModuleRegistry {
  private modules = new Map<string, CascadeModule>();

  register(module: CascadeModule): void {
    if (this.modules.has(module.name)) {
      console.warn(`Module [${module.name}] is already registered. Overwriting.`);
    }
    this.modules.set(module.name, module);
  }

  get(moduleName: string): CascadeModule | undefined {
    return this.modules.get(moduleName);
  }

  getAll(): Map<string, CascadeModule> {
    return this.modules;
  }
}

// Export a singleton instance of the registry
export const moduleRegistry = new ModuleRegistry();
