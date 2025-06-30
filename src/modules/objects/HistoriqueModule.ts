/**
 * @fileOverview Enrichment module to generate a plausible history for an object.
 */

import type {
  ObjectEnrichmentModule,
  ObjectModuleResult,
  BaseObject,
  ObjectEnrichmentContext,
  ObjectProvenance,
  PreviousOwner,
  CulturalSignificance,
} from '@/core/objects/object-types';

export class HistoriqueModule implements ObjectEnrichmentModule {
  readonly id = 'historique_objet';

  async enrichObject(
    object: BaseObject,
    context: ObjectEnrichmentContext
  ): Promise<ObjectModuleResult> {
    console.log(`📜 Researching history: ${object.name}`);

    const provenance = this.generateProvenance(object);
    const previousOwners = this.generatePreviousOwners(object);
    const culturalSignificance = this.assessCulturalValue(object, context);

    return {
      moduleId: this.id,
      enrichmentData: {
        provenance: {
          originalCreator: provenance.creator,
          creationDate: provenance.date,
          creationLocation: provenance.location,
        },
        previousOwners,
        culturalSignificance: {
          localFame: culturalSignificance.fame,
          culturalValue: culturalSignificance.description,
          museumInterest: culturalSignificance.museum,
        },
      },
    };
  }

  private generateProvenance(object: BaseObject): {
    creator: string;
    date: string;
    location: string;
  } {
    const quality = object.quality || 'common';
    if (quality === 'masterwork' || quality === 'legendary') {
      return {
        creator: 'Maître Henri Durand',
        date: 'Il y a environ 3 ans',
        location: 'Lyon, Forge de la Rue des Armuriers',
      };
    }
     if (quality === 'superior') {
      return {
        creator: 'Atelier Dubois & Fils',
        date: 'Il y a 1 an',
        location: 'Paris, Quartier des artisans',
      };
    }
    return {
      creator: 'Forgeron local anonyme',
      date: 'Récemment',
      location: 'Atelier municipal',
    };
  }

  private generatePreviousOwners(object: BaseObject): PreviousOwner[] {
    const quality = object.quality || 'common';
    if (quality === 'legendary') {
        return [{
            name: 'Gaspard le Silencieux',
            title: 'Aventurier de renom',
            story: 'On dit que Gaspard a utilisé cette lame pour vaincre la Chimère des Catacombes avant de disparaître mystérieusement.'
        }];
    }
    if (quality === 'masterwork') {
        return [{
            name: 'Capitaine de la Garde',
            title: 'Officier respecté',
            story: 'Appartenait à l\'ancien capitaine de la garde de la ville, qui l\'a perdue lors d\'un duel.'
        }];
    }
    return [];
  }
  
  private assessCulturalValue(object: BaseObject, context: ObjectEnrichmentContext): { fame: number, description: string, museum: number } {
      const quality = object.quality || 'common';
      if(quality === 'legendary') {
          return {
              fame: 75,
              description: 'Une pièce de légende dont parlent les collectionneurs et les historiens.',
              museum: 90
          }
      }
       if(quality === 'masterwork') {
          return {
              fame: 40,
              description: 'Un exemple remarquable de l\'artisanat local, connu des connaisseurs.',
              museum: 50
          }
      }
      return {
          fame: 5,
          description: 'Un objet fonctionnel sans signification culturelle particulière.',
          museum: 0
      }
  }
}
