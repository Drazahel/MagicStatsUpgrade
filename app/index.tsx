import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/components/AppTheme';
import { ManaLogo } from '@/components/ManaPip';
import { MenuCard } from '@/components/MenuCard';
import { Text, View } from '@/components/Themed';
import { fill } from '@/lib/theme';

const MENU_ITEMS = [
  {
    title: 'Nouvelle Partie',
    href: '/nouvelle-partie',
    mana: 'red',
  },
  {
    title: 'Historique',
    href: '/historique',
    mana: 'white',
  },
  {
    title: 'Statistiques',
    href: '/statistiques',
    mana: 'blue',
  },
  {
    title: 'Joueurs',
    href: '/joueurs',
    mana: 'green',
  },
  {
    title: 'Decks',
    href: '/decks',
    mana: 'colorless',
  },
  {
    title: 'Import/Export',
    href: '/import-export',
    mana: 'black',
  },
] as const;

export default function MenuScreen() {
  const { colors } = useAppTheme();

  return (
    <View style={styles.screen} {...fill(colors.screen)}>
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header} lightColor="transparent" darkColor="transparent">
            <ManaLogo size={26} />
            <Text style={styles.heading} {...fill(colors.cream)}>
              Menu
            </Text>
            <Text style={styles.lead} {...fill(colors.gold)}>
              Choisis une section pour continuer.
            </Text>
          </View>
          <View style={styles.list} lightColor="transparent" darkColor="transparent">
            {MENU_ITEMS.map((item) => (
              <MenuCard key={item.href} {...item} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 28,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  heading: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  lead: {
    fontSize: 15,
    textAlign: 'center',
  },
  list: {
    width: '100%',
    gap: 12,
  },
});
