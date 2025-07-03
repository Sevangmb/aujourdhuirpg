# 🔐 Configuration Sécurisée - Aujourd'hui RPG

Ce guide vous explique comment configurer votre environnement de développement de manière sécurisée.

## ⚡ Configuration Rapide

### 1. Variables d'environnement

1. **Copiez le fichier d'exemple :**
   ```bash
   cp .env.example .env.local
   ```

2. **Remplissez vos clés API dans `.env.local` :**
   ```bash
   # Google AI (OBLIGATOIRE)
   GOOGLE_API_KEY=votre_clé_google_ai
   
   # Firebase (OBLIGATOIRE) 
   NEXT_PUBLIC_FIREBASE_API_KEY=votre_clé_firebase
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre-projet-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre-projet.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=votre_app_id
   
   # Google Maps (OPTIONNEL)
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=votre_clé_google_maps
   ```

### 2. Obtenir les clés API

#### 🤖 Google AI (Genkit)
1. Allez sur [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Connectez-vous avec votre compte Google
3. Cliquez sur "Create API Key"
4. Copiez la clé dans `GOOGLE_API_KEY`

#### 🔥 Firebase
1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet (ou créez-en un nouveau)
3. Allez dans "Project Settings" (⚙️)
4. Dans l'onglet "General", section "Your apps"
5. Copiez les valeurs de configuration dans votre `.env.local`

#### 🗺️ Google Maps (Optionnel)
1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Activez l'API "Maps JavaScript API"
3. Créez une clé API et copiez-la dans `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

## 🛡️ Bonnes Pratiques de Sécurité

### ✅ À FAIRE
- ✅ Utilisez toujours `.env.local` pour les clés de développement
- ✅ Ajoutez `.env.local` à votre `.gitignore` (déjà fait)
- ✅ Utilisez des projets Firebase séparés pour dev/staging/production
- ✅ Limitez vos clés API à des domaines spécifiques en production
- ✅ Rotez vos clés API régulièrement
- ✅ Surveillez l'utilisation de vos APIs

### ❌ À ÉVITER
- ❌ Ne jamais committer de vraies clés API dans le code
- ❌ Ne pas partager vos clés API sur Discord/Slack/Email
- ❌ Ne pas utiliser les mêmes clés pour dev et production
- ❌ Ne pas laisser des clés API dans les commentaires de code

## 🚨 En cas de problème

### Erreur : "GOOGLE_API_KEY is missing"
```bash
# Vérifiez que votre .env.local contient :
GOOGLE_API_KEY=votre_clé_ici
```

### Erreur : "Firebase auth is not initialized"
1. Vérifiez que toutes les variables `NEXT_PUBLIC_FIREBASE_*` sont remplies
2. Vérifiez que votre projet Firebase est correctement configuré
3. Redémarrez votre serveur de développement

### Erreur : "loadedPlugin.initializer is not a function"
- Cette erreur indique que Genkit ne peut pas initialiser le plugin Google AI
- Vérifiez votre `GOOGLE_API_KEY` dans `.env.local`
- Redémarrez avec `npm run genkit:watch`

## 🔧 Scripts de développement

```bash
# Démarrer le frontend
npm run dev

# Démarrer l'AI backend (dans un autre terminal)
npm run genkit:watch

# Vérifier la configuration TypeScript
npm run typecheck

# Linter le code
npm run lint
```

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez que toutes les variables d'environnement sont configurées
2. Consultez les logs dans la console du navigateur et du terminal
3. Vérifiez que vos clés API sont valides et ont les bonnes permissions

---

⚠️ **IMPORTANT** : Ce fichier ne contient que des instructions. Vos vraies clés API doivent être dans `.env.local` (qui n'est pas dans Git).
