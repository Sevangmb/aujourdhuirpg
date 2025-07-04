# 🛠️ Guide de Dépannage - Aujourd'hui RPG

> Ce guide vous aide à résoudre les problèmes les plus courants rencontrés avec Aujourd'hui RPG.

## 🚀 Diagnostic Rapide (2 minutes)

### Script de Diagnostic Automatique

```bash
# Lancer le diagnostic complet
node check-config.js

# Vérifier la configuration spécifique
npm run validate
```

### Checklist Express

- [ ] Le fichier `.env.local` existe-t-il ?
- [ ] Toutes les variables critiques sont-elles définies ?
- [ ] Le serveur de développement est-il démarré (`npm run dev`) ?
- [ ] Les services Genkit sont-ils actifs (`npm run genkit:watch`) ?
- [ ] Y a-t-il des erreurs dans la console navigateur (F12) ?

---

## 🤖 Problèmes IA et Génération de Contenu

### ❌ "L'IA n'a pas pu générer de scénario"

**Symptômes** :
- Message d'erreur lors de la création de personnage
- Scénarios qui ne se chargent pas
- Timeouts lors de la génération

**Causes Possibles** :

#### 1. Clé API Google AI Manquante/Invalide

```bash
# Vérification
echo $GOOGLE_API_KEY
# OU
echo $GEMINI_API_KEY
```

**Solutions** :
- ✅ Créer une clé sur [Google AI Studio](https://makersuite.google.com/app/apikey)
- ✅ Ajouter à `.env.local` : `GOOGLE_API_KEY=votre_cle_ici`
- ✅ Redémarrer le serveur : `npm run dev`

#### 2. Services Genkit Non Démarrés

**Symptômes** : Console affiche "AI services not available"

**Solution** :
```bash
# Terminal séparé - OBLIGATOIRE
npm run genkit:watch
```

#### 3. Quota API Dépassé

**Symptômes** : Erreurs 429 dans les logs

**Solutions** :
- ✅ Vérifier les quotas dans [Google Cloud Console](https://console.cloud.google.com/iam-admin/quotas)
- ✅ Attendre la réinitialisation des quotas
- ✅ Augmenter les limites si nécessaire

#### 4. Réseau/Proxy/Firewall

**Test** :
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Test"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=VOTRE_CLE"
```

---

## 🔥 Problèmes Firebase

### ❌ "Firebase app failed to initialize"

**Symptômes** :
- Impossible de se connecter
- Données non sauvegardées
- Erreurs d'authentification

**Diagnostic** :
```bash
# Vérifier les variables Firebase
env | grep FIREBASE
```

**Variables Requises** :
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

**Solutions** :

#### 1. Configuration Incomplète
- ✅ Copier toutes les variables depuis la console Firebase
- ✅ Vérifier qu'aucune variable ne contient `undefined`
- ✅ Supprimer les espaces avant/après les valeurs

#### 2. Projet Firebase Inexistant
- ✅ Vérifier que le projet existe dans [Firebase Console](https://console.firebase.google.com/)
- ✅ Activer Authentication, Firestore, Storage

#### 3. Règles Firestore Trop Restrictives
```javascript
// firestore.rules - Configuration de base
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### ❌ "Permission denied" Firestore

**Causes** :
- Utilisateur non authentifié
- Règles Firestore restrictives
- Tentative d'accès à des documents non autorisés

**Solutions** :
1. **Vérifier l'authentification** :
```javascript
// Dans la console navigateur
firebase.auth().currentUser
```

2. **Simplifier les règles temporairement** (développement uniquement) :
```javascript
match /{document=**} {
  allow read, write: if true; // ATTENTION: Seulement en développement!
}
```

---

## 🗺️ Problèmes Google Maps

### ❌ Carte ne s'affiche pas

**Symptômes** :
- Zone grise à la place de la carte
- Message "For development purposes only"
- Erreurs JavaScript dans la console

**Solutions** :

#### 1. Clé API Manquante
```bash
# Ajouter à .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=votre_cle_maps_ici
```

#### 2. APIs Non Activées
Activer dans [Google Cloud Console](https://console.cloud.google.com/apis/library) :
- ✅ Maps JavaScript API
- ✅ Places API
- ✅ Geocoding API

#### 3. Restrictions de Domaine
- ✅ Configurer les restrictions HTTP referrers
- ✅ Ajouter `localhost:3000` pour développement

---

## 🔧 Problèmes de Développement

### ❌ Erreurs TypeScript

**Symptômes** :
- `npm run dev` échoue
- Erreurs de types dans l'IDE
- Build qui ne fonctionne pas

**Solutions** :

#### 1. Cache TypeScript Corrompu
```bash
# Nettoyer le cache
npm run clean
rm -rf .next node_modules
npm install
```

#### 2. Types Manquants
```bash
# Installer les types manquants
npm install --save-dev @types/node @types/react @types/react-dom
```

#### 3. Configuration TypeScript
```bash
# Vérifier la configuration
npm run typecheck
```

### ❌ Erreurs de Build

**Symptômes** :
- `npm run build` échoue
- Erreurs de modules non trouvés
- Problèmes d'imports

**Solutions** :

#### 1. Dépendances Manquantes
```bash
# Réinstaller toutes les dépendances
rm package-lock.json
rm -rf node_modules
npm install
```

#### 2. Imports Relatifs Incorrects
```typescript
// ✅ Bon
import { config } from '@/lib/config';

// ❌ Éviter
import { config } from '../../../lib/config';
```

#### 3. Variables d'Environnement en Production
- ✅ Toutes les variables `NEXT_PUBLIC_*` doivent être définies au build
- ✅ Les variables privées doivent être configurées côté serveur

---

## 🐛 Problèmes de Performance

### ❌ Application Lente

**Symptômes** :
- Temps de chargement élevés
- Interface qui rame
- Génération IA très lente

**Diagnostic** :

#### 1. Monitoring Performance
```javascript
// Dans la console navigateur
console.time('Génération scénario');
// ... action ...
console.timeEnd('Génération scénario');
```

#### 2. Profiling React
```bash
# Mode profiling
npm run dev -- --mode=development
```

**Solutions** :

#### 1. Optimiser les Requêtes Firestore
```typescript
// ✅ Bon - requête spécifique
.where('userId', '==', currentUserId)
.limit(10)

// ❌ Éviter - récupérer tout
.get()
```

#### 2. Cache des Résultats IA
```typescript
// Implémenter un cache local des scénarios générés
const scenarioCache = new Map();
```

#### 3. Lazy Loading
```typescript
// Charger les composants à la demande
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

---

## 🔍 Outils de Debug

### Console Navigateur (F12)

**Onglets Importants** :
- **Console** : Erreurs JavaScript, logs
- **Network** : Requêtes API, timeouts
- **Application** : LocalStorage, cookies
- **Performance** : Profiling, mémoire

### Logs Serveur

```bash
# Logs détaillés du serveur Next.js
DEBUG=* npm run dev

# Logs spécifiques Genkit
DEBUG=genkit npm run genkit:watch
```

### Firebase Debug

```javascript
// Activer les logs Firebase
import { enableNetwork, disableNetwork } from 'firebase/firestore';

// Dans la console navigateur
enableNetwork(db).then(() => console.log('Firestore online'));
```

---

## 📞 Obtenir de l'Aide

### Informations à Fournir

Lors de la création d'un ticket, incluez :

```bash
# Informations système
node --version
npm --version
git --version

# Logs d'erreur complets
npm run dev 2>&1 | tee debug.log

# Configuration (sans les clés secrètes!)
node check-config.js
```

### Template de Bug Report

```markdown
## Problème Rencontré
[Description claire du problème]

## Étapes pour Reproduire
1. ...
2. ...
3. ...

## Comportement Attendu vs Actuel
- **Attendu** : ...
- **Actuel** : ...

## Environnement
- OS : [Windows/Mac/Linux]
- Node.js : [version]
- Navigateur : [Chrome/Firefox/Safari + version]

## Logs d'Erreur
```
[Coller les logs ici]
```

## Configuration
[Résultat de `node check-config.js` sans les clés API]
```

### Ressources Utiles

- 📖 **Documentation** : README.md du projet
- 🐛 **Bug Reports** : [GitHub Issues](https://github.com/Sevangmb/aujourdhuirpg/issues)
- 💬 **Discussions** : [GitHub Discussions](https://github.com/Sevangmb/aujourdhuirpg/discussions)
- 📧 **Contact Direct** : Sevans@hotmail.fr

---

## ⚡ Solutions Express (1 minute)

### Réinitialisation Complète

```bash
# 🚨 Solution "dernière chance" - supprime tout et recommence
rm -rf .next node_modules package-lock.json
rm .env.local
cp .env.example .env.local
# [Configurer vos clés API dans .env.local]
npm install
npm run dev
```

### Test Minimal

```bash
# Test avec configuration minimale
export GOOGLE_API_KEY="votre_cle_google"
export NEXT_PUBLIC_FIREBASE_API_KEY="votre_cle_firebase"
export NEXT_PUBLIC_FIREBASE_PROJECT_ID="votre_projet_id"
export NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="votre_projet.firebaseapp.com"

npm run dev
```

---

> **💡 Conseil** : 90% des problèmes viennent d'une mauvaise configuration des clés API. Vérifiez toujours en premier !