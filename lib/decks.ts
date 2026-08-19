import { loadDb, saveDb } from '@/lib/db';
import { type DeckRecord } from '@/lib/export-format';
import { sortColors, type ColorLetter } from '@/lib/game-types';
import { fetchCommanderByName } from '@/lib/scryfall';

export class DeckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeckError';
  }
}

export type DeckInput = {
  commanderName: string;
  commanderImageUrl: string | null;
  colorIdentity: ColorLetter[];
  playerId: number;
};

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, 'fr', { sensitivity: 'accent' }) === 0;
}

function nextId(decks: DeckRecord[]): number {
  return decks.reduce((max, deck) => Math.max(max, deck.id), 0) + 1;
}

function assertPlayerExists(playerId: number, players: { id: number }[]): void {
  if (!players.some((player) => player.id === playerId)) {
    throw new DeckError('Choisis un joueur pour ce deck.');
  }
}

function assertUniqueCommander(
  decks: DeckRecord[],
  playerId: number,
  commanderName: string,
  exceptId?: number
): void {
  const taken = decks.some(
    (deck) =>
      deck.id !== exceptId &&
      deck.playerId === playerId &&
      sameName(deck.commanderName, commanderName)
  );
  if (taken) {
    throw new DeckError('Ce joueur a déjà un deck avec ce commander.');
  }
}

function deckInUse(
  deckId: number,
  games: { participants: { deckId: number | null }[] }[]
): boolean {
  return games.some((game) =>
    game.participants.some((participant) => participant.deckId === deckId)
  );
}

export async function addDeck(input: DeckInput): Promise<DeckRecord> {
  const commanderName = normalizeName(input.commanderName);
  if (!commanderName) {
    throw new DeckError('Choisis un commander.');
  }

  const data = await loadDb();
  assertPlayerExists(input.playerId, data.players);
  assertUniqueCommander(data.decks, input.playerId, commanderName);

  const deck: DeckRecord = {
    id: nextId(data.decks),
    commanderName,
    commanderImageUrl: input.commanderImageUrl,
    colorIdentity: sortColors(input.colorIdentity),
    playerId: input.playerId,
    createdAt: new Date().toISOString(),
  };
  data.decks = [...data.decks, deck];
  await saveDb(data);
  return deck;
}

export async function updateDeck(id: number, input: DeckInput): Promise<DeckRecord> {
  const commanderName = normalizeName(input.commanderName);
  if (!commanderName) {
    throw new DeckError('Choisis un commander.');
  }

  const data = await loadDb();
  const index = data.decks.findIndex((deck) => deck.id === id);
  if (index < 0) {
    throw new DeckError('Ce deck n’existe plus.');
  }

  assertPlayerExists(input.playerId, data.players);
  assertUniqueCommander(data.decks, input.playerId, commanderName, id);

  const updated: DeckRecord = {
    ...data.decks[index],
    commanderName,
    commanderImageUrl: input.commanderImageUrl,
    colorIdentity: sortColors(input.colorIdentity),
    playerId: input.playerId,
  };
  data.decks = data.decks.map((deck, deckIndex) => (deckIndex === index ? updated : deck));
  await saveDb(data);
  return updated;
}

export async function deleteDeck(id: number): Promise<void> {
  const data = await loadDb();
  const exists = data.decks.some((deck) => deck.id === id);
  if (!exists) {
    throw new DeckError('Ce deck n’existe plus.');
  }
  if (deckInUse(id, data.games)) {
    throw new DeckError('Impossible de supprimer ce deck : il a déjà une partie.');
  }

  data.decks = data.decks.filter((deck) => deck.id !== id);
  await saveDb(data);
}

export async function fillMissingColorIdentities(): Promise<DeckRecord[]> {
  const data = await loadDb();
  let changed = false;
  const decks: DeckRecord[] = [];

  for (const deck of data.decks) {
    if (deck.colorIdentity !== null) {
      decks.push(deck);
      continue;
    }
    try {
      const hit = await fetchCommanderByName(deck.commanderName);
      if (hit) {
        changed = true;
        decks.push({ ...deck, colorIdentity: hit.colorIdentity });
        continue;
      }
    } catch {
      // Keep the deck unchanged if Scryfall is unreachable.
    }
    decks.push(deck);
  }

  if (changed) {
    data.decks = decks;
    await saveDb(data);
  }
  return decks;
}
