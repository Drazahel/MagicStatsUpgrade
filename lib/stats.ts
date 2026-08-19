import {
  type AppExport,
  type DeckRecord,
  type GameRecord,
  type PlayerRecord,
} from '@/lib/export-format';
import {
  GAME_TYPE_LABELS,
  GAME_TYPES,
  colorIdentityName,
  sortColors,
  usesColors,
  usesCommanders,
  type ColorLetter,
  type GameType,
} from '@/lib/game-types';

export const STAT_FILTERS = ['all', ...GAME_TYPES] as const;

export type StatFilter = (typeof STAT_FILTERS)[number];

export const STAT_FILTER_LABELS: Record<StatFilter, string> = {
  all: 'Tous',
  ...GAME_TYPE_LABELS,
};

export type RecordLine = {
  wins: number;
  losses: number;
  total: number;
  winrate: number;
};

export type PlayerStat = RecordLine & {
  playerId: number;
  name: string;
};

export type DeckStat = RecordLine & {
  deckId: number;
  playerId: number;
  commanderName: string;
  commanderImageUrl: string | null;
  colorIdentity: ColorLetter[] | null;
  ownerName: string;
};

export type ColorStat = RecordLine & {
  key: string;
  colors: ColorLetter[];
  name: string;
};

export type StatsSnapshot = {
  games: number;
  players: PlayerStat[];
  decks: DeckStat[];
  colors: ColorStat[];
};

type Tally = {
  wins: number;
  losses: number;
  total: number;
};

function emptyTally(): Tally {
  return { wins: 0, losses: 0, total: 0 };
}

function withRate(tally: Tally): RecordLine {
  return {
    ...tally,
    winrate: tally.total === 0 ? 0 : Math.round((tally.wins / tally.total) * 100),
  };
}

function bump(tally: Tally, won: boolean): void {
  tally.total += 1;
  if (won) {
    tally.wins += 1;
  } else {
    tally.losses += 1;
  }
}

function compareLines(
  a: RecordLine,
  b: RecordLine,
  nameA: string,
  nameB: string
): number {
  if (b.winrate !== a.winrate) {
    return b.winrate - a.winrate;
  }
  if (b.total !== a.total) {
    return b.total - a.total;
  }
  return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
}

function playerName(players: PlayerRecord[], playerId: number): string {
  return players.find((player) => player.id === playerId)?.name ?? 'Joueur inconnu';
}

function colorKey(colors: ColorLetter[]): string {
  return sortColors(colors).join('');
}

function relevantGames(games: GameRecord[], filter: StatFilter): GameRecord[] {
  if (filter === 'all') {
    return games;
  }
  return games.filter((game) => game.gameType === filter);
}

function commanderGamesForFilter(games: GameRecord[], filter: StatFilter): GameRecord[] {
  const commanderGames = games.filter((game) => usesCommanders(game.gameType));
  if (filter === 'kingdom' || filter === 'commander_ffa') {
    return commanderGames.filter((game) => game.gameType === filter);
  }
  return commanderGames;
}

function toDeckStats(
  tallies: Map<number, Tally>,
  data: AppExport
): DeckStat[] {
  const decksById = new Map(data.decks.map((deck) => [deck.id, deck]));
  return [...tallies.entries()]
    .map(([deckId, tally]) => {
      const deck: DeckRecord | undefined = decksById.get(deckId);
      const commanderName = deck?.commanderName ?? 'Commander inconnu';
      return {
        deckId,
        playerId: deck?.playerId ?? 0,
        commanderName,
        commanderImageUrl: deck?.commanderImageUrl ?? null,
        colorIdentity: deck?.colorIdentity ?? null,
        ownerName: deck ? playerName(data.players, deck.playerId) : 'Joueur inconnu',
        ...withRate(tally),
      };
    })
    .sort((a, b) => compareLines(a, b, a.commanderName, b.commanderName));
}

export function computeStats(data: AppExport, filter: StatFilter): StatsSnapshot {
  const games = relevantGames(data.games, filter);
  const playerTallies = new Map<number, Tally>();
  const deckTallies = new Map<number, Tally>();
  const colorTallies = new Map<string, Tally>();
  const colorByKey = new Map<string, ColorLetter[]>();

  for (const game of games) {
    for (const participant of game.participants) {
      const won = game.winnerPlayerId === participant.playerId;
      const playerTally = playerTallies.get(participant.playerId) ?? emptyTally();
      bump(playerTally, won);
      playerTallies.set(participant.playerId, playerTally);

      if (usesCommanders(game.gameType) && participant.deckId !== null) {
        const deckTally = deckTallies.get(participant.deckId) ?? emptyTally();
        bump(deckTally, won);
        deckTallies.set(participant.deckId, deckTally);
      }

      if (usesColors(game.gameType) && participant.colors && participant.colors.length > 0) {
        const key = colorKey(participant.colors);
        const colorTally = colorTallies.get(key) ?? emptyTally();
        bump(colorTally, won);
        colorTallies.set(key, colorTally);
        colorByKey.set(key, sortColors(participant.colors));
      }
    }
  }

  const players: PlayerStat[] = [...playerTallies.entries()]
    .map(([playerId, tally]) => ({
      playerId,
      name: playerName(data.players, playerId),
      ...withRate(tally),
    }))
    .sort((a, b) => compareLines(a, b, a.name, b.name));

  const decks = toDeckStats(deckTallies, data);

  const colors: ColorStat[] = [...colorTallies.entries()]
    .map(([key, tally]) => {
      const identity = colorByKey.get(key) ?? [];
      return {
        key,
        colors: identity,
        name: colorIdentityName(identity),
        ...withRate(tally),
      };
    })
    .sort((a, b) => compareLines(a, b, a.name, b.name));

  return {
    games: games.length,
    players,
    decks,
    colors,
  };
}

export function computePlayerCommanderStats(
  data: AppExport,
  playerId: number,
  filter: StatFilter
): DeckStat[] {
  const games = commanderGamesForFilter(data.games, filter);
  const deckTallies = new Map<number, Tally>();

  for (const game of games) {
    for (const participant of game.participants) {
      if (participant.playerId !== playerId || participant.deckId === null) {
        continue;
      }
      const won = game.winnerPlayerId === participant.playerId;
      const deckTally = deckTallies.get(participant.deckId) ?? emptyTally();
      bump(deckTally, won);
      deckTallies.set(participant.deckId, deckTally);
    }
  }

  return toDeckStats(deckTallies, data);
}
