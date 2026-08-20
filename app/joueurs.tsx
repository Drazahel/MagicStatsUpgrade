import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

import { useAppTheme } from '@/components/AppTheme';
import { Text, View } from '@/components/Themed';
import { loadDb } from '@/lib/db';
import { type PlayerRecord } from '@/lib/export-format';
import { addPlayer, deletePlayer, PlayerError, renamePlayer } from '@/lib/players';
import { fill } from '@/lib/theme';

type PendingDelete = {
  id: number;
  name: string;
};

function byName(a: PlayerRecord, b: PlayerRecord): number {
  return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
}

export default function JoueursScreen() {
  const { colors } = useAppTheme();
  const styles = useStyles();
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [draftName, setDraftName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
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
    setPlayers([...stored.players].sort(byName));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onAdd = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const created = await addPlayer(draftName);
      setDraftName('');
      await refresh();
      showSuccess(`${created.name} a été ajouté.`);
    } catch (err) {
      setError(err instanceof PlayerError ? err.message : 'Impossible d’ajouter ce joueur.');
    } finally {
      setBusy(false);
    }
  }, [draftName, refresh, showSuccess]);

  const onStartEdit = useCallback((player: PlayerRecord) => {
    setError(null);
    setPendingDelete(null);
    setEditingId(player.id);
    setEditName(player.name);
  }, []);

  const onCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditName('');
  }, []);

  const onSaveEdit = useCallback(async () => {
    if (editingId === null) {
      return;
    }
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const updated = await renamePlayer(editingId, editName);
      setEditingId(null);
      setEditName('');
      await refresh();
      showSuccess(`${updated.name} a été mis à jour.`);
    } catch (err) {
      setError(err instanceof PlayerError ? err.message : 'Impossible de modifier ce joueur.');
    } finally {
      setBusy(false);
    }
  }, [editName, editingId, refresh, showSuccess]);

  const onConfirmDelete = useCallback(async () => {
    if (!pendingDelete) {
      return;
    }
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await deletePlayer(pendingDelete.id);
      setPendingDelete(null);
      await refresh();
      showSuccess(`${pendingDelete.name} a été supprimé.`);
    } catch (err) {
      setError(
        err instanceof PlayerError ? err.message : 'Impossible de supprimer ce joueur.'
      );
    } finally {
      setBusy(false);
    }
  }, [pendingDelete, refresh, showSuccess]);

  return (
    <View style={styles.screen} {...fill(colors.screen)}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>Autour de la table</Text>
        <Text style={styles.summary}>
          {players.length} joueur{players.length === 1 ? '' : 's'}
        </Text>

        <View style={styles.form} lightColor="transparent" darkColor="transparent">
          <TextInput
            accessibilityLabel="Nom du joueur"
            autoCapitalize="words"
            autoCorrect={false}
            editable={!busy}
            onChangeText={setDraftName}
            onSubmitEditing={() => {
              void onAdd();
            }}
            placeholder="Nom du joueur"
            placeholderTextColor={colors.parchmentBorder}
            returnKeyType="done"
            style={styles.input}
            value={draftName}
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              void onAdd();
            }}
            style={({ pressed }) => [
              styles.button,
              (pressed || busy) && styles.buttonPressed,
            ]}>
            <Text style={styles.buttonLabel}>Ajouter</Text>
          </Pressable>
        </View>

        {success ? <Text style={styles.success}>{success}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {pendingDelete ? (
          <View style={styles.confirmBox} {...fill(colors.card)}>
            <Text style={styles.confirmTitle}>Supprimer {pendingDelete.name} ?</Text>
            <Text style={styles.confirmBody}>
              Cette action est définitive. Un joueur lié à un deck ou une partie ne peut pas
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

        {players.map((player) => (
          <View
            key={player.id}
            style={styles.card}
            {...fill(colors.card)}>
            {editingId === player.id ? (
              <>
                <TextInput
                  accessibilityLabel="Nouveau nom"
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!busy}
                  onChangeText={setEditName}
                  onSubmitEditing={() => {
                    void onSaveEdit();
                  }}
                  returnKeyType="done"
                  style={styles.input}
                  value={editName}
                />
                <View style={styles.row} lightColor="transparent" darkColor="transparent">
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => {
                      void onSaveEdit();
                    }}
                    style={({ pressed }) => [
                      styles.button,
                      styles.rowButton,
                      (pressed || busy) && styles.buttonPressed,
                    ]}>
                    <Text style={styles.buttonLabel}>Enregistrer</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={onCancelEdit}
                    style={({ pressed }) => [
                      styles.buttonSecondary,
                      styles.rowButton,
                      (pressed || busy) && styles.buttonPressed,
                    ]}>
                    <Text style={styles.buttonSecondaryLabel}>Annuler</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.playerName}>{player.name}</Text>
                <View style={styles.row} lightColor="transparent" darkColor="transparent">
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => onStartEdit(player)}
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
                      setEditingId(null);
                      setPendingDelete({ id: player.id, name: player.name });
                    }}
                    style={({ pressed }) => [
                      styles.buttonSecondary,
                      styles.rowButton,
                      (pressed || busy) && styles.buttonPressed,
                    ]}>
                    <Text style={styles.buttonSecondaryLabel}>Supprimer</Text>
                  </Pressable>
                </View>
              </>
            )}
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
        form: {
          gap: 12,
        },
        card: {
          gap: 12,
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.gold,
        },
        playerName: {
          color: c.cream,
          fontSize: 20,
          fontWeight: '800',
        },
        input: {
          alignSelf: 'stretch',
          backgroundColor: c.parchment,
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
