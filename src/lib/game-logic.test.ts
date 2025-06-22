
import {
  fetchPoisForCurrentLocation,
  checkForLocationBasedEvents,
  calculateDeterministicEffects,
  type GameAction,
} from './game-logic';
import type { Position, GameState, Player, GameNotification } from './types';
import { fetchNearbyPoisFromOSM } from '@/services/osm-service'; // To be mocked
import { getMasterItemById } from '@/data/items';

// Mocking @/services/osm-service
jest.mock('@/services/osm-service', () => ({
  fetchNearbyPoisFromOSM: jest.fn(),
}));

// Define a simplified structure for OverpassPoiInternal for mock return values
// This matches the structure expected by fetchPoisForCurrentLocation after osm-service processing
type MockOverpassPoiInternal = {
  name?: string;
  type: string;
  subtype?: string;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
};

describe('fetchPoisForCurrentLocation', () => {
  const mockPlayerLocation: Position = {
    latitude: 1,
    longitude: 1,
    name: "Player's Current Spot",
  };

  beforeEach(() => {
    // Clear mock calls before each test
    (fetchNearbyPoisFromOSM as jest.Mock).mockClear();
  });

  test('Test Case 1: POI with valid lat/lon', async () => {
    const mockPois: MockOverpassPoiInternal[] = [
      { name: "Park Alpha", type: "leisure", subtype: "park", lat: 10, lon: 20, tags: { description: "A nice park" } },
    ];
    (fetchNearbyPoisFromOSM as jest.Mock).mockResolvedValueOnce({ pois: mockPois });

    const result = await fetchPoisForCurrentLocation(mockPlayerLocation);

    expect(fetchNearbyPoisFromOSM).toHaveBeenCalledWith({
      latitude: mockPlayerLocation.latitude,
      longitude: mockPlayerLocation.longitude,
      radius: 500, // Default radius
      limit: 10,   // Default limit
    });
    expect(result).toHaveLength(1);
    const poi = result![0];
    expect(poi.name).toBe("Park Alpha");
    expect(poi.latitude).toBe(10);
    expect(poi.longitude).toBe(20);
    expect(poi.summary).toBe("A nice park"); // Description from tags becomes summary
    expect(poi.zone?.name).toBe("park"); // Subtype or type becomes zone name
  });

  test('Test Case 2: POI with missing lat/lon (fallback to player location)', async () => {
    const mockPois: MockOverpassPoiInternal[] = [
      { name: "Cafe Beta", type: "amenity", subtype: "cafe", tags: { amenity: "cafe" } }, // No lat/lon
    ];
    (fetchNearbyPoisFromOSM as jest.Mock).mockResolvedValueOnce({ pois: mockPois });

    const playerLocationForFallback: Position = { latitude: 5, longitude: 5, name: "Player Spot" };
    const result = await fetchPoisForCurrentLocation(playerLocationForFallback);

    expect(result).toHaveLength(1);
    const poi = result![0];
    expect(poi.name).toBe("Cafe Beta");
    expect(poi.latitude).toBe(5); // Fallback to player's location
    expect(poi.longitude).toBe(5); // Fallback to player's location
    expect(poi.zone?.name).toBe("cafe");
  });

  test('Test Case 3: Service returns empty array', async () => {
    (fetchNearbyPoisFromOSM as jest.Mock).mockResolvedValueOnce({ pois: [] });
    const result = await fetchPoisForCurrentLocation(mockPlayerLocation);
    expect(result).toEqual([]);
  });

  test('Test Case 4: Service returns null (simulating error in service call, not a throw)', async () => {
    // fetchNearbyPoisFromOSM in osm-service.ts returns { pois: [], message: "..." } on error, not null.
    // If it were to return null, the current fetchPoisForCurrentLocation would error.
    // Let's test the actual error return type of fetchNearbyPoisFromOSM (empty pois and a message)
    (fetchNearbyPoisFromOSM as jest.Mock).mockResolvedValueOnce({ pois: [], message: "Service error" });
    const result = await fetchPoisForCurrentLocation(mockPlayerLocation);
    // Based on current logic: if poisFromService.message is set and pois.length is 0, it returns []
    expect(result).toEqual([]);
  });

   test('Test Case 4b: Service throws an error', async () => {
    (fetchNearbyPoisFromOSM as jest.Mock).mockRejectedValueOnce(new Error("Network failure"));
    const result = await fetchPoisForCurrentLocation(mockPlayerLocation);
    expect(result).toBeNull(); // As per current error handling (catch block returns null)
  });


  test('Test Case 5: Filtering POI identical to player location', async () => {
    const identicalPois: MockOverpassPoiInternal[] = [
      { name: "Player's Current Spot", type: "place", lat: 1, lon: 1, tags: {} },
    ];
    (fetchNearbyPoisFromOSM as jest.Mock).mockResolvedValueOnce({ pois: identicalPois });
    const result = await fetchPoisForCurrentLocation(mockPlayerLocation);
    // The filter !(poi.latitude === playerLocation.latitude && poi.longitude === playerLocation.longitude)
    // unless poisFromService.pois.length === 1.
    // So if it's the *only* POI, it should be returned.
    expect(result).toHaveLength(1);
    // To make it filter, there must be other POIs or the name must also match and we decide to filter by name too.
    // The current filter is purely coordinate based.
    // Let's adjust the test to reflect the "only POI" rule.

    // If there are multiple POIs, and one matches, it should be filtered.
     const multiplePois: MockOverpassPoiInternal[] = [
      { name: "Player's Current Spot", type: "place", lat: 1, lon: 1, tags: {} },
      { name: "Another Spot", type: "place", lat: 2, lon: 2, tags: {} },
    ];
    (fetchNearbyPoisFromOSM as jest.Mock).mockResolvedValueOnce({ pois: multiplePois });
    const resultMulti = await fetchPoisForCurrentLocation(mockPlayerLocation);
    expect(resultMulti).toHaveLength(1);
    expect(resultMulti![0].name).toBe("Another Spot");

  });

  test('Test Case 6: Mix of valid, fallback, and filtered POIs', async () => {
    const mixedPois: MockOverpassPoiInternal[] = [
      { name: "Library", type: "amenity", subtype: "library", lat: 12, lon: 22, tags: { amenity: "library" } },
      { name: "Player Home", type: "building", lat: 30, lon: 40, tags: {} }, // This will be filtered
      { name: "Mysterious Shop", type: "shop", subtype: "magic", tags: { shop: "magic" } }, // No lat/lon
    ];
    const playerAtHomeLocation: Position = { latitude: 30, longitude: 40, name: "Player Home" };
    (fetchNearbyPoisFromOSM as jest.Mock).mockResolvedValueOnce({ pois: mixedPois });

    const result = await fetchPoisForCurrentLocation(playerAtHomeLocation);

    expect(result).toHaveLength(2);

    const library = result!.find(p => p.name === "Library");
    expect(library).toBeDefined();
    expect(library?.latitude).toBe(12);
    expect(library?.longitude).toBe(22);
    expect(library?.zone?.name).toBe("library");

    const shop = result!.find(p => p.name === "Mysterious Shop");
    expect(shop).toBeDefined();
    expect(shop?.latitude).toBe(30); // Fallback to player's location
    expect(shop?.longitude).toBe(40); // Fallback to player's location
    expect(shop?.zone?.name).toBe("magic");

    const filteredHome = result!.find(p => p.name === "Player Home");
    expect(filteredHome).toBeUndefined();
  });

  test('Should return null if playerLocation is invalid', async () => {
    // @ts-expect-error Testing invalid input
    const result = await fetchPoisForCurrentLocation(null);
    expect(result).toBeNull();
  });

  test('Should use default radius and limit if not provided in playerLocation (though not directly used by fetchPoisForCurrentLocation)', async () => {
    // This test is more about ensuring the call to fetchNearbyPoisFromOSM is correct
    const mockPois: MockOverpassPoiInternal[] = [
      { name: "Park Alpha", type: "park", lat: 10, lon: 20, tags: {}}
    ];
    (fetchNearbyPoisFromOSM as jest.Mock).mockResolvedValueOnce({ pois: mockPois });
    await fetchPoisForCurrentLocation(mockPlayerLocation); // mockPlayerLocation doesn't have radius/limit
    expect(fetchNearbyPoisFromOSM).toHaveBeenCalledWith(expect.objectContaining({
        radius: 500, // Default from osm-service if not specified, but fetchPoisForCurrentLocation specifies it
        limit: 10,   // Default from osm-service, but fetchPoisForCurrentLocation specifies it
    }));
  });
});


describe('checkForLocationBasedEvents', () => {
  const mockGameState: GameState = {
    player: {
      uid: 'test-uid',
      name: 'Test Player',
      // ... other player fields minimally mocked as needed by function (likely none for current examples)
      currentLocation: { latitude: 0, longitude: 0, name: "Initial Spot" }, // Example initial location
      // Add other required Player properties with default/mock values
      gender: "Unknown",
      age: 25,
      avatarUrl: "",
      origin: "",
      background: "",
      stats: { Sante: 100, Charisme: 50, Intelligence: 50, Force: 50, Energie: 100, Stress: 10, Volonte: 50, Reputation: 0 },
      skills: {},
      traitsMentalStates: [],
      progression: { level: 1, xp: 0, xpToNextLevel: 100, perks: [] },
      alignment: { chaosLawful: 0, goodEvil: 0 },
      money: 0,
      inventory: [],
      toneSettings: { Horreur: 50, Romance: 50, Humour: 50, Mystère: 50, Action: 50 },
      questLog: [],
      encounteredPNJs: [],
      decisionLog: [],
      clues: [],
      documents: [],
      investigationNotes: "",
    },
    currentScenario: null,
    nearbyPois: null,
    gameTimeInMinutes: 0,
    journal: [],
    toneSettings: { Horreur: 50, Romance: 50, Humour: 50, Mystère: 50, Action: 50 },
  };

  test('Test Case 1: Entering "Forbidden Sector"', () => {
    const newLocation: Position = { latitude: 0, longitude: 0, name: "Some Place", zone: { name: "Forbidden Sector" } };
    const actions = checkForLocationBasedEvents(newLocation, mockGameState);
    expect(actions).not.toHaveLength(0);
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'ADD_JOURNAL_ENTRY',
          payload: {
            type: 'event',
            text: `Vous sentez un frisson vous parcourir l'échine en entrant dans le Forbidden Sector. Quelque chose ne va pas ici.`,
          },
        }),
      ])
    );
  });

  test('Test Case 2: Reaching "Old Observatory"', () => {
    const newLocation: Position = { latitude: 1, longitude: 1, name: "Old Observatory" };
    const actions = checkForLocationBasedEvents(newLocation, mockGameState);
    expect(actions).not.toHaveLength(0);
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'SET_CURRENT_SCENARIO',
          payload: {
            scenarioText: `<p>Vous êtes arrivé à l'Ancien Observatoire. La porte est entrouverte et une faible lumière filtre de l'intérieur.</p>`,
          },
        }),
      ])
    );
  });

  test('Test Case 3: Both conditions met (Old Observatory in Forbidden Sector)', () => {
    const newLocation: Position = { latitude: 2, longitude: 2, name: "Old Observatory", zone: { name: "Forbidden Sector" } };
    const actions = checkForLocationBasedEvents(newLocation, mockGameState);
    expect(actions).toHaveLength(2);
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'ADD_JOURNAL_ENTRY',
          payload: {
            type: 'event',
            text: `Vous sentez un frisson vous parcourir l'échine en entrant dans le Forbidden Sector. Quelque chose ne va pas ici.`,
          },
        }),
        expect.objectContaining({
          type: 'SET_CURRENT_SCENARIO',
          payload: {
            scenarioText: `<p>Vous êtes arrivé à l'Ancien Observatoire. La porte est entrouverte et une faible lumière filtre de l'intérieur.</p>`,
          },
        }),
      ])
    );
  });

  test('Test Case 4: No specific event conditions met', () => {
    const newLocation: Position = { latitude: 3, longitude: 3, name: "Safe House", zone: { name: "Residential Area" } };
    const actions = checkForLocationBasedEvents(newLocation, mockGameState);
    expect(actions).toHaveLength(0);
  });
});

describe('calculateDeterministicEffects', () => {
  const energyBar = getMasterItemById('energy_bar_01');

  if (!energyBar) {
    throw new Error('Test setup failed: energy_bar_01 not found in master items.');
  }

  const mockPlayer: Player = {
    uid: 'test-user',
    name: 'Test',
    gender: 'Test',
    age: 25,
    avatarUrl: '',
    origin: '',
    background: '',
    stats: {
      Sante: 50,
      Charisme: 50,
      Intelligence: 50,
      Force: 50,
      Energie: 50,
      Stress: 10,
      Volonte: 50,
      Reputation: 0,
    },
    skills: {},
    traitsMentalStates: [],
    progression: { level: 1, xp: 0, xpToNextLevel: 100, perks: [] },
    alignment: { chaosLawful: 0, goodEvil: 0 },
    inventory: [{ ...energyBar, quantity: 2 }],
    money: 50,
    currentLocation: { latitude: 0, longitude: 0, name: 'Test Location' },
    toneSettings: {},
    questLog: [],
    encounteredPNJs: [],
    decisionLog: [],
    clues: [],
    documents: [],
    investigationNotes: '',
  };

  test('should correctly apply effects when using a consumable item', async () => {
    const actionText = 'Utiliser Barre énergétique';
    const { updatedPlayer, notifications, eventsForAI } = await calculateDeterministicEffects(
      mockPlayer,
      actionText
    );

    // Check stats
    expect(updatedPlayer.stats.Sante).toBe(60); // 50 + 10 from energy bar

    // Check inventory
    expect(updatedPlayer.inventory.length).toBe(1);
    expect(updatedPlayer.inventory[0].quantity).toBe(1);

    // Check notifications
    expect(notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'item_removed',
          title: 'Objet Utilisé',
          description: 'Vous avez utilisé : Barre énergétique.',
        }),
        expect.objectContaining({
          type: 'stat_changed',
          title: 'Statistique modifiée',
          description: 'Sante a changé de +10.',
        }),
      ])
    );
    expect(notifications.length).toBe(2);

    // Check AI events
    expect(eventsForAI).toEqual([
      "Le joueur a utilisé 'Barre énergétique'.",
      "Effet : Sante a changé de 10.",
    ]);
  });
  
  test('should return no changes if item is not in inventory', async () => {
    const playerWithNoItems = { ...mockPlayer, inventory: [] };
    const actionText = "Utiliser Potion"; // An item the player doesn't have
    
    const { updatedPlayer, notifications, eventsForAI } = await calculateDeterministicEffects(
      playerWithNoItems,
      actionText
    );
    
    expect(updatedPlayer).toEqual(playerWithNoItems); // Player state should be unchanged
    expect(notifications.length).toBe(1);
    expect(notifications[0]).toEqual({
        type: 'warning',
        title: 'Action impossible',
        description: `Vous n'avez pas d'objet nommé 'Potion'.`
    });
    expect(eventsForAI.length).toBe(0);
  });
});
