# 🛠️ Guide de Dépannage - Aujourd'hui RPG

## 🚀 Diagnostic Automatique (NOUVEAU!)

**Utilisez d'abord notre outil de diagnostic automatique :**
```bash
node check-config.js
```

Cet outil vérifie automatiquement votre configuration et vous guide vers les solutions.

---

## 🚨 Problèmes Critiques et Solutions

### 1. 🔑 **ERREUR CRITIQUE : "L'IA n'a pas pu générer de scénario"**

#### Symptômes :
- ❌ "L'IA n'a pas pu générer de scénario. Veuillez réessayer"
- ❌ "Neither GOOGLE_API_KEY nor GEMINI_API_KEY found"
- ❌ "Erreur critique du modèle IA"
- ❌ Interface affiche un message d'erreur rouge

#### ✅ **Solution Express (5 minutes) :**
```bash
# 1. Diagnostic automatique
node check-config.js

# 2. Si .env.local manque, créez-le
cp .env.example .env.local

# 3. Ajoutez vos clés API dans .env.local
GOOGLE_API_KEY=votre_clé_google_ai_ici
NEXT_PUBLIC_FIREBASE_API_KEY=votre_clé_firebase_ici
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre-projet-id

# 4. Redémarrez le serveur
npm run dev
```

#### 🔑 **Obtenir vos clés API :**
- **Google AI** (OBLIGATOIRE) : [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Firebase** (OBLIGATOIRE) : [Firebase Console](https://console.firebase.google.com/) → Paramètres du projet → Config Web
- **Google Maps** (Optionnel) : [Google Cloud Console](https://console.cloud.google.com/)

#### 🔍 **Diagnostic détaillé :**
L'application a été améliorée avec de meilleurs messages d'erreur. Si vous voyez encore des erreurs :

1. **Vérification des clés :**
   ```bash
   # Vérifiez que vos clés sont présentes
   grep -E "GOOGLE_API_KEY|FIREBASE" .env.local
   ```

2. **Test de la clé Google AI :**
   - Allez sur [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Testez votre clé dans l'interface
   - Assurez-vous qu'elle a les permissions Generative Language API

3. **Logs détaillés :**
   - Ouvrez la console navigateur (F12)
   - Cherchez des messages détaillés d'erreur
   - Les nouveaux messages d'erreur sont plus informatifs

### 2. 🔥 Problèmes Firebase

#### Erreurs courantes :
- "Firebase app not initialized"
- "Permission denied" (règles Firestore)
- "Storage bucket not found"
- "Auth service not available for sign in"

#### ✅ Solutions :
```bash
# Configuration Firebase complète dans .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=votre_clé_firebase
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre-projet-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre-projet.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc123
```

#### Vérifiez les règles Firestore :
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. 🤖 Problèmes Genkit AI

#### Erreurs TypeScript/Build :
- "loadedPlugin.initializer is not a function"
- "Cannot resolve module '@genkit-ai/googleai'"
- "TypeError in genkit initialization"

#### ✅ Solutions :
```bash
# 1. Réinstallez les dépendances proprement
rm -rf node_modules package-lock.json
npm install

# 2. Vérifiez la version Node.js (requis: 20.x+)
node --version

# 3. Redémarrez Genkit en mode watch
npm run genkit:watch

# 4. Si l'erreur persiste, vérifiez les variables d'environnement
node check-config.js
```

### 4. 🚀 Problèmes de Build et Développement

#### Erreurs communes :
- TypeScript compilation errors
- Module resolution failures
- Environment variables not found
- Hot reload ne fonctionne pas

#### ✅ Solutions :
```bash
# Vérification TypeScript
npm run typecheck

# Build propre
rm -rf .next
npm run build

# Redémarrage complet
npm run dev

# Vérifiez les imports (utilisez toujours @/ pour les imports locaux)
import { Component } from '@/components/Component';
```

### 5. 🎨 Problèmes d'Interface et Styles

#### Styles Tailwind ne s'appliquent pas :
```bash
# Vérifiez la configuration Tailwind
npm run dev

# Purgez le cache
rm -rf .next
npm run dev
```

#### Composants ShadCN manquants :
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add alert
```

## 🔍 Outils de Debug et Diagnostic

### 1. Script de Diagnostic Automatique
```bash
# Utilisez notre outil de diagnostic complet
node check-config.js

# Vérification rapide des variables d'environnement
grep -v "^#" .env.local | grep -v "^$"
```

### 2. Console Logs Utiles
```typescript
// Vérifiez l'état Firebase
console.log('Firebase App:', firebaseApp);
console.log('Auth:', auth);
console.log('User:', user);

// Vérifiez les variables d'environnement
console.log('Env Check:', {
  hasGoogleAI: !!process.env.GOOGLE_API_KEY,
  hasFirebase: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  nodeEnv: process.env.NODE_ENV
});

// Nouvelles vérifications IA
console.log('AI Config:', {
  hasApiKey: !!process.env.GOOGLE_API_KEY || !!process.env.GEMINI_API_KEY,
  apiKeySource: process.env.GOOGLE_API_KEY ? 'GOOGLE_API_KEY' : 
                process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : 'none'
});
```

### 3. DevTools Recommandés
- **React DevTools** : Inspect component state
- **Firebase DevTools** : Monitor database
- **Network Tab** : Check API calls
- **Console** : Erreurs détaillées avec les nouvelles améliorations

## 🚀 Optimisation des Performances

### Code Optimizations :
```typescript
// Lazy loading des composants lourds
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false
});

// Memoization pour éviter re-renders
const MemoizedComponent = React.memo(Component);

// Optimisation des useEffect
useEffect(() => {
  // logic
}, [specific, dependencies]); // Pas de dépendances vides []
```

### Bundle Analysis :
```bash
npm run build
npm run analyze # Si configuré dans package.json
```

## 🔒 Sécurité et Bonnes Pratiques

### ⚠️ **À NE JAMAIS FAIRE :**
- ❌ Committer .env.local ou des clés API
- ❌ Clés en dur dans le code source
- ❌ Variables NEXT_PUBLIC avec des secrets
- ❌ Pousser des credentials sur GitHub

### ✅ **Bonnes Pratiques :**
- ✅ Utilisez .env.local pour les variables sensibles
- ✅ .env.local est dans .gitignore
- ✅ Validation côté serveur pour les données critiques
- ✅ Régénérez vos clés si elles sont compromises

### 🛡️ **Vérification de Sécurité :**
```bash
# Vérifiez que .env.local n'est pas tracké
git ls-files | grep .env.local
# Cette commande ne doit rien retourner

# Vérifiez .gitignore
grep "\.env\.local" .gitignore
# Doit retourner .env.local
```

## 📞 Support et Aide

### ✅ **Avant de demander de l'aide :**
1. **Utilisez le diagnostic automatique :** `node check-config.js`
2. **Vérifiez les logs console** (F12 dans le navigateur)
3. **Testez avec une configuration minimale**
4. **Décrivez l'erreur exacte avec screenshots**

### 📋 **Informations utiles à fournir :**
```bash
# Informations système
node --version
npm --version
echo $NODE_ENV

# Vérification de la configuration (SANS révéler les clés)
node check-config.js

# État Git
git status
git log --oneline -5
```

### 🔗 **Ressources Supplémentaires :**
- **Guide de Configuration :** [SECURITY_SETUP.md](./SECURITY_SETUP.md)
- **Documentation Complète :** [README.md](./README.md)
- **Google AI Studio :** https://makersuite.google.com/app/apikey
- **Firebase Console :** https://console.firebase.google.com/

## 🎯 Checklist de Résolution Rapide

- [ ] Exécuter `node check-config.js`
- [ ] Fichier `.env.local` créé et configuré
- [ ] Clés API Google et Firebase ajoutées
- [ ] Serveur redémarré (`npm run dev`)
- [ ] Aucune erreur dans la console navigateur
- [ ] Test de création de personnage réussi
- [ ] Génération de scénario fonctionnelle

---

**🔄 Dernière mise à jour :** Juillet 2025 - Améliorations diagnostics IA
**📚 Voir aussi :** SECURITY_SETUP.md, README.md, check-config.js
