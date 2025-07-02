
/**
 * @fileOverview Enrichment module to determine the physical and combat properties of a weapon.
 */

import type {
  ObjectEnrichmentModule,
  ObjectModuleResult,
  BaseObject,
  ObjectEnrichmentContext,
  MaterialInfo,
  PhysicalProperties,
  CombatStats,
  CraftingDetails,
} from '@/core/objects/object-types';
import type { EnrichedObject } from '@/lib/types';

export class ProprietesArmesModule implements ObjectEnrichmentModule {
  readonly id = 'proprietes_armes';

  async enrichObject(
    object: BaseObject | EnrichedObject,
    context: ObjectEnrichmentContext
  ): Promise<ObjectModuleResult> {
    console.log(`🗡️ Analyzing weapon properties: ${object.name}`);

    const material = this.analyzeMaterial(object);
    const physicalProperties = this.calculatePhysicalProperties(material, object);
    const combatStats = this.calculateCombatStats(physicalProperties, object);
    const craftingDetails = this.generateCraftingDetails(object, material);

    return {
      moduleId: this.id,
      enrichmentData: {
        material,
        physicalProperties,
        combatStats,
        craftingDetails,
      },
    };
  }

  private analyzeMaterial(object: BaseObject): MaterialInfo {
    const nameLower = object.name.toLowerCase();
    if (nameLower.includes('acier')) {
      return {
        primary: 'Acier de Tolède Premium',
        hardness: 78,
        flexibility: 65,
        magicalReceptivity: 45,
        rarity: 'uncommon',
        source: 'Mines de la Sierra Nevada',
      };
    }
    if (nameLower.includes('mithril')) {
        return {
          primary: 'Mithril',
          hardness: 85,
          flexibility: 90,
          magicalReceptivity: 95,
          rarity: 'legendary',
          source: 'Veines des Montagnes Brisées',
        };
    }
    return {
      primary: 'Fer commun',
      hardness: 50,
      flexibility: 30,
      magicalReceptivity: 10,
      rarity: 'common',
      source: 'Gisements de surface',
    };
  }

  private calculatePhysicalProperties(
    material: MaterialInfo,
    object: BaseObject
  ): PhysicalProperties {
    return {
      weight: material.hardness * 0.1,
      balance: 100 - material.hardness * 0.2,
      sharpness: material.hardness * 1.1,
      durability: material.hardness,
    };
  }

  private calculateCombatStats(
    physical: PhysicalProperties,
    object: BaseObject
  ): CombatStats {
    let baseDamage = physical.sharpness * 0.7 + physical.weight * 0.3;

    const qualityMultipliers = {
      poor: 0.7,
      common: 1.0,
      fine: 1.3,
      superior: 1.6,
      masterwork: 2.0,
      legendary: 2.5,
    };
    const quality = object.quality || 'common';

    const finalDamage = Math.round(
      baseDamage * (qualityMultipliers[quality] || 1.0)
    );

    return {
      damage: finalDamage,
      accuracy: Math.round(physical.balance * 0.9),
      criticalChance: Math.round(physical.sharpness / 10),
      reach: this.determineReach(object.subtype),
    };
  }
  
  private determineReach(subtype?: string): 'short' | 'medium' | 'long' {
      const sub = subtype?.toLowerCase() || '';
      if (sub.includes('dague') || sub.includes('couteau')) return 'short';
      if (sub.includes('lance') || sub.includes('hallebarde')) return 'long';
      return 'medium';
  }

  private generateCraftingDetails(
    object: BaseObject,
    material: MaterialInfo
  ): CraftingDetails {
    const quality = object.quality || 'common';
    const creators = {
        poor: 'Apprenti maladroit',
        common: 'Forgeron de village',
        fine: 'Artisan compétent',
        superior: 'Maître forgeron',
        masterwork: 'Artisan de renom',
        legendary: 'Légende de la forge'
    };
    return {
        creator: creators[quality],
        technique: `Forge traditionnelle de ${material.source}`,
        qualityMark: `Marque de l'atelier de ${creators[quality]}`
    }
  }
}
