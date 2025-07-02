/**
 * @fileOverview Logique de combat simplifiée - Version progressive
 * Commence par les fonctions de base puis s'étoffera
 */

import type { GameState, Player, GameEvent } from '@/lib/types';
import type { Enemy, CombatAction } from './types';
import { BASIC_PLAYER_ACTIONS, SKILL_BASED_ACTIONS, ENEMY_ACTIONS } from './actions';
import { v4 as uuidv4 } from 'uuid';

/**
 * ÉTAPE 1: Fonction simple pour calculer les dégâts
 */
export function calculateBasicDamage(
  attacker: Player | Enemy, 
  defender: Player | Enemy,
  baseDamage: number
): number {
  // Calcul simple : dégâts de base - défense
  let damage = baseDamage;
  
  // Si l'attaquant est le joueur
  if ('stats' in attacker && attacker.stats.Force) {
    damage += attacker.stats.Force.value * 0.2; // 20% de la force
  }
  // Si l'attaquant est un ennemi
  else if ('attack' in attacker) {
    damage += attacker.attack * 0.1;
  }
  
  // Si le défenseur est le joueur
  if ('stats' in defender && defender.stats.Force) {
    damage -= defender.stats.Force.value * 0.1; // 10% de réduction
  }
  // Si le défenseur est un ennemi
  else if ('defense' in defender) {
    damage -= defender.defense * 0.1;
  }
  
  return Math.max(1, Math.round(damage)); // Minimum 1 dégât
}

/**
 * ÉTAPE 2: Fonction pour vérifier si une action peut être utilisée
 */
export function canUseAction(action: CombatAction, player: Player): boolean {
  // Vérifier l'énergie
  if (player.stats.Energie.value < action.energyCost) {
    return false;
  }
  
  // Vérifier les compétences requises
  if (action.requiredSkill) {
    const skillPath = action.requiredSkill.skill.split('.');
    const category = skillPath[0] as keyof typeof player.skills;
    const skill = skillPath[1];
    
    if (!player.skills[category] || !(player.skills[category] as any)[skill]) {
      return false;
    }
    
    const skillLevel = (player.skills[category] as any)[skill].level;
    if (skillLevel < action.requiredSkill.level) {
      return false;
    }
  }
  
  return true;
}

/**
 * ÉTAPE 3: Obtenir les actions disponibles pour le joueur
 */
export function getAvailablePlayerActions(player: Player): CombatAction[] {
  const actions = [...BASIC_PLAYER_ACTIONS];
  
  // Ajouter les actions basées sur les compétences
  for (const skillAction of SKILL_BASED_ACTIONS) {
    if (canUseAction(skillAction, player)) {
      actions.push(skillAction);
    }
  }
  
  return actions;
}

/**
 * ÉTAPE 4: Exécuter une attaque simple
 */
export function executeSimpleAttack(
  attacker: Player | Enemy,
  defender: Player | Enemy,
  action: CombatAction
): {
  success: boolean;
  damage: number;
  description: string;
} {
  // Test de précision
  const hitRoll = Math.random() * 100;
  const success = hitRoll < action.accuracy;
  
  if (!success) {
    return {
      success: false,
      damage: 0,
      description: 'L\'attaque manque sa cible !'
    };
  }
  
  // Calculer les dégâts
  const baseDamage = action.damage?.base || 0;
  const damage = calculateBasicDamage(attacker, defender, baseDamage);
  
  // Test de critique
  const critRoll = Math.random() * 100;
  const isCritical = action.criticalChance && critRoll < action.criticalChance;
  
  if (isCritical) {
    const critDamage = Math.round(damage * 1.5);
    return {
      success: true,
      damage: critDamage,
      description: `🎯 Coup critique ! ${critDamage} dégâts !`
    };
  }
  
  return {
    success: true,
    damage,
    description: `${damage} dégâts infligés.`
  };
}

/**
 * ÉTAPE 5: Traiter une action du joueur
 */
export function processPlayerCombatAction(
  gameState: GameState,
  actionId: string
): { events: GameEvent[]; success: boolean; description: string } {
  const events: GameEvent[] = [];
  const player = gameState.player;
  const enemy = gameState.currentEnemy;
  
  if (!player || !enemy) {
    return { events, success: false, description: 'État de combat invalide.' };
  }
  
  // Trouver l'action
  const availableActions = getAvailablePlayerActions(player);
  const action = availableActions.find(a => a.id === actionId);
  
  if (!action) {
    return { events, success: false, description: 'Action non trouvée.' };
  }
  
  // Vérifier si l'action peut être utilisée
  if (!canUseAction(action, player)) {
    return { events, success: false, description: 'Action non disponible.' };
  }
  
  // Consommer l'énergie
  const newEnergy = player.stats.Energie.value - action.energyCost;
  events.push({
    type: 'PLAYER_STAT_CHANGE',
    stat: 'Energie',
    change: -action.energyCost,
    finalValue: newEnergy
  });
  
  // Traiter l'action selon son type
  switch (action.type) {
    case 'attack':
    case 'skill':
      const result = executeSimpleAttack(player, enemy, action);
      if (result.success && result.damage > 0) {
        const newEnemyHealth = enemy.health - result.damage;
        events.push({
          type: 'COMBAT_ACTION',
          target: 'enemy',
          newHealth: newEnemyHealth
        });
        
        // Vérifier si l'ennemi est vaincu
        if (newEnemyHealth <= 0) {
          events.push({ type: 'COMBAT_ENDED', winner: 'player' });
        }
      }
      return { events, success: result.success, description: result.description };
      
    case 'defend':
      // Récupérer un peu d'énergie en se défendant
      const defendEnergy = Math.min(100, newEnergy + 5);
      events.push({
        type: 'PLAYER_STAT_CHANGE',
        stat: 'Energie',
        change: 5,
        finalValue: defendEnergy
      });
      return { events, success: true, description: 'Vous vous défendez et récupérez de l\'énergie.' };
      
    case 'flee':
      // Simple chance de fuite de 60%
      const fleeSuccess = Math.random() < 0.6;
      if (fleeSuccess) {
        events.push({ type: 'COMBAT_ENDED', winner: 'player' }); // Fuite réussie
        return { events, success: true, description: 'Vous réussissez à fuir !' };
      } else {
        return { events, success: false, description: 'Impossible de fuir !' };
      }
      
    case 'wait':
      // Récupérer de l'énergie
      const waitEnergy = Math.min(100, newEnergy + Math.abs(action.energyCost));
      events.push({
        type: 'PLAYER_STAT_CHANGE',
        stat: 'Energie',
        change: Math.abs(action.energyCost),
        finalValue: waitEnergy
      });
      return { events, success: true, description: 'Vous attendez et récupérez de l\'énergie.' };
      
    default:
      return { events, success: false, description: 'Action non implémentée.' };
  }
}

/**
 * ÉTAPE 6: IA simple pour l'ennemi
 */
export function processEnemyTurn(gameState: GameState): { 
  events: GameEvent[]; 
  description: string; 
} {
  const events: GameEvent[] = [];
  const player = gameState.player;
  const enemy = gameState.currentEnemy;
  
  if (!player || !enemy) {
    return { events, description: 'État de combat invalide.' };
  }
  
  // L'ennemi attaque toujours avec l'action de base
  const enemyAction = ENEMY_ACTIONS.enemy_attack;
  const result = executeSimpleAttack(enemy, player, enemyAction);
  
  if (result.success && result.damage > 0) {
    const newPlayerHealth = player.stats.Sante.value - result.damage;
    events.push({
      type: 'COMBAT_ACTION',
      target: 'player',
      newHealth: newPlayerHealth
    });
    
    // Vérifier si le joueur est vaincu
    if (newPlayerHealth <= 0) {
      events.push({ type: 'COMBAT_ENDED', winner: 'enemy' });
    }
  }
  
  return { 
    events, 
    description: `${enemy.name} ${result.description}` 
  };
}

// Fonctions existantes pour la compatibilité
export function handleCombatAction(state: GameState, target: 'player' | 'enemy', newHealth: number): GameState {
  if (target === 'player' && state.player) {
    const newSante = { ...state.player.stats.Sante, value: newHealth };
    const newPlayer = { ...state.player, stats: { ...state.player.stats, Sante: newSante } };
    return { ...state, player: newPlayer };
  } else if (target === 'enemy' && state.currentEnemy) {
    const newEnemy = { ...state.currentEnemy, health: newHealth };
    return { ...state, currentEnemy: newEnemy };
  }
  return state;
}

export function handleCombatStarted(state: GameState, enemy: Enemy): GameState {
  return { ...state, currentEnemy: enemy };
}

export function handleCombatEnded(state: GameState): GameState {
  return { ...state, currentEnemy: null };
}
