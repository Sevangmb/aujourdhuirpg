
/**
 * @fileOverview Type definitions specific to the Player module.
 */

// We can start by re-exporting types from the central location
// and add module-specific types here later if needed.
export type { 
    Player,
    PlayerStats,
    AdvancedSkillSystem,
    Progression,
    Alignment,
    SkillDetail,
    SkillCategory,
} from '@/lib/types';

// Example of a module-specific type
export interface PlayerVitals {
    healthPercentage: number;
    energyPercentage: number;
    stressLevel: 'low' | 'medium' | 'high';
}
