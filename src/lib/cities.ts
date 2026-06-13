// Lightweight city → coordinates lookup so the map view works without geocoding.
// Coords are normalised x/y in [0,1] for our SVG world (equirectangular).
export type CityPreset = { name: string; lat: number; lng: number };

export const CITY_PRESETS: CityPreset[] = [
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "New York", lat: 40.7128, lng: -74.006 },
  { name: "San Francisco", lat: 37.7749, lng: -122.4194 },
  { name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
  { name: "Berlin", lat: 52.52, lng: 13.405 },
  { name: "Madrid", lat: 40.4168, lng: -3.7038 },
  { name: "Barcelona", lat: 41.3851, lng: 2.1734 },
  { name: "Amsterdam", lat: 52.3676, lng: 4.9041 },
  { name: "Lisbon", lat: 38.7223, lng: -9.1393 },
  { name: "Rome", lat: 41.9028, lng: 12.4964 },
  { name: "Milan", lat: 45.4642, lng: 9.19 },
  { name: "Zurich", lat: 47.3769, lng: 8.5417 },
  { name: "Dublin", lat: 53.3498, lng: -6.2603 },
  { name: "Stockholm", lat: 59.3293, lng: 18.0686 },
  { name: "Copenhagen", lat: 55.6761, lng: 12.5683 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "Singapore", lat: 1.3521, lng: 103.8198 },
  { name: "Hong Kong", lat: 22.3193, lng: 114.1694 },
  { name: "Seoul", lat: 37.5665, lng: 126.978 },
  { name: "Sydney", lat: -33.8688, lng: 151.2093 },
  { name: "Melbourne", lat: -37.8136, lng: 144.9631 },
  { name: "Dubai", lat: 25.2048, lng: 55.2708 },
  { name: "Mexico City", lat: 19.4326, lng: -99.1332 },
  { name: "São Paulo", lat: -23.5505, lng: -46.6333 },
  { name: "Buenos Aires", lat: -34.6037, lng: -58.3816 },
  { name: "Cape Town", lat: -33.9249, lng: 18.4241 },
  { name: "Toronto", lat: 43.6532, lng: -79.3832 },
  { name: "Montreal", lat: 45.5017, lng: -73.5673 },
  { name: "Chicago", lat: 41.8781, lng: -87.6298 },
  { name: "Boston", lat: 42.3601, lng: -71.0589 },
  { name: "Austin", lat: 30.2672, lng: -97.7431 },
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "Bangalore", lat: 12.9716, lng: 77.5946 },
  { name: "Bangkok", lat: 13.7563, lng: 100.5018 },
  { name: "Bali", lat: -8.4095, lng: 115.1889 },
  { name: "Athens", lat: 37.9838, lng: 23.7275 },
  { name: "Vienna", lat: 48.2082, lng: 16.3738 },
  { name: "Prague", lat: 50.0755, lng: 14.4378 },
  { name: "Warsaw", lat: 52.2297, lng: 21.0122 },
];

export function findCityPreset(city: string | null | undefined): CityPreset | null {
  if (!city) return null;
  const k = city.trim().toLowerCase();
  return CITY_PRESETS.find((c) => c.name.toLowerCase() === k) ?? null;
}

export function projectLatLng(lat: number, lng: number): { x: number; y: number } {
  // Equirectangular projection into [0,1]x[0,1]
  const x = (lng + 180) / 360;
  const y = (90 - lat) / 180;
  return { x, y };
}
