import { loadDb, saveDb } from '@/lib/db';
import {
  EXPORT_SCHEMA_VERSION,
  type GameRecord,
  type ParticipantRecord,
} from '@/lib/export-format';
import {
  sortColors,
  usesCommanders,
  type ColorLetter,
  type GameType,
} from '@/lib/game-types';

export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameError';
  }
}

export type GameSeat = {
  playerId: number;
  deckId: number | null;
  colors: ColorLetter[] | null;
};

export type AddGameInput = {
  gameType: GameType;
  winnerPlayerId: number;
  seats: GameSeat[];
};

export type LastTable = {
  gameType: GameType;
  seats: GameSeat[];
};

export const MIN_GAME_PLAYERS = 2;

export function todayLocal(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function nextGameId(games: GameRecord[]): number {
  return games.reduce((max, game) => Math.max(max, game.id), 0) + 1;
}

function nextParticipantId(games: GameRecord[]): number {
  let max = 0;
  for (const game of games) {
    for (const participant of game.participants) {
      max = Math.max(max, participant.id);
    }
  }
  return max + 1;
}

export function lastReplayableTable(
  games: GameRecord[],
  players: { id: number }[],
  decks: { id: number; playerId: number }[]
): LastTable | null {
  if (games.length === 0) {
    return null;
  }

  const last = [...games].sort((a, b) => a.id - b.id)[games.length - 1];
  const playerIds = new Set(players.map((player) => player.id));
  const deckById = new Map(decks.map((deck) => [deck.id, deck]));
  const seats: GameSeat[] = [];

  for (const participant of last.participants) {
    if (!playerIds.has(participant.playerId)) {
      return null;
    }
    if (usesCommanders(last.gameType)) {
      const deck = participant.deckId === null ? undefined : deckById.get(participant.deckId);
      if (!deck || deck.playerId !== participant.playerId) {
        return null;
      }
      seats.push({ playerId: participant.playerId, deckId: deck.id, colors: null });
    } else {
      if (participant.colors === null || participant.colors.length === 0) {
        return null;
      }
      seats.push({
        playerId: participant.playerId,
        deckId: null,
        colors: sortColors(participant.colors),
      });
    }
  }

  if (seats.length < MIN_GAME_PLAYERS) {
    return null;
  }
  return { gameType: last.gameType, seats };
}

export async function addGame(input: AddGameInput): Promise<GameRecord> {
  const datePlayed = todayLocal();
  const seats = input.seats;
  if (seats.length < MIN_GAME_PLAYERS) {
    throw new GameError('Une partie doit avoir au moins 2 joueurs.');
  }

  const commanderGame = usesCommanders(input.gameType);
  const playerIds = new Set<number>();
  const deckIds = new Set<number>();

  for (const seat of seats) {
    if (playerIds.has(seat.playerId)) {
      throw new GameError('Un joueur ne peut pas participer deux fois.');
    }
    playerIds.add(seat.playerId);

    if (commanderGame) {
      if (seat.deckId === null) {
        throw new GameError('Chaque joueur doit jouer un de ses decks.');
      }
      if (deckIds.has(seat.deckId)) {
        throw new GameError('Un deck ne peut pas être joué deux fois.');
      }
      deckIds.add(seat.deckId);
    } else if (seat.colors === null || seat.colors.length === 0) {
      throw new GameError('Chaque joueur doit avoir des couleurs.');
    }
  }

  if (!playerIds.has(input.winnerPlayerId)) {
    throw new GameError('Le gagnant doit être l’un des participants.');
  }

  const data = await loadDb();

  for (const seat of seats) {
    const player = data.players.find((item) => item.id === seat.playerId);
    if (!player) {
      throw new GameError('Ce joueur n’existe plus.');
    }
    if (!commanderGame) {
      continue;
    }
    const deck = data.decks.find((item) => item.id === seat.deckId);
    if (!deck) {
      throw new GameError('Ce deck n’existe plus.');
    }
    if (deck.playerId !== seat.playerId) {
      throw new GameError(`${player.name} ne peut pas jouer ce deck.`);
    }
  }

  const gameId = nextGameId(data.games);
  let participantId = nextParticipantId(data.games);
  const participants: ParticipantRecord[] = seats.map((seat) => {
    const participant: ParticipantRecord = {
      id: participantId,
      gameId,
      playerId: seat.playerId,
      deckId: commanderGame ? seat.deckId : null,
      colors: commanderGame ? null : sortColors(seat.colors ?? []),
    };
    participantId += 1;
    return participant;
  });

  const game: GameRecord = {
    id: gameId,
    datePlayed,
    winnerPlayerId: input.winnerPlayerId,
    createdAt: new Date().toISOString(),
    gameType: input.gameType,
    participants,
  };

  data.schemaVersion = Math.max(data.schemaVersion, EXPORT_SCHEMA_VERSION);
  data.games = [...data.games, game];
  await saveDb(data);
  return game;
}
