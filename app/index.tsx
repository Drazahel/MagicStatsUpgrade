import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ManaLogo } from '@/components/ManaPip';
import { MenuCard } from '@/components/MenuCard';
import { Text, View } from '@/components/Themed';

const MENU_ITEMS = [
  {
    title: 'Statistiques',
    subtitle: 'Résultats, classements et tendances de tes parties.',
    href: '/statistiques',
    mana: 'blue',
    typeLine: 'Menu — Instant',
  },
  {
    title: 'Joueurs',
    subtitle: 'Profils et historique de chacun autour de la table.',
    href: '/joueurs',
    mana: 'white',
    typeLine: 'Menu — Creature',
  },
  {
    title: 'Decks',
    subtitle: 'Tes listes et leurs performances en tournoi comme en kitchen table.',
    href: '/decks',
    mana: 'green',
    typeLine: 'Menu — Artifact',
  },
  {
    title: 'Import/Export',
    subtitle: 'Sauvegarde et échange tes données entre appareils.',
    href: '/import-export',
    mana: 'colorless',
    typeLine: 'Menu — Sorcery',
  },
] as const;

export default function MenuScreen() {
  return (
    <View style={styles.screen} lightColor="#0F1A14" darkColor="#0F1A14">
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header} lightColor="transparent" darkColor="transparent">
            <ManaLogo size={26} />
            <Text style={styles.heading} lightColor="#E8D9B8" darkColor="#E8D9B8">
              Menu
            </Text>
            <Text style={styles.lead} lightColor="#C4A35A" darkColor="#C4A35A">
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
