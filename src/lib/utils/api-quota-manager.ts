/**
 * @fileOverview API Quota Manager - Gestion intelligente des quotas API
 * Évite les dépassements de quota et optimise l'utilisation de l'API Google/Gemini
 */

interface QuotaState {
  lastReset: number;
  requestCount: number;
  isBlocked: boolean;
  blockedUntil?: number;
  errorCount: number;
  lastSuccessfulRequest?: number;
}

interface QuotaConfig {
  hourlyLimit: number;
  resetInterval: number; // en millisecondes
  backoffTime: number; // en millisecondes
  maxConsecutiveErrors: number;
}

/**
 * 📊 Gestionnaire avancé de quota API
 * Surveille et limite les appels API pour éviter les dépassements
 */
class APIQuotaManager {
  private quotaState: QuotaState = {
    lastReset: Date.now(),
    requestCount: 0,
    isBlocked: false,
    errorCount: 0
  };
  
  private readonly config: QuotaConfig = {
    hourlyLimit: parseInt(process.env.NEXT_PUBLIC_API_QUOTA_HOURLY_LIMIT || '100'),
    resetInterval: 60 * 60 * 1000, // 1 heure
    backoffTime: parseInt(process.env.NEXT_PUBLIC_API_QUOTA_BACKOFF_MINUTES || '5') * 60 * 1000,
    maxConsecutiveErrors: 3
  };

  /**
   * Vérifie si une requête API peut être effectuée
   */
  checkQuotaAvailable(): boolean {
    const now = Date.now();
    
    // Reset automatique du compteur si l'intervalle est écoulé
    if (now - this.quotaState.lastReset > this.config.resetInterval) {
      this.resetQuota();
    }
    
    // Vérifier si on est encore bloqué par un backoff
    if (this.quotaState.isBlocked && this.quotaState.blockedUntil && now < this.quotaState.blockedUntil) {
      return false;
    }
    
    // Débloquer si le temps de backoff est écoulé
    if (this.quotaState.isBlocked && this.quotaState.blockedUntil && now >= this.quotaState.blockedUntil) {
      this.unblock();
    }
    
    // Vérifier si on a dépassé la limite horaire
    if (this.quotaState.requestCount >= this.config.hourlyLimit) {
      this.blockUntilReset();
      return false;
    }
    
    // Bloquer temporairement s'il y a trop d'erreurs consécutives
    if (this.quotaState.errorCount >= this.config.maxConsecutiveErrors) {
      this.blockTemporarily("Trop d'erreurs consécutives");
      return false;
    }
    
    return true;
  }
  
  /**
   * Enregistre une requête API réussie
   */
  recordSuccessfulRequest(): void {
    this.quotaState.requestCount++;
    this.quotaState.errorCount = 0; // Reset du compteur d'erreurs
    this.quotaState.lastSuccessfulRequest = Date.now();
    
    this.logQuotaStatus('success');
  }
  
  /**
   * Enregistre un dépassement de quota détecté
   */
  recordQuotaExceeded(): void {
    this.quotaState.errorCount++;
    this.blockTemporarily("Quota API dépassé");
    
    console.warn('🚨 Quota API dépassé détecté. Activation du mode backoff.');
  }
  
  /**
   * Enregistre une erreur API
   */
  recordAPIError(error: string): void {
    this.quotaState.errorCount++;
    
    if (this.quotaState.errorCount >= this.config.maxConsecutiveErrors) {
      this.blockTemporarily(`Trop d'erreurs: ${error}`);
    }
    
    this.logQuotaStatus('error', error);
  }
  
  /**
   * Reset complet du quota (nouveau cycle)
   */
  private resetQuota(): void {
    this.quotaState.lastReset = Date.now();
    this.quotaState.requestCount = 0;
    this.quotaState.isBlocked = false;
    this.quotaState.blockedUntil = undefined;
    this.quotaState.errorCount = 0;
    
    console.log('🔄 Quota API reseté - nouveau cycle commencé');
  }
  
  /**
   * Débloquer après un backoff
   */
  private unblock(): void {
    this.quotaState.isBlocked = false;
    this.quotaState.blockedUntil = undefined;
    this.quotaState.errorCount = Math.max(0, this.quotaState.errorCount - 1); // Réduction progressive
    
    console.log('✅ Quota API débloqué - requêtes à nouveau autorisées');
  }
  
  /**
   * Bloquer jusqu'au prochain reset de quota
   */
  private blockUntilReset(): void {
    this.quotaState.isBlocked = true;
    this.quotaState.blockedUntil = this.quotaState.lastReset + this.config.resetInterval;
    
    console.warn('⏸️ Quota API bloqué jusqu\'au prochain reset automatique');
  }
  
  /**
   * Bloquer temporairement (backoff)
   */
  private blockTemporarily(reason: string): void {
    this.quotaState.isBlocked = true;
    this.quotaState.blockedUntil = Date.now() + this.config.backoffTime;
    
    console.warn(`⏸️ Quota API bloqué temporairement: ${reason}`);
  }
  
  /**
   * Obtenir le statut actuel du quota
   */
  getStatus(): {
    available: boolean;
    remainingRequests: number;
    timeUntilReset: number;
    timeUntilUnblock?: number;
    errorCount: number;
    isBlocked: boolean;
    blockReason?: string;
  } {
    const now = Date.now();
    
    return {
      available: this.checkQuotaAvailable(),
      remainingRequests: Math.max(0, this.config.hourlyLimit - this.quotaState.requestCount),
      timeUntilReset: Math.max(0, this.config.resetInterval - (now - this.quotaState.lastReset)),
      timeUntilUnblock: this.quotaState.blockedUntil ? Math.max(0, this.quotaState.blockedUntil - now) : undefined,
      errorCount: this.quotaState.errorCount,
      isBlocked: this.quotaState.isBlocked,
      blockReason: this.quotaState.isBlocked ? 'Quota ou erreurs dépassés' : undefined
    };
  }
  
  /**
   * Obtenir des statistiques détaillées
   */
  getStatistics(): {
    totalRequests: number;
    successRate: number;
    averageRequestsPerHour: number;
    timeSinceLastSuccess: number | null;
    configLimits: QuotaConfig;
  } {
    const now = Date.now();
    const hoursElapsed = (now - this.quotaState.lastReset) / (1000 * 60 * 60);
    
    return {
      totalRequests: this.quotaState.requestCount,
      successRate: this.quotaState.requestCount > 0 
        ? ((this.quotaState.requestCount - this.quotaState.errorCount) / this.quotaState.requestCount) * 100 
        : 100,
      averageRequestsPerHour: hoursElapsed > 0 ? this.quotaState.requestCount / hoursElapsed : 0,
      timeSinceLastSuccess: this.quotaState.lastSuccessfulRequest 
        ? now - this.quotaState.lastSuccessfulRequest 
        : null,
      configLimits: { ...this.config }
    };
  }
  
  /**
   * Forcer un reset du quota (pour les tests ou la maintenance)
   */
  forceReset(): void {
    this.resetQuota();
    console.log('🔄 Reset forcé du quota API effectué');
  }
  
  /**
   * Logging du statut pour le monitoring
   */
  private logQuotaStatus(type: 'success' | 'error', details?: string): void {
    const status = this.getStatus();
    
    if (type === 'success') {
      console.log(`✅ API Request OK - Remaining: ${status.remainingRequests}/${this.config.hourlyLimit}`);
    } else {
      console.warn(`❌ API Request Error - ${details} - Errors: ${status.errorCount}/${this.config.maxConsecutiveErrors}`);
    }
    
    // Warning si on approche des limites
    if (status.remainingRequests <= 10 && status.remainingRequests > 0) {
      console.warn(`⚠️ Attention: Plus que ${status.remainingRequests} requêtes API disponibles`);
    }
  }
  
  /**
   * Générer un rapport de statut pour l'interface utilisateur
   */
  generateStatusReport(): string {
    const status = this.getStatus();
    const stats = this.getStatistics();
    
    const resetMinutes = Math.ceil(status.timeUntilReset / 1000 / 60);
    const unblockMinutes = status.timeUntilUnblock ? Math.ceil(status.timeUntilUnblock / 1000 / 60) : 0;
    
    return `
📊 **Statut du Quota API**
• Disponible: ${status.available ? '✅ Oui' : '❌ Non'}
• Requêtes restantes: ${status.remainingRequests}/${this.config.hourlyLimit}
• Reset automatique dans: ${resetMinutes} minutes
${status.isBlocked ? `• Débloquage dans: ${unblockMinutes} minutes` : ''}
• Erreurs consécutives: ${status.errorCount}/${this.config.maxConsecutiveErrors}

📈 **Statistiques**
• Taux de succès: ${stats.successRate.toFixed(1)}%
• Moyenne horaire: ${stats.averageRequestsPerHour.toFixed(1)} req/h
${stats.timeSinceLastSuccess ? `• Dernière réussite: il y a ${Math.ceil(stats.timeSinceLastSuccess / 1000 / 60)} min` : ''}
    `.trim();
  }
}

// Instance singleton exportée
export const quotaManager = new APIQuotaManager();

/**
 * 🛡️ Middleware pour encapsuler les appels API avec gestion de quota
 */
export async function withQuotaCheck<T>(
  apiCall: () => Promise<T>,
  fallbackResponse?: T
): Promise<T> {
  if (!quotaManager.checkQuotaAvailable()) {
    const status = quotaManager.getStatus();
    const waitTime = status.timeUntilUnblock 
      ? Math.ceil(status.timeUntilUnblock / 1000 / 60)
      : Math.ceil(status.timeUntilReset / 1000 / 60);
    
    console.warn(`🚫 API quota non disponible. Attente: ${waitTime} minutes`);
    
    if (fallbackResponse !== undefined) {
      return fallbackResponse;
    }
    
    throw new Error(`QUOTA_EXCEEDED: API quota épuisé. Réessayez dans ${waitTime} minutes.`);
  }
  
  try {
    const result = await apiCall();
    quotaManager.recordSuccessfulRequest();
    return result;
    
  } catch (error: any) {
    // Détecter les différents types d'erreurs de quota
    if (error.code === 429 || 
        error.status === 429 ||
        error.message?.includes('quota') || 
        error.message?.includes('rate limit') ||
        error.message?.includes('Too Many Requests')) {
      quotaManager.recordQuotaExceeded();
    } else {
      quotaManager.recordAPIError(error.message || 'Erreur inconnue');
    }
    
    throw error;
  }
}

/**
 * 🔧 Hook React pour surveiller le statut du quota
 */
export function useQuotaStatus() {
  // Note: Dans un vrai hook React, il faudrait useState et useEffect
  // Ici c'est une version simplifiée pour le serveur
  return {
    status: quotaManager.getStatus(),
    statistics: quotaManager.getStatistics(),
    statusReport: quotaManager.generateStatusReport(),
    forceReset: () => quotaManager.forceReset()
  };
}

/**
 * 📱 Fonction utilitaire pour afficher le statut dans la console
 */
export function logQuotaStatus(): void {
  console.log('\n' + quotaManager.generateStatusReport() + '\n');
}

// Auto-logging du statut toutes les 10 minutes en développement
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const status = quotaManager.getStatus();
    if (status.remainingRequests <= 20 || status.isBlocked) {
      logQuotaStatus();
    }
  }, 10 * 60 * 1000); // 10 minutes
}

export default quotaManager;