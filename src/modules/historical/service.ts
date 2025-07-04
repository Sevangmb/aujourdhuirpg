
'use server';

import { searchWikipedia, fetchPersonDetails } from '@/data-sources/culture/wikipedia-api';
import type { HistoricalPersonality, ModernIdentity, ContactKnowledge, GameEra, AdaptedContact } from './types';
import { generateHistoricalContact } from '@/ai/flows/generate-historical-contact-flow';
import { ERA_YEARS } from '@/lib/types/era-types';

// Simple in-memory cache for this serverless function's lifecycle
const locationCache = new Map<string, any[]>();

// --- Adapter Logic (from historical-adapter-service) ---

const CONTEMPORARY_YEAR = ERA_YEARS['Époque Contemporaine'].end;

function determineConnectionType(p: HistoricalPersonality): ModernIdentity['connectionType'] {
  const deathYear = p.death?.year;
  if (!deathYear) return 'other';

  const yearsSinceDeath = CONTEMPORARY_YEAR - deathYear;

  if (deathYear > CONTEMPORARY_YEAR) return 'contemporary';
  if (yearsSinceDeath <= 60) return 'contemporary';
  if (yearsSinceDeath > 60 && yearsSinceDeath <= 120) return 'descendant';
  if (yearsSinceDeath > 120) return 'expert';

  return 'other';
}

function generateContactName(historicalName: string, connectionType: ModernIdentity['connectionType'], era: GameEra): string {
    const nameParts = historicalName.split(' ');
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : historicalName;
    
    if (era !== 'Époque Contemporaine') {
        const firstNames = ["Jean", "Guillaume", "Pierre", "Marie", "Jeanne", "Louis", "Catherine"];
        return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastName}`;
    }

    // Existing contemporary logic
    if (connectionType === 'descendant') {
        const firstNames = ["Léo", "Marie", "Jean", "Camille", "Alex", "Jules"];
        return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastName}-Leclerc`;
    }
    if (connectionType === 'expert' || connectionType === 'guardian') {
         const titles = ["Dr.", "Prof.", "M."];
         const firstNames = ["Didier", "Sophie", "Bernard", "Hélène"];
         const modernLastNames = ["Dubois", "Martin", "Bernard", "Petit"];
         return `${titles[Math.floor(Math.random() * titles.length)]} ${firstNames[Math.floor(Math.random() * firstNames.length)]} ${modernLastNames[Math.floor(Math.random() * modernLastNames.length)]}`;
    }
    return `Alex ${lastName}`;
}

function generateContactProfession(historical: HistoricalPersonality, connectionType: ModernIdentity['connectionType'], era: GameEra): string {
    const mainOccupation = historical.occupation?.[0] || 'figure';

    if (era !== 'Époque Contemporaine') {
        if (connectionType === 'descendant') return `Gardien(ne) de l'héritage de ${historical.name}`;
        if (connectionType === 'guardian') return `Chroniqueur et érudit étudiant l'oeuvre de ${historical.name}`;
        return `Artisan de la guilde des ${mainOccupation}s`;
    }
    
    // Existing contemporary logic
    if (connectionType === 'descendant') return `Descendant(e) et gestionnaire du patrimoine de ${historical.name}`;
    if (connectionType === 'expert') return `Historien(ne) spécialiste de ${historical.name} et de son époque`;
    if (connectionType === 'guardian') return `Conservateur/Conservatrice du musée dédié à ${historical.name}`;
    return `Passionné(e) par l'histoire de ${mainOccupation}s comme ${historical.name}`;
}


function generateGreeting(contactName: string, historicalName: string, era: GameEra): string {
    if (era !== 'Époque Contemporaine') {
         return `Salutations. Je suis ${contactName}. L'héritage de mon ancêtre, ${historicalName}, est encore palpable en ces lieux, n'est-ce pas ?`;
    }
  
  const greetings = [
    `Bonjour, je suis ${contactName}. C'est fascinant de voir encore des gens s'intéresser à l'héritage de ${historicalName}.`,
    `Vous semblez vous intéresser à ce lieu. Il a une grande importance pour ma famille, voyez-vous... Mon nom est ${contactName}.`,
    `Pardon de vous déranger, mais j'ai remarqué votre intérêt. ${historicalName} a marqué cet endroit de son empreinte. Je m'appelle ${contactName}.`
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}


function adaptHistoricalFigure(historical: HistoricalPersonality, playerEra: GameEra): ModernIdentity {
    const playerEraYears = ERA_YEARS[playerEra];
    const historicalBirthYear = historical.birth?.year;
    const historicalDeathYear = historical.death?.year;

    // Case 1: The historical figure is alive and a contemporary of the player's era.
    if (historicalBirthYear && historicalDeathYear && historicalBirthYear <= playerEraYears.end && historicalDeathYear >= playerEraYears.start) {
        const ageInEra = Math.floor(Math.random() * (historicalDeathYear - historicalBirthYear) * 0.5 + (historicalDeathYear - historicalBirthYear) * 0.25);
        return {
            name: historical.name,
            age: Math.max(20, Math.min(80, ageInEra)),
            profession: historical.occupation?.join(', ') || 'Figure publique',
            connectionType: 'self',
            greeting: `Bonjour, je suis ${historical.name}. Que me vaut l'honneur de votre visite en cette année de grâce ?`,
            personality: ["authentique", "historique"],
        };
    }
    
    // Case 2: The player is in the modern day, meeting a contact related to a past figure.
    if (playerEra === 'Époque Contemporaine') {
        const connectionType = determineConnectionType(historical);
        const contactName = generateContactName(historical.name, connectionType, playerEra);
        
        let age = 60;
        if (connectionType === 'descendant') age = Math.floor(Math.random() * 20) + 45;
        if (connectionType === 'expert') age = Math.floor(Math.random() * 30) + 40;
        if (connectionType === 'guardian') age = Math.floor(Math.random() * 25) + 35;

        return {
            name: contactName,
            age: age,
            profession: generateContactProfession(historical, connectionType, playerEra),
            connectionType: connectionType,
            greeting: generateGreeting(contactName, historical.name, playerEra),
            personality: ["cultivée", "discrète", "passionnée"],
        };
    }
    
    // Case 3: The player is in a historical era, and the figure is from a *previous* historical era.
    else {
        const connectionType = 'descendant';
        const contactName = generateContactName(historical.name, connectionType, playerEra);
        const contactProfession = generateContactProfession(historical, connectionType, playerEra);

        return {
            name: contactName,
            age: Math.floor(Math.random() * 30) + 25,
            profession: contactProfession,
            connectionType,
            greeting: generateGreeting(contactName, historical.name, playerEra),
            personality: ["érudit", "réservé"],
        };
    }
}


// --- Main Service Logic (from historical-contact-service) ---

/**
 * Finds historical personalities related to a specific location, adapts them, enriches them with AI,
 * and uses a cache to avoid repeated lookups.
 * @param placeName The name of the location (e.g., "Montmartre").
 * @param playerEra The era the player is in.
 * @returns A promise that resolves to an array of fully adapted and enriched historical contacts.
 */
export async function findAndAdaptHistoricalContactsForLocation(
  placeName: string,
  playerEra: GameEra
): Promise<AdaptedContact[]> {

  const cacheKey = `contacts_enriched_${placeName.toLowerCase().replace(/\s+/g, '_')}_${playerEra}`;
  if (locationCache.has(cacheKey)) {
    console.log(`Cache hit for enriched historical contacts at: ${placeName} for era ${playerEra}`);
    return locationCache.get(cacheKey)!;
  }

  console.log(`Cache miss. Searching and enriching historical contacts for: ${placeName} in era ${playerEra}`);
  
  const searchResults = await searchWikipedia(`personnalités liées à ${placeName}`, 5);
  const adaptedContacts: AdaptedContact[] = [];

  for (const personName of searchResults) {
    const details = await fetchPersonDetails(personName);

    if (details && details.birthYear) {
      const historicalPersonality: HistoricalPersonality = {
        name: details.name,
        birth: { year: details.birthYear, place: details.birthPlace },
        death: { year: details.deathYear, place: details.deathPlace },
        occupation: details.occupation,
        extract: details.extract,
        wikipediaUrl: details.url,
        thumbnail: details.thumbnail,
      };

      const modernIdentity = adaptHistoricalFigure(historicalPersonality, playerEra);

      const knowledge = await generateHistoricalContact({
          historical: historicalPersonality,
          modern: modernIdentity,
          location: placeName,
          playerEra: playerEra,
      });
      
      adaptedContacts.push({
          historical: historicalPersonality,
          modern: modernIdentity,
          knowledge: knowledge,
      });
    }
  }

  locationCache.set(cacheKey, adaptedContacts);
  setTimeout(() => locationCache.delete(cacheKey), 24 * 60 * 60 * 1000);

  return adaptedContacts;
}
