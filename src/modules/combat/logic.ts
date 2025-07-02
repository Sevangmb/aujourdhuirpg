/**
 * @fileOverview Complete Combat Logic for the RPG.
 * Includes turn-based combat, status effects, AI, and tactical gameplay.
 */

import type { GameState, Player, GameEvent } from '@/lib/types';
import type { 
  Enemy, 
  CombatState, 
  CombatAction, 
  CombatResult, 
  StatusEffect, 
  CombatLogEntry,
  CombatConfig,
  CombatActionType 
} from './types';
import { v4 as uuidv4 } from 'uuid';

// Configuration par défaut du combat
export const DEFAULT_COMBAT_CONFIG: CombatConfig = {
  maxTurns: 20,
  fleeBaseChance: 60,
  criticalMultiplier: 2.0,
  statusEffectMaxStack: 3,
  energyRegenPerTurn: 5
};

// Actions de base disponibles pour tous les joueurs
export const BASE_COMBAT_ACTIONS: CombatAction[] = [
  {
    id: 'attack_basic',
    type: 'attack',
    name: 'Attaque basique',
    description: 'Une attaque physique simple mais efficace.',
    iconName: 'Sword',
    energyCost: 10,
    accuracy: 85,
    criticalChance: 10,
    damage: {
      base: 15,
      scaling: 'force',
      variance: 0.3
    }
  },
  {
    id: 'defend',
    type: 'defend',
    name: 'Se défendre',
    description: 'Réduire les dégâts subis ce tour et récupérer de l\'énergie.',
    iconName: 'Shield',
    energyCost: 0,
    accuracy: 100,
    statusEffects: [{
      target: 'self',
      effect: {
        name: 'Défense',
        description: 'Dégâts réduits de 50%',
        type: 'buff',
        duration: 1,
        effects: { defense: 50 },
        icon: 'Shield'
      },
      chance: 100
    }]
  },
  {
    id: 'flee',
    type: 'flee',
    name: 'Fuir',
    description: 'Tenter de s\'échapper du combat.',
    iconName: 'ArrowRight',
    energyCost: 5,
    accuracy: 60 // Base chance, modifiée par calculateFleeChance
  },
  {
    id: 'wait',
    type: 'wait',
    name: 'Attendre',
    description: 'Passer son tour pour récupérer de l\'énergie.',
    iconName: 'Clock',
    energyCost: -10, // Récupère de l'énergie
    accuracy: 100
  }
];

// Actions ennemies de base
export const ENEMY_COMBAT_ACTIONS: { [key: string]: CombatAction } = {
  enemy_attack: {
    id: 'enemy_attack',
    type: 'attack',
    name: 'Attaque',
    description: 'L\'ennemi attaque.',
    iconName: 'Sword',
    energyCost: 8,
    accuracy: 75,
    criticalChance: 8,
    damage: {
      base: 12,
      scaling: 'force',
      variance: 0.25
    }
  },
  enemy_defensive: {
    id: 'enemy_defensive',
    type: 'defend',
    name: 'Position défensive',
    description: 'L\'ennemi adopte une posture défensive.',
    iconName: 'Shield',
    energyCost: 0,
    accuracy: 100,
    statusEffects: [{
      target: 'self',
      effect: {
        name: 'Défense renforcée',
        description: 'Dégâts réduits de 40%',
        type: 'buff',
        duration: 2,
        effects: { defense: 40 },
        icon: 'Shield'
      },
      chance: 100
    }]
  }
};

/**
 * Initialise un nouveau combat avec l'ennemi donné
 */
export function initializeCombat(
  player: Player, 
  enemy: Enemy, 
  environment?: CombatState['environment']
): CombatState {
  // Calcul de l'initiative (qui commence)
  const playerSpeed = player.stats.Force.value + player.stats.Intelligence.value;
  const enemySpeed = enemy.speed + enemy.accuracy;
  
  const playerInitiative = playerSpeed + Math.random() * 20;
  const enemyInitiative = enemySpeed + Math.random() * 20;
  
  const startingTurn = playerInitiative >= enemyInitiative ? 'player' : 'enemy';
  
  const combatState: CombatState = {
    isActive: true,
    currentTurn: startingTurn,
    turnNumber: 1,
    initiative: {
      player: playerInitiative,
      enemy: enemyInitiative
    },
    player: {
      health: player.stats.Sante.value,
      energy: player.stats.Energie.value,
      statusEffects: [],
      availableActions: getPlayerAvailableActions(player),
      actionCooldowns: {}
    },
    enemy: {
      ...enemy,
      statusEffects: [],
      actionCooldowns: {}
    },
    combatLog: [{
      id: uuidv4(),
      timestamp: Date.now(),
      actor: 'player',
      action: 'combat_start',
      result: 'success',
      description: `Combat contre ${enemy.name} ! ${startingTurn === 'player' ? 'Vous commencez.' : 'L\'ennemi commence.'}`
    }],
    canFlee: true,
    fleeAttempts: 0,
    environment
  };
  
  return combatState;
}

/**
 * Détermine les actions disponibles pour le joueur
 */
function getPlayerAvailableActions(player: Player): CombatAction[] {
  const actions = [...BASE_COMBAT_ACTIONS];
  
  // Ajouter des actions basées sur les compétences
  const combatSkill = player.skills.physical?.combat?.level || 0;
  
  if (combatSkill >= 10) {
    actions.push({
      id: 'power_attack',
      type: 'skill',
      name: 'Attaque puissante',
      description: 'Une attaque qui fait plus de dégâts mais coûte plus d\'énergie.',
      iconName: 'Zap',
      energyCost: 20,
      accuracy: 70,
      criticalChance: 20,
      damage: {
        base: 25,
        scaling: 'force',
        variance: 0.2
      },
      requiredSkill: {
        skill: 'physical.combat',
        level: 10
      }
    });
  }
  
  if (combatSkill >= 20) {
    actions.push({
      id: 'precise_strike',
      type: 'skill',
      name: 'Frappe précise',
      description: 'Une attaque très précise avec forte chance de critique.',
      iconName: 'Target',
      energyCost: 15,
      accuracy: 95,
      criticalChance: 40,
      damage: {
        base: 18,
        scaling: 'intelligence',
        variance: 0.1
      },
      requiredSkill: {
        skill: 'physical.combat',
        level: 20
      }
    });
  }
  
  return actions;
}

/**
 * Exécute une action de combat et retourne les événements résultants
 */
export function executeCombatAction(
  combatState: CombatState,
  actionId: string,
  actor: 'player' | 'enemy',
  player: Player
): { events: GameEvent[], newCombatState: CombatState } {
  const events: GameEvent[] = [];
  const newCombatState = { ...combatState };
  
  // Trouver l'action
  const action = actor === 'player' 
    ? combatState.player.availableActions.find(a => a.id === actionId)
    : ENEMY_COMBAT_ACTIONS[actionId];
    
  if (!action) {
    console.error(`Action not found: ${actionId}`);
    return { events, newCombatState };
  }
  
  // Vérifier les conditions d'utilisation
  if (!canUseAction(action, actor, combatState, player)) {
    events.push({
      type: 'TEXT_EVENT',
      text: `${action.name} ne peut pas être utilisée maintenant.`
    });
    return { events, newCombatState };
  }
  
  // Exécuter l'action selon son type
  const result = executeActionByType(action, actor, newCombatState, player);
  events.push(...result.events);
  Object.assign(newCombatState, result.combatState);
  
  // Ajouter au log de combat
  const logEntry: CombatLogEntry = {
    id: uuidv4(),
    timestamp: Date.now(),
    actor,
    action: action.name,
    result: result.success ? 'success' : 'failure',
    damage: result.damage,
    healing: result.healing,
    description: result.description
  };
  newCombatState.combatLog.push(logEntry);
  
  // Traiter les effets de statut
  processStatusEffects(newCombatState, events);
  
  // Vérifier la fin du combat
  const combatResult = checkCombatEnd(newCombatState, player);
  if (combatResult) {
    events.push({ type: 'COMBAT_ENDED', result: combatResult });
    newCombatState.isActive = false;
  } else {
    // Passer au tour suivant
    advanceTurn(newCombatState, events);
  }
  
  return { events, newCombatState };
}

/**
 * Vérifie si une action peut être utilisée
 */
function canUseAction(
  action: CombatAction, 
  actor: 'player' | 'enemy', 
  combatState: CombatState,
  player: Player
): boolean {
  const actorState = actor === 'player' ? combatState.player : combatState.enemy;
  
  // Vérifier l'énergie
  if (actorState.energy < action.energyCost) {
    return false;
  }
  
  // Vérifier le cooldown
  if (actorState.actionCooldowns[action.id] && actorState.actionCooldowns[action.id] > 0) {
    return false;
  }
  
  // Vérifier les compétences requises (pour le joueur)
  if (actor === 'player' && action.requiredSkill) {
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
 * Exécute une action selon son type
 */
function executeActionByType(
  action: CombatAction,
  actor: 'player' | 'enemy',
  combatState: CombatState,
  player: Player
) {
  const events: GameEvent[] = [];
  const actorState = actor === 'player' ? combatState.player : combatState.enemy;
  const targetState = actor === 'player' ? combatState.enemy : combatState.player;
  
  let success = false;
  let damage = 0;
  let healing = 0;
  let description = '';
  
  // Consommer l'énergie
  actorState.energy = Math.max(0, actorState.energy - action.energyCost);
  
  switch (action.type) {
    case 'attack':
      const attackResult = executeAttack(action, actor, combatState, player);
      success = attackResult.hit;
      damage = attackResult.damage;
      description = attackResult.description;
      
      if (success && damage > 0) {
        targetState.health = Math.max(0, targetState.health - damage);
        events.push({
          type: 'COMBAT_DAMAGE_DEALT',
          target: actor === 'player' ? 'enemy' : 'player',
          damage,
          source: action.name
        });
      }
      break;
      
    case 'defend':
      success = true;
      description = `${actor === 'player' ? 'Vous vous défendez' : 'L\'ennemi se défend'}.`;
      // Les effets de statut sont appliqués après
      break;
      
    case 'flee':
      if (actor === 'player') {
        const fleeChance = calculateFleeChance(combatState, player);
        success = Math.random() * 100 < fleeChance;
        combatState.fleeAttempts++;
        
        if (success) {
          description = 'Vous réussissez à fuir le combat !';
          combatState.isActive = false;
        } else {
          description = 'Votre tentative de fuite échoue !';
        }
      }
      break;
      
    case 'wait':
      success = true;
      healing = Math.abs(action.energyCost); // energyCost négatif = heal
      actorState.energy = Math.min(100, actorState.energy + healing);
      description = `${actor === 'player' ? 'Vous attendez' : 'L\'ennemi attend'} et récupérez de l'énergie.`;
      break;
      
    case 'skill':
      // Actions de compétence (similaire à l'attaque mais avec effets spéciaux)
      const skillResult = executeAttack(action, actor, combatState, player);
      success = skillResult.hit;
      damage = skillResult.damage;
      description = skillResult.description;
      
      if (success && damage > 0) {
        targetState.health = Math.max(0, targetState.health - damage);
        events.push({
          type: 'COMBAT_DAMAGE_DEALT',
          target: actor === 'player' ? 'enemy' : 'player',
          damage,
          source: action.name
        });
      }
      break;
  }
  
  // Appliquer les effets de statut
  if (success && action.statusEffects) {
    for (const statusEffect of action.statusEffects) {
      if (Math.random() * 100 < statusEffect.chance) {
        const effect: StatusEffect = {
          id: uuidv4(),
          ...statusEffect.effect
        };
        
        const target = statusEffect.target === 'self' ? actorState : targetState;
        target.statusEffects.push(effect);
        
        events.push({
          type: 'COMBAT_STATUS_APPLIED',
          target: statusEffect.target === 'self' 
            ? actor 
            : (actor === 'player' ? 'enemy' : 'player'),
          effect
        });
      }
    }
  }
  
  // Appliquer le cooldown
  if (action.cooldown) {
    actorState.actionCooldowns[action.id] = action.cooldown;
  }
  
  return {
    events,
    combatState,
    success,
    damage,
    healing,
    description
  };
}

/**
 * Calcule les dégâts d'une attaque
 */
function executeAttack(
  action: CombatAction,
  actor: 'player' | 'enemy',
  combatState: CombatState,
  player: Player
) {
  const actorState = actor === 'player' ? combatState.player : combatState.enemy;
  const targetState = actor === 'player' ? combatState.enemy : combatState.player;
  
  // Calculer la précision finale
  let finalAccuracy = action.accuracy;
  
  // Modificateurs d'environnement
  if (combatState.environment?.modifiers?.accuracy) {
    finalAccuracy += combatState.environment.modifiers.accuracy;
  }
  
  // Modificateurs de statut
  for (const effect of actorState.statusEffects) {
    if (effect.effects.accuracy) {
      finalAccuracy += effect.effects.accuracy;
    }
  }
  
  // Test de précision
  const hitRoll = Math.random() * 100;
  const hit = hitRoll < finalAccuracy;
  
  if (!hit) {
    return {
      hit: false,
      damage: 0,
      description: `${actor === 'player' ? 'Votre attaque manque' : 'L\'attaque ennemie vous rate'} !`
    };
  }
  
  // Calculer les dégâts
  if (!action.damage) {
    return {
      hit: true,
      damage: 0,
      description: `${action.name} réussit !`
    };
  }
  
  let baseDamage = action.damage.base;
  
  // Scaling par stat
  if (action.damage.scaling && actor === 'player') {
    const scalingStat = player.stats[action.damage.scaling as keyof typeof player.stats];
    if (scalingStat) {
      baseDamage += scalingStat.value * 0.3; // 30% de la stat
    }
  } else if (actor === 'enemy') {
    baseDamage += combatState.enemy.attack * 0.25;
  }
  
  // Variance aléatoire
  const variance = action.damage.variance;
  const randomFactor = 1 + (Math.random() - 0.5) * 2 * variance;
  let finalDamage = baseDamage * randomFactor;
  
  // Modificateurs de défense du défenseur
  let defenseReduction = 0;
  if (actor === 'enemy') {
    // Défense du joueur
    defenseReduction = player.stats.Force.value * 0.1;
  } else {
    // Défense de l'ennemi
    defenseReduction = combatState.enemy.defense * 0.15;
  }
  
  // Effets de statut sur la défense
  for (const effect of targetState.statusEffects) {
    if (effect.effects.defense) {
      defenseReduction += effect.effects.defense;
    }
  }
  
  finalDamage = Math.max(1, finalDamage - defenseReduction);
  
  // Test de critique
  const critRoll = Math.random() * 100;
  const isCritical = action.criticalChance && critRoll < action.criticalChance;
  
  if (isCritical) {
    finalDamage *= DEFAULT_COMBAT_CONFIG.criticalMultiplier;
    return {
      hit: true,
      damage: Math.round(finalDamage),
      description: `🎯 Coup critique ! ${Math.round(finalDamage)} dégâts !`
    };
  }
  
  return {
    hit: true,
    damage: Math.round(finalDamage),
    description: `${Math.round(finalDamage)} dégâts infligés.`
  };
}

/**
 * Calcule la chance de fuite
 */
function calculateFleeChance(combatState: CombatState, player: Player): number {
  let baseChance = DEFAULT_COMBAT_CONFIG.fleeBaseChance;
  
  // Réduction par tentatives précédentes
  baseChance -= combatState.fleeAttempts * 15;
  
  // Modificateur de vitesse relative
  const playerSpeed = player.stats.Force.value + player.stats.Intelligence.value;
  const enemySpeed = combatState.enemy.speed;
  
  if (playerSpeed > enemySpeed) {
    baseChance += 20;
  } else if (playerSpeed < enemySpeed) {
    baseChance -= 20;
  }
  
  // Modificateurs d'environnement
  if (combatState.environment?.modifiers?.flee_chance) {
    baseChance += combatState.environment.modifiers.flee_chance;
  }
  
  return Math.max(10, Math.min(90, baseChance));
}

/**
 * Traite les effets de statut actifs
 */
function processStatusEffects(combatState: CombatState, events: GameEvent[]) {
  // Traiter les effets du joueur
  processActorStatusEffects(combatState.player, 'player', events);
  
  // Traiter les effets de l'ennemi
  processActorStatusEffects(combatState.enemy, 'enemy', events);
}

function processActorStatusEffects(
  actor: CombatState['player'] | CombatState['enemy'], 
  actorType: 'player' | 'enemy',
  events: GameEvent[]
) {
  const effectsToRemove: string[] = [];
  
  for (const effect of actor.statusEffects) {
    // Appliquer les effets par tour
    if (effect.effects.damage_per_turn) {
      const damage = Math.abs(effect.effects.damage_per_turn);
      if (effect.effects.damage_per_turn > 0) {
        // Dégâts
        actor.health = Math.max(0, actor.health - damage);
        events.push({
          type: 'COMBAT_DAMAGE_DEALT',
          target: actorType,
          damage,
          source: effect.name
        });
      } else {
        // Soins
        actor.health = Math.min(actor.maxHealth || 100, actor.health + damage);
        events.push({
          type: 'COMBAT_HEALING_APPLIED',
          target: actorType,
          healing: damage,
          source: effect.name
        });
      }
    }
    
    if (effect.effects.energy) {
      actor.energy = Math.max(0, Math.min(100, actor.energy + effect.effects.energy));
    }
    
    // Réduire la durée
    effect.duration--;
    
    // Marquer pour suppression si expiré
    if (effect.duration <= 0) {
      effectsToRemove.push(effect.id);
    }
  }
  
  // Supprimer les effets expirés
  for (const effectId of effectsToRemove) {
    const index = actor.statusEffects.findIndex(e => e.id === effectId);
    if (index !== -1) {
      actor.statusEffects.splice(index, 1);
      events.push({
        type: 'COMBAT_STATUS_REMOVED',
        target: actorType,
        effectId
      });
    }
  }
}

/**
 * Avance au tour suivant
 */
function advanceTurn(combatState: CombatState, events: GameEvent[]) {
  // Réduire les cooldowns
  for (const actionId in combatState.player.actionCooldowns) {
    combatState.player.actionCooldowns[actionId]--;
    if (combatState.player.actionCooldowns[actionId] <= 0) {
      delete combatState.player.actionCooldowns[actionId];
    }
  }
  
  for (const actionId in combatState.enemy.actionCooldowns) {
    combatState.enemy.actionCooldowns[actionId]--;
    if (combatState.enemy.actionCooldowns[actionId] <= 0) {
      delete combatState.enemy.actionCooldowns[actionId];
    }
  }
  
  // Régénération d'énergie
  combatState.player.energy = Math.min(100, combatState.player.energy + DEFAULT_COMBAT_CONFIG.energyRegenPerTurn);
  combatState.enemy.energy = Math.min(combatState.enemy.maxEnergy, combatState.enemy.energy + DEFAULT_COMBAT_CONFIG.energyRegenPerTurn);
  
  // Changer de tour
  combatState.currentTurn = combatState.currentTurn === 'player' ? 'enemy' : 'player';
  combatState.turnNumber++;
  
  events.push({ type: 'COMBAT_TURN_END' });
}

/**
 * Vérifie si le combat est terminé
 */
function checkCombatEnd(combatState: CombatState, player: Player): CombatResult | null {
  const { player: playerState, enemy, turnNumber } = combatState;
  
  // Victoire du joueur
  if (enemy.health <= 0) {
    return {
      outcome: 'victory',
      duration: turnNumber,
      playerDamageDealt: enemy.maxHealth - enemy.health,
      playerDamageTaken: player.stats.Sante.value - playerState.health,
      actionsUsed: combatState.combatLog.filter(l => l.actor === 'player').map(l => l.action),
      rewards: enemy.rewards,
      narrative: enemy.combatText?.onDefeat || `Vous avez vaincu ${enemy.name} !`
    };
  }
  
  // Défaite du joueur
  if (playerState.health <= 0) {
    return {
      outcome: 'defeat',
      duration: turnNumber,
      playerDamageDealt: enemy.maxHealth - enemy.health,
      playerDamageTaken: player.stats.Sante.value - playerState.health,
      actionsUsed: combatState.combatLog.filter(l => l.actor === 'player').map(l => l.action),
      narrative: enemy.combatText?.onVictory || `${enemy.name} vous a vaincu...`
    };
  }
  
  // Match nul (trop de tours)
  if (turnNumber >= DEFAULT_COMBAT_CONFIG.maxTurns) {
    return {
      outcome: 'draw',
      duration: turnNumber,
      playerDamageDealt: enemy.maxHealth - enemy.health,
      playerDamageTaken: player.stats.Sante.value - playerState.health,
      actionsUsed: combatState.combatLog.filter(l => l.actor === 'player').map(l => l.action),
      narrative: 'Le combat s\'éternise... Vous vous séparez sans vainqueur.'
    };
  }
  
  return null;
}

/**
 * IA simple pour choisir l'action de l'ennemi
 */
export function chooseEnemyAction(combatState: CombatState): string {
  const { enemy } = combatState;
  const availableActions = enemy.availableActions.filter(actionId => {
    const action = ENEMY_COMBAT_ACTIONS[actionId];
    return action && enemy.energy >= action.energyCost;
  });
  
  if (availableActions.length === 0) {
    return 'enemy_wait'; // Action par défaut
  }
  
  // IA basique selon le type d'ennemi
  switch (enemy.aiType) {
    case 'aggressive':
      // Toujours attaquer si possible
      return availableActions.includes('enemy_attack') ? 'enemy_attack' : availableActions[0];
      
    case 'defensive':
      // Se défendre si la vie est basse
      if (enemy.health < enemy.maxHealth * 0.3 && availableActions.includes('enemy_defensive')) {
        return 'enemy_defensive';
      }
      return availableActions.includes('enemy_attack') ? 'enemy_attack' : availableActions[0];
      
    case 'tactical':
      // Mélange d'attaque et de défense
      if (enemy.health < enemy.maxHealth * 0.5 && Math.random() < 0.4) {
        return availableActions.includes('enemy_defensive') ? 'enemy_defensive' : availableActions[0];
      }
      return availableActions.includes('enemy_attack') ? 'enemy_attack' : availableActions[0];
      
    default:
      return availableActions[Math.floor(Math.random() * availableActions.length)];
  }
}

// Fonctions pour l'intégration avec le système principal
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
