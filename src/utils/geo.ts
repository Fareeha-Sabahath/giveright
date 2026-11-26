import { HyderabadHubPreset } from '../types';

export const HYDERABAD_LOCATIONS: HyderabadHubPreset[] = [
  {
    label: 'Hyderabad Central (Abids)',
    area: 'Abids',
    city: 'Hyderabad',
    state: 'Telangana',
    address: 'Tilak Road, Abids, Hyderabad',
    lat: 17.385,
    lng: 78.4867,
  },
  {
    label: 'Secunderabad Station Hub',
    area: 'Secunderabad',
    city: 'Secunderabad',
    state: 'Telangana',
    address: 'RP Road, Secunderabad',
    lat: 17.4399,
    lng: 78.4983,
  },
  {
    label: 'Kukatpally Housing Board',
    area: 'Kukatpally',
    city: 'Hyderabad',
    state: 'Telangana',
    address: 'KPHB Phase 3, Kukatpally, Hyderabad',
    lat: 17.4948,
    lng: 78.3996,
  },
  {
    label: 'Ameerpet Main Road',
    area: 'Ameerpet',
    city: 'Hyderabad',
    state: 'Telangana',
    address: 'SR Nagar Cross Roads, Ameerpet, Hyderabad',
    lat: 17.4375,
    lng: 78.4483,
  },
  {
    label: 'Gachibowli Financial District',
    area: 'Gachibowli',
    city: 'Hyderabad',
    state: 'Telangana',
    address: 'ORR Service Road, Gachibowli, Hyderabad',
    lat: 17.4401,
    lng: 78.3489,
  },
  {
    label: 'Uppal Ring Road',
    area: 'Uppal',
    city: 'Hyderabad',
    state: 'Telangana',
    address: 'Survey of India Colony, Uppal, Hyderabad',
    lat: 17.4058,
    lng: 78.5591,
  },
];

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export function estimateUrbanMinutes(distanceKm: number): number {
  // Typical Hyderabad urban relief van average speed ~24 km/h + 6 min loading buffer
  return Math.max(8, Math.round((distanceKm / 24) * 60 + 6));
}

export function resolvePresetCoordinates(locationText: string): {
  lat: number;
  lng: number;
} {
  const lower = locationText.toLowerCase();
  const match = HYDERABAD_LOCATIONS.find(
    (loc) =>
      lower.includes(loc.area.toLowerCase()) ||
      lower.includes(loc.city.toLowerCase())
  );
  if (match) {
    return { lat: match.lat, lng: match.lng };
  }
  return { lat: 17.385, lng: 78.4867 };
}
