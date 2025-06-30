
import { fetchNearbyPoisFromOSM, type GetNearbyPoisServiceInput, type GetNearbyPoisServiceOutput } from './osm-service';

// Mock global.fetch
global.fetch = jest.fn();

const mockFetchResponse = (data: any, ok: boolean = true) => {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: ok,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)), // For error cases
  } as Response);
};

describe('fetchNearbyPoisFromOSM', () => {
  const baseInput: GetNearbyPoisServiceInput = {
    latitude: 0,
    longitude: 0,
    radius: 1000,
    limit: 5,
  };

  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    (fetch as jest.Mock).mockClear();
  });

  test('Test Case 1: POI with lat/lon (node element)', async () => {
    const mockOverpassResponse = {
      elements: [
        { id: 1, lat: 10.123, lon: -5.456, tags: { name: "Test POI 1", amenity: "restaurant" }, type: "node" },
      ],
    };
    mockFetchResponse(mockOverpassResponse);

    const result: GetNearbyPoisServiceOutput = await fetchNearbyPoisFromOSM(baseInput);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.pois).toHaveLength(1);
    const poi = result.pois[0];
    expect(poi.name).toBe("Test POI 1");
    expect(poi.lat).toBe(10.123);
    expect(poi.lon).toBe(-5.456);
    expect(poi.type).toBe("amenity");
    expect(poi.subtype).toBe("restaurant");
  });

  test('Test Case 2: POI with center.lat/center.lon (way/relation element)', async () => {
    const mockOverpassResponse = {
      elements: [
        { id: 2, center: { lat: 20.789, lon: -3.123 }, tags: { name: "Test POI 2", shop: "supermarket" }, type: "way" },
      ],
    };
    mockFetchResponse(mockOverpassResponse);

    const result: GetNearbyPoisServiceOutput = await fetchNearbyPoisFromOSM(baseInput);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.pois).toHaveLength(1);
    const poi = result.pois[0];
    expect(poi.name).toBe("Test POI 2");
    expect(poi.lat).toBe(20.789);
    expect(poi.lon).toBe(-3.123);
    expect(poi.type).toBe("shop");
    expect(poi.subtype).toBe("supermarket");
  });

  test('Test Case 3: POI without explicit coordinates', async () => {
    const mockOverpassResponse = {
      elements: [
        { id: 3, tags: { name: "Test POI 3", tourism: "museum" }, type: "node" },
      ],
    };
    mockFetchResponse(mockOverpassResponse);

    const result: GetNearbyPoisServiceOutput = await fetchNearbyPoisFromOSM(baseInput);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.pois).toHaveLength(1);
    const poi = result.pois[0];
    expect(poi.name).toBe("Test POI 3");
    expect(poi.lat).toBeUndefined();
    expect(poi.lon).toBeUndefined();
    expect(poi.type).toBe("tourism");
    expect(poi.subtype).toBe("museum");
  });

  test('Test Case 4: Mixed POIs, filtering, and unnamed POI', async () => {
    const mockOverpassResponse = {
      elements: [
        { id: 1, lat: 10.123, lon: -5.456, tags: { name: "Test POI 1", amenity: "restaurant" }, type: "node" },
        { id: 2, center: { lat: 20.789, lon: -3.123 }, tags: { name: "Test POI 2", shop: "supermarket" }, type: "way" },
        { id: 3, tags: { name: "Test POI 3", tourism: "museum" }, type: "node" }, // No coords
        { id: 4, lat: 30.0, lon: -4.0, tags: { amenity: "bench" }, type: "node" }, // Unnamed, but typed
        { id: 5, lat: 40.0, lon: -2.0, tags: { name: "Too Many" } , type: "node"}, // Named, simple type (will be 'unknown' if not amenity/shop/etc)
      ],
    };
    mockFetchResponse(mockOverpassResponse);

    const inputWithLimit: GetNearbyPoisServiceInput = { ...baseInput, limit: 3 };
    const result: GetNearbyPoisServiceOutput = await fetchNearbyPoisFromOSM(inputWithLimit);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.pois).toHaveLength(3); // Limited to 3

    // The sorting in osm-service is: named first, then by type.
    // Test POI 1 (named, amenity)
    // Test POI 2 (named, shop)
    // Test POI 3 (named, tourism)
    // Too Many (named, unknown type)
    // Unnamed POI (unnamed, amenity)

    // Expected order after sort and limit: Test POI 1, Test POI 2, Test POI 3
    const poi1 = result.pois.find(p => p.name === "Test POI 1");
    expect(poi1).toBeDefined();
    expect(poi1?.lat).toBe(10.123);
    expect(poi1?.lon).toBe(-5.456);

    const poi2 = result.pois.find(p => p.name === "Test POI 2");
    expect(poi2).toBeDefined();
    expect(poi2?.lat).toBe(20.789);
    expect(poi2?.lon).toBe(-3.123);

    const poi3 = result.pois.find(p => p.name === "Test POI 3");
    expect(poi3).toBeDefined();
    expect(poi3?.lat).toBeUndefined();
    expect(poi3?.lon).toBeUndefined();

    // Check that the unnamed POI is NOT in the first 3 due to sorting (name first)
    const unnamedPoi = result.pois.find(p => p.id === 4); // Assuming id is not part of OverpassPoiInternal for now
    expect(unnamedPoi).toBeUndefined(); // It shouldn't be in the top 3 due to sorting

    // Check that "Too Many" is also not in the top 3
     const tooManyPoi = result.pois.find(p => p.name === "Too Many");
     expect(tooManyPoi).toBeUndefined();
  });

  test('Should return empty array and message if API fails', async () => {
    mockFetchResponse({ error: "API error" }, false);
    const result = await fetchNearbyPoisFromOSM(baseInput);
    expect(result.pois).toEqual([]);
    expect(result.message).toContain("Failed to fetch POIs from Overpass API");
  });

  test('Should return empty array and message if no elements found', async () => {
    mockFetchResponse({ elements: [] });
    const result = await fetchNearbyPoisFromOSM(baseInput);
    expect(result.pois).toEqual([]);
    expect(result.message).toContain(`No POIs of type "any" found within ${baseInput.radius}m.`);
  });

  test('Should handle POI type mapping correctly for subtype', async () => {
    const mockOverpassResponse = {
      elements: [
        { id: 1, lat: 10.123, lon: -5.456, tags: { name: "Fancy Restaurant", amenity: "restaurant", cuisine: "french" }, type: "node" },
      ],
    };
    mockFetchResponse(mockOverpassResponse);
    const result = await fetchNearbyPoisFromOSM(baseInput);
    expect(result.pois[0].type).toBe("amenity");
    // The current logic in osm-service.ts is:
    // if(element.tags.amenity) { type = 'amenity'; subtype = element.tags.amenity; }
    // ...
    // else if (element.tags.cuisine) { subtype = element.tags.cuisine + (subtype ? ` ${subtype}` : ''); }
    // This means if amenity is present, cuisine won't be appended to subtype in the current code.
    // The test should reflect this. If cuisine were to be primary or appended, the code would need change.
    expect(result.pois[0].subtype).toBe("restaurant");
    // If we wanted "french restaurant" or "french", the logic in osm-service.ts needs adjustment.
    // For now, this test confirms current behavior.
  });

});
