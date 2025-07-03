# 🚨 Guide de Résolution Express - Erreur IA

> **Problème :** "L'IA n'a pas pu générer de scénario. Veuillez réessayer ou vérifier la configuration du serveur."

## ⚡ Solution Rapide (2 minutes)

### 1. Diagnostic Automatique
```bash
node check-config.js
```

### 2. Configuration Express
Si le fichier `.env.local` n'existe pas :
```bash
cp .env.example .env.local
```

### 3. Ajoutez Vos Clés API
Modifiez `.env.local` avec vos vraies clés :
```bash
GOOGLE_API_KEY=AIzaSyCL-e_c4qG51YMfz9NrIVkPEPS8StFuo_I
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCfXSVcVuVxcl3Hd2swFjAa4Zzvstyyo_8
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=aujourdhui-rpg.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=aujourdhui-rpg
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=aujourdhui-rpg.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=528666135142
NEXT_PUBLIC_FIREBASE_APP_ID=1:528666135142:web:1e9678352c33a7f36bfba7
```

### 4. Redémarrage
```bash
# Arrêtez le serveur (Ctrl+C)
npm run dev
```

## ✅ Vérification

1. **Ouvrez** http://localhost:3000
2. **Créez** un nouveau personnage
3. **Démarrez** une partie
4. **Vérifiez** que les scénarios se génèrent sans erreur

## 🔍 Si Ça Ne Fonctionne Toujours Pas

### Vérification Rapide
```bash
# Les logs doivent montrer :
# ✅ "Google API Key found in environment"
# ✅ "Firebase initialized successfully"

# PAS :
# ❌ "Neither GOOGLE_API_KEY nor GEMINI_API_KEY found"
```

### Test de Clé API
1. Allez sur https://makersuite.google.com/app/apikey
2. Testez votre clé dans l'interface
3. Régénérez-la si nécessaire

### Dépannage Avancé
Consultez [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) pour une aide complète.

---

**✅ Résultat Attendu :** L'erreur disparaît et vous pouvez jouer normalement !
