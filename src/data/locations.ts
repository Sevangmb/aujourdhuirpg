
export const predefinedLocationsByCountry: Record<string, string[]> = {
  "France": [
    "Montmartre, Paris, France",
    "Le Quartier Latin, Paris, France",
    "Le Marais, Paris, France",
    "La Tour Eiffel, Paris, France",
    "Le Vieux-Port, Marseille, France",
    "La Place Bellecour, Lyon, France"
  ],
  "États-Unis": [
    "Times Square, New York, USA",
    "Hollywood, Los Angeles, USA",
    "The Loop, Chicago, USA",
    "French Quarter, New Orleans, USA"
  ],
  "Japon": [
    "Shibuya, Tokyo, Japon",
    "Gion, Kyoto, Japon",
    "Dōtonbori, Osaka, Japon"
  ],
  "Royaume-Uni": [
    "Westminster, London, UK",
    "The Royal Mile, Edinburgh, UK",
    "Liverpool Docks, Liverpool, UK"
  ],
  "Italie": [
    "Colisée, Rome, Italie",
    "Grand Canal, Venise, Italie",
    "Duomo, Florence, Italie"
  ]
};

export const countries = Object.keys(predefinedLocationsByCountry);
