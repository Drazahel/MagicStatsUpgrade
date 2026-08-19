import { loadDb, saveDb } from '@/lib/db';
import { type PlayerRecord } from '@/lib/export-format';

export class PlayerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlayerError';
  }
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, 'fr', { sensitivity: 'accent' }) === 0;
}

function nextId(players: PlayerRecord[]): number {
  return players.reduce((max, player) => Math.max(max, player.id), 0) + 1;
}

function assertUniqueName(players: PlayerRecord[], name: string, exceptId?: number): void {
  const taken = players.some(
    (player) => player.id !== exceptId && sameName(player.name, name)
  );
  if (taken) {
    throw new PlayerError('Un joueur porte déjà ce nom.');
  }
}

function playerInUse(playerId: number, decks: { playerId: number }[], games: {
  winnerPlayerId: number | null;
  participants: { playerId: number }[];
}[]): boolean {
  if (decks.some((deck) => deck.playerId === playerId)) {
    return true;
  }
  return games.some(
    (game) =>
      game.winnerPlayerId === playerId ||
      game.participants.some((participant) => participant.playerId === playerId)
  );
}

export async function addPlayer(rawName: string): Promise<PlayerRecord> {
  const name = normalizeName(rawName);
  if (!name) {
    throw new PlayerError('Le nom du joueur est obligatoire.');
  }

  const data = await loadDb();
  assertUniqueName(data.players, name);

  const player: PlayerRecord = {
    id: nextId(data.players),
    name,
    createdAt: new Date().toISOString(),
  };
  data.players = [...data.players, player];
  await saveDb(data);
  return player;
}

export async function renamePlayer(id: number, rawName: string): Promise<PlayerRecord> {
  const name = normalizeName(rawName);
  if (!name) {
    throw new PlayerError('Le nom du joueur est obligatoire.');
  }

  const data = await loadDb();
  const index = data.players.findIndex((player) => player.id === id);
  if (index < 0) {
    throw new PlayerError('Ce joueur n’existe plus.');
  }

  assertUniqueName(data.players, name, id);
  const updated = { ...data.players[index], name };
  data.players = data.players.map((player, playerIndex) =>
    playerIndex === index ? updated : player
  );
  await saveDb(data);
  return updated;
}

export async function deletePlayer(id: number): Promise<void> {
  const data = await loadDb();
  const exists = data.players.some((player) => player.id === id);
  if (!exists) {
    throw new PlayerError('Ce joueur n’existe plus.');
  }
  if (playerInUse(id, data.decks, data.games)) {
    throw new PlayerError(
      'Impossible de supprimer ce joueur : il a déjà un deck ou une partie.'
    );
  }

  data.players = data.players.filter((player) => player.id !== id);
  await saveDb(data);
}
