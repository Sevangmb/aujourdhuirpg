
/**
 * @fileOverview Enhanced Combat Logic System
 * Advanced tactical combat mechanics with turn management, AI, and effects
 */

import type { 
  GameState, 
  GameEvent, 
  Player, 
  DegreeOfSuccess, 
  StoryChoice,
  IntelligentItem 
} from '@/lib/types';
import type { 
  Enemy, 
  CombatState, 
  CombatAction, 
  CombatResult, 
  StatusEffect,
  CombatLogEntry,
  EnemyTemplate,
  CombatStats,
  WeaponStats,
  ArmorStats
} from './enhanced-types';
import { COMBAT_ACTIONS, getAvailableActions, calculateActionSuccessProbability } from './actions';
import { performSkillCheck } from '@/lib/skill-check';
import { v4 as uuidv4 } from 'uuid';

// === COMBAT STATE MANAGEMENT ===

export class CombatManager {
  private state: CombatState;
  private logEntries: CombatLogEntry[] = [];

  constructor(player: Player, enemies: Enemy[]) {
    this.state = this.initializeCombatState(player, enemies);
  }

  private initializeCombatState(player: Player, enemies: Enemy[]): CombatState {
    const playerWeapon = this.getEquippedWeapon(player);
    const playerArmor = this.getEquippedArmor(player);

    return {
      isActive: true,
      currentTurn: 'player',
      turnCount: 1,
      player: {
        stats: this.createPlayerCombatStats(player, playerArmor),
        availableActions: getAvailableActions(
          player.skills, 
          player.stats, 
          playerWeapon, 
          player.stats.Energie.value
        ),
        equipped: {
          weapon: playerWeapon,
          armor: playerArmor,
          accessories: this.getEquippedAccessories(player)
        }
      },
      enemies: enemies.map(enemy => ({
        ...enemy,
        currentStats: this.createEnemyCombatStats(enemy)
      })),
      environment: {
        type: 'urban',
        modifiers: {
          visibility: 100,
          mobility: 100
        }
      },
      combatLog: []
    };
  }

  private createPlayerCombatStats(player: Player, armor?: IntelligentItem & { armorStats: ArmorStats }): CombatStats {
    const baseArmor = armor?.armorStats.defense || 0;
    return {
      health: player.stats.Sante.value,
      maxHealth: player.stats.Sante.max || 100,
      stamina: player.stats.Energie.value,
      maxStamina: player.stats.Energie.max || 100,
      armor: baseArmor,
      position: 'melee',
      stance: 'balanced',
      statusEffects: []
    };
  }

  private createEnemyCombatStats(enemy: Enemy): CombatStats {
    const healthFromConstitution = Math.floor(enemy.baseStats.Constitution * 1.5);
    return {
      health: healthFromConstitution,
      maxHealth: healthFromConstitution,
      stamina: 100,
      maxStamina: 100,
      armor: enemy.naturalArmor.defense,
      position: 'melee',
      stance: 'balanced',
      statusEffects: []
    };
  }

  private getEquippedWeapon(player: Player): (IntelligentItem & { combatStats: WeaponStats }) | undefined {
    const weapon = player.inventory.find(item => 
      item.type === 'weapon' && item.combatStats
    ) as (IntelligentItem & { combatStats: WeaponStats }) | undefined;
    
    return weapon;
  }

  private getEquippedArmor(player: Player): (IntelligentItem & { armorStats: ArmorStats }) | undefined {
    const armor = player.inventory.find(item => 
      item.type === 'armor' && item.armorStats
    ) as (IntelligentItem & { armorStats: ArmorStats }) | undefined;
    
    return armor;
  }

  private getEquippedAccessories(player: Player): (IntelligentItem & { special_effects?: StatusEffect[] })[] {
    return player.inventory.filter(item => 
      item.type === 'misc' && item.special_effects
    ) as (IntelligentItem & { special_effects?: StatusEffect[] })[];
  }

  // === COMBAT ACTION PROCESSING ===

  public processPlayerAction(action: CombatAction, player: Player, target?: Enemy): GameEvent[] {
    const events: GameEvent[] = [];
    const logEntry = this.createLogEntry('action', player.name, target?.name, `${player.name} tente ${action.name}`);
    
    this.addToLog(logEntry);
    events.push({ type: 'COMBAT_LOG_ENTRY', payload: logEntry });

    // Check stamina cost
    if (this.state.player.stats.stamina < action.stamina_cost) {
      const failEntry = this.createLogEntry('action', player.name, undefined, 'Pas assez d\'endurance !');
      this.addToLog(failEntry);
      events.push({ type: 'COMBAT_LOG_ENTRY', payload: failEntry });
      return events;
    }

    // Consume stamina
    this.state.player.stats.stamina -= action.stamina_cost;
    events.push({ 
      type: 'COMBAT_ACTION', 
      attacker: player.name, 
      target: 'player', 
      damage: -action.stamina_cost, 
      newHealth: this.state.player.stats.stamina, 
      action: 'consomme de l\'endurance' 
    });

    // Perform skill check if required
    let success = true;
    let degreeOfSuccess: DegreeOfSuccess = 'success';

    if (action.success_modifiers.skill_bonus || target) {
      const difficulty = target ? this.calculateActionDifficulty(action, target) : 50;
      const skillCheckResult = this.performActionSkillCheck(action, player, difficulty);
      success = skillCheckResult.success;
      degreeOfSuccess = skillCheckResult.degreeOfSuccess;
      events.push({ ...skillCheckResult, type: 'SKILL_CHECK_RESULT' });
    }

    if (success) {
      events.push(...this.applyActionEffects(action, player, target, degreeOfSuccess));
    } else {
      const failEntry = this.createLogEntry('action', player.name, target?.name, `${action.name} échoue !`);
      this.addToLog(failEntry);
      events.push({ type: 'COMBAT_LOG_ENTRY', payload: failEntry });
    }

    return events;
  }

  private calculateActionDifficulty(action: CombatAction, target: Enemy): number {
    let baseDifficulty = 40;
    
    // Adjust for target's relevant stats
    switch (action.type) {
      case 'attack':
        baseDifficulty += target.baseStats.Dexterite / 2;
        break;
      case 'intimidate':
        baseDifficulty += target.baseStats.Intelligence / 2;
        break;
      case 'analyze':
        baseDifficulty += target.baseStats.Perception / 3;
        break;
      default:
        baseDifficulty += target.baseStats.Perception / 4;
    }

    // Adjust for target's current status
    if (target.currentStats.statusEffects.some(effect => effect.id === 'intimidated')) {
      baseDifficulty -= 15;
    }
    if (target.currentStats.statusEffects.some(effect => effect.id === 'analyzed')) {
      baseDifficulty -= 10;
    }

    return Math.max(20, Math.min(90, baseDifficulty));
  }

  private performActionSkillCheck(action: CombatAction, player: Player, difficulty: number) {
    const skillPath = action.success_modifiers.skill_bonus || 'physiques.combat_mains_nues';
    return performSkillCheck(
      player.skills, 
      player.stats, 
      skillPath, 
      difficulty, 
      player.inventory, 
      0, 
      player.physiology, 
      player.momentum
    );
  }

  private applyActionEffects(
    action: CombatAction, 
    player: Player, 
    target?: Enemy, 
    degreeOfSuccess: DegreeOfSuccess = 'success'
  ): GameEvent[] {
    const events: GameEvent[] = [];

    // Apply damage
    if (action.effects.damage && target) {
      const damage = this.calculateActionDamage(action, player, target, degreeOfSuccess);
      const newHealth = Math.max(0, target.currentStats.health - damage);
      target.currentStats.health = newHealth;

      const damageEntry = this.createLogEntry(
        'damage', 
        player.name, 
        target.name, 
        `${damage} points de dégâts infligés`, 
        { damage, critical: degreeOfSuccess === 'critical_success' }
      );
      this.addToLog(damageEntry);
      events.push({ type: 'COMBAT_LOG_ENTRY', payload: damageEntry });

      events.push({ 
        type: 'COMBAT_ACTION', 
        attacker: player.name, 
        target: 'enemy', 
        damage: damage, 
        newHealth: newHealth, 
        action: `inflige des dégâts avec ${action.name}` 
      });

      if (newHealth <= 0) {
        events.push({ type: 'COMBAT_ENDED', winner: 'player' });
        events.push(...this.generateVictoryRewards(target));
      }
    }

    // Apply healing
    if (action.effects.healing) {
      const healing = this.calculateActionHealing(action, player);
      const newHealth = Math.min(this.state.player.stats.maxHealth, this.state.player.stats.health + healing);
      this.state.player.stats.health = newHealth;

      const healingEntry = this.createLogEntry(
        'healing', 
        player.name, 
        undefined, 
        `${healing} points de santé récupérés`, 
        { healing }
      );
      this.addToLog(healingEntry);
      events.push({ type: 'COMBAT_LOG_ENTRY', payload: healingEntry });

      events.push({ 
        type: 'COMBAT_ACTION', 
        attacker: player.name, 
        target: 'player', 
        damage: -healing, 
        newHealth: newHealth, 
        action: `récupère de la santé` 
      });
    }

    // Apply status effects
    if (action.effects.status_apply) {
      action.effects.status_apply.forEach(effect => {
        if (target) {
          target.currentStats.statusEffects.push({ ...effect });
          const statusEntry = this.createLogEntry(
            'status', 
            player.name, 
            target.name, 
            `${target.name} subit l'effet ${effect.name}`, 
            { status_effects: [effect.name] }
          );
          this.addToLog(statusEntry);
          events.push({ type: 'COMBAT_LOG_ENTRY', payload: statusEntry });
        } else {
          this.state.player.stats.statusEffects.push({ ...effect });
          const statusEntry = this.createLogEntry(
            'status', 
            player.name, 
            undefined, 
            `${player.name} bénéficie de l'effet ${effect.name}`, 
            { status_effects: [effect.name] }
          );
          this.addToLog(statusEntry);
          events.push({ type: 'COMBAT_LOG_ENTRY', payload: statusEntry });
        }
      });
    }

    // Remove status effects
    if (action.effects.status_remove) {
      action.effects.status_remove.forEach(effectId => {
        if (target) {
          target.currentStats.statusEffects = target.currentStats.statusEffects.filter(e => e.id !== effectId);
        } else {
          this.state.player.stats.statusEffects = this.state.player.stats.statusEffects.filter(e => e.id !== effectId);
        }
      });
    }

    return events;
  }

  private calculateActionDamage(
    action: CombatAction, 
    player: Player, 
    target: Enemy, 
    degreeOfSuccess: DegreeOfSuccess
  ): number {
    if (!action.effects.damage) return 0;

    let baseDamage = action.effects.damage.base;
    
    // Apply stat modifier
    if (action.effects.damage.stat_modifier) {
      const statValue = player.stats[action.effects.damage.stat_modifier]?.value || 0;
      baseDamage += Math.floor(statValue / 4);
    }

    // Apply weapon damage
    const weapon = this.state.player.equipped.weapon;
    if (weapon?.combatStats) {
      baseDamage += weapon.combatStats.damage;
    }

    // Apply critical success
    if (degreeOfSuccess === 'critical_success') {
      baseDamage = Math.floor(baseDamage * 1.5);
    }

    // Apply armor reduction
    const armorReduction = Math.floor(target.currentStats.armor / 2);
    baseDamage = Math.max(1, baseDamage - armorReduction);

    // Random variance
    const variance = (Math.random() * 0.3) - 0.15; // ±15%
    baseDamage = Math.floor(baseDamage * (1 + variance));

    return Math.max(1, baseDamage);
  }

  private calculateActionHealing(action: CombatAction, player: Player): number {
    if (!action.effects.healing) return 0;

    let baseHealing = action.effects.healing.base;
    
    if (action.effects.healing.stat_modifier) {
      const statValue = player.stats[action.effects.healing.stat_modifier]?.value || 0;
      baseHealing += Math.floor(statValue / 5);
    }

    return baseHealing;
  }

  // === ENEMY AI ===

  public processEnemyTurn(enemy: Enemy, player: Player): GameEvent[] {
    const events: GameEvent[] = [];
    
    const turnEntry = this.createLogEntry('turn_start', enemy.name, undefined, `Tour de ${enemy.name}`);
    this.addToLog(turnEntry);
    events.push({ type: 'COMBAT_LOG_ENTRY', payload: turnEntry });

    // Process status effects
    events.push(...this.processStatusEffects(enemy, false));

    if (enemy.currentStats.health <= 0) {
      return events;
    }

    // Choose action based on AI behavior
    const chosenAction = this.chooseEnemyAction(enemy, player);
    if (chosenAction) {
      events.push(...this.processEnemyAction(enemy, chosenAction, player));
    }

    return events;
  }

  private chooseEnemyAction(enemy: Enemy, player: Player): CombatAction | null {
    const availableActions = Object.values(COMBAT_ACTIONS).filter(action => {
      // Check if enemy can use this action based on stamina
      return enemy.currentStats.stamina >= action.stamina_cost;
    });

    if (availableActions.length === 0) return null;

    // Simple AI decision making
    const healthPercent = (enemy.currentStats.health / enemy.currentStats.maxHealth) * 100;
    
    // Flee if health is low and enemy is cowardly
    if (healthPercent <= enemy.combatBehavior.fleeThreshold && Math.random() < 0.6) {
      return availableActions.find(action => action.type === 'flee') || null;
    }

    // Prefer actions based on behavior
    const preferredActions = availableActions.filter(action => 
      enemy.combatBehavior.preferredActions.includes(action.type)
    );

    const actionPool = preferredActions.length > 0 ? preferredActions : availableActions;
    return actionPool[Math.floor(Math.random() * actionPool.length)];
  }

  private processEnemyAction(enemy: Enemy, action: CombatAction, player: Player): GameEvent[] {
    const events: GameEvent[] = [];

    const actionEntry = this.createLogEntry('action', enemy.name, player.name, `${enemy.name} utilise ${action.name}`);
    this.addToLog(actionEntry);
    events.push({ type: 'COMBAT_LOG_ENTRY', payload: actionEntry });

    // Consume stamina
    enemy.currentStats.stamina -= action.stamina_cost;

    // Simplified enemy success check
    const successChance = this.calculateEnemySuccessChance(enemy, action, player);
    const success = Math.random() * 100 < successChance;

    if (success && action.effects.damage) {
      const damage = this.calculateEnemyDamage(enemy, action, player);
      const newPlayerHealth = Math.max(0, this.state.player.stats.health - damage);
      this.state.player.stats.health = newPlayerHealth;

      const damageEntry = this.createLogEntry(
        'damage', 
        enemy.name, 
        player.name, 
        `${damage} points de dégâts infligés au joueur`, 
        { damage }
      );
      this.addToLog(damageEntry);
      events.push({ type: 'COMBAT_LOG_ENTRY', payload: damageEntry });

      events.push({ 
        type: 'COMBAT_ACTION', 
        attacker: enemy.name, 
        target: 'player', 
        damage: damage, 
        newHealth: newPlayerHealth, 
        action: `attaque ${player.name}` 
      });

      if (newPlayerHealth <= 0) {
        events.push({ type: 'COMBAT_ENDED', winner: 'enemy' });
      }
    } else {
      const failEntry = this.createLogEntry('action', enemy.name, player.name, `${action.name} échoue !`);
      this.addToLog(failEntry);
      events.push({ type: 'COMBAT_LOG_ENTRY', payload: failEntry });
    }

    return events;
  }

  private calculateEnemySuccessChance(enemy: Enemy, action: CombatAction, player: Player): number {
    let baseChance = 60;
    
    // Adjust based on enemy stats
    if (action.type === 'attack') {
      baseChance += (enemy.baseStats.Force + enemy.baseStats.Dexterite) / 4;
    }
    
    // Adjust based on player defense
    baseChance -= player.stats.Dexterite.value / 3;
    
    return Math.max(10, Math.min(90, baseChance));
  }

  private calculateEnemyDamage(enemy: Enemy, action: CombatAction, player: Player): number {
    if (!action.effects.damage) return 0;

    let baseDamage = action.effects.damage.base + enemy.naturalWeapons.damage;
    baseDamage += Math.floor(enemy.baseStats.Force / 3);

    // Apply player armor
    const playerArmor = this.state.player.equipped.armor;
    if (playerArmor?.armorStats) {
      baseDamage = Math.max(1, baseDamage - playerArmor.armorStats.defense);
    }

    return Math.max(1, baseDamage);
  }

  // === STATUS EFFECT PROCESSING ===

  public processStatusEffects(target: Enemy | null, isPlayer: boolean): GameEvent[] {
    const events: GameEvent[] = [];
    const stats = isPlayer ? this.state.player.stats : target?.currentStats;
    
    if (!stats) return events;

    stats.statusEffects = stats.statusEffects.filter(effect => {
      effect.duration--;

      // Apply per-turn effects
      if (effect.effects.damage?.perTurn) {
        const damage = effect.effects.damage.amount;
        const targetName = isPlayer ? 'Joueur' : target?.name || 'Ennemi';
        
        if (isPlayer) {
          this.state.player.stats.health = Math.max(0, this.state.player.stats.health - damage);
        } else if (target) {
          target.currentStats.health = Math.max(0, target.currentStats.health - damage);
        }

        const damageEntry = this.createLogEntry(
          'damage', 
          effect.name, 
          targetName, 
          `${effect.name} inflige ${damage} dégâts`, 
          { damage }
        );
        this.addToLog(damageEntry);
        events.push({ type: 'COMBAT_LOG_ENTRY', payload: damageEntry });
      }

      if (effect.effects.healing?.perTurn) {
        const healing = effect.effects.healing.amount;
        const targetName = isPlayer ? 'Joueur' : target?.name || 'Ennemi';
        
        if (isPlayer) {
          this.state.player.stats.health = Math.min(this.state.player.stats.maxHealth, this.state.player.stats.health + healing);
        } else if (target) {
          target.currentStats.health = Math.min(target.currentStats.maxHealth, target.currentStats.health + healing);
        }

        const healingEntry = this.createLogEntry(
          'healing', 
          effect.name, 
          targetName, 
          `${effect.name} soigne ${healing} points`, 
          { healing }
        );
        this.addToLog(healingEntry);
        events.push({ type: 'COMBAT_LOG_ENTRY', payload: healingEntry });
      }

      // Remove effect if duration is over
      if (effect.duration <= 0) {
        const removeEntry = this.createLogEntry(
          'status', 
          effect.name, 
          isPlayer ? 'Joueur' : target?.name || 'Ennemi', 
          `L'effet ${effect.name} se dissipe`
        );
        this.addToLog(removeEntry);
        events.push({ type: 'COMBAT_LOG_ENTRY', payload: removeEntry });
        return false; // Remove this effect
      }

      return true; // Keep this effect
    });

    return events;
  }

  // === UTILITY METHODS ===

  private generateVictoryRewards(defeatedEnemy: Enemy): GameEvent[] {
    const events: GameEvent[] = [];
    
    // XP reward
    events.push({ type: 'XP_GAINED', amount: defeatedEnemy.xpReward });
    
    // Money reward
    const moneyReward = Math.floor(
      Math.random() * (defeatedEnemy.loot.money.max - defeatedEnemy.loot.money.min + 1) + 
      defeatedEnemy.loot.money.min
    );
    events.push({ type: 'MONEY_CHANGED', amount: moneyReward, description: `Butin de ${defeatedEnemy.name}` });

    // Item rewards
    defeatedEnemy.loot.items.forEach(lootItem => {
      if (Math.random() < lootItem.chance) {
        events.push({ 
          type: 'ITEM_ADDED', 
          itemId: lootItem.itemId, 
          itemName: lootItem.itemId, // itemName will be filled by reducer
          quantity: lootItem.quantity || 1
        });
      }
    });

    return events;
  }

  private createLogEntry(
    type: CombatLogEntry['type'], 
    actor: string, 
    target?: string, 
    description: string,
    details?: CombatLogEntry['details']
  ): CombatLogEntry {
    return {
      id: uuidv4(),
      timestamp: Date.now(),
      type,
      actor,
      target,
      description,
      details
    };
  }

  private addToLog(entry: CombatLogEntry): void {
    this.logEntries.push(entry);
    this.state.combatLog.push(entry);
  }

  // === PUBLIC INTERFACE ===

  public getCombatState(): CombatState {
    return { ...this.state };
  }

  public isPlayerTurn(): boolean {
    return this.state.currentTurn === 'player';
  }

  public isCombatActive(): boolean {
    return this.state.isActive && this.state.enemies.some(e => e.currentStats.health > 0);
  }

  public switchTurn(): void {
    this.state.currentTurn = this.state.currentTurn === 'player' ? 'enemy' : 'player';
    if (this.state.currentTurn === 'player') {
      this.state.turnCount++;
    }
  }

  public endCombat(outcome: 'victory' | 'defeat' | 'flee'): CombatResult {
    this.state.isActive = false;
    
    return {
      outcome,
      rewards: {
        xp: 0,
        money: 0,
        items: [],
        skill_progress: []
      },
      casualties: {
        enemies_defeated: this.state.enemies.filter(e => e.currentStats.health <= 0).map(e => e.instanceId)
      },
      duration: {
        turns: this.state.turnCount,
        time_minutes: Math.ceil(this.state.turnCount * 0.5)
      }
    };
  }
}
