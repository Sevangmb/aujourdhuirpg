import { validateConfiguration, config, aiConfig, firebaseConfig } from '../src/lib/config';

/**
 * Tests basiques pour la configuration du projet
 * À exécuter avec: npm run test
 */

describe('Configuration Tests', () => {
  
  test('La validation de configuration doit retourner un objet valide', () => {
    const validation = validateConfiguration();
    
    expect(validation).toHaveProperty('isValid');
    expect(validation).toHaveProperty('missingCritical');
    expect(validation).toHaveProperty('missingRecommended');
    expect(validation).toHaveProperty('warnings');
    
    expect(Array.isArray(validation.missingCritical)).toBe(true);
    expect(Array.isArray(validation.missingRecommended)).toBe(true);
    expect(Array.isArray(validation.warnings)).toBe(true);
  });

  test('La configuration AI doit être cohérente', () => {
    expect(aiConfig).toHaveProperty('hasApiKey');
    expect(aiConfig).toHaveProperty('apiKey');
    expect(aiConfig).toHaveProperty('apiKeySource');
    
    if (aiConfig.hasApiKey) {
      expect(typeof aiConfig.apiKey).toBe('string');
      expect(aiConfig.apiKey.length).toBeGreaterThan(0);
      expect(['GOOGLE_API_KEY', 'GEMINI_API_KEY'].includes(aiConfig.apiKeySource)).toBe(true);
    }
  });

  test('La configuration Firebase doit avoir les bonnes propriétés', () => {
    expect(firebaseConfig).toHaveProperty('apiKey');
    expect(firebaseConfig).toHaveProperty('authDomain');
    expect(firebaseConfig).toHaveProperty('projectId');
    expect(firebaseConfig).toHaveProperty('storageBucket');
    expect(firebaseConfig).toHaveProperty('messagingSenderId');
    expect(firebaseConfig).toHaveProperty('appId');
  });

  test('Les clés API ne doivent pas être hardcodées', () => {
    const dangerousPatterns = [
      'AIzaSyCfXSVcVuVxcl3Hd2swFjAa4Zzvstyyo_8', // Ancienne clé Firebase exposée
      'AIzaSyCL-e_c4qG51YMfz9NrIVkPEPS8StFuo_I', // Ancienne clé Google AI exposée
    ];

    // Vérifier la config AI
    if (aiConfig.apiKey) {
      dangerousPatterns.forEach(pattern => {
        expect(aiConfig.apiKey).not.toContain(pattern);
      });
    }

    // Vérifier la config Firebase
    Object.values(firebaseConfig).forEach(value => {
      if (typeof value === 'string') {
        dangerousPatterns.forEach(pattern => {
          expect(value).not.toContain(pattern);
        });
      }
    });
  });

  test('L\'environnement de développement doit être correctement détecté', () => {
    expect(typeof config.isDevelopment).toBe('boolean');
    expect(typeof config.isProduction).toBe('boolean');
    expect(typeof config.nodeEnv).toBe('string');
    
    // isDevelopment et isProduction ne peuvent pas être tous les deux true
    expect(config.isDevelopment && config.isProduction).toBe(false);
  });
});