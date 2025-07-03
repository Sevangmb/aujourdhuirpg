# 🛠️ Guide de Dépannage - Aujourd'hui RPG

## 🚨 Problèmes Courants et Solutions

### 1. 🔑 Erreurs de Clés API

#### Symptômes :
- ❌ "Firebase auth is not initialized"
- ❌ "Neither GOOGLE_API_KEY nor GEMINI_API_KEY found"
- ❌ "L'IA n'a pas pu générer de scénario"

#### Solutions :
```bash
# 1. Vérifiez votre fichier .env.local
cp .env.example .env.local

# 2. Remplissez toutes les clés requises
GOOGLE_API_KEY=votre_clé_google_ai
NEXT_PUBLIC_FIREBASE_API_KEY=votre_clé_firebase
# ... autres clés

# 3. Redémarrez le serveur
npm run dev
```

#### Obtenir les clés :
- **Google AI** : [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Firebase** : [Firebase Console](https://console.firebase.google.com/)
- **Google Maps** : [Google Cloud Console](https://console.cloud.google.com/)

### 2. 🔥 Problèmes Firebase

#### Erreurs courantes :
- "Firebase app not initialized"
- "Permission denied" (règles Firestore)
- "Storage bucket not found"

#### Solutions :
```bash
# Vérifiez la configuration Firebase
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre-projet-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre-projet.firebasestorage.app
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

#### Erreurs TypeScript :
- "loadedPlugin.initializer is not a function"
- "Cannot resolve module '@genkit-ai/googleai'"

#### Solutions :
```bash
# Réinstallez les dépendances
npm ci

# Vérifiez la version Node.js (requis: 20.x+)
node --version

# Redémarrez Genkit
npm run genkit:watch
```

### 4. 🚀 Problèmes de Build

#### Erreurs communes :
- TypeScript compilation errors
- Module resolution failures
- Environment variables not found

#### Solutions :
```bash
# Vérification TypeScript
npm run typecheck

# Build clean
npm run build

# Vérifiez les imports
# Utilisez toujours @/ pour les imports locaux
import { Component } from '@/components/Component';
```

### 5. 🎨 Problèmes d'Interface

#### Styles ne s'appliquent pas :
```bash
# Vérifiez Tailwind
npm run dev

# Purgez le cache Next.js
rm -rf .next
npm run dev
```

#### Composants ShadCN manquants :
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
# etc.
```

### 6. 📱 Problèmes Responsive

#### Tests recommandés :
- 📱 Mobile : 375px (iPhone)
- 📱 Tablet : 768px (iPad)
- 💻 Desktop : 1024px+

#### CSS Debug :
```css
/* Ajoutez temporairement pour debug */
* {
  border: 1px solid red !important;
}
```

## 🔍 Outils de Debug

### Console Logs Utiles :
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
```

### DevTools :
- **React DevTools** : Inspect component state
- **Firebase DevTools** : Monitor database
- **Network Tab** : Check API calls

## 🚀 Performance

### Optimisations :
```typescript
// Lazy loading des composants
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>
});

// Memoization pour éviter re-renders
const MemoizedComponent = React.memo(Component);
```

### Bundle Analysis :
```bash
npm run build
npm run analyze # Si configuré
```

## 🔒 Sécurité

### ⚠️ À NE JAMAIS FAIRE :
- ❌ Committer des clés API
- ❌ Clés en dur dans le code
- ❌ Variables NEXT_PUBLIC avec secrets

### ✅ Bonnes pratiques :
- ✅ Variables d'environnement
- ✅ .env.local dans .gitignore
- ✅ Validation côté serveur

## 📞 Support

### Avant de demander de l'aide :
1. ✅ Suivez ce guide
2. ✅ Vérifiez les logs console
3. ✅ Testez avec une config minimale
4. ✅ Décrivez l'erreur exacte

### Informations utiles à fournir :
- Version Node.js : `node --version`
- Système d'exploitation
- Message d'erreur complet
- Étapes pour reproduire
- Configuration (sans les clés secrètes !)

---

**🔄 Dernière mise à jour :** Juillet 2025
**📚 Voir aussi :** SECURITY_SETUP.md, README.md
