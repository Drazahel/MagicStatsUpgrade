import { Platform } from 'react-native';

const SCRYFALL_API = 'https://api.scryfall.com';
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 5;
const MIN_INTERVAL_MS = 120;

export class ScryfallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScryfallError';
  }
}

export type CommanderHit = {
  name: string;
  imageUrl: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function imageFromCard(card: Record<string, unknown>): string | null {
  const uris = card.image_uris;
  if (isRecord(uris) && typeof uris.normal === 'string') {
    return uris.normal;
  }

  const faces = card.card_faces;
  if (Array.isArray(faces) && isRecord(faces[0])) {
    const faceUris = faces[0].image_uris;
    if (isRecord(faceUris) && typeof faceUris.normal === 'string') {
      return faceUris.normal;
    }
  }

  return null;
}

let lastRequestAt = 0;

async function waitForRateLimit(): Promise<void> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();
}

async function scryfallGet(path: string): Promise<unknown> {
  await waitForRateLimit();

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (Platform.OS !== 'web') {
    headers['User-Agent'] = 'MagicStatsUpgrade/1.0';
  }

  const response = await fetch(`${SCRYFALL_API}${path}`, { headers });
  const json: unknown = await response.json().catch(() => null);

  if (response.status === 404) {
    return { object: 'error', code: 'not_found' };
  }
  if (!response.ok) {
    throw new ScryfallError('Recherche Scryfall impossible pour le moment.');
  }
  return json;
}

export async function searchCommanders(query: string): Promise<CommanderHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return [];
  }

  const params = new URLSearchParams({
    q: `is:commander ${trimmed}`,
    unique: 'cards',
    order: 'name',
  });
  const json = await scryfallGet(`/cards/search?${params.toString()}`);
  if (!isRecord(json) || !Array.isArray(json.data)) {
    return [];
  }

  return json.data.slice(0, MAX_RESULTS).flatMap((card) => {
    if (!isRecord(card) || typeof card.name !== 'string') {
      return [];
    }
    return [
      {
        name: card.name,
        imageUrl: imageFromCard(card),
      },
    ];
  });
}
