import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { CommanderImage } from '@/components/CommanderImage';
import { ColorIdentityPips } from '@/components/ManaPip';
import { Text, View } from '@/components/Themed';
import { loadDb } from '@/lib/db';
import { fillMissingColorIdentities } from '@/lib/decks';
import { type AppExport } from '@/lib/export-format';
import {
  STAT_FILTERS,
  STAT_FILTER_LABELS,
  computePlayerCommanderStats,
  computeStats,
  type ColorStat,
  type DeckStat,
  type PlayerStat,
  type RecordLine,
  type StatFilter,
} from '@/lib/stats';

const CREAM = '#E8D9B8';
const GOLD = '#C4A35A';
const INK = '#1A140C';

function formatWinrate(value: number): string {
  return `${value} %`;
}

function StatFigures({ line }: { line: RecordLine }) {
  return (
    <View style={styles.figures} lightColor="transparent" darkColor="transparent">
      <Text style={styles.figure}>
        <Text style={styles.figureLabel}>W </Text>
        {line.wins}
      </Text>
      <Text style={styles.figure}>
        <Text style={styles.figureLabel}>L </Text>
        {line.losses}
      </Text>
      <Text style={styles.figure}>
        <Text style={styles.figureLabel}>Total </Text>
        {line.total}
      </Text>
      <Text style={styles.winrate}>{formatWinrate(line.winrate)}</Text>
    </View>
  );
}

function PlayerCard({
  stat,
  onPress,
}: {
  stat: PlayerStat;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Voir les commanders de ${stat.name}`}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <View style={styles.card} lightColor="#1A2A22" darkColor="#1A2A22">
        <Text style={styles.cardTitle}>{stat.name}</Text>
        <StatFigures line={stat} />
      </View>
    </Pressable>
  );
}

function DeckCard({
  stat,
  showOwner = true,
}: {
  stat: DeckStat;
  showOwner?: boolean;
}) {
  return (
    <View style={styles.card} lightColor="#1A2A22" darkColor="#1A2A22">
      <View style={styles.deckHead} lightColor="transparent" darkColor="transparent">
        {stat.commanderImageUrl ? (
          <CommanderImage uri={stat.commanderImageUrl} style={styles.deckImage} />
        ) : (
          <View style={styles.deckImageFallback} lightColor="#1A140C" darkColor="#1A140C" />
        )}
        <View style={styles.deckMeta} lightColor="transparent" darkColor="transparent">
          <Text style={styles.cardTitle}>{stat.commanderName}</Text>
          <ColorIdentityPips colors={stat.colorIdentity} size={16} />
          {showOwner ? <Text style={styles.owner}>{stat.ownerName}</Text> : null}
        </View>
      </View>
      <StatFigures line={stat} />
    </View>
  );
}

function ColorCard({ stat }: { stat: ColorStat }) {
  return (
    <View style={styles.card} lightColor="#1A2A22" darkColor="#1A2A22">
      <ColorIdentityPips colors={stat.colors} size={22} />
      <Text style={styles.cardTitle}>{stat.name}</Text>
      <StatFigures line={stat} />
    </View>
  );
}

function FilterChips({
  filter,
  onChange,
}: {
  filter: StatFilter;
  onChange: (next: StatFilter) => void;
}) {
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

export default function StatistiquesScreen() {
  const [data, setData] = useState<AppExport | null>(null);
  const [filter, setFilter] = useState<StatFilter>('all');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

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

  const stats = useMemo(
    () => (data ? computeStats(data, filter) : null),
    [data, filter]
  );

  const selectedPlayer = useMemo(() => {
    if (selectedPlayerId === null || !data) {
      return null;
    }
    return (
      stats?.players.find((player) => player.playerId === selectedPlayerId) ?? {
        playerId: selectedPlayerId,
        name: data.players.find((player) => player.id === selectedPlayerId)?.name ?? 'Joueur inconnu',
        wins: 0,
        losses: 0,
        total: 0,
        winrate: 0,
      }
    );
  }, [data, selectedPlayerId, stats]);

  const playerCommanders = useMemo(() => {
    if (!data || selectedPlayerId === null) {
      return [];
    }
    return computePlayerCommanderStats(data, selectedPlayerId, filter);
  }, [data, filter, selectedPlayerId]);

  return (
    <View style={styles.screen} lightColor="#0F1A14" darkColor="#0F1A14">
      <ScrollView contentContainerStyle={styles.content}>
        {selectedPlayer ? (
          <>
            <Text style={styles.kicker}>Joueur</Text>
            <View style={styles.card} lightColor="#1A2A22" darkColor="#1A2A22">
              <Text style={styles.cardTitle}>{selectedPlayer.name}</Text>
              {selectedPlayer.total > 0 ? <StatFigures line={selectedPlayer} /> : null}
            </View>

            <FilterChips filter={filter} onChange={setFilter} />

            <Pressable
              accessibilityRole="button"
              onPress={() => setSelectedPlayerId(null)}
              style={({ pressed }) => [
                styles.buttonSecondary,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.buttonSecondaryLabel}>Retour au classement</Text>
            </Pressable>

            <Text style={styles.fieldLabel}>Commanders</Text>
            {playerCommanders.length === 0 ? (
              <Text style={styles.empty}>Aucun commander pour ce filtre.</Text>
            ) : (
              playerCommanders.map((stat) => (
                <DeckCard key={stat.deckId} stat={stat} showOwner={false} />
              ))
            )}
          </>
        ) : (
          <>
            <Text style={styles.kicker}>Classements</Text>
            <Text style={styles.summary}>
              {stats ? `${stats.games} partie${stats.games === 1 ? '' : 's'}` : '…'}
            </Text>

            <FilterChips filter={filter} onChange={setFilter} />

            {stats && stats.games === 0 ? (
              <Text style={styles.empty}>Aucune partie pour ce filtre.</Text>
            ) : null}

            {stats && stats.players.length > 0 ? (
              <>
                <Text style={styles.fieldLabel}>Joueurs</Text>
                {stats.players.map((stat) => (
                  <PlayerCard
                    key={stat.playerId}
                    stat={stat}
                    onPress={() => setSelectedPlayerId(stat.playerId)}
                  />
                ))}
              </>
            ) : null}

            {stats && stats.decks.length > 0 ? (
              <>
                <Text style={styles.fieldLabel}>Commanders</Text>
                {stats.decks.map((stat) => (
                  <DeckCard key={stat.deckId} stat={stat} />
                ))}
              </>
            ) : null}

            {stats && stats.colors.length > 0 ? (
              <>
                <Text style={styles.fieldLabel}>Couleurs</Text>
                {stats.colors.map((stat) => (
                  <ColorCard key={stat.key} stat={stat} />
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  kicker: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  summary: {
    color: CREAM,
    fontSize: 20,
    fontWeight: '700',
  },
  empty: {
    color: CREAM,
    fontSize: 15,
    lineHeight: 21,
  },
  fieldLabel: {
    color: GOLD,
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
    borderColor: GOLD,
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: GOLD,
  },
  chipLabel: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '800',
  },
  chipLabelActive: {
    color: INK,
  },
  pressed: {
    opacity: 0.85,
  },
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GOLD,
  },
  cardTitle: {
    color: CREAM,
    fontSize: 18,
    fontWeight: '800',
  },
  owner: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '600',
  },
  deckHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  deckImage: {
    height: 112,
    width: 80,
  },
  deckImageFallback: {
    height: 112,
    width: 80,
  },
  deckMeta: {
    flex: 1,
    gap: 6,
  },
  figures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  figure: {
    color: CREAM,
    fontSize: 15,
    fontWeight: '700',
  },
  figureLabel: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '800',
  },
  winrate: {
    color: GOLD,
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 'auto',
  },
  buttonSecondary: {
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: GOLD,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonSecondaryLabel: {
    color: GOLD,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
});
