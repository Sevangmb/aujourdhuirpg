
import type { Quest, QuestRewards } from '@/modules/quests/types';
import type { NewsArticle, NewsQuestType } from './types';
import { v4 as uuidv4 } from 'uuid';

// Placeholder helper functions from the user's design
function simplifyTitle(title: string): string {
    return title.split(' - ')[0]; // Basic simplification
}

function extractKeyEntity(article: NewsArticle): string {
    // In a real implementation, this would use NLP. For now, a placeholder.
    return article.sourceName || 'l\'affaire';
}

function calculateExpiration(publishedAt: string | null, days: number): string {
    const startDate = publishedAt ? new Date(publishedAt) : new Date();
    startDate.setDate(startDate.getDate() + days);
    return startDate.toISOString();
}

export class NewsQuestGenerator {

  public async generateQuestFromNews(article: NewsArticle): Promise<Omit<Quest, 'id' | 'dateAdded'> | null> {
    const questType = this.determineQuestType(article);

    switch (questType) {
      case 'INVESTIGATION':
        return this.createInvestigationQuest(article);
      // Stubs for other types as planned
      case 'CULTURAL':
      case 'SOCIAL':
      case 'DISCOVERY':
      case 'ECONOMIC':
        // console.log(`Quest generation for type ${questType} is not yet implemented.`);
        return Promise.resolve(null);
      default:
        return Promise.resolve(null);
    }
  }

  private determineQuestType(article: NewsArticle): NewsQuestType | null {
    const content = (article.title + ' ' + (article.description || '')).toLowerCase();
    
    const containsKeywords = (text: string, keywords: string[]): boolean => {
        return keywords.some(keyword => text.includes(keyword));
    }

    if (containsKeywords(content, ['enquête', 'mystère', 'disparition', 'scandale', 'affaire'])) {
      return 'INVESTIGATION';
    }
    if (containsKeywords(content, ['exposition', 'festival', 'théâtre', 'musée', 'concert', 'vernissage'])) {
      return 'CULTURAL';
    }
    if (containsKeywords(content, ['manifestation', 'grève', 'mouvement', 'protestation', 'solidarité'])) {
      return 'SOCIAL';
    }
    if (containsKeywords(content, ['nouveau', 'ouverture', 'découverte', 'innovation', 'première'])) {
      return 'DISCOVERY';
    }
    if (containsKeywords(content, ['prix', 'économie', 'marché', 'emploi', 'business', 'soldes'])) {
      return 'ECONOMIC';
    }
    
    return null;
  }

  private async createInvestigationQuest(article: NewsArticle): Promise<Omit<Quest, 'id' | 'dateAdded'> | null> {
    
    const rewards: QuestRewards = {
        xp: 150,
        money: 0,
        items: [
            { itemId: 'notebook_pen_01', quantity: 1 },
        ],
        reputation: 20
    };

    const questData: Omit<Quest, 'id' | 'dateAdded'> = {
      title: `Enquête: ${simplifyTitle(article.title)}`,
      description: `Les rumeurs courent dans Paris suite à l'affaire mentionnée dans cet article de ${article.sourceName}. Menez votre propre investigation pour découvrir la vérité.`,
      type: 'secondary',
      status: 'inactive',
      objectives: [
        { description: `Collecter des informations sur "${extractKeyEntity(article)}"`, isCompleted: false },
        { description: 'Interroger les témoins potentiels dans le quartier concerné', isCompleted: false },
        { description: 'Trouver des preuves ou indices matériels', isCompleted: false }
      ],
      rewardDescription: `Récompenses pour la résolution du mystère.`,
      rewards: rewards,
    };
    return questData;
  }
}
