# 🔐 Guide de Configuration Sécurisée - Aujourd'hui RPG

> **IMPORTANT**: Ce guide vous accompagne dans la configuration sécurisée de toutes les clés API nécessaires au bon fonctionnement d'Aujourd'hui RPG.

## 🚨 Alertes Sécurité Importantes

### ⚠️ Clés API Compromises (Action Immédiate Requise)

Les clés suivantes ont été **exposées publiquement** et doivent être **régénérées immédiatement** :

- ❌ Firebase API Key: `AIzaSyCfXSVcVuVxcl3Hd2swFjAa4Zzvstyyo_8`
- ❌ Google AI API Key: `AIzaSyCL-e_c4qG51YMfz9NrIVkPEPS8StFuo_I`

**🔥 ACTION CRITIQUE**: Si vous utilisez ces clés, régénérez-les **MAINTENANT** dans vos consoles respectives.

---

## 🛠️ Configuration Étape par Étape

### Étape 1: Préparer l'Environnement

```bash
# 1. Cloner le projet si pas encore fait
git clone https://github.com/Sevangmb/aujourdhuirpg.git
cd aujourdhuirpg

# 2. Installer les dépendances
npm install

# 3. Créer le fichier de configuration local
cp .env.example .env.local
```

### Étape 2: Firebase Setup

#### A. Créer/Configurer le Projet Firebase

1. **Aller sur [Firebase Console](https://console.firebase.google.com/)**
2. **Créer un nouveau projet** ou sélectionner `aujourdhui-rpg`
3. **Activer les services requis**:
   - ✅ Authentication (avec Email/Password et Anonymous)
   - ✅ Firestore Database
   - ✅ Storage
   - ✅ Hosting (optionnel)

#### B. Récupérer les Clés Firebase

1. **Projet Settings** → **General** → **Your apps**
2. **Sélectionner Web App** ou créer une nouvelle
3. **Copier la configuration**:

```javascript
// Exemple de configuration (NE PAS copier ces valeurs!)
const firebaseConfig = {
  apiKey: "votre-nouvelle-cle-api",
  authDomain: "votre-projet.firebaseapp.com",
  projectId: "votre-projet-id",
  storageBucket: "votre-projet.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

#### C. Configurer les Règles Firestore

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permettre aux utilisateurs authentifiés de lire/écrire leurs données
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Permettre aux utilisateurs authentifiés de lire/écrire leurs parties
    match /games/{gameId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Permettre la lecture publique des données de jeu statiques
    match /gameData/{document=**} {
      allow read: if true;
    }
  }
}
```

### Étape 3: Google AI Setup

#### A. Obtenir une Clé Google AI

1. **Aller sur [Google AI Studio](https://makersuite.google.com/app/apikey)**
2. **Créer une nouvelle clé API**
3. **Configurer les restrictions**:
   - Restreindre par IP (recommandé pour production)
   - Limiter aux APIs Generative Language

#### B. Tester la Clé

```bash
# Test rapide avec curl
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Test"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=VOTRE_CLE"
```

### Étape 4: Google Maps API (Optionnel)

1. **[Google Cloud Console](https://console.cloud.google.com/)** → APIs & Services
2. **Activer** : Maps JavaScript API, Places API
3. **Créer une clé API** avec restrictions géographiques

### Étape 5: NewsAPI (Optionnel)

1. **[NewsAPI](https://newsapi.org/register)** → Créer un compte
2. **Récupérer la clé API** (gratuite pour développement)

---

## 📝 Configuration du Fichier .env.local

Éditez votre fichier `.env.local` avec vos vraies clés :

```bash
# ==============================================
# 🔥 CLÉS CRITIQUES - OBLIGATOIRES
# ==============================================

# Google AI / Genkit (choisir une des deux)
GOOGLE_API_KEY=votre_cle_google_ai_ici
# OU
GEMINI_API_KEY=votre_cle_gemini_ici

# Firebase - TOUTES OBLIGATOIRES
NEXT_PUBLIC_FIREBASE_API_KEY=votre_cle_firebase_ici
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre-projet-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre-projet.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# ==============================================
# 🌟 CLÉS RECOMMANDÉES
# ==============================================

# Google Maps (pour la carte)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=votre_cle_maps_ici

# Firebase Analytics (optionnel)
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABCDEF123

# ==============================================
# 📰 CLÉS OPTIONNELLES
# ==============================================

# NewsAPI (pour les actualités du jeu)
NEWS_API_KEY=votre_cle_news_ici
```

---

## ✅ Validation de la Configuration

### Test Automatique

```bash
# Lancer le script de validation
node check-config.js
```

### Test Manuel

```bash
# Démarrer l'application
npm run dev

# Vérifier les logs dans la console pour:
# ✅ "Firebase app initialized successfully"
# ✅ "AI module successfully configured and ready"
# ❌ Aucune erreur de clé API manquante
```

### Test Fonctionnel

1. **Ouvrir** http://localhost:3000
2. **Créer un personnage** → Vérifier que l'avatar s'affiche
3. **Démarrer une partie** → Vérifier que les scénarios se génèrent
4. **Sauvegarder** → Vérifier que la progression est enregistrée

---

## 🔒 Bonnes Pratiques de Sécurité

### ✅ À Faire

- ✅ **Toujours** utiliser `.env.local` pour les clés de développement
- ✅ **Jamais** committer de fichiers contenant des clés API
- ✅ **Régénérer** les clés si elles sont exposées
- ✅ **Restreindre** les clés API par IP/domaine en production
- ✅ **Monitorer** l'usage des clés API
- ✅ **Utiliser** des variables d'environnement en production

### ❌ À Éviter

- ❌ **Jamais** hardcoder de clés dans le code source
- ❌ **Jamais** partager les clés par email/chat
- ❌ **Jamais** utiliser des clés de développement en production
- ❌ **Jamais** laisser des clés dans les logs
- ❌ **Jamais** committer `.env.local`

---

## 🚨 Procédure d'Urgence (Clé Compromise)

Si une clé API est compromise :

### Étapes Immédiates (< 5 minutes)

1. **🔥 DÉSACTIVER** la clé compromise dans la console
2. **🔄 GÉNÉRER** une nouvelle clé
3. **📝 METTRE À JOUR** `.env.local` avec la nouvelle clé
4. **🔄 REDÉMARRER** l'application
5. **📋 AUDITER** les logs pour détecter un usage malveillant

### Étapes de Suivi (< 24h)

1. **📊 ANALYSER** les métriques d'usage de l'ancienne clé
2. **🔍 VÉRIFIER** les commits Git pour d'autres expositions
3. **📚 DOCUMENTER** l'incident
4. **🛡️ RENFORCER** les mesures de sécurité

---

## 🆘 Support et Aide

### Problèmes Courants

- **Erreur "L'IA n'a pas pu générer"** → Vérifier `GOOGLE_API_KEY`
- **Erreur Firebase Auth** → Vérifier les clés Firebase
- **Carte ne se charge pas** → Vérifier `GOOGLE_MAPS_API_KEY`

### Ressources

- 📖 [Documentation Firebase](https://firebase.google.com/docs)
- 🤖 [Documentation Google AI](https://ai.google.dev/)
- 🗺️ [Documentation Google Maps](https://developers.google.com/maps)
- 📰 [Documentation NewsAPI](https://newsapi.org/docs)

### Contact

- 🐛 **Issues GitHub** : [Créer un ticket](https://github.com/Sevangmb/aujourdhuirpg/issues)
- 📧 **Email** : Sevans@hotmail.fr

---

> **💡 Conseil**: Gardez une copie de sauvegarde de vos clés API dans un gestionnaire de mots de passe sécurisé !