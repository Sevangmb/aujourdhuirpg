/**
 * @fileOverview Enrichment module to determine the economic value and market context of an object.
 */

import type {
  ObjectEnrichmentModule,
  ObjectModuleResult,
  BaseObject,
  ObjectEnrichmentContext,
  PricingInfo,
  MarketAnalysis,
  TradingAdvice,
  MarketFactors,
} from '@/core/objects/object-types';

export class ValeurEconomiqueModule implements ObjectEnrichmentModule {
  readonly id = 'valeur_economique';

  async enrichObject(
    object: BaseObject,
    context: ObjectEnrichmentContext
  ): Promise<ObjectModuleResult> {
    console.log(`💰 Analyzing economic value: ${object.name}`);

    const baseValue = this.calculateBaseValue(object);
    const marketFactors = this.analyzeLocalMarket(context);
    const currentPrice = Math.round(baseValue * marketFactors.totalMultiplier);
    const tradingAdvice = this.generateTradingAdvice(currentPrice, marketFactors);

    const pricing: PricingInfo = {
        baseValue,
        currentMarketPrice: currentPrice,
        priceRange: {
            minimum: Math.round(currentPrice * 0.7),
            maximum: Math.round(currentPrice * 1.4),
        },
    };

    const marketAnalysis: MarketAnalysis = {
        localDemand: marketFactors.demand,
        priceStability: this.calculateStability(marketFactors),
        competitionLevel: marketFactors.competition,
    };

    return {
      moduleId: this.id,
      enrichmentData: {
        pricing,
        marketAnalysis,
        tradingRecommendations: tradingAdvice,
      },
    };
  }

  private calculateBaseValue(object: BaseObject): number {
    let baseValue = 50; // Minimum base value for an item
    const nameLower = object.name.toLowerCase();

    // Material bonus
    if (nameLower.includes('acier')) baseValue += 100;
    if (nameLower.includes('mithril')) baseValue += 500;
    if (nameLower.includes('or')) baseValue += 300;

    // Quality bonus
    const qualityBonuses = {
      poor: 0.5,
      common: 1.0,
      fine: 2.0,
      superior: 4.0,
      masterwork: 8.0,
      legendary: 20.0,
    };
    const quality = object.quality || 'common';

    return Math.round(baseValue * (qualityBonuses[quality] || 1.0));
  }

  private analyzeLocalMarket(context: ObjectEnrichmentContext): MarketFactors {
    // Simulate market factors based on location name
    const locationName = context.player?.currentLocation.name || '';
    const nameLower = locationName.toLowerCase();

    if (nameLower.includes('paris')) {
      return { demand: 'very_high', competition: 'high', totalMultiplier: 1.5 };
    }
    if (nameLower.includes('lyon')) {
      return { demand: 'high', competition: 'moderate', totalMultiplier: 1.2 };
    }
    if (nameLower.includes('marseille')) {
      return { demand: 'high', competition: 'high', totalMultiplier: 1.1 };
    }
    // Default for smaller towns/villages
    return { demand: 'medium', competition: 'low', totalMultiplier: 1.0 };
  }

  private calculateStability(marketFactors: MarketFactors): number {
      let stability = 100;
      if (marketFactors.demand === 'very_high') stability -= 20;
      if (marketFactors.competition === 'high') stability -= 15;
      if (marketFactors.competition === 'low') stability += 10;
      return Math.max(0, Math.min(100, stability));
  }

  private generateTradingAdvice(price: number, factors: MarketFactors): TradingAdvice {
      if(factors.demand === 'very_high' && factors.competition !== 'high') {
          return { action: 'sell', reason: 'La demande est très forte et la concurrence est gérable. C\'est le moment de vendre !' };
      }
      if(factors.demand === 'low' && price > 100) {
          return { action: 'hold', reason: 'La demande locale est faible, gardez cet objet pour une plus grande ville.' };
      }
      return { action: 'hold', reason: 'Le marché est stable. Aucune action immédiate n\'est recommandée.'};
  }
}
