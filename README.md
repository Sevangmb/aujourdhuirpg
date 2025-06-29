# Aujourd'hui RPG

## Introduction

Aujourd'hui RPG is an interactive role-playing game that plunges you into the heart of France, from contemporary times to pivotal historical eras. Create a unique character and navigate a dynamic world where every choice matters. Powered by generative AI, the game offers a deeply personal and replayable narrative experience, featuring a living economy, intelligent travel, and surprise encounters with historical figures.

## Core Features

*   **Character Creation:** Design a detailed character with a unique name, background, and an AI-generated avatar.
*   **Dynamic Storytelling:** Engage with scenarios presented in HTML, making choices that directly influence a story that evolves with you.
*   **Multi-Era Gameplay:** Start your adventure in the modern day or travel back to historical periods like the Renaissance, meeting historical figures as they were in their own time.
*   **Living Economy**: Actively earn money through AI-generated jobs and missions. Manage realistic expenses for everything from a cup of coffee to a taxi ride—the world has a cost.
*   **Intelligent Transport System**: Travel between locations with choices of transport mode (walk, metro, taxi), each with time, cost, and energy trade-offs. Journeys can even trigger random narrative events.
*   **Geospatial Analysis**: Use AI-powered tools to get strategic insights on your current location, including its safety, atmosphere, economic profile, and hidden gems.
*   **Encounters with History**: Meet historical figures (or their modern descendants) tied to the places you visit. Uncover unique secrets, facts, and quests from these AI-enriched characters.
*   **Investigation Dossier**: Become a detective. Collect clues and documents, and rely on an AI-generated summary to help you connect the dots and solve complex mysteries.
*   **Cloud-Based Persistence:** Your progress is automatically saved to the cloud. Load different save points (auto-saves, manual saves, and checkpoints) to continue your adventure anytime, anywhere.

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
    cd aujourdhui-rpg # Or your project's directory name
    ```
    *(Replace `<repository-url>` with the actual URL of the repository)*

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Running the Development Server

To start the development server for Next.js:

```bash
npm run dev
```

This will typically start the application on `http://localhost:3000`.

The AI functionalities are powered by Genkit. To run the Genkit flows locally (e.g., for testing or development of AI features):

```bash
npm run genkit:dev
```

Or to watch for changes in AI-related files:

```bash
npm run genkit:watch
```

### Environment Variables

This project requires certain environment variables to be set up for full functionality, particularly for AI services and maps.

1.  Create a `.env` file in the root of the project.
2.  Add the necessary environment variables. The Firebase configuration is currently hardcoded in `src/lib/firebase.ts` for simplicity, but you will need the following for AI and external services:

    *   **Google AI / Genkit Configuration:**
        ```
        GOOGLE_API_KEY=your_google_ai_api_key
        ```
        *(Required for all generative AI features, including text, images, and enrichments.)*

    *   **Google Maps Configuration:**
        ```
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
        ```
        *(Required for the map display component. Get this from the Google Cloud Console.)*
    
    *   **NewsAPI Configuration (Optional):**
        ```
        NEWS_API_KEY=your_newsapi_org_key
        ```
        *(Optional. Used by an AI tool to fetch current news headlines. Get a key from newsapi.org.)*


**Important:** Do not commit your `.env` file to version control. Ensure it is listed in your `.gitignore` file.

## Style Guidelines

The visual style of Aujourd'hui RPG is designed to be calm, immersive, and modern, using a customizable theme via CSS variables in `src/app/globals.css`.

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

## License

This project does not currently have a license. Consider adding an open-source license such as MIT to define how others can use and contribute to the project.
