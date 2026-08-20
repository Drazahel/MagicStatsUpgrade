import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { useAppTheme } from '@/components/AppTheme';
import { Text, View } from '@/components/Themed';
import { loadDb, replaceAll } from '@/lib/db';
import { ExportError, downloadAppExport } from '@/lib/export-file';
import {
  type AppExport,
  ExportParseError,
  parseAppExport,
} from '@/lib/export-format';
import { fill } from '@/lib/theme';

// @refresh reset

type PendingImport = {
  raw: string;
  players: number;
  decks: number;
  games: number;
};

function stripBom(raw: string): string {
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

async function readPickedFile(uri: string, webFile?: Blob): Promise<string> {
  if (webFile) {
    return stripBom(await webFile.text());
  }

  const attempts = [
    async () => await new File(uri).text(),
    async () => await readAsStringAsync(uri),
    async () => {
      const response = await fetch(uri);
      return response.text();
    },
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const raw = await attempt();
      if (typeof raw === 'string' && raw.trim().length > 0) {
        return stripBom(raw);
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Impossible de lire ce fichier.');
}

export default function ImportExportRoute() {
  const { colors } = useAppTheme();
  const styles = useStyles();
  const [data, setData] = useState<AppExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
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
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applyImport = useCallback(async (raw: string) => {
    const parsed = parseAppExport(raw);
    await replaceAll(parsed);
    setData(parsed);
    setError(null);
  }, []);

  const onImport = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', 'application/octet-stream', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const raw = await readPickedFile(asset.uri, asset.file);
      const parsed = parseAppExport(raw);
      setPendingImport({
        raw,
        players: parsed.players.length,
        decks: parsed.decks.length,
        games: parsed.games.length,
      });
    } catch (err) {
      setError(
        err instanceof ExportParseError
          ? err.message
          : err instanceof Error
            ? `Impossible de lire ce fichier : ${err.message}`
            : 'Impossible de lire ce fichier.'
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const onConfirmImport = useCallback(async () => {
    if (!pendingImport) {
      return;
    }
    setBusy(true);
    try {
      await applyImport(pendingImport.raw);
      showSuccess(
        `Import réussi : ${pendingImport.players} joueur(s), ${pendingImport.decks} deck(s), ${pendingImport.games} partie(s).`
      );
      setPendingImport(null);
    } catch (err) {
      setError(
        err instanceof ExportParseError
          ? err.message
          : 'Impossible d’enregistrer les données importées.'
      );
    } finally {
      setBusy(false);
    }
  }, [applyImport, pendingImport, showSuccess]);

  const onExport = useCallback(async () => {
    if (!data) {
      return;
    }
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const result = await downloadAppExport(data);
      if (result) {
        showSuccess(`Export réussi : ${result.filename}`);
      }
    } catch (err) {
      setError(
        err instanceof ExportError ? err.message : 'Impossible d’exporter les données.'
      );
    } finally {
      setBusy(false);
    }
  }, [data, showSuccess]);

  const players = data?.players.length ?? 0;
  const decks = data?.decks.length ?? 0;
  const games = data?.games.length ?? 0;

  return (
    <View style={styles.screen} {...fill(colors.screen)}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>Données locales</Text>
        <Text style={styles.summary}>
          {players} joueur{players === 1 ? '' : 's'} · {decks} deck{decks === 1 ? '' : 's'} ·{' '}
          {games} partie{games === 1 ? '' : 's'}
        </Text>

        {pendingImport ? (
          <View style={styles.confirmBox} {...fill(colors.card)}>
            <Text style={styles.confirmTitle}>Remplacer les données ?</Text>
            <Text style={styles.confirmBody}>
              Ce fichier contient {pendingImport.players} joueur(s), {pendingImport.decks}{' '}
              deck(s) et {pendingImport.games} partie(s). Les données actuelles seront
              effacées.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => {
                void onConfirmImport();
              }}
              style={({ pressed }) => [
                styles.button,
                (pressed || busy) && styles.buttonPressed,
              ]}>
              <Text style={styles.buttonLabel}>Remplacer</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => setPendingImport(null)}
              style={({ pressed }) => [
                styles.buttonSecondary,
                (pressed || busy) && styles.buttonPressed,
              ]}>
              <Text style={styles.buttonSecondaryLabel}>Annuler</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => {
                void onImport();
              }}
              style={({ pressed }) => [
                styles.button,
                (pressed || busy) && styles.buttonPressed,
              ]}>
              <Text style={styles.buttonLabel}>Importer un JSON</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={busy || !data}
              onPress={() => {
                void onExport();
              }}
              style={({ pressed }) => [
                styles.buttonSecondary,
                (pressed || busy || !data) && styles.buttonPressed,
              ]}>
              <Text style={styles.buttonSecondaryLabel}>Exporter un JSON</Text>
            </Pressable>
          </>
        )}

        {success ? <Text style={styles.success}>{success}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
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
          paddingVertical: 16,
          paddingHorizontal: 20,
          alignItems: 'center',
        },
        buttonPressed: {
          opacity: 0.85,
        },
        buttonLabel: {
          color: c.ink,
          fontSize: 17,
          fontWeight: '800',
        },
        buttonSecondary: {
          alignSelf: 'stretch',
          backgroundColor: 'transparent',
          borderRadius: 12,
          borderWidth: 2,
          borderColor: c.gold,
          paddingVertical: 16,
          paddingHorizontal: 20,
          alignItems: 'center',
        },
        buttonSecondaryLabel: {
          color: c.gold,
          fontSize: 17,
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
