/**
 * @fileOverview Combat Test Button Component
 * Testing component for the complete combat system
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sword, Shield, Users, Zap } from 'lucide-react';
import { CombatUI } from './CombatUI';
import type { Player } from '@/lib/types';
import type { Enemy } from '@/modules/combat/enhanced-types';
import { v4 as uuidv4 } from 'uuid';

// === TEST DATA ===

const createTestPlayer = (): Player => ({
  name: 'Héros Test',
  gender: 'Homme',
  age: 25,
  avatarUrl: '',
  origin: 'Paris',
  era: 'moderne',
  background: 'Un aventurier expérimenté pour les tests de combat',
  stats: {
    Force: { value: 70 },
    Dexterite: { value: 65 },
    Constitution: { value: 80 },
    Intelligence: { value: 60 },
    Perception: { value: 55 },
    Charisme: { value: 50 },
    Volonte: { value: 60 },
    Savoir: { value: 45 },
    Technique: { value: 40 },
    MagieOccultisme: { value: 20 },
    Discretion: { value: 35 },
    ChanceDestin: { value: 50 },
    Sante: { value: 100, max: 100 },
    Energie: { value: 100, max: 100 },
    Stress: { value: 20 }
  },
  skills: {
    physiques: {
      combat_mains_nues: { level: 4, xp: 120, xpToNext: 80 },
      arme_blanche: { level: 5, xp: 200, xpToNext: 100 },
      arme_de_tir: { level: 2, xp: 50, xpToNext: 50 },
      arme_a_feu: { level: 1, xp: 10, xpToNext: 40 },
      pilotage_monture: { level: 1, xp: 0, xpToNext: 40 },
      pilotage_vehicules: { level: 2, xp: 60, xpToNext: 40 },
      pilotage_spatial: { level: 0, xp: 0, xpToNext: 40 },
      esquive: { level: 4, xp: 180, xpToNext: 20 },
      natation: { level: 2, xp: 80, xpToNext: 20 },
      escalade: { level: 3, xp: 140, xpToNext: 60 },
      discretion_skill: { level: 3, xp: 90, xpToNext: 110 }
    },
    techniques: {
      artisanat_general: { level: 2, xp: 50, xpToNext: 50 },
      forge_metallurgie: { level: 1, xp: 20, xpToNext: 80 },
      maconnerie_construction: { level: 0, xp: 0, xpToNext: 40 },
      menuiserie: { level: 1, xp: 30, xpToNext: 70 },
      couture_tissage: { level: 0, xp: 0, xpToNext: 40 },
      joaillerie: { level: 0, xp: 0, xpToNext: 40 },
      navigation: { level: 1, xp: 40, xpToNext: 60 },
      mecanique: { level: 2, xp: 70, xpToNext: 30 },
      electronique: { level: 1, xp: 25, xpToNext: 75 },
      informatique_hacking: { level: 0, xp: 0, xpToNext: 40 },
      ingenierie_spatiale: { level: 0, xp: 0, xpToNext: 40 },
      contrefacon: { level: 0, xp: 0, xpToNext: 40 }
    },
    survie: {
      pistage: { level: 2, xp: 60, xpToNext: 40 },
      orientation: { level: 3, xp: 120, xpToNext: 80 },
      chasse_peche: { level: 1, xp: 30, xpToNext: 70 },
      herboristerie: { level: 1, xp: 20, xpToNext: 80 },
      premiers_secours: { level: 3, xp: 150, xpToNext: 50 },
      medecine: { level: 0, xp: 0, xpToNext: 40 },
      survie_generale: { level: 2, xp: 90, xpToNext: 10 }
    },
    sociales: {
      persuasion: { level: 3, xp: 110, xpToNext: 90 },
      seduction: { level: 1, xp: 35, xpToNext: 65 },
      intimidation: { level: 2, xp: 80, xpToNext: 20 },
      tromperie_baratin: { level: 2, xp: 70, xpToNext: 30 },
      commandement: { level: 1, xp: 40, xpToNext: 60 },
      etiquette: { level: 1, xp: 20, xpToNext: 80 }
    },
    savoir: {
      histoire: { level: 2, xp: 85, xpToNext: 15 },
      geographie: { level: 2, xp: 75, xpToNext: 25 },
      theologie_religions: { level: 1, xp: 30, xpToNext: 70 },
      sciences_naturelles: { level: 3, xp: 130, xpToNext: 70 },
      alchimie_chimie: { level: 0, xp: 0, xpToNext: 40 },
      occultisme_magie_theorique: { level: 1, xp: 25, xpToNext: 75 },
      astrologie_astronomie: { level: 1, xp: 35, xpToNext: 65 }
    }
  },
  physiology: {
    basic_needs: {
      hunger: { 
        level: 80, 
        satisfaction_quality: 90, 
        cultural_craving: 'français', 
        dietary_preferences: ['bio'], 
        food_memories: ['croissant du matin']
      },
      thirst: { 
        level: 90, 
        hydration_quality: 85, 
        climate_adjustment: 0, 
        beverage_tolerance: ['café'], 
        cultural_beverage_preference: 'café français'
      }
    }
  },
  momentum: {
    consecutive_successes: 1,
    consecutive_failures: 0,
    momentum_bonus: 5,
    desperation_bonus: 0
  },
  traitsMentalStates: ['Confiant', 'Déterminé'],
  progression: {
    level: 8,
    xp: 2450,
    xpToNextLevel: 550,
    perks: ['Combattant Expérimenté', 'Survivant Urbain']
  },
  alignment: {
    chaosLawful: 20,
    goodEvil: 60
  },
  inventory: [
    {
      instanceId: 'weapon_001',
      id: 'epee_courte',
      name: 'Épée Courte d\'Acier',
      description: 'Une épée bien équilibrée, parfaite pour le combat rapproché',
      type: 'weapon',
      quantity: 1,
      condition: { durability: 90 },
      memory: {
        acquisitionStory: 'Héritée d\'un mentor disparu dans les rues de Paris'
      },
      economics: {
        base_value: 250,
        rarity_multiplier: 1.2
      },
      combatStats: {
        damage: 15,
        accuracy: 8,
        criticalChance: 12,
        stamina_cost: 8,
        range: ['melee'],
        damage_type: 'physical'
      }
    },
    {
      instanceId: 'armor_001',
      id: 'veste_cuir',
      name: 'Veste de Cuir Renforcée',
      description: 'Une veste en cuir avec des plaques de métal discrètes',
      type: 'armor',
      quantity: 1,
      condition: { durability: 85 },
      memory: {
        acquisitionStory: 'Achetée dans une boutique vintage de Montmartre'
      },
      economics: {
        base_value: 180,
        rarity_multiplier: 1.0
      },
      armorStats: {
        defense: 12,
        damage_reduction: { physical: 8, mental: 2 },
        mobility_penalty: 2,
        special_properties: ['Discret', 'Résistant aux intempéries']
      }
    },
    {
      instanceId: 'potion_001',
      id: 'potion_soin',
      name: 'Potion de Soin Mineure',
      description: 'Un élixir rouge qui restaure la vitalité',
      type: 'consumable',
      quantity: 3,
      condition: { durability: 100 },
      memory: {
        acquisitionStory: 'Préparée par un herboriste du Marais'
      },
      economics: {
        base_value: 45,
        rarity_multiplier: 1.1
      },
      effects: {
        Sante: 25
      }
    }
  ],
  money: 450,
  transactionLog: [],
  currentLocation: {
    latitude: 48.8566,
    longitude: 2.3522,
    name: 'Paris, France'
  },
  toneSettings: {
    Horreur: false,
    Romance: false,
    Action: true,
    Fantastique: false,
    Mystere: true,
    Humour: false,
    Slice_of_Life: false,
    Aventure: true,
    Drame: false,
    Science_Fiction: false
  },
  questLog: [],
  encounteredPNJs: [],
  decisionLog: [],
  clues: [],
  documents: [],
  investigationNotes: '',
  historicalContacts: []
});

const createTestEnemies = (): Enemy[] => [
  {
    instanceId: uuidv4(),
    id: 'bandit_urbain',
    name: 'Bandit des Rues',
    description: 'Un criminel aguerri aux méthodes brutales',
    baseStats: {
      Force: 60,
      Dexterite: 55,
      Constitution: 70,
      Intelligence: 40,
      Perception: 50
    },
    combatBehavior: {
      aggressiveness: 80,
      intelligence: 45,
      preferredActions: ['attack', 'intimidate'],
      fleeThreshold: 25
    },
    naturalWeapons: {
      damage: 12,
      accuracy: 5,
      criticalChance: 8,
      stamina_cost: 10,
      range: ['melee'],
      damage_type: 'physical'
    },
    naturalArmor: {
      defense: 8,
      damage_reduction: { physical: 5 },
      mobility_penalty: 0,
      special_properties: ['Résistant']
    },
    loot: {
      money: { min: 15, max: 35 },
      items: [
        { itemId: 'couteau_cran', chance: 0.7, quantity: 1 },
        { itemId: 'argent_sale', chance: 0.9, quantity: 1 }
      ]
    },
    xpReward: 65,
    currentStats: {
      health: 105,
      maxHealth: 105,
      stamina: 80,
      maxStamina: 80,
      armor: 8,
      position: 'melee',
      stance: 'aggressive',
      statusEffects: []
    },
    ai_state: {
      lastAction: null,
      target_priority: 'player',
      turns_since_special: 0
    }
  },
  {
    instanceId: uuidv4(),
    id: 'garde_corrompu',
    name: 'Garde Corrompu',
    description: 'Un ancien policier tombé dans la criminalité',
    baseStats: {
      Force: 65,
      Dexterite: 60,
      Constitution: 75,
      Intelligence: 55,
      Perception: 65
    },
    combatBehavior: {
      aggressiveness: 70,
      intelligence: 60,
      preferredActions: ['attack', 'defend', 'analyze'],
      fleeThreshold: 20
    },
    naturalWeapons: {
      damage: 18,
      accuracy: 8,
      criticalChance: 10,
      stamina_cost: 12,
      range: ['melee', 'ranged'],
      damage_type: 'physical'
    },
    naturalArmor: {
      defense: 15,
      damage_reduction: { physical: 8, mental: 3 },
      mobility_penalty: 5,
      special_properties: ['Blindage', 'Professionnel']
    },
    loot: {
      money: { min: 25, max: 50 },
      items: [
        { itemId: 'matraque_police', chance: 0.8, quantity: 1 },
        { itemId: 'badge_corrompu', chance: 0.6, quantity: 1 },
        { itemId: 'cles_menottes', chance: 0.4, quantity: 1 }
      ]
    },
    xpReward: 85,
    currentStats: {
      health: 112,
      maxHealth: 112,
      stamina: 90,
      maxStamina: 90,
      armor: 15,
      position: 'melee',
      stance: 'balanced',
      statusEffects: []
    },
    ai_state: {
      lastAction: null,
      target_priority: 'player',
      turns_since_special: 0
    }
  }
];

// === MAIN COMPONENT ===

export function CombatTestButton() {
  const [showCombat, setShowCombat] = useState(false);
  const [testPlayer] = useState(createTestPlayer);
  const [testEnemies] = useState(createTestEnemies);
  const [combatResult, setCombatResult] = useState<'victory' | 'defeat' | 'flee' | null>(null);

  const handleCombatEnd = (outcome: 'victory' | 'defeat' | 'flee') => {
    setCombatResult(outcome);
    setShowCombat(false);
    
    // Reset after 3 seconds
    setTimeout(() => {
      setCombatResult(null);
    }, 3000);
  };

  const startTestCombat = () => {
    setShowCombat(true);
    setCombatResult(null);
  };

  return (
    <div className="space-y-4">
      
      {/* Test Controls */}
      <Card className="bg-slate-800/80 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sword className="w-5 h-5 text-red-400" />
            Test de Combat Complet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Player Preview */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              Héros de Test
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-300">Nom: <span className="text-white">{testPlayer.name}</span></div>
                <div className="text-slate-300">Niveau: <span className="text-white">{testPlayer.progression.level}</span></div>
                <div className="text-slate-300">Santé: <span className="text-white">{testPlayer.stats.Sante.value}/{testPlayer.stats.Sante.max}</span></div>
              </div>
              <div>
                <div className="text-slate-300">Force: <span className="text-white">{testPlayer.stats.Force.value}</span></div>
                <div className="text-slate-300">Dextérité: <span className="text-white">{testPlayer.stats.Dexterite.value}</span></div>
                <div className="text-slate-300">Constitution: <span className="text-white">{testPlayer.stats.Constitution.value}</span></div>
              </div>
            </div>
            
            <div className="mt-3">
              <div className="text-slate-300 text-sm mb-1">Équipement:</div>
              <div className="flex gap-2">
                {testPlayer.inventory.filter(item => ['weapon', 'armor'].includes(item.type)).map(item => (
                  <Badge key={item.instanceId} variant="outline" className="text-xs">
                    {item.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Enemies Preview */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-red-400" />
              Ennemis de Test ({testEnemies.length})
            </h4>
            <div className="space-y-2">
              {testEnemies.map((enemy, index) => (
                <div key={enemy.instanceId} className="flex items-center justify-between bg-slate-600/50 rounded p-2">
                  <div>
                    <div className="text-white font-medium">{enemy.name}</div>
                    <div className="text-slate-300 text-xs">{enemy.description}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-white">{enemy.currentStats.health} PV</div>
                    <div className="text-slate-300">Armure {enemy.currentStats.armor}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Launch Button */}
          <div className="flex items-center justify-between">
            <Button 
              onClick={startTestCombat} 
              disabled={showCombat}
              className="flex items-center gap-2"
              size="lg"
            >
              <Zap className="w-4 h-4" />
              {showCombat ? 'Combat en cours...' : 'Lancer le Test de Combat'}
            </Button>
            
            {combatResult && (
              <Badge 
                variant={combatResult === 'victory' ? 'default' : combatResult === 'defeat' ? 'destructive' : 'secondary'}
                className="text-sm px-3 py-1"
              >
                {combatResult === 'victory' && '🏆 Victoire!'}
                {combatResult === 'defeat' && '💀 Défaite!'}
                {combatResult === 'flee' && '🏃 Fuite!'}
              </Badge>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Combat UI */}
      {showCombat && (
        <CombatUI
          player={testPlayer}
          enemies={testEnemies}
          onCombatEnd={handleCombatEnd}
          isOpen={showCombat}
          onClose={() => setShowCombat(false)}
        />
      )}

      {/* Instructions */}
      <Card className="bg-slate-800/50 border-slate-600">
        <CardContent className="p-4">
          <h4 className="text-white font-semibold mb-2">Instructions de Test</h4>
          <div className="text-slate-300 text-sm space-y-1">
            <div>• Cliquez sur "Lancer le Test de Combat" pour ouvrir l'interface</div>
            <div>• Sélectionnez des actions de combat tactiques</div>
            <div>• Observez les animations et les effets de statut</div>
            <div>• Testez différentes stratégies contre les ennemis</div>
            <div>• Vérifiez la gestion des tours et l'IA ennemie</div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

export default CombatTestButton;