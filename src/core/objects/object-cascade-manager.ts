
/**
 * @fileOverview Centralized instance of the ObjectCascadeManager.
 * This file initializes the manager and registers all available object enrichment modules.
 */
import { ObjectCascadeManager } from './ObjectCascadeManager';
import { ProprietesArmesModule } from '@/modules/objects/ProprietesArmesModule';
import { ValeurEconomiqueModule } from '@/modules/objects/ValeurEconomiqueModule';
import { EnchantementsModule } from '@/modules/objects/EnchantementsModule';
import { HistoriqueModule } from '@/modules/objects/HistoriqueModule';


const manager = new ObjectCascadeManager();

// Register all available object modules
manager.registerModule(new ProprietesArmesModule());
manager.registerModule(new ValeurEconomiqueModule());
manager.registerModule(new EnchantementsModule());
manager.registerModule(new HistoriqueModule());


export const objectCascadeManager = manager;
