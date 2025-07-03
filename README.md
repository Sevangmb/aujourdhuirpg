
# Aujourd'hui RPG

![Game Screenshot](https://storage.googleapis.com/static.aiforge.dev/aujourdhui-rpg-banner.png)

## 📖 Introduction

**Aujourd'hui RPG** est une expérience de jeu de rôle textuel interactive qui vous plonge au cœur de la France. Il mélange une simulation de vie réaliste avec une aventure narrative où chaque choix compte. Propulsé par une IA générative, le jeu offre une expérience profondément personnelle et rejouable.

Ce projet se distingue par son **architecture modulaire en cascade**. Au lieu que l'IA gère à la fois la logique et la narration, nous avons séparé les responsabilités :
-   Le **moteur de jeu**, écrit en TypeScript, est le maître des règles. Il calcule les conséquences logiques de chaque action.
-   L'**IA** agit comme un narrateur créatif, prenant les résultats logiques du moteur pour tisser une histoire immersive.

Chaque action du joueur déclenche une cascade d'enrichissements contextuels, fournissant à l'IA un contexte ultra-riche pour une narration d'une profondeur inégalée.

## ✨ Core Features

*   **Création de Personnage Détaillée** : Concevez un personnage unique avec un nom, un passé, une époque de départ et un avatar généré par IA. Définissez votre expérience narrative en ajustant les tonalités de l'histoire (Horreur, Romance, Action, etc.).
*   **Narration par IA Dynamique (Architecture en Cascade)** : Interagissez avec des scénarios présentés en HTML riche, en faisant des choix qui influencent directement une histoire qui évolue avec vous. Le moteur de jeu détermine les conséquences ; l'IA les raconte de manière captivante.
*   **Système d'Objets et d'Économie Évolué** :
    *   **Objets Intelligents** : Les objets ont une "mémoire", une condition, des propriétés contextuelles et peuvent même gagner de l'expérience et évoluer.
    *   **Économie Vivante** : Gagnez de l'argent grâce à des jobs générés par l'IA. Gérez des dépenses réalistes pour tout, du café au taxi.
    *   **Artisanat & Cuisine** : Utilisez des recettes et des ingrédients pour cuisiner des repas ou fabriquer des objets, avec un succès basé sur vos compétences.
*   **Système de Transport Intelligent** : Voyagez entre les lieux avec des choix de mode de transport (marche, métro, taxi), chacun avec des compromis de temps, de coût et d'énergie. Les trajets peuvent même déclencher des événements narratifs aléatoires.
*   **Simulation Physiologique** : Gérez la faim et la soif de votre personnage. Votre état physique affecte vos performances, ajoutant une couche de survie et de réalisme.
*   **Combat Narratif** : Engagez-vous dans un système de combat piloté par l'histoire. Vos statistiques, compétences et équipement déterminent le résultat des conflits initiés par l'IA.
*   **Analyse Géospatiale** : Utilisez des outils d'IA pour obtenir des informations stratégiques sur votre emplacement actuel, y compris sa sécurité, son atmosphère, son profil économique et ses joyaux cachés.
*   **Rencontres avec l'Histoire** : Rencontrez des personnages historiques (ou leurs descendants modernes) liés aux lieux que vous visitez. Découvrez des secrets uniques, des faits et des quêtes de ces personnages enrichis par l'IA.
*   **Dossier d'Enquête** : Devenez un détective. Collectez des indices et des documents, et appuyez-vous sur un résumé généré par l'IA pour vous aider à relier les points et à résoudre des mystères complexes.
*   **Persistance Basée sur le Cloud** : Votre progression est automatiquement sauvegardée dans Firebase. Chargez différents points de sauvegarde (automatiques, manuels et checkpoints) pour continuer votre aventure à tout moment.

## 🛠️ Tech Stack & Architecture

*   **Frontend** : Next.js (React)
*   **Styling** : Tailwind CSS, ShadCN UI
*   **Backend & Database** : Firebase (Firestore, Authentication, Storage)
*   **AI & Generative Content** : Google AI & Genkit
*   **Language** : TypeScript
*   **Architecture** : Le projet utilise une **architecture modulaire en cascade** personnalisée. Les actions du joueur déclenchent des chaînes de modules d'enrichissement (logique de jeu en TypeScript) qui créent un contexte riche avant de l'envoyer à l'IA pour une narration pure.

## 🚀 Getting Started

Cette section vous guidera pour configurer et lancer Aujourd'hui RPG localement.

### Prerequisites

*   **Node.js** : Assurez-vous d'avoir Node.js installé (version 20.x ou ultérieure recommandée).
*   **npm** : npm (Node Package Manager) est inclus avec Node.js.

### Installation & Configuration

1.  **Cloner le dépôt :**
    ```bash
    git clone <repository-url>
    cd aujourdhui-rpg
    ```
2.  **Installer les dépendances :**
    ```bash
    npm install
    ```
3.  **Configurer les Clés API (Important!)**
    Ce projet nécessite plusieurs clés API pour fonctionner. Veuillez suivre les instructions détaillées dans le fichier `SECURITY_SETUP.md` pour configurer votre fichier `.env.local` de manière sécurisée.
    
    ➡️ **[Lire le Guide de Configuration de Sécurité](SECURITY_SETUP.md)**

### Running the Development Server

L'application se compose de deux parties principales : le frontend Next.js et le backend Genkit AI.

1.  **Lancer le frontend Next.js :**
    ```bash
    npm run dev
    ```
    Cela démarrera l'application principale, généralement sur `http://localhost:3000`.

2.  **Lancer les flux Genkit AI :**
    Les fonctionnalités d'IA sont alimentées par Genkit. Pour les exécuter localement pour le développement, utilisez un terminal séparé :
    ```bash
    npm run genkit:watch
    ```
    Cela démarre le serveur de développement Genkit, qui se recharge automatiquement lorsque vous modifiez les fichiers liés à l'IA.

**Important** : Ne commitez jamais votre fichier `.env.local` contenant vos clés API.

## 🎨 Style Guidelines

Le style visuel d'Aujourd'hui RPG est conçu pour être calme, immersif et moderne, en utilisant un thème personnalisable via des variables CSS dans `src/app/globals.css`. La police principale utilisée est 'Montserrat'.
