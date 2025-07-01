/**
 * @fileOverview Central configuration file to list all available modules.
 * This will be used to register all modules with the cascade engine.
 */
import type { CascadeModule } from '../cascade/types';
import { playerModule } from '@/modules/player';
import { inventoryModule } from '@/modules/inventory';
import { combatModule } from '@/modules/combat';

// Import other modules here as they are created
// import { combatModule } from '@/modules/combat';

export const ALL_MODULES: CascadeModule[] = [
  playerModule,
  inventoryModule,
  combatModule,
];
