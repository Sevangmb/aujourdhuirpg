#!/usr/bin/env node

/**
 * Script de diagnostic pour Aujourd'hui RPG
 * Vérifie que toutes les configurations nécessaires sont en place
 * 
 * Usage: node check-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnostic de Configuration - Aujourd\'hui RPG\n');

// Configuration des variables requises
const REQUIRED_ENV_VARS = {
  critical: [
    'GOOGLE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  ],
  recommended: [
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'
  ],
  optional: [
    'NEWS_API_KEY',
    'GEMINI_API_KEY'
  ]
};

// Couleurs pour le terminal
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function loadEnvFile(filePath) {
  try {
    if (!checkFileExists(filePath)) {
      return {};
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const envVars = {};
    
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return envVars;
  } catch (error) {
    log(`❌ Erreur lors de la lecture de ${filePath}: ${error.message}`, 'red');
    return {};
  }
}

function checkEnvVariable(key, value, type) {
  const hasValue = value && value.trim() !== '' && !value.includes('your_') && !value.includes('votre_');
  
  let status, icon, color;
  if (hasValue) {
    status = '✅ OK';
    icon = '✅';
    color = 'green';
  } else {
    if (type === 'critical') {
      status = '❌ MANQUANTE';
      icon = '❌';
      color = 'red';
    } else if (type === 'recommended') {
      status = '⚠️  RECOMMANDÉE';
      icon = '⚠️';
      color = 'yellow';
    } else {
      status = '➖ OPTIONNELLE';
      icon = '➖';
      color = 'cyan';
    }
  }
  
  const displayValue = hasValue ? 
    (value.length > 20 ? value.substring(0, 20) + '...' : value) : 
    'Non définie';
    
  log(`  ${icon} ${key.padEnd(35)} ${status.padEnd(15)} ${displayValue}`, color);
  
  return hasValue;
}

function runDiagnostic() {
  let criticalIssues = 0;
  let recommendedIssues = 0;
  
  // 1. Vérification des fichiers
  log('📁 Vérification des Fichiers:', 'bold');
  
  const envLocalExists = checkFileExists('.env.local');
  const envExampleExists = checkFileExists('.env.example');
  const packageJsonExists = checkFileExists('package.json');
  
  log(`  ${envLocalExists ? '✅' : '❌'} .env.local ${envLocalExists ? 'EXISTS' : 'MANQUANT'}`, envLocalExists ? 'green' : 'red');
  log(`  ${envExampleExists ? '✅' : '❌'} .env.example ${envExampleExists ? 'EXISTS' : 'MANQUANT'}`, envExampleExists ? 'green' : 'yellow');
  log(`  ${packageJsonExists ? '✅' : '❌'} package.json ${packageJsonExists ? 'EXISTS' : 'MANQUANT'}`, packageJsonExists ? 'green' : 'red');
  
  if (!envLocalExists) {
    criticalIssues++;
    log('\n❌ ERREUR CRITIQUE: Le fichier .env.local est manquant!', 'red');
    if (envExampleExists) {
      log('💡 Solution: Copiez .env.example vers .env.local et remplissez vos clés', 'yellow');
      log('   Commande: cp .env.example .env.local', 'cyan');
    }
    return criticalIssues;
  }
  
  // 2. Chargement des variables d'environnement
  log('\n🔑 Vérification des Variables d\'Environnement:', 'bold');
  const envVars = loadEnvFile('.env.local');
  
  if (Object.keys(envVars).length === 0) {
    log('❌ Le fichier .env.local semble vide ou corrompu', 'red');
    criticalIssues++;
    return criticalIssues;
  }
  
  // 3. Vérification des variables critiques
  log('\n🚨 Variables CRITIQUES (obligatoires pour le fonctionnement):');
  REQUIRED_ENV_VARS.critical.forEach(key => {
    const hasValue = checkEnvVariable(key, envVars[key], 'critical');
    if (!hasValue) criticalIssues++;
  });
  
  // Vérification spéciale pour GOOGLE_API_KEY vs GEMINI_API_KEY
  if (!envVars['GOOGLE_API_KEY'] && !envVars['GEMINI_API_KEY']) {
    log('  ❌ Ni GOOGLE_API_KEY ni GEMINI_API_KEY n\'est définie!', 'red');
    criticalIssues++;
  } else if (envVars['GOOGLE_API_KEY'] || envVars['GEMINI_API_KEY']) {
    log('  ✅ Clé API Google/Gemini trouvée', 'green');
    if (criticalIssues > 0) criticalIssues--; // Enlever l'erreur de GOOGLE_API_KEY si on a une des deux
  }
  
  // 4. Vérification des variables recommandées
  log('\n⚠️  Variables RECOMMANDÉES (pour une expérience complète):');
  REQUIRED_ENV_VARS.recommended.forEach(key => {
    const hasValue = checkEnvVariable(key, envVars[key], 'recommended');
    if (!hasValue) recommendedIssues++;
  });
  
  // 5. Vérification des variables optionnelles
  log('\n➖ Variables OPTIONNELLES (fonctionnalités bonus):');
  REQUIRED_ENV_VARS.optional.forEach(key => {
    checkEnvVariable(key, envVars[key], 'optional');
  });
  
  // 6. Vérification des dépendances
  log('\n📦 Vérification des Dépendances:', 'bold');
  if (packageJsonExists) {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const hasGenkit = packageJson.dependencies && packageJson.dependencies['@genkit-ai/googleai'];
      const hasNext = packageJson.dependencies && packageJson.dependencies['next'];
      
      log(`  ${hasGenkit ? '✅' : '❌'} @genkit-ai/googleai ${hasGenkit ? 'INSTALLÉE' : 'MANQUANTE'}`, hasGenkit ? 'green' : 'red');
      log(`  ${hasNext ? '✅' : '❌'} next ${hasNext ? 'INSTALLÉE' : 'MANQUANTE'}`, hasNext ? 'green' : 'red');
      
      if (!hasGenkit || !hasNext) {
        log('💡 Solution: Exécutez npm install pour installer les dépendances', 'yellow');
      }
    } catch (error) {
      log('❌ Erreur lors de la lecture de package.json', 'red');
    }
  }
  
  // 7. Résumé et recommendations
  log('\n📊 RÉSUMÉ DU DIAGNOSTIC:', 'bold');
  
  if (criticalIssues === 0) {
    log('✅ Configuration critique: COMPLÈTE', 'green');
  } else {
    log(`❌ Configuration critique: ${criticalIssues} problème(s) critique(s)`, 'red');
  }
  
  if (recommendedIssues === 0) {
    log('✅ Configuration recommandée: COMPLÈTE', 'green');
  } else {
    log(`⚠️  Configuration recommandée: ${recommendedIssues} élément(s) manquant(s)`, 'yellow');
  }
  
  // 8. Instructions de correction
  if (criticalIssues > 0) {
    log('\n🔧 ACTIONS REQUISES:', 'bold');
    log('1. Obtenez vos clés API manquantes:', 'red');
    log('   - Google AI: https://makersuite.google.com/app/apikey', 'cyan');
    log('   - Firebase: https://console.firebase.google.com/', 'cyan');
    log('2. Ajoutez-les dans votre fichier .env.local', 'red');
    log('3. Redémarrez votre serveur: npm run dev', 'red');
  } else {
    log('\n🎉 FÉLICITATIONS! Votre configuration est prête!', 'green');
    log('Vous pouvez maintenant lancer: npm run dev', 'green');
  }
  
  if (recommendedIssues > 0) {
    log('\n💡 AMÉLIORATIONS SUGGÉRÉES:', 'bold');
    log('Pour une expérience optimale, configurez les variables recommandées.', 'yellow');
    log('Consultez SECURITY_SETUP.md pour plus de détails.', 'yellow');
  }
  
  return criticalIssues;
}

// Exécution du script
try {
  const issues = runDiagnostic();
  
  console.log('\n' + '='.repeat(60));
  if (issues === 0) {
    log('🚀 Votre configuration est prête! Bon jeu!', 'green');
    process.exit(0);
  } else {
    log(`⚠️  ${issues} problème(s) critique(s) détecté(s). Consultez les instructions ci-dessus.`, 'red');
    process.exit(1);
  }
} catch (error) {
  log(`❌ Erreur inattendue: ${error.message}`, 'red');
  process.exit(1);
}
