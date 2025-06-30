
/**
 * @fileOverview Centralized instance of the DependencyChainManager.
 * This file initializes the manager and registers all available enrichment modules.
 */
import { DependencyChainManager } from './DependencyChainManager';
import { CuisineModule } from '@/modules/cascade/CuisineModule';
import { RecettesModule } from '@/modules/cascade/RecettesModule';
import { IngredientsModule } from '@/modules/cascade/IngredientsModule';
import { NutrimentsModule } from '@/modules/cascade/NutrimentsModule';
import { CultureLocaleModule } from '@/modules/cascade/CultureLocaleModule';

const manager = new DependencyChainManager();

// Register all available modules
manager.registerModule(new CuisineModule());
manager.registerModule(new RecettesModule());
manager.registerModule(new IngredientsModule());
manager.registerModule(new NutrimentsModule());
manager.registerModule(new CultureLocaleModule());

export const cascadeManager = manager;
