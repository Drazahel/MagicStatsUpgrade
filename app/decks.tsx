import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { useAppTheme } from '@/components/AppTheme';
import { CommanderImage } from '@/components/CommanderImage';
import { ColorIdentityPips } from '@/components/ManaPip';
import { Text, View } from '@/components/Themed';
import { loadDb } from '@/lib/db';
import { addDeck, DeckError, deleteDeck, fillMissingColorIdentities, updateDeck } from '@/lib/decks';
import { type DeckRecord, type PlayerRecord } from '@/lib/export-format';
import { searchCommanders, ScryfallError, type CommanderHit } from '@/lib/scryfall';
import { fill } from '@/lib/theme';

type PendingDelete = {
  id: number;
  name: string;
};

function playerName(players: PlayerRecord[], playerId: number): string {
  return players.find((player) => player.id === playerId)?.name ?? 'Joueur inconnu';
}

function byCommander(a: DeckRecord, b: DeckRecord): number {
  return a.commanderName.localeCompare(b.commanderName, 'fr', { sensitivity: 'base' });
}

export default function DecksScreen() {
  const { colors } = useAppTheme();
  const styles = useStyles();
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [decks, setDecks] = useState<DeckRecord[]>([]);
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<CommanderHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [noResultFor, setNoResultFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<CommanderHit | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
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
    setPlayers([...stored.players].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
    setDecks([...stored.decks].sort(byCommander));
    if (stored.decks.some((deck) => deck.colorIdentity === null)) {
      const filled = await fillMissingColorIdentities();
      setDecks([...filled].sort(byCommander));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || selected?.name === trimmed) {
      setHits([]);
      setSearching(false);
      setNoResultFor(null);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      void searchCommanders(trimmed)
        .then((results) => {
          if (!cancelled) {
            setHits(results);
            setNoResultFor(results.length === 0 ? trimmed : null);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setHits([]);
            setNoResultFor(null);
            setError(
              err instanceof ScryfallError
                ? err.message
                : 'Impossible de contacter Scryfall.'
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setSearching(false);
          }
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, selected]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setSelected(null);
    setQuery('');
    setHits([]);
    setNoResultFor(null);
    setPendingDelete(null);
  }, []);

  const onPickCommander = useCallback((hit: CommanderHit) => {
    setSelected(hit);
    setQuery(hit.name);
    setHits([]);
    setError(null);
  }, []);

  const onSave = useCallback(async () => {
    if (ownerId === null || !selected) {
      setError('Choisis un joueur et un commander.');
      return;
    }
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const payload = {
        commanderName: selected.name,
        commanderImageUrl: selected.imageUrl,
        colorIdentity: selected.colorIdentity,
        playerId: ownerId,
      };
      if (editingId === null) {
        const created = await addDeck(payload);
        showSuccess(`${created.commanderName} a été ajouté.`);
      } else {
        const updated = await updateDeck(editingId, payload);
        showSuccess(`${updated.commanderName} a été mis à jour.`);
      }
      resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof DeckError ? err.message : 'Impossible d’enregistrer ce deck.');
    } finally {
      setBusy(false);
    }
  }, [editingId, ownerId, refresh, resetForm, selected, showSuccess]);

  const onStartEdit = useCallback((deck: DeckRecord) => {
    setPendingDelete(null);
    setError(null);
    setEditingId(deck.id);
    setOwnerId(deck.playerId);
    setSelected({
      name: deck.commanderName,
      imageUrl: deck.commanderImageUrl,
      colorIdentity: deck.colorIdentity ?? [],
    });
    setQuery(deck.commanderName);
    setHits([]);
  }, []);

  const onConfirmDelete = useCallback(async () => {
    if (!pendingDelete) {
      return;
    }
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await deleteDeck(pendingDelete.id);
      showSuccess(`${pendingDelete.name} a été supprimé.`);
      setPendingDelete(null);
      if (editingId === pendingDelete.id) {
        resetForm();
      }
      await refresh();
    } catch (err) {
      setError(err instanceof DeckError ? err.message : 'Impossible de supprimer ce deck.');
    } finally {
      setBusy(false);
    }
  }, [editingId, pendingDelete, refresh, resetForm, showSuccess]);

  const visibleDecks =
    ownerId === null ? decks : decks.filter((deck) => deck.playerId === ownerId);

  return (
    <View style={styles.screen} {...fill(colors.screen)}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>Commanders</Text>
        <Text style={styles.summary}>
          {visibleDecks.length} deck{visibleDecks.length === 1 ? '' : 's'}
        </Text>

        {players.length === 0 ? (
          <Text style={styles.empty}>Ajoute d’abord un joueur pour créer un deck.</Text>
        ) : (
          <View style={styles.form} lightColor="transparent" darkColor="transparent">
            <Text style={styles.fieldLabel}>Propriétaire</Text>
            <View style={styles.chips} lightColor="transparent" darkColor="transparent">
              {players.map((player) => {
                const active = ownerId === player.id;
                return (
                  <Pressable
                    key={player.id}
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => {
                      setOwnerId((current) => (current === player.id ? null : player.id));
                    }}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      (pressed || busy) && styles.buttonPressed,
                    ]}>
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                      {player.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Commander</Text>
            <TextInput
              accessibilityLabel="Rechercher un commander"
              autoCapitalize="words"
              autoCorrect={false}
              editable={!busy}
              onChangeText={(value) => {
                setQuery(value);
                if (selected && value.trim() !== selected.name) {
                  setSelected(null);
                }
              }}
              placeholder="Chercher sur Scryfall…"
              placeholderTextColor={colors.parchmentBorder}
              style={styles.input}
              value={query}
            />
            {searching ? <Text style={styles.hint}>Recherche…</Text> : null}
            {!searching && !selected && noResultFor === query.trim() ? (
              <Text style={styles.empty}>Aucun commander trouvé sur Scryfall.</Text>
            ) : null}
            {hits.map((hit) => (
              <Pressable
                key={hit.name}
                accessibilityRole="button"
                onPress={() => onPickCommander(hit)}
                style={({ pressed }) => [styles.hit, pressed && styles.buttonPressed]}>
                {hit.imageUrl ? (
                  <CommanderImage uri={hit.imageUrl} style={styles.hitImage} />
                ) : (
                  <View style={styles.hitImageFallback} {...fill(colors.fallback)} />
                )}
                <View style={styles.hitMeta} lightColor="transparent" darkColor="transparent">
                  <Text style={styles.hitName}>{hit.name}</Text>
                  <ColorIdentityPips colors={hit.colorIdentity} size={20} />
                </View>
              </Pressable>
            ))}

            {selected ? (
              <View style={styles.preview} {...fill(colors.card)}>
                {selected.imageUrl ? (
                  <CommanderImage uri={selected.imageUrl} style={styles.previewImage} />
                ) : null}
                <Text style={styles.playerName}>{selected.name}</Text>
                <ColorIdentityPips colors={selected.colorIdentity} size={22} />
              </View>
            ) : null}

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
                {editingId === null ? 'Ajouter' : 'Enregistrer'}
              </Text>
            </Pressable>
            {editingId !== null ? (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={resetForm}
                style={({ pressed }) => [
                  styles.buttonSecondary,
                  (pressed || busy) && styles.buttonPressed,
                ]}>
                <Text style={styles.buttonSecondaryLabel}>Annuler</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {success ? <Text style={styles.success}>{success}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {pendingDelete ? (
          <View style={styles.confirmBox} {...fill(colors.card)}>
            <Text style={styles.confirmTitle}>Supprimer {pendingDelete.name} ?</Text>
            <Text style={styles.confirmBody}>
              Cette action est définitive. Un deck déjà utilisé dans une partie ne peut pas
              être supprimé.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => {
                void onConfirmDelete();
              }}
              style={({ pressed }) => [
                styles.button,
                (pressed || busy) && styles.buttonPressed,
              ]}>
              <Text style={styles.buttonLabel}>Supprimer</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => setPendingDelete(null)}
              style={({ pressed }) => [
                styles.buttonSecondary,
                (pressed || busy) && styles.buttonPressed,
              ]}>
              <Text style={styles.buttonSecondaryLabel}>Annuler</Text>
            </Pressable>
          </View>
        ) : null}

        {ownerId !== null && visibleDecks.length === 0 ? (
          <Text style={styles.empty}>
            Il n’y a pas de commander associé à ce propriétaire.
          </Text>
        ) : null}

        {visibleDecks.map((deck) => (
          <View
            key={deck.id}
            style={styles.card}
            {...fill(colors.card)}>
            <View style={styles.deckHead} lightColor="transparent" darkColor="transparent">
              {deck.commanderImageUrl ? (
                <CommanderImage uri={deck.commanderImageUrl} style={styles.deckImage} />
              ) : (
                <View style={styles.deckImageFallback} {...fill(colors.fallback)} />
              )}
              <View style={styles.deckMeta} lightColor="transparent" darkColor="transparent">
                <Text style={styles.playerName}>{deck.commanderName}</Text>
                <ColorIdentityPips colors={deck.colorIdentity} size={18} />
                <Text style={styles.owner}>{playerName(players, deck.playerId)}</Text>
              </View>
            </View>
            <View style={styles.row} lightColor="transparent" darkColor="transparent">
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => onStartEdit(deck)}
                style={({ pressed }) => [
                  styles.buttonSecondary,
                  styles.rowButton,
                  (pressed || busy) && styles.buttonPressed,
                ]}>
                <Text style={styles.buttonSecondaryLabel}>Modifier</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => {
                  resetForm();
                  setPendingDelete({ id: deck.id, name: deck.commanderName });
                }}
                style={({ pressed }) => [
                  styles.buttonSecondary,
                  styles.rowButton,
                  (pressed || busy) && styles.buttonPressed,
                ]}>
                <Text style={styles.buttonSecondaryLabel}>Supprimer</Text>
              </Pressable>
            </View>
          </View>
        ))}
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
  form: {
    gap: 12,
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
  hint: {
    color: c.cream,
    opacity: 0.75,
    fontSize: 14,
  },
  hit: {
    alignItems: 'center',
    backgroundColor: c.card,
    borderColor: c.gold,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 10,
  },
  hitImage: {
    height: 122,
    width: 88,
  },
  hitImageFallback: {
    height: 122,
    width: 88,
  },
  hitName: {
    color: c.cream,
    fontSize: 16,
    fontWeight: '700',
  },
  hitMeta: {
    flex: 1,
    gap: 8,
  },
  preview: {
    alignItems: 'center',
    borderColor: c.gold,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  previewImage: {
    height: 220,
    width: 158,
  },
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.gold,
  },
  deckHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  deckImage: {
    height: 168,
    width: 120,
  },
  deckImageFallback: {
    height: 168,
    width: 120,
  },
  deckMeta: {
    flex: 1,
    gap: 4,
  },
  playerName: {
    color: c.cream,
    fontSize: 18,
    fontWeight: '800',
  },
  owner: {
    color: c.gold,
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    alignSelf: 'stretch',
    backgroundColor: c.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.parchmentBorder,
    color: c.ink,
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowButton: {
    flex: 1,
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
