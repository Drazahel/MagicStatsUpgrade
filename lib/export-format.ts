export const APP_NAME = 'MagicStats' as const;
export const EXPORT_FORMAT_VERSION = 1;

export type PlayerRecord = {
  id: number;
  name: string;
  createdAt: string;
};

export type DeckRecord = {
  id: number;
  commanderName: string;
  commanderImageUrl: string | null;
  playerId: number;
  createdAt: string;
};

export type ParticipantRecord = {
  id: number;
  gameId: number;
  playerId: number;
  deckId: number;
};

export type GameRecord = {
  id: number;
  datePlayed: string;
  winnerPlayerId: number | null;
  createdAt: string;
  participants: ParticipantRecord[];
};

export type AppExport = {
  app: typeof APP_NAME;
  formatVersion: number;
  schemaVersion: number;
  exportedAt: string;
  players: PlayerRecord[];
  decks: DeckRecord[];
  games: GameRecord[];
};

export class ExportParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportParseError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new ExportParseError(`Champ invalide : ${field}.`);
  }
  return value;
}

function requireId(value: unknown, field: string): number {
  if (!isFiniteNumber(value) || !Number.isInteger(value)) {
    throw new ExportParseError(`Identifiant invalide : ${field}.`);
  }
  return value;
}

function uniqueIds(ids: number[], label: string): Set<number> {
  const set = new Set<number>();
  for (const id of ids) {
    if (set.has(id)) {
      throw new ExportParseError(`Identifiant ${label} dupliqué : ${id}.`);
    }
    set.add(id);
  }
  return set;
}

function parsePlayer(value: unknown, index: number): PlayerRecord {
  if (!isRecord(value)) {
    throw new ExportParseError(`Joueur ${index + 1} invalide.`);
  }
  return {
    id: requireId(value.id, `players[${index}].id`),
    name: requireString(value.name, `players[${index}].name`),
    createdAt: requireString(value.createdAt, `players[${index}].createdAt`),
  };
}

function parseDeck(value: unknown, index: number): DeckRecord {
  if (!isRecord(value)) {
    throw new ExportParseError(`Deck ${index + 1} invalide.`);
  }
  const image = value.commanderImageUrl;
  if (image !== null && typeof image !== 'string') {
    throw new ExportParseError(`Champ invalide : decks[${index}].commanderImageUrl.`);
  }
  return {
    id: requireId(value.id, `decks[${index}].id`),
    commanderName: requireString(value.commanderName, `decks[${index}].commanderName`),
    commanderImageUrl: image,
    playerId: requireId(value.playerId, `decks[${index}].playerId`),
    createdAt: requireString(value.createdAt, `decks[${index}].createdAt`),
  };
}

function parseParticipant(value: unknown, gameIndex: number, index: number): ParticipantRecord {
  if (!isRecord(value)) {
    throw new ExportParseError(`Participant ${index + 1} de la partie ${gameIndex + 1} invalide.`);
  }
  return {
    id: requireId(value.id, `games[${gameIndex}].participants[${index}].id`),
    gameId: requireId(value.gameId, `games[${gameIndex}].participants[${index}].gameId`),
    playerId: requireId(value.playerId, `games[${gameIndex}].participants[${index}].playerId`),
    deckId: requireId(value.deckId, `games[${gameIndex}].participants[${index}].deckId`),
  };
}

function parseGame(value: unknown, index: number): GameRecord {
  if (!isRecord(value)) {
    throw new ExportParseError(`Partie ${index + 1} invalide.`);
  }
  if (!Array.isArray(value.participants)) {
    throw new ExportParseError(`La partie ${index + 1} n’a pas de participants.`);
  }
  const winner = value.winnerPlayerId;
  if (winner !== null && (!isFiniteNumber(winner) || !Number.isInteger(winner))) {
    throw new ExportParseError(`Champ invalide : games[${index}].winnerPlayerId.`);
  }
  return {
    id: requireId(value.id, `games[${index}].id`),
    datePlayed: requireString(value.datePlayed, `games[${index}].datePlayed`),
    winnerPlayerId: winner,
    createdAt: requireString(value.createdAt, `games[${index}].createdAt`),
    participants: value.participants.map((participant, participantIndex) =>
      parseParticipant(participant, index, participantIndex)
    ),
  };
}

export function parseAppExport(raw: string): AppExport {
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ExportParseError('Le fichier n’est pas un JSON valide.');
  }

  if (!isRecord(parsed)) {
    throw new ExportParseError('Le fichier n’est pas un export MagicStats.');
  }
  if (parsed.app !== APP_NAME) {
    throw new ExportParseError('Ce fichier ne vient pas de MagicStats.');
  }
  if (parsed.formatVersion !== EXPORT_FORMAT_VERSION) {
    throw new ExportParseError('Version de format non supportée.');
  }
  if (!isFiniteNumber(parsed.schemaVersion)) {
    throw new ExportParseError('schemaVersion manquant ou invalide.');
  }
  if (!Array.isArray(parsed.players) || !Array.isArray(parsed.decks) || !Array.isArray(parsed.games)) {
    throw new ExportParseError('players, decks ou games manquant.');
  }

  const players = parsed.players.map(parsePlayer);
  const decks = parsed.decks.map(parseDeck);
  const games = parsed.games.map(parseGame);

  const playerIds = uniqueIds(
    players.map((player) => player.id),
    'joueur'
  );
  const deckIds = uniqueIds(
    decks.map((deck) => deck.id),
    'deck'
  );
  const gameIds = uniqueIds(
    games.map((game) => game.id),
    'partie'
  );

  for (const deck of decks) {
    if (!playerIds.has(deck.playerId)) {
      throw new ExportParseError(`Le deck ${deck.id} référence un joueur inconnu.`);
    }
  }

  const participantIds = new Set<number>();
  for (const game of games) {
    for (const participant of game.participants) {
      if (participantIds.has(participant.id)) {
        throw new ExportParseError(`Identifiant participant dupliqué : ${participant.id}.`);
      }
      participantIds.add(participant.id);
      if (participant.gameId !== game.id || !gameIds.has(participant.gameId)) {
        throw new ExportParseError(`Le participant ${participant.id} n’appartient pas à la partie ${game.id}.`);
      }
      if (!playerIds.has(participant.playerId)) {
        throw new ExportParseError(`Le participant ${participant.id} référence un joueur inconnu.`);
      }
      if (!deckIds.has(participant.deckId)) {
        throw new ExportParseError(`Le participant ${participant.id} référence un deck inconnu.`);
      }
    }
    if (game.winnerPlayerId !== null && !playerIds.has(game.winnerPlayerId)) {
      throw new ExportParseError(`La partie ${game.id} a un gagnant inconnu.`);
    }
  }

  return {
    app: APP_NAME,
    formatVersion: EXPORT_FORMAT_VERSION,
    schemaVersion: parsed.schemaVersion,
    exportedAt: requireString(parsed.exportedAt, 'exportedAt'),
    players,
    decks,
    games,
  };
}

export function createEmptyExport(): AppExport {
  return {
    app: APP_NAME,
    formatVersion: EXPORT_FORMAT_VERSION,
    schemaVersion: 3,
    exportedAt: '',
    players: [],
    decks: [],
    games: [],
  };
}

function byId<T extends { id: number }>(a: T, b: T): number {
  return a.id - b.id;
}

export function snapshotForExport(data: AppExport): AppExport {
  return {
    ...data,
    app: APP_NAME,
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    players: [...data.players].sort(byId),
    decks: [...data.decks].sort(byId),
    games: [...data.games].sort(byId).map((game) => ({
      ...game,
      participants: [...game.participants].sort(byId),
    })),
  };
}

export function stringifyAppExport(data: AppExport): string {
  return JSON.stringify(snapshotForExport(data), null, 2);
}

export function buildExportFilename(exportedAt: string): string {
  const date = new Date(exportedAt);
  if (Number.isNaN(date.getTime())) {
    return 'magicstats-export-unknown-date.json';
  }

  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join('-');

  return `magicstats-export-${stamp}.json`;
}
