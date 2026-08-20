import { Link, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/components/AppTheme';
import { ManaPip, type ManaColor } from '@/components/ManaPip';

type MenuCardProps = {
  title: string;
  href: Href;
  mana: ManaColor;
};

export function MenuCard({ title, href, mana }: MenuCardProps) {
  const { colors: c } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        frame: {
          width: '100%',
          alignSelf: 'stretch',
          backgroundColor: c.gold,
          padding: 5,
          borderRadius: 12,
        },
        pressed: {
          opacity: 0.88,
          transform: [{ scale: 0.995 }],
        },
        inner: {
          backgroundColor: c.frame,
          borderRadius: 8,
          overflow: 'hidden',
        },
        namePlate: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: c.parchment,
          margin: 8,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: c.parchmentBorder,
        },
        title: {
          flex: 1,
          flexShrink: 1,
          marginRight: 12,
          color: c.ink,
          fontSize: 24,
          fontWeight: '800',
          letterSpacing: 0.3,
        },
      }),
    [c]
  );

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        style={({ pressed }) => [styles.frame, pressed && styles.pressed]}>
        <View style={styles.inner}>
          <View style={styles.namePlate}>
            <Text style={styles.title}>{title}</Text>
            <ManaPip color={mana} size={36} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
