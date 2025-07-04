/**
 * @fileOverview AI Debug Monitor - Surveillance et débogage des erreurs IA
 * Surveille les erreurs de validation, les performances et la qualité des réponses IA
 */

import { ACTION_TYPES, MOOD_TYPES, CHOICE_ICON_NAMES } from '@/lib/types';

interface ValidationError {
  field: string;
  expectedValues: string[];
  actualValue: any;
  timestamp: number;
  choiceIndex?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface AICallLog {
  id: string;
  timestamp: number;
  input: any;
  output: any;
  error?: string;
  validationErrors: ValidationError[];
  executionTime: number;
  model?: string;
  tokensUsed?: number;
  success: boolean;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  errorsByType: Record<string, number>;
  validationErrorsByField: Record<string, number>;
  totalCalls: number;
  lastHourCalls: number;
}

/**
 * 🔍 Moniteur de débogage IA avancé
 * Collecte et analyse les erreurs pour améliorer la robustesse
 */
class AIDebugMonitor {
  private logs: AICallLog[] = [];
  private readonly MAX_LOGS = 100; // Garder plus de logs pour l'analyse
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 heures
  
  /**
   * Enregistrer un appel IA avec analyse complète
   */
  logAICall(
    input: any, 
    output: any, 
    error?: string, 
    executionTime: number = 0,
    additionalMetadata?: { model?: string; tokensUsed?: number }
  ): void {
    const validationErrors = this.validateOutput(output);
    const success = !error && validationErrors.length === 0;
    
    const log: AICallLog = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      input: this.sanitizeInput(input),
      output: this.sanitizeOutput(output),
      error,
      validationErrors,
      executionTime,
      model: additionalMetadata?.model,
      tokensUsed: additionalMetadata?.tokensUsed,
      success
    };

    this.addLog(log);
    this.analyzeAndReport(log);
    
    // Nettoyage automatique si nécessaire
    this.cleanupOldLogs();
  }

  /**
   * Validation complète de la sortie IA
   */
  private validateOutput(output: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!output) {
      errors.push({
        field: 'output',
        expectedValues: ['object with choices'],
        actualValue: output,
        timestamp: Date.now(),
        severity: 'critical'
      });
      return errors;
    }

    if (!output.choices) {
      errors.push({
        field: 'choices',
        expectedValues: ['array of choices'],
        actualValue: output.choices,
        timestamp: Date.now(),
        severity: 'high'
      });
      return errors;
    }

    // Validation détaillée de chaque choix
    output.choices.forEach((choice: any, index: number) => {
      this.validateChoice(choice, index, errors);
    });

    // Validation des autres champs optionnels
    this.validateOptionalFields(output, errors);

    return errors;
  }

  /**
   * Validation d'un choix individuel
   */
  private validateChoice(choice: any, index: number, errors: ValidationError[]): void {
    // Validation iconName
    if (!choice.iconName) {
      errors.push({
        field: `choices[${index}].iconName`,
        expectedValues: CHOICE_ICON_NAMES,
        actualValue: choice.iconName,
        timestamp: Date.now(),
        choiceIndex: index,
        severity: 'critical'
      });
    } else if (!CHOICE_ICON_NAMES.includes(choice.iconName)) {
      errors.push({
        field: `choices[${index}].iconName`,
        expectedValues: CHOICE_ICON_NAMES,
        actualValue: choice.iconName,
        timestamp: Date.now(),
        choiceIndex: index,
        severity: 'critical'
      });
    }

    // Validation type
    if (!choice.type) {
      errors.push({
        field: `choices[${index}].type`,
        expectedValues: ACTION_TYPES,
        actualValue: choice.type,
        timestamp: Date.now(),
        choiceIndex: index,
        severity: 'high'
      });
    } else if (!ACTION_TYPES.includes(choice.type)) {
      errors.push({
        field: `choices[${index}].type`,
        expectedValues: ACTION_TYPES,
        actualValue: choice.type,
        timestamp: Date.now(),
        choiceIndex: index,
        severity: 'high'
      });
    }

    // Validation mood
    if (!choice.mood) {
      errors.push({
        field: `choices[${index}].mood`,
        expectedValues: MOOD_TYPES,
        actualValue: choice.mood,
        timestamp: Date.now(),
        choiceIndex: index,
        severity: 'medium'
      });
    } else if (!MOOD_TYPES.includes(choice.mood)) {
      errors.push({
        field: `choices[${index}].mood`,
        expectedValues: MOOD_TYPES,
        actualValue: choice.mood,
        timestamp: Date.now(),
        choiceIndex: index,
        severity: 'medium'
      });
    }

    // Validation des champs obligatoires
    const requiredFields = ['id', 'text', 'description', 'consequences'];
    requiredFields.forEach(field => {
      if (!choice[field]) {
        errors.push({
          field: `choices[${index}].${field}`,
          expectedValues: ['string'],
          actualValue: choice[field],
          timestamp: Date.now(),
          choiceIndex: index,
          severity: field === 'id' ? 'high' : 'medium'
        });
      }
    });

    // Validation de la longueur du texte
    if (choice.text && choice.text.length > 100) {
      errors.push({
        field: `choices[${index}].text`,
        expectedValues: ['string <= 100 characters'],
        actualValue: `${choice.text.length} characters`,
        timestamp: Date.now(),
        choiceIndex: index,
        severity: 'low'
      });
    }

    if (choice.description && choice.description.length > 200) {
      errors.push({
        field: `choices[${index}].description`,
        expectedValues: ['string <= 200 characters'],
        actualValue: `${choice.description.length} characters`,
        timestamp: Date.now(),
        choiceIndex: index,
        severity: 'low'
      });
    }
  }

  /**
   * Validation des champs optionnels
   */
  private validateOptionalFields(output: any, errors: ValidationError[]): void {
    // Validation scenarioText
    if (!output.scenarioText) {
      errors.push({
        field: 'scenarioText',
        expectedValues: ['HTML string'],
        actualValue: output.scenarioText,
        timestamp: Date.now(),
        severity: 'high'
      });
    } else if (typeof output.scenarioText !== 'string') {
      errors.push({
        field: 'scenarioText',
        expectedValues: ['string'],
        actualValue: typeof output.scenarioText,
        timestamp: Date.now(),
        severity: 'medium'
      });
    }

    // Validation aiRecommendation
    if (output.aiRecommendation) {
      if (!output.aiRecommendation.focus || !output.aiRecommendation.reasoning) {
        errors.push({
          field: 'aiRecommendation',
          expectedValues: ['object with focus and reasoning'],
          actualValue: output.aiRecommendation,
          timestamp: Date.now(),
          severity: 'low'
        });
      }
    }
  }

  /**
   * Ajouter un log et maintenir la limite
   */
  private addLog(log: AICallLog): void {
    this.logs.unshift(log);
    
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(0, this.MAX_LOGS);
    }
  }

  /**
   * Analyser et reporter les problèmes importants
   */
  private analyzeAndReport(log: AICallLog): void {
    const criticalErrors = log.validationErrors.filter(e => e.severity === 'critical');
    const highErrors = log.validationErrors.filter(e => e.severity === 'high');
    
    if (criticalErrors.length > 0) {
      console.error('🚨 ERREURS CRITIQUES détectées dans la réponse IA:', criticalErrors);
      this.logCorrectiveActions(criticalErrors);
    }
    
    if (highErrors.length > 0) {
      console.warn('⚠️ Erreurs importantes détectées:', highErrors);
    }
    
    if (log.executionTime > 10000) { // Plus de 10 secondes
      console.warn(`⏱️ Réponse IA lente: ${log.executionTime}ms`);
    }
    
    if (!log.success) {
      console.error(`❌ Échec de l'appel IA: ${log.error}`);
    }
  }

  /**
   * Suggérer des actions correctives
   */
  private logCorrectiveActions(errors: ValidationError[]): void {
    const iconNameErrors = errors.filter(e => e.field.includes('iconName'));
    const typeErrors = errors.filter(e => e.field.includes('.type'));
    const moodErrors = errors.filter(e => e.field.includes('.mood'));
    
    if (iconNameErrors.length > 0) {
      console.error('🔧 CORRECTION AUTOMATIQUE: Valeurs iconName invalides détectées');
      console.error('Valeurs autorisées:', CHOICE_ICON_NAMES.join(', '));
      console.error('Valeurs trouvées:', iconNameErrors.map(e => e.actualValue));
    }
    
    if (typeErrors.length > 0) {
      console.error('🔧 CORRECTION AUTOMATIQUE: Types d\'action invalides');
      console.error('Types autorisés:', ACTION_TYPES.join(', '));
    }
    
    if (moodErrors.length > 0) {
      console.error('🔧 CORRECTION AUTOMATIQUE: Ambiances invalides');
      console.error('Ambiances autorisées:', MOOD_TYPES.join(', '));
    }
  }

  /**
   * Générer un ID unique pour le log
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Nettoyer les données sensibles pour les logs
   */
  private sanitizeInput(input: any): any {
    if (!input) return input;
    
    const sanitized = { ...input };
    
    // Supprimer les informations sensibles
    if (sanitized.player?.email) {
      sanitized.player.email = '[REDACTED]';
    }
    
    // Limiter la taille des textes longs
    if (sanitized.gameEvents && sanitized.gameEvents.length > 500) {
      sanitized.gameEvents = sanitized.gameEvents.substring(0, 500) + '... [TRUNCATED]';
    }
    
    return sanitized;
  }

  /**
   * Nettoyer la sortie pour les logs
   */
  private sanitizeOutput(output: any): any {
    if (!output) return output;
    
    const sanitized = { ...output };
    
    // Limiter la taille du texte de scénario
    if (sanitized.scenarioText && sanitized.scenarioText.length > 1000) {
      sanitized.scenarioText = sanitized.scenarioText.substring(0, 1000) + '... [TRUNCATED]';
    }
    
    return sanitized;
  }

  /**
   * Obtenir les erreurs récentes
   */
  getRecentErrors(hoursBack: number = 1): ValidationError[] {
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    const recentErrors: ValidationError[] = [];
    
    this.logs.forEach(log => {
      if (log.timestamp > cutoffTime) {
        recentErrors.push(...log.validationErrors);
      }
    });
    
    return recentErrors;
  }

  /**
   * Obtenir les statistiques de performance
   */
  getPerformanceMetrics(): PerformanceMetrics {
    if (this.logs.length === 0) {
      return {
        averageResponseTime: 0,
        successRate: 0,
        errorsByType: {},
        validationErrorsByField: {},
        totalCalls: 0,
        lastHourCalls: 0
      };
    }

    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentLogs = this.logs.filter(log => log.timestamp > oneHourAgo);
    
    const successfulCalls = this.logs.filter(log => log.success).length;
    const totalTime = this.logs.reduce((sum, log) => sum + log.executionTime, 0);
    
    // Compter les erreurs par type
    const errorsByType: Record<string, number> = {};
    const validationErrorsByField: Record<string, number> = {};
    
    this.logs.forEach(log => {
      if (log.error) {
        const errorType = this.categorizeError(log.error);
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      }
      
      log.validationErrors.forEach(error => {
        const fieldBase = error.field.replace(/\[\d+\]/, '[]'); // Normaliser les indices
        validationErrorsByField[fieldBase] = (validationErrorsByField[fieldBase] || 0) + 1;
      });
    });

    return {
      averageResponseTime: totalTime / this.logs.length,
      successRate: (successfulCalls / this.logs.length) * 100,
      errorsByType,
      validationErrorsByField,
      totalCalls: this.logs.length,
      lastHourCalls: recentLogs.length
    };
  }

  /**
   * Catégoriser les erreurs pour les statistiques
   */
  private categorizeError(errorMessage: string): string {
    if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
      return 'Quota/Rate Limit';
    }
    if (errorMessage.includes('authentication') || errorMessage.includes('API key')) {
      return 'Authentication';
    }
    if (errorMessage.includes('validation') || errorMessage.includes('schema')) {
      return 'Validation';
    }
    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return 'Network';
    }
    return 'Other';
  }

  /**
   * Générer un rapport de débogage détaillé
   */
  generateDebugReport(): string {
    const metrics = this.getPerformanceMetrics();
    const recentErrors = this.getRecentErrors();
    const criticalErrors = recentErrors.filter(e => e.severity === 'critical');
    
    const report = [
      '# Rapport de Débogage IA - ' + new Date().toISOString(),
      '',
      '## 📊 Statistiques Générales',
      `- Total d'appels: ${metrics.totalCalls}`,
      `- Appels dernière heure: ${metrics.lastHourCalls}`,
      `- Taux de succès: ${metrics.successRate.toFixed(1)}%`,
      `- Temps de réponse moyen: ${metrics.averageResponseTime.toFixed(0)}ms`,
      '',
      '## 🚨 Erreurs Critiques Récentes',
      criticalErrors.length === 0 ? 'Aucune erreur critique récente ✅' : 
        criticalErrors.slice(0, 5).map(error => 
          `- ${error.field}: "${error.actualValue}" (attendu: ${error.expectedValues.slice(0, 3).join(', ')}...)`
        ).join('\n'),
      '',
      '## 🔍 Erreurs de Validation les Plus Fréquentes',
      Object.entries(metrics.validationErrorsByField)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([field, count]) => `- ${field}: ${count} fois`)
        .join('\n') || 'Aucune erreur de validation',
      '',
      '## 🐛 Erreurs par Type',
      Object.entries(metrics.errorsByType)
        .sort(([,a], [,b]) => b - a)
        .map(([type, count]) => `- ${type}: ${count} fois`)
        .join('\n') || 'Aucune erreur système',
      '',
      '## ⏱️ Performance',
      `- Appels les plus lents: ${this.getSlowestCalls(3).map(log => `${log.executionTime}ms`).join(', ')}`,
      `- Pic d'activité: ${this.getHourlyPeaks()}`,
      '',
      '## 💡 Recommandations',
      this.generateRecommendations(metrics, criticalErrors)
    ];
    
    return report.join('\n');
  }

  /**
   * Obtenir les appels les plus lents
   */
  private getSlowestCalls(count: number): AICallLog[] {
    return [...this.logs]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, count);
  }

  /**
   * Analyser les pics d'activité
   */
  private getHourlyPeaks(): string {
    const hourlyActivity: Record<number, number> = {};
    
    this.logs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });
    
    const peakHour = Object.entries(hourlyActivity)
      .sort(([,a], [,b]) => b - a)[0];
    
    return peakHour ? `${peakHour[0]}h (${peakHour[1]} appels)` : 'Données insuffisantes';
  }

  /**
   * Générer des recommandations basées sur l'analyse
   */
  private generateRecommendations(metrics: PerformanceMetrics, criticalErrors: ValidationError[]): string {
    const recommendations: string[] = [];
    
    if (metrics.successRate < 90) {
      recommendations.push('• Améliorer la robustesse des prompts IA');
    }
    
    if (metrics.averageResponseTime > 5000) {
      recommendations.push('• Optimiser les prompts pour réduire le temps de réponse');
    }
    
    if (criticalErrors.length > 0) {
      recommendations.push('• Renforcer la validation automatique des réponses IA');
    }
    
    if (metrics.validationErrorsByField['choices[].iconName'] > 5) {
      recommendations.push('• Améliorer les instructions sur les valeurs iconName autorisées');
    }
    
    if (Object.keys(metrics.errorsByType).includes('Quota/Rate Limit')) {
      recommendations.push('• Implémenter une gestion plus agressive des quotas API');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('• Système fonctionnel - continuer la surveillance');
    }
    
    return recommendations.join('\n');
  }

  /**
   * Nettoyer les anciens logs
   */
  private cleanupOldLogs(): void {
    const cutoffTime = Date.now() - this.CLEANUP_INTERVAL;
    const initialCount = this.logs.length;
    
    this.logs = this.logs.filter(log => log.timestamp > cutoffTime);
    
    const removedCount = initialCount - this.logs.length;
    if (removedCount > 0) {
      console.log(`🧹 Nettoyage automatique: ${removedCount} logs anciens supprimés`);
    }
  }

  /**
   * Forcer un nettoyage complet
   */
  clearAllLogs(): void {
    const count = this.logs.length;
    this.logs = [];
    console.log(`🗑️ Tous les logs supprimés (${count} entrées)`);
  }

  /**
   * Exporter les logs pour analyse externe
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Instance singleton exportée
export const aiDebugMonitor = new AIDebugMonitor();

/**
 * 🔧 Hook React pour surveiller le statut en temps réel
 */
export function useAIDebugInfo() {
  // Dans un vrai environnement React, utiliser useState et useEffect
  const metrics = aiDebugMonitor.getPerformanceMetrics();
  const recentErrors = aiDebugMonitor.getRecentErrors();
  
  return {
    metrics,
    recentErrors,
    debugReport: aiDebugMonitor.generateDebugReport(),
    clearLogs: () => aiDebugMonitor.clearAllLogs()
  };
}

/**
 * 📱 Fonction utilitaire pour l'affichage console
 */
export function logDebugStatus(): void {
  console.log('\n📊 AI DEBUG STATUS\n');
  console.log(aiDebugMonitor.generateDebugReport());
  console.log('\n');
}

/**
 * 🛠️ Middleware pour les appels IA avec monitoring automatique
 */
export async function withAIMonitoring<T>(
  aiCall: () => Promise<T>,
  metadata?: { model?: string; operation?: string }
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await aiCall();
    const executionTime = Date.now() - startTime;
    
    aiDebugMonitor.logAICall(
      { operation: metadata?.operation },
      result,
      undefined,
      executionTime,
      { model: metadata?.model }
    );
    
    return result;
    
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    
    aiDebugMonitor.logAICall(
      { operation: metadata?.operation },
      null,
      error.message,
      executionTime,
      { model: metadata?.model }
    );
    
    throw error;
  }
}

// Auto-rapport toutes les heures en développement
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const metrics = aiDebugMonitor.getPerformanceMetrics();
    if (metrics.totalCalls > 0 && (metrics.successRate < 95 || metrics.lastHourCalls > 20)) {
      logDebugStatus();
    }
  }, 60 * 60 * 1000); // 1 heure
}

export default aiDebugMonitor;