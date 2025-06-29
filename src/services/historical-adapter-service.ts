
import type { HistoricalPersonality, ModernIdentity } from '@/lib/types';
import { ERA_YEARS, type GameEra } from '@/lib/types';

/**
 * Service to adapt historical personality data into a modern context for the RPG.
 */

const CONTEMPORARY_YEAR = ERA_YEARS['Époque Contemporaine'].end;

/**
 * Determines the type of connection a modern character might have to a historical figure.
 * @param p The historical personality.
 * @returns A connection type string.
 */
function determineConnectionType(p: HistoricalPersonality): ModernIdentity['connectionType'] {
  const deathYear = p.death?.year;
  if (!deathYear) return 'other';

  const yearsSinceDeath = CONTEMPORARY_YEAR - deathYear;

  if (deathYear > CONTEMPORARY_YEAR) return 'contemporary'; // Still alive in our time
  if (yearsSinceDeath <= 60) return 'contemporary'; // e.g., friend, colleague, direct witness
  if (yearsSinceDeath > 60 && yearsSinceDeath <= 120) return 'descendant'; // e.g., grandchild
  if (yearsSinceDeath > 120) return 'expert'; // More likely an expert or guardian of legacy

  return 'other';
}

/**
 * Generates a plausible modern name based on the historical name.
 * @param historicalName The name of the historical figure.
 * @param connectionType The type of connection.
 * @returns A modern name string.
 */
function generateModernName(historicalName: string, connectionType: ModernIdentity['connectionType']): string {
    const nameParts = historicalName.split(' ');
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : historicalName;

    if (connectionType === 'descendant') {
        const firstNames = ["Léo", "Marie", "Jean", "Camille", "Alex", "Jules"];
        const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        return `${randomFirstName} ${lastName}-Leclerc`; // Hyphenated name suggests lineage
    }
    if (connectionType === 'expert' || connectionType === 'guardian') {
         const titles = ["Dr.", "Prof.", "M."];
         const randomTitle = titles[Math.floor(Math.random() * titles.length)];
         const firstNames = ["Didier", "Sophie", "Bernard", "Hélène"];
         const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
         const modernLastNames = ["Dubois", "Martin", "Bernard", "Petit"];
         const randomLastName = modernLastNames[Math.floor(Math.random() * modernLastNames.length)];
         return `${randomTitle} ${randomFirstName} ${randomLastName}`;
    }
    return `Alex ${lastName}`; // Default fallback
}

/**
 * Generates a plausible modern profession.
 * @param historical The historical personality.
 * @param connectionType The type of connection.
 * @returns A modern profession string.
 */
function generateModernProfession(historical: HistoricalPersonality, connectionType: ModernIdentity['connectionType']): string {
    const mainOccupation = historical.occupation?.[0] || 'figure';
    
    if (connectionType === 'descendant') {
        return `Descendant(e) et gestionnaire du patrimoine de ${historical.name}`;
    }
    if (connectionType === 'expert') {
        return `Historien(ne) spécialiste de ${historical.name} et de son époque`;
    }
    if (connectionType === 'guardian') {
        return `Conservateur/Conservatrice du musée dédié à ${historical.name}`;
    }
    return `Passionné(e) par l'histoire de ${mainOccupation}s comme ${historical.name}`;
}


/**
 * Generates an engaging greeting for the modern character.
 * @param modernName The modern character's name.
 * @param historicalName The historical figure's name.
 * @returns A greeting string.
 */
function generateGreeting(modernName: string, historicalName: string): string {
  const greetings = [
    `Bonjour, je suis ${modernName}. C'est fascinant de voir encore des gens s'intéresser à l'héritage de ${historicalName}.`,
    `Vous semblez vous intéresser à ce lieu. Il a une grande importance pour ma famille, voyez-vous... Mon nom est ${modernName}.`,
    `Pardon de vous déranger, mais j'ai remarqué votre intérêt. ${historicalName} a marqué cet endroit de son empreinte. Je m'appelle ${modernName}.`
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}


/**
 * Adapts a historical personality into a character for the RPG, considering the player's era.
 * @param historical The historical personality data from Wikipedia.
 * @param playerEra The era the player is currently in.
 * @returns A ModernIdentity object representing the character to be met.
 */
export function adaptHistoricalFigure(historical: HistoricalPersonality, playerEra: GameEra): ModernIdentity {
    const playerEraYears = ERA_YEARS[playerEra];
    const historicalBirthYear = historical.birth?.year;
    const historicalDeathYear = historical.death?.year;

    // Case 1: Player is in a historical era, and the figure might be contemporary to them.
    if (playerEra !== 'Époque Contemporaine' && historicalBirthYear && historicalDeathYear) {
        const isAlive = historicalBirthYear <= playerEraYears.end && historicalDeathYear >= playerEraYears.start;
        
        if (isAlive) {
            // Player meets the figure themselves!
            const ageInEra = Math.floor(Math.random() * (historicalDeathYear - historicalBirthYear) * 0.5 + (historicalDeathYear - historicalBirthYear) * 0.25);
            return {
                name: historical.name,
                age: Math.max(20, Math.min(80, ageInEra)), // A plausible age within the era
                profession: historical.occupation?.join(', ') || 'Figure publique',
                connectionType: 'self',
                greeting: `Bonjour, je suis ${historical.name}. Que me vaut l'honneur de votre visite en cette année de grâce ?`,
                personality: ["authentique", "historique"],
            };
        }
    }

    // Case 2: Player is in contemporary era, or the figure is not from the player's historical era.
    // Fallback to the original "modern adaptation" logic.
    const connectionType = determineConnectionType(historical);
    const modernName = generateModernName(historical.name, connectionType);
    
    // Simple age generation logic
    let age = 60;
    if (connectionType === 'descendant') age = Math.floor(Math.random() * 20) + 45; // 45-65
    if (connectionType === 'expert') age = Math.floor(Math.random() * 30) + 40; // 40-70
    if (connectionType === 'guardian') age = Math.floor(Math.random() * 25) + 35; // 35-60

    return {
        name: modernName,
        age: age,
        profession: generateModernProfession(historical, connectionType),
        connectionType: connectionType,
        greeting: generateGreeting(modernName, historical.name),
        personality: ["cultivée", "discrète", "passionnée"],
    };
}
