import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { useAppTheme } from '@/components/AppTheme';
import { ColorIdentityPicker } from '@/components/ColorIdentityPicker';
import { Crown } from '@/components/Crown';
import { ColorIdentityPips } from '@/components/ManaPip';
import { Text, View } from '@/components/Themed';
import { loadDb } from '@/lib/db';
import { fillMissingColorIdentities } from '@/lib/decks';
import { type DeckRecord, type PlayerRecord } from '@/lib/export-format';
import {
  DEFAULT_GAME_TYPE,
  GAME_TYPE_LABELS,
  GAME_TYPES,
  sameColors,
  sortColors,
  usesCommanders,
  type ColorLetter,
  type GameType,
} from '@/lib/game-types';
import {
  addGame,
  formatDatePlayed,
  GameError,
  lastReplayableTable,
  MIN_GAME_PLAYERS,
  updateGame,
  type GameSeat,
  type LastTable,
} from '@/lib/games';
import { fill } from '@/lib/theme';

function byName(a: PlayerRecord, b: PlayerRecord): number {
  return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
}

function byCommander(a: DeckRecord, b: DeckRecord): number {
  return a.commanderName.localeCompare(b.commanderName, 'fr', { sensitivity: 'base' });
}

function decksFor(decks: DeckRecord[], playerId: number): DeckRecord[] {
  return decks.filter((deck) => deck.playerId === playerId).sort(byCommander);
}

function todayLabel(): string {
  const raw = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function sameTable(
  last: LastTable,
  gameType: GameType,
  selectedIds: number[],
  deckByPlayer: Record<number, number>,
  colorsByPlayer: Record<number, ColorLetter[]>
): boolean {
  if (last.gameType !== gameType || last.seats.length !== selectedIds.length) {
    return false;
  }
  return last.seats.every((seat) => {
    if (!selectedIds.includes(seat.playerId)) {
      return false;
    }
    if (usesCommanders(gameType)) {
      return deckByPlayer[seat.playerId] === seat.deckId;
    }
    const current = colorsByPlayer[seat.playerId];
    return current !== undefined && seat.colors !== null && sameColors(current, seat.colors);
  });
}

export default function NouvellePartieScreen() {
  const { colors } = useAppTheme();
  const styles = useStyles();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ gameId?: string | string[] }>();
  const rawGameId = Array.isArray(params.gameId) ? params.gameId[0] : params.gameId;
  const parsedId = rawGameId === undefined ? Number.NaN : Number(rawGameId);
  const editingId = Number.isInteger(parsedId) ? parsedId : null;
  const isEditing = editingId !== null;

  const [step, setStep] = useState<'type' | 'result'>('type');
  const [gameType, setGameType] = useState<GameType>(DEFAULT_GAME_TYPE);
  const [editDatePlayed, setEditDatePlayed] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [decks, setDecks] = useState<DeckRecord[]>([]);
  const [lastTable, setLastTable] = useState<LastTable | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deckByPlayer, setDeckByPlayer] = useState<Record<number, number>>({});
  const [colorsByPlayer, setColorsByPlayer] = useState<Record<number, ColorLetter[]>>({});
  const [winnerPlayerId, setWinnerPlayerId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const commanderMode = usesCommanders(gameType);

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
    setPlayers([...stored.players].sort(byName));
    setDecks([...stored.decks]);
    setLastTable(lastReplayableTable(stored.games, stored.players, stored.decks));
    if (stored.decks.some((deck) => deck.colorIdentity === null)) {
      const filled = await fillMissingColorIdentities();
      setDecks([...filled]);
    }

    if (editingId === null) {
      setEditDatePlayed(null);
      return;
    }

    const game = stored.games.find((item) => item.id === editingId);
    if (!game) {
      setError('Cette partie n’existe plus.');
      return;
    }

    setError(null);
    setGameType(game.gameType);
    setStep('result');
    setEditDatePlayed(game.datePlayed);
    setSelectedIds(game.participants.map((participant) => participant.playerId));
    if (usesCommanders(game.gameType)) {
      setDeckByPlayer(
        Object.fromEntries(
          game.participants
            .filter((participant) => participant.deckId !== null)
            .map((participant) => [participant.playerId, participant.deckId as number])
        )
      );
      setColorsByPlayer({});
    } else {
      setDeckByPlayer({});
      setColorsByPlayer(
        Object.fromEntries(
          game.participants
            .filter((participant) => participant.colors !== null)
            .map((participant) => [participant.playerId, participant.colors as ColorLetter[]])
        )
      );
    }
    setWinnerPlayerId(game.winnerPlayerId);
  }, [editingId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Modifier la partie' : 'Nouvelle Partie',
    });
  }, [isEditing, navigation]);

  useEffect(() => {
    const playerIds = new Set(players.map((player) => player.id));
    const validDecks = new Set(decks.map((deck) => deck.id));

    setSelectedIds((current) => current.filter((id) => playerIds.has(id)));
    setDeckByPlayer((current) => {
      const next: Record<number, number> = {};
      for (const [rawId, deckId] of Object.entries(current)) {
        const playerId = Number(rawId);
        if (!playerIds.has(playerId) || !validDecks.has(deckId)) {
          continue;
        }
        const deck = decks.find((item) => item.id === deckId);
        if (deck?.playerId === playerId) {
          next[playerId] = deckId;
        }
      }
      return next;
    });
    setColorsByPlayer((current) => {
      const next: Record<number, ColorLetter[]> = {};
      for (const [rawId, colors] of Object.entries(current)) {
        const playerId = Number(rawId);
        if (playerIds.has(playerId)) {
          next[playerId] = colors;
        }
      }
      return next;
    });
    setWinnerPlayerId((current) =>
      current !== null && playerIds.has(current) ? current : null
    );
  }, [decks, players]);

  const resetSeats = useCallback(() => {
    setSelectedIds([]);
    setDeckByPlayer({});
    setColorsByPlayer({});
    setWinnerPlayerId(null);
  }, []);

  const unseat = useCallback((playerId: number) => {
    setSelectedIds((current) => current.filter((id) => id !== playerId));
    setDeckByPlayer((current) => {
      const next = { ...current };
      delete next[playerId];
      return next;
    });
    setColorsByPlayer((current) => {
      const next = { ...current };
      delete next[playerId];
      return next;
    });
    setWinnerPlayerId((current) => (current === playerId ? null : current));
  }, []);

  const onPickDeck = useCallback(
    (player: PlayerRecord, deck: DeckRecord) => {
      const seated = selectedIds.includes(player.id);
      if (seated && deckByPlayer[player.id] === deck.id) {
        setError(null);
        unseat(player.id);
        return;
      }
      setError(null);
      if (!seated) {
        setSelectedIds((current) => [...current, player.id]);
      }
      setDeckByPlayer((current) => ({ ...current, [player.id]: deck.id }));
    },
    [deckByPlayer, selectedIds, unseat]
  );

  const onPickColors = useCallback(
    (player: PlayerRecord, colors: ColorLetter[]) => {
      setError(null);
      if (!selectedIds.includes(player.id)) {
        setSelectedIds((current) => [...current, player.id]);
      }
      setColorsByPlayer((current) => ({ ...current, [player.id]: sortColors(colors) }));
    },
    [selectedIds]
  );

  const onToggleLimitedPlayer = useCallback(
    (player: PlayerRecord) => {
      if (selectedIds.includes(player.id)) {
        setError(null);
        unseat(player.id);
        return;
      }
      setError(null);
      setSelectedIds((current) => [...current, player.id]);
    },
    [selectedIds, unseat]
  );

  const onReplayLast = useCallback(() => {
    if (!lastTable || lastTable.gameType !== gameType) {
      return;
    }
    setError(null);
    setSelectedIds(lastTable.seats.map((seat) => seat.playerId));
    if (usesCommanders(gameType)) {
      setDeckByPlayer(
        Object.fromEntries(
          lastTable.seats
            .filter((seat) => seat.deckId !== null)
            .map((seat) => [seat.playerId, seat.deckId as number])
        )
      );
      setColorsByPlayer({});
    } else {
      setDeckByPlayer({});
      setColorsByPlayer(
        Object.fromEntries(
          lastTable.seats
            .filter((seat) => seat.colors !== null)
            .map((seat) => [seat.playerId, seat.colors as ColorLetter[]])
        )
      );
    }
    setWinnerPlayerId(null);
  }, [gameType, lastTable]);

  const onSave = useCallback(async () => {
    const seats: GameSeat[] = selectedIds.map((playerId) => {
      if (commanderMode) {
        const deckId = deckByPlayer[playerId];
        return {
          playerId,
          deckId: deckId === undefined ? null : deckId,
          colors: null,
        };
      }
      const colors = colorsByPlayer[playerId];
      return {
        playerId,
        deckId: null,
        colors: colors === undefined ? null : colors,
      };
    });

    if (winnerPlayerId === null) {
      setError('Désigne le gagnant sur sa carte.');
      return;
    }

    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      if (isEditing) {
        await updateGame(editingId, {
          gameType,
          winnerPlayerId,
          seats,
        });
        router.back();
        return;
      }
      await addGame({
        gameType,
        winnerPlayerId,
        seats,
      });
      resetSeats();
      await refresh();
      showSuccess('Partie enregistrée.');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (err) {
      setError(
        err instanceof GameError
          ? err.message
          : isEditing
            ? 'Impossible de modifier cette partie.'
            : 'Impossible d’enregistrer cette partie.'
      );
    } finally {
      setBusy(false);
    }
  }, [
    colorsByPlayer,
    commanderMode,
    deckByPlayer,
    editingId,
    gameType,
    isEditing,
    refresh,
    resetSeats,
    router,
    selectedIds,
    showSuccess,
    winnerPlayerId,
  ]);

  const playable = commanderMode
    ? players.filter((player) => decksFor(decks, player.id).length > 0)
    : players;
  const seatedPlayers = playable.filter((player) => selectedIds.includes(player.id));
  const benchPlayers = playable.filter((player) => !selectedIds.includes(player.id));
  const showLastTable =
    !isEditing &&
    lastTable !== null &&
    lastTable.gameType === gameType &&
    !sameTable(lastTable, gameType, selectedIds, deckByPlayer, colorsByPlayer);

  const renderPlayerCard = (player: PlayerRecord, seated: boolean) => {
    const owned = decksFor(decks, player.id);
    const pickedDeck = deckByPlayer[player.id];
    const pickedColors = Object.prototype.hasOwnProperty.call(colorsByPlayer, player.id)
      ? colorsByPlayer[player.id]
      : null;
    const isWinner = winnerPlayerId === player.id;
    return (
      <View
        key={player.id}
        style={[styles.card, seated && styles.cardSeated]}
        {...fill(colors.card)}>
        <View style={styles.cardHead} lightColor="transparent" darkColor="transparent">
          {commanderMode ? (
            <View style={styles.playerNameRow} lightColor="transparent" darkColor="transparent">
              {isWinner ? <Crown size={18} /> : null}
              <Text style={styles.playerName}>{player.name}</Text>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => onToggleLimitedPlayer(player)}
              style={styles.playerNameHit}>
              <View style={styles.playerNameRow} lightColor="transparent" darkColor="transparent">
                {isWinner ? <Crown size={18} /> : null}
                <Text style={styles.playerName}>{player.name}</Text>
              </View>
            </Pressable>
          )}
          {seated ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isWinner }}
              disabled={busy}
              onPress={() => {
                setError(null);
                setWinnerPlayerId(player.id);
              }}
              style={({ pressed }) => [
                styles.winnerChip,
                isWinner && styles.chipActive,
                (pressed || busy) && styles.buttonPressed,
              ]}>
              <Text style={[styles.chipLabel, isWinner && styles.chipLabelActive]}>
                Gagnant
              </Text>
            </Pressable>
          ) : null}
        </View>
        {commanderMode ? (
          <View style={styles.chips} lightColor="transparent" darkColor="transparent">
            {owned.map((deck) => {
              const active = pickedDeck === deck.id;
              return (
                <Pressable
                  key={deck.id}
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => onPickDeck(player, deck)}
                  style={({ pressed }) => [
                    styles.chip,
                    styles.commanderChip,
                    active && styles.chipActive,
                    (pressed || busy) && styles.buttonPressed,
                  ]}>
                  <ColorIdentityPips colors={deck.colorIdentity} size={16} />
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                    {deck.commanderName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <ColorIdentityPicker
            disabled={busy}
            onChange={(colors) => onPickColors(player, colors)}
            value={pickedColors}
          />
        )}
        {seated ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              setError(null);
              unseat(player.id);
            }}
            style={({ pressed }) => [pressed && styles.buttonPressed]}>
            <Text style={styles.unseatLabel}>Désélectionner</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  if (step === 'type') {
    return (
      <View style={styles.screen} {...fill(colors.screen)}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.kicker}>Format</Text>
          <Text style={styles.summary}>Quel type de partie ?</Text>
          <View style={styles.chips} lightColor="transparent" darkColor="transparent">
            {GAME_TYPES.map((type) => {
              const active = gameType === type;
              return (
                <Pressable
                  key={type}
                  accessibilityRole="button"
                  onPress={() => setGameType(type)}
                  style={({ pressed }) => [
                    styles.chip,
                    active && styles.chipActive,
                    pressed && styles.buttonPressed,
                  ]}>
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                    {GAME_TYPE_LABELS[type]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setError(null);
              setSuccess(null);
              setStep('result');
            }}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonLabel}>Saisir le résultat</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen} {...fill(colors.screen)}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>{GAME_TYPE_LABELS[gameType]}</Text>
        <Text style={styles.summary}>
          {selectedIds.length} joueur{selectedIds.length === 1 ? '' : 's'} ·{' '}
          {editDatePlayed ? formatDatePlayed(editDatePlayed) : todayLabel()}
        </Text>
        {success ? (
          <View style={styles.notice} {...fill(colors.card)}>
            <Text style={styles.success}>{success}</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            resetSeats();
            setStep('type');
          }}
          style={({ pressed }) => [
            styles.buttonSecondary,
            (pressed || busy) && styles.buttonPressed,
          ]}>
          <Text style={styles.buttonSecondaryLabel}>Changer le type de partie</Text>
        </Pressable>

        {players.length === 0 ? (
          <Text style={styles.empty}>Ajoute d’abord des joueurs pour enregistrer une partie.</Text>
        ) : commanderMode && playable.length < MIN_GAME_PLAYERS ? (
          <Text style={styles.empty}>
            Il faut au moins {MIN_GAME_PLAYERS} joueurs avec un deck pour enregistrer une
            partie.
          </Text>
        ) : !commanderMode && playable.length < MIN_GAME_PLAYERS ? (
          <Text style={styles.empty}>
            Il faut au moins {MIN_GAME_PLAYERS} joueurs pour enregistrer une partie.
          </Text>
        ) : null}

        {showLastTable ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onReplayLast}
            style={({ pressed }) => [
              styles.buttonSecondary,
              (pressed || busy) && styles.buttonPressed,
            ]}>
            <Text style={styles.buttonSecondaryLabel}>Même table que la dernière fois</Text>
          </Pressable>
        ) : null}

        {seatedPlayers.length > 0 ? (
          <Text style={styles.fieldLabel}>Participants</Text>
        ) : null}
        {seatedPlayers.map((player) => renderPlayerCard(player, true))}

        {benchPlayers.length > 0 && playable.length >= MIN_GAME_PLAYERS ? (
          <Text style={styles.fieldLabel}>
            {seatedPlayers.length > 0 ? 'Autres joueurs' : 'Joueurs'}
          </Text>
        ) : null}
        {playable.length >= MIN_GAME_PLAYERS
          ? benchPlayers.map((player) => renderPlayerCard(player, false))
          : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            void onSave();
          }}
          style={({ pressed }) => [
            styles.button,
            (pressed || busy) && styles.buttonPressed,
          ]}>
          <Text style={styles.buttonLabel}>
            {isEditing ? 'Enregistrer les modifications' : 'Enregistrer la partie'}
          </Text>
        </Pressable>
        {selectedIds.length > 0 || winnerPlayerId !== null ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={resetSeats}
            style={({ pressed }) => [
              styles.buttonSecondary,
              (pressed || busy) && styles.buttonPressed,
            ]}>
            <Text style={styles.buttonSecondaryLabel}>Réinitialiser</Text>
          </Pressable>
        ) : null}
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
  notice: {
    borderColor: c.success,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldLabel: {
    color: c.gold,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
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
  commanderChip: {
    alignItems: 'center',
    gap: 6,
  },
  winnerChip: {
    borderColor: c.gold,
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.gold,
  },
  cardSeated: {
    borderWidth: 2,
  },
  cardHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  playerNameHit: {
    flex: 1,
  },
  playerNameRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  playerName: {
    color: c.cream,
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
  },
  unseatLabel: {
    color: c.gold,
    fontSize: 14,
    fontWeight: '700',
  },
  button: {
    alignSelf: 'stretch',
    backgroundColor: c.gold,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
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
    fontWeight: '700',
    textAlign: 'center',
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
