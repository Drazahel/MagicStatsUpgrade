import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ManaPip, type ManaColor } from '@/components/ManaPip';

type MenuCardProps = {
  title: string;
  subtitle: string;
  href: Href;
  mana: ManaColor;
  typeLine: string;
};

export function MenuCard({ title, subtitle, href, mana, typeLine }: MenuCardProps) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${subtitle}`}
        style={({ pressed }) => [styles.frame, pressed && styles.pressed]}>
        <View style={styles.inner}>
          <View style={styles.namePlate}>
            <Text style={styles.title}>{title}</Text>
            <ManaPip color={mana} size={36} />
          </View>
          <View style={styles.typeLine}>
            <Text style={styles.typeText}>{typeLine}</Text>
          </View>
          <View style={styles.textBox}>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const GOLD = '#C4A35A';
const FRAME = '#1A140C';
const CREAM = '#E8D9B8';
const INK = '#1A140C';

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: GOLD,
    padding: 5,
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },
  inner: {
    backgroundColor: FRAME,
    borderRadius: 8,
    overflow: 'hidden',
  },
  namePlate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CREAM,
    margin: 8,
    marginBottom: 0,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8A7340',
  },
  title: {
    flex: 1,
    flexShrink: 1,
    marginRight: 12,
    color: INK,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  typeLine: {
    backgroundColor: CREAM,
    marginHorizontal: 8,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#8A7340',
  },
  typeText: {
    color: INK,
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  textBox: {
    backgroundColor: '#E4D6B0',
    margin: 8,
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#8A7340',
  },
  subtitle: {
    color: INK,
    fontSize: 15,
    lineHeight: 21,
  },
});
