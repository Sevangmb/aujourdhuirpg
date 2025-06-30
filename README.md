# Aujourd'hui RPG

## Introduction

Aujourd'hui RPG is an interactive role-playing game that plunges you into the heart of France, blending realistic life simulation with narrative-driven adventure. Create a unique character and navigate a dynamic world where every choice—from the croissant you eat to the metro you take—matters. Powered by generative AI, the game offers a deeply personal and replayable experience, featuring a living economy, an intelligent travel system, and surprise encounters with historical figures.

## Core Features

*   **Character Creation:** Design a detailed character with a unique name, background, starting era, and an AI-generated avatar. Define your narrative experience by setting your preferred story tones (Horror, Romance, Action, etc.).
*   **Dynamic AI Storytelling:** Engage with scenarios presented in rich HTML, making choices that directly influence a story that evolves with you. The AI acts as a Game Master, creating quests, NPCs, and events on the fly.
*   **Enriched Item & Economy System:** Interact with a world of tangible objects.
    *   **Real-World Items:** Discover authentic French products, read real books from Google Books, and use items with realistic properties (durability, nutritional value, etc.).
    *   **Living Economy:** Earn money through AI-generated jobs. Manage realistic expenses for everything from a cup of coffee to a taxi ride—the world has a cost.
    *   **Crafting & Cooking:** Use recipes and gathered ingredients to cook meals or craft items, with success based on your skills.
*   **Intelligent Transport System:** Travel between locations with choices of transport mode (walk, metro, taxi), each with distinct time, cost, and energy trade-offs. Journeys can even trigger random narrative events.
*   **Physiology Simulation:** Manage your character's hunger and thirst. Your physical state affects your performance, adding a layer of survival and realism to your adventure.
*   **Narrative Combat:** Engage in a combat system that is driven by the story. Your stats, skills, and equipment determine the outcome of conflicts initiated by the AI.
*   **Geospatial Analysis:** Use AI-powered tools to get strategic insights on your current location, including its safety, atmosphere, economic profile, and hidden gems.
*   **Encounters with History:** Meet historical figures (or their modern descendants) tied to the places you visit. Uncover unique secrets, facts, and quests from these AI-enriched characters.
*   **Investigation Dossier:** Become a detective. Collect clues and documents, and rely on an AI-generated summary to help you connect the dots and solve complex mysteries.
*   **Cloud-Based Persistence:** Your progress is automatically saved. Load different save points (auto-saves, manual saves, and checkpoints) to continue your adventure anytime.

## Tech Stack

*   **Frontend:** Next.js (React framework)
*   **Styling:** Tailwind CSS, ShadCN UI
*   **Backend & Database:** Firebase (Firestore, Authentication, Storage)
*   **AI & Generative Content:** Genkit (using Google AI)
*   **Language:** TypeScript

## Getting Started

This section will guide you through setting up and running Aujourd'hui RPG locally.

### Prerequisites

*   **Node.js:** Make sure you have Node.js installed (version 20.x or later recommended). You can download it from [https://nodejs.org/](https://nodejs.org/).
*   **npm:** npm (Node Package Manager) is included with Node.js.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd aujourdhui-rpg
    ```
    *(Replace `<repository-url>` with the actual URL of the repository)*

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Running the Development Server

The application consists of two main parts: the Next.js frontend and the Genkit AI backend.

1.  **Start the Next.js frontend:**
    ```bash
    npm run dev
    ```
    This will start the main application, usually on `http://localhost:3000`.

2.  **Start the Genkit AI flows:**
    The AI functionalities are powered by Genkit. To run them locally for development and testing, use a separate terminal:
    ```bash
    npm run genkit:watch
    ```
    This starts the Genkit development server, which automatically reloads when you make changes to AI-related files.

### Environment Variables

This project requires certain environment variables to be set up for full functionality, particularly for AI services and maps.

1.  Create a `.env` file in the root of the project.
2.  Add the necessary environment variables. The Firebase configuration is currently hardcoded in `src/lib/firebase.ts` for simplicity.

    *   **Google AI / Genkit Configuration:**
        ```
        GOOGLE_API_KEY=your_google_ai_api_key
        ```
        *(**Required** for all generative AI features, including text, images, and enrichments. Get this from the Google AI Studio.)*

    *   **Google Maps Configuration:**
        ```
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
        ```
        *(**Required** for the map display component. Get this from the Google Cloud Console.)*
    
    *   **NewsAPI Configuration (Optional):**
        ```
        NEWS_API_KEY=your_newsapi_org_key
        ```
        *(Optional. Used by an AI tool to fetch current news headlines. Get a key from newsapi.org.)*


**Important:** Do not commit your `.env` file to version control. Ensure it is listed in your `.gitignore` file.

## Style Guidelines

The visual style of Aujourd'hui RPG is designed to be calm, immersive, and modern, using a customizable theme via CSS variables in `src/app/globals.css`. The primary font used is 'Montserrat'.

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

## License

This project does not currently have a license. Consider adding an open-source license such as MIT to define how others can use and contribute to the project.
