# 🚨 ALERTE SÉCURITÉ URGENTE

## ⚠️ Problème Critique Détecté

GitHub a scanné le repository et détecte **ENCORE** 2 clés API exposées :

1. ❌ `AIzaSyCL-e_c4qG51YMfz9NrIVk...` dans `FIX_IA_ERROR.md:21`
2. ❌ `AIzaSyCfXSVcVuVxcl3Hd2swFjAa4Zzv...` dans `src/lib/firebase.ts:15`

## 🔥 Action Immédiate Requise

### Étape 1: Remplacer le fichier Firebase

**URGENT** : Le fichier `src/lib/firebase.ts` contient ENCORE la clé API hardcodée !

```typescript
// LIGNE 14 - PROBLÉMATIQUE
apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCfXSVcVuVxcl3Hd2swFjAa4Zzvstyyo_8"
```

**Solution Immédiate** :

1. **Supprimez** le fichier `src/lib/firebase.ts`
2. **Renommez** `src/lib/firebase-secure.ts` en `src/lib/firebase.ts`

Ou remplacez tout le contenu de `src/lib/firebase.ts` par le contenu de `firebase-secure.ts`

### Étape 2: Vérification Rapide

Vérifiez que le nouveau fichier utilise UNIQUEMENT :

```typescript
import { firebaseConfig, validateConfiguration, config } from './config';

// Configuration Firebase (SANS fallbacks hardcodés)
const firebaseAppConfig: FirebaseOptions = {
  apiKey: firebaseConfig.apiKey!,  // ✅ Pas de fallback hardcodé
  authDomain: firebaseConfig.authDomain!,
  projectId: firebaseConfig.projectId!,
  // ...
};
```

### Étape 3: Push Immédiat

```bash
# Si vous modifiez localement
git add src/lib/firebase.ts
git commit -m "🚨 EMERGENCY: Remove hardcoded Firebase API key"
git push origin main
```

### Étape 4: Régénérez VOS Clés API

**🔥 CES CLÉS SONT COMPROMISES** - Régénérez-les IMMÉDIATEMENT :

1. **Firebase** : https://console.firebase.google.com/
   - Clé exposée : `AIzaSyCfXSVcVuVxcl3Hd2swFjAa4Zzvstyyo_8`
   
2. **Google AI** : https://makersuite.google.com/app/apikey  
   - Clé exposée : `AIzaSyCL-e_c4qG51YMfz9NrIVk...`

### Étape 5: Créez .env.local

```bash
# Utilisez VOS NOUVELLES clés régénérées
GOOGLE_API_KEY=votre_nouvelle_cle_google_ai
NEXT_PUBLIC_FIREBASE_API_KEY=votre_nouvelle_cle_firebase
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=aujourdhui-rpg.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=aujourdhui-rpg
# ... autres variables
```

## 📊 Status des Alertes

- ❌ **Alerte #1** : Google API Key dans FIX_IA_ERROR.md → ✅ CORRIGÉE
- ❌ **Alerte #2** : Firebase API Key dans firebase.ts → ⚠️ **ACTION REQUISE**

## ⏰ Timing Critique

Les alertes GitHub resteront **ACTIVES** tant que :
1. Le fichier `src/lib/firebase.ts` contient la clé hardcodée
2. Les clés ne sont pas régénérées

## 🎯 Une fois terminé

- ✅ Les alertes GitHub se fermeront automatiquement (peut prendre quelques heures)
- ✅ Plus de clés exposées dans le code
- ✅ Configuration centralisée sécurisée active

---

**⚠️ CRITIQUE** : Cette correction est URGENTE. GitHub scanne continuellement et ces clés sont exposées publiquement !