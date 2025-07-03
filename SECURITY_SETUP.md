# 🔐 Configuration Sécurisée - Aujourd'hui RPG

Ce guide vous explique comment configurer votre environnement de développement de manière sécurisée.

## ⚡ Configuration Rapide

### 1. Variables d'environnement

1. **Copiez le fichier d'exemple :**
   Il est recommandé d'utiliser `.env.local` car il a la priorité sur les autres fichiers d'environnement et n'est pas suivi par Git.
   ```bash
   cp .env.example .env.local
   ```

2. **Remplissez vos clés API dans `.env.local` :**
   ```bash
   # Google AI (OBLIGATOIRE pour l'IA)
   # Obtenez votre clé sur https://makersuite.google.com/app/apikey
   GOOGLE_API_KEY=votre_clé_google_ai_ici
   
   # Firebase (OBLIGATOIRE pour la sauvegarde et l'authentification)
   # Obtenez ces valeurs depuis les paramètres de votre projet Firebase
   NEXT_PUBLIC_FIREBASE_API_KEY=votre_clé_api
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre-projet-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=votre_app_id
   
   # Google Maps (FORTEMENT RECOMMANDÉ pour la carte)
   # Obtenez votre clé sur https://console.cloud.google.com/
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=votre_clé_google_maps_ici
   
   # NewsAPI (OPTIONNEL pour les quêtes basées sur l'actualité)
   # Obtenez votre clé sur https://newsapi.org/
   NEWS_API_KEY=votre_clé_newsapi_ici
   ```

### 2. Obtenir les clés API

#### 🤖 Google AI (Genkit)
1. Allez sur [Google AI Studio](https://makersuite.google.com/app/apikey).
2. Connectez-vous avec votre compte Google.
3. Cliquez sur **"Create API Key"**.
4. Copiez la clé et collez-la dans `GOOGLE_API_KEY` dans votre `.env.local`.

#### 🔥 Firebase
1. Allez sur la [Console Firebase](https://console.firebase.google.com/).
2. Sélectionnez votre projet (ou créez-en un nouveau).
3. Allez dans les **"Paramètres du projet"** (icône ⚙️ en haut à gauche).
4. Dans l'onglet **"Général"**, faites défiler jusqu'à la section **"Vos applications"**.
5. Si vous n'avez pas d'application web, créez-en une.
6. Copiez les valeurs de l'objet de configuration `firebaseConfig` dans les variables correspondantes de votre `.env.local`.

#### 🗺️ Google Maps
1. Allez sur la [Google Cloud Console](https://console.cloud.google.com/).
2. Créez un projet si vous n'en avez pas.
3. Activez l'API **"Maps JavaScript API"** pour votre projet.
4. Allez dans **"API et services" > "Identifiants"**.
5. Créez une nouvelle clé API et copiez-la dans `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
6. **Important :** Pour la production, restreignez votre clé API pour n'autoriser que le domaine de votre application.

## 🛡️ Bonnes Pratiques de Sécurité

- ✅ Utilisez **toujours** `.env.local` pour vos clés secrètes. Le fichier `.gitignore` est déjà configuré pour l'ignorer.
- ✅ Ne commitez **jamais** de clés API dans votre code source.
- ✅ Utilisez des projets Firebase **séparés** pour le développement et la production.
- ✅ Restreignez vos clés API (Google Maps, etc.) aux domaines de votre application en production.
- ✅ Rotez vos clés API périodiquement.

## 🚨 Dépannage des Erreurs Courantes

### Erreur : "TypeError: loadedPlugin.initializer is not a function"
- **Cause :** Genkit n'a pas pu initialiser le plugin Google AI.
- **Solution :** Vérifiez que votre `GOOGLE_API_KEY` dans `.env.local` est correcte et valide. Assurez-vous d'avoir redémarré votre serveur Genkit (`npm run genkit:watch`) après avoir modifié le fichier.

### Erreur : "FirebaseError: Firebase: Error (auth/invalid-api-key)."
- **Cause :** Votre clé API Firebase est incorrecte ou les variables d'environnement ne sont pas chargées.
- **Solution :** Vérifiez que toutes les variables `NEXT_PUBLIC_FIREBASE_*` dans `.env.local` sont correctement remplies. Redémarrez votre serveur de développement (`npm run dev`).

### Erreur : La carte Google Maps affiche "Oops! Something went wrong."
- **Cause :** La clé `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` est manquante, invalide, ou n'a pas les bonnes autorisations.
- **Solution :** Vérifiez la clé dans votre `.env.local` et assurez-vous que l'API "Maps JavaScript API" est activée dans votre projet Google Cloud.

---

⚠️ **IMPORTANT** : Ce fichier ne contient que des instructions. Vos vraies clés API doivent être dans `.env.local` (qui n'est pas versionné dans Git).
