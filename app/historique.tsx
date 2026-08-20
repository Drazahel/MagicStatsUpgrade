import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { useAppTheme } from '@/components/AppTheme';
import { CommanderImage } from '@/components/CommanderImage';
import { Crown } from '@/components/Crown';
import { ColorIdentityPips } from '@/components/ManaPip';
import { Text, View } from '@/components/Themed';
import { loadDb } from '@/lib/db';
import { fillMissingColorIdentities } from '@/lib/decks';
import {
  type AppExport,
  type DeckRecord,
  type GameRecord,
  type ParticipantRecord,
  type PlayerRecord,
} from '@/lib/export-format';
import { colorIdentityName, GAME_TYPE_LABELS, usesCommanders } from '@/lib/game-types';
import { deleteGame, formatDatePlayed, GameError } from '@/lib/games';
import { STAT_FILTERS, STAT_FILTER_LABELS, type StatFilter } from '@/lib/stats';
import { fill } from '@/lib/theme';

function playerName(players: PlayerRecord[], playerId: number): string {
  return players.find((player) => player.id === playerId)?.name ?? 'Joueur inconnu';
}

function deckFor(
  decks: DeckRecord[],
  participant: ParticipantRecord
): DeckRecord | undefined {
  if (participant.deckId === null) {
    return undefined;
  }
  return decks.find((deck) => deck.id === participant.deckId);
}

function sortGames(games: GameRecord[]): GameRecord[] {
  return [...games].sort((a, b) => {
    if (a.datePlayed !== b.datePlayed) {
      return b.datePlayed.localeCompare(a.datePlayed);
    }
    return b.id - a.id;
  });
}

function FilterChips({
  filter,
  onChange,
}: {
  filter: StatFilter;
  onChange: (next: StatFilter) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.chips} lightColor="transparent" darkColor="transparent">
      {STAT_FILTERS.map((item) => {
        const active = filter === item;
        return (
          <Pressable
            key={item}
            accessibilityRole="button"
            onPress={() => onChange(item)}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
              {STAT_FILTER_LABELS[item]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ParticipantLine({
  participant,
  game,
  data,
  compact,
}: {
  participant: ParticipantRecord;
  game: GameRecord;
  data: AppExport;
  compact: boolean;
}) {
  const { colors } = useAppTheme();
  const styles = useStyles();
  const name = playerName(data.players, participant.playerId);
  const won = game.winnerPlayerId === participant.playerId;
  const deck = deckFor(data.decks, participant);
  const commander = usesCommanders(game.gameType);
  const identity = commander ? deck?.colorIdentity ?? null : participant.colors;

  return (
    <View
      style={[styles.participant, compact && styles.participantCompact]}
      lightColor="transparent"
      darkColor="transparent">
      {!compact && commander ? (
        deck?.commanderImageUrl ? (
          <CommanderImage uri={deck.commanderImageUrl} style={styles.deckImage} />
        ) : (
          <View style={styles.deckImageFallback} {...fill(colors.fallback)} />
        )
      ) : null}
      <View style={styles.participantMeta} lightColor="transparent" darkColor="transparent">
        <View style={styles.nameRow} lightColor="transparent" darkColor="transparent">
          {won ? <Crown size={compact ? 14 : 18} /> : null}
          <Text style={[styles.participantName, won && styles.winnerName]}>{name}</Text>
        </View>
        {commander ? (
          <Text style={styles.participantDetail}>{deck?.commanderName ?? 'Commander inconnu'}</Text>
        ) : (
          <Text style={styles.participantDetail}>
            {identity && identity.length > 0 ? colorIdentityName(identity) : 'Couleurs inconnues'}
          </Text>
        )}
        <ColorIdentityPips colors={identity} size={compact ? 14 : 16} />
      </View>
    </View>
  );
}

export default function HistoriqueScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useStyles();
  const [data, setData] = useState<AppExport | null>(null);
  const [filter, setFilter] = useState<StatFilter>('all');
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSuccess = useCallback((message: string) => {
    if (successTimer.current) {
      clearTimeout(successTimer.current);
    }
    setError(null);
    setSuccess(message);
    successTimer.current = setTimeout(() => {
      setSuccess(null);
      successTimer.current = null;
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (successTimer.current) {
        clearTimeout(successTimer.current);
      }
    };
  }, []);

  const refresh = useCallback(async () => {
    const stored = await loadDb();
    setData(stored);
    if (stored.decks.some((deck) => deck.colorIdentity === null)) {
      const filled = await fillMissingColorIdentities();
      setData({ ...stored, decks: filled });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const games = useMemo(() => {
    if (!data) {
      return [];
    }
    const filtered =
      filter === 'all' ? data.games : data.games.filter((game) => game.gameType === filter);
    return sortGames(filtered);
  }, [data, filter]);

  const selectedGame = useMemo(() => {
    if (selectedGameId === null || !data) {
      return null;
    }
    return data.games.find((game) => game.id === selectedGameId) ?? null;
  }, [data, selectedGameId]);

  const onConfirmDelete = useCallback(async () => {
    if (selectedGameId === null) {
      return;
    }
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await deleteGame(selectedGameId);
      setPendingDelete(false);
      setSelectedGameId(null);
      await refresh();
      showSuccess('Partie supprimée.');
    } catch (err) {
      setError(err instanceof GameError ? err.message : 'Impossible de supprimer cette partie.');
    } finally {
      setBusy(false);
    }
  }, [refresh, selectedGameId, showSuccess]);

  return (
    <View style={styles.screen} {...fill(colors.screen)}>
      <ScrollView contentContainerStyle={styles.content}>
        {selectedGame && data ? (
          <>
            <Text style={styles.kicker}>{GAME_TYPE_LABELS[selectedGame.gameType]}</Text>
            <Text style={styles.summary}>{formatDatePlayed(selectedGame.datePlayed)}</Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setPendingDelete(false);
                setSelectedGameId(null);
              }}
              style={({ pressed }) => [
                styles.buttonSecondary,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.buttonSecondaryLabel}>Retour à l’historique</Text>
            </Pressable>

            {success ? <Text style={styles.success}>{success}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {pendingDelete ? (
              <View style={styles.confirmBox} {...fill(colors.card)}>
                <Text style={styles.confirmTitle}>Supprimer cette partie ?</Text>
                <Text style={styles.confirmBody}>Cette action est définitive.</Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => {
                    void onConfirmDelete();
                  }}
                  style={({ pressed }) => [
                    styles.button,
                    (pressed || busy) && styles.pressed,
                  ]}>
                  <Text style={styles.buttonLabel}>Supprimer</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => setPendingDelete(false)}
                  style={({ pressed }) => [
                    styles.buttonSecondary,
                    (pressed || busy) && styles.pressed,
                  ]}>
                  <Text style={styles.buttonSecondaryLabel}>Annuler</Text>
                </Pressable>
              </View>
            ) : null}

            {selectedGame.winnerPlayerId === null ? (
              <Text style={styles.empty}>Aucun gagnant.</Text>
            ) : null}

            {selectedGame.participants.map((participant) => (
              <View
                key={participant.id}
                style={styles.card}
                {...fill(colors.card)}>
                <ParticipantLine
                  participant={participant}
                  game={selectedGame}
                  data={data}
                  compact={false}
                />
              </View>
            ))}

            {!pendingDelete ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => {
                    router.push(`/nouvelle-partie?gameId=${selectedGame.id}`);
                  }}
                  style={({ pressed }) => [
                    styles.button,
                    (pressed || busy) && styles.pressed,
                  ]}>
                  <Text style={styles.buttonLabel}>Modifier</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => setPendingDelete(true)}
                  style={({ pressed }) => [
                    styles.buttonSecondary,
                    (pressed || busy) && styles.pressed,
                  ]}>
                  <Text style={styles.buttonSecondaryLabel}>Supprimer</Text>
                </Pressable>
              </>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.kicker}>Parties</Text>
            <Text style={styles.summary}>
              {data
                ? `${games.length} partie${games.length === 1 ? '' : 's'}`
                : '…'}
            </Text>

            <FilterChips filter={filter} onChange={setFilter} />

            {success ? <Text style={styles.success}>{success}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {data && games.length === 0 ? (
              <Text style={styles.empty}>Aucune partie pour ce filtre.</Text>
            ) : null}

            {data
              ? games.map((game) => (
                  <Pressable
                    key={game.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Partie du ${formatDatePlayed(game.datePlayed)}`}
                    onPress={() => {
                      setPendingDelete(false);
                      setError(null);
                      setSelectedGameId(game.id);
                    }}
                    style={({ pressed }) => [pressed && styles.pressed]}>
                    <View style={styles.card} {...fill(colors.card)}>
                      <Text style={styles.cardTitle}>{formatDatePlayed(game.datePlayed)}</Text>
                      <Text style={styles.owner}>{GAME_TYPE_LABELS[game.gameType]}</Text>
                      {game.participants.map((participant) => (
                        <ParticipantLine
                          key={participant.id}
                          participant={participant}
                          game={game}
                          data={data}
                          compact
                        />
                      ))}
                    </View>
                  </Pressable>
                ))
              : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function useStyles() {
  const { colors: c } = useAppTheme();
  return useMemo(
    () =>
      StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  kicker: {
    color: c.gold,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  summary: {
    color: c.cream,
    fontSize: 20,
    fontWeight: '700',
  },
  empty: {
    color: c.cream,
    fontSize: 15,
    lineHeight: 21,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderColor: c.gold,
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: c.gold,
  },
  chipLabel: {
    color: c.gold,
    fontSize: 15,
    fontWeight: '800',
  },
  chipLabelActive: {
    color: c.ink,
  },
  pressed: {
    opacity: 0.85,
  },
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.gold,
  },
  cardTitle: {
    color: c.cream,
    fontSize: 18,
    fontWeight: '800',
  },
  owner: {
    color: c.gold,
    fontSize: 15,
    fontWeight: '600',
  },
  participant: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  participantCompact: {
    alignItems: 'flex-start',
  },
  participantMeta: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  participantName: {
    color: c.cream,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  winnerName: {
    color: c.gold,
  },
  participantDetail: {
    color: c.cream,
    fontSize: 15,
    fontWeight: '600',
  },
  deckImage: {
    height: 112,
    width: 80,
  },
  deckImageFallback: {
    height: 112,
    width: 80,
  },
  confirmBox: {
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.gold,
  },
  confirmTitle: {
    color: c.gold,
    fontSize: 16,
    fontWeight: '800',
  },
  confirmBody: {
    color: c.cream,
    fontSize: 15,
    lineHeight: 21,
  },
  button: {
    alignSelf: 'stretch',
    backgroundColor: c.gold,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonLabel: {
    color: c.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  buttonSecondary: {
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.gold,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonSecondaryLabel: {
    color: c.gold,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  success: {
    color: c.success,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  error: {
    color: c.error,
    fontSize: 15,
    lineHeight: 21,
  },
      }),
    [c]
  );
}
