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

⚠️ **IMPORTANT : Les clés ci-dessous ont été SUPPRIMÉES pour la sécurité**

```bash
# 🔒 REMPLACEZ avec VOS nouvelles clés API sécurisées
GOOGLE_API_KEY=votre_nouvelle_cle_google_ai
NEXT_PUBLIC_FIREBASE_API_KEY=votre_nouvelle_cle_firebase
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=aujourdhui-rpg.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=aujourdhui-rpg
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=aujourdhui-rpg.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=votre_app_id
```

⚠️ **SÉCURITÉ CRITIQUE** :
- Les anciennes clés ont été **détectées par GitHub** comme étant compromises
- Vous **DEVEZ** régénérer TOUTES vos clés API immédiatement
- **JAMAIS** mettre de vraies clés dans un fichier committé

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
```

### Actions de Dépannage
1. **Vérifiez** que `.env.local` existe et contient vos clés
2. **Redémarrez** complètement le serveur
3. **Consultez** les logs de la console pour les erreurs
4. **Utilisez** `npm run test:ai` pour tester l'IA

## 🆘 Support Avancé

Si le problème persiste, consultez :
- `SECURITY_MIGRATION_COMPLETED.md` - Documentation complète
- `CENTRALIZED_CONFIG_README.md` - Guide de configuration
- Logs de la console développeur du navigateur

---

**⚠️ RAPPEL SÉCURITÉ** : Ne jamais inclure de vraies clés API dans le code source ou la documentation publique.