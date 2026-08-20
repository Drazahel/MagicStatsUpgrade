import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/components/AppTheme';
import { THEME_IDS, THEME_LABELS, THEMES } from '@/lib/theme';

export function ThemeSwitch() {
  const { themeId, colors, setThemeId } = useAppTheme();

  return (
    <View style={styles.row}>
      {THEME_IDS.map((id) => {
        const active = themeId === id;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Thème ${THEME_LABELS[id]}`}
            onPress={() => setThemeId(id)}
            style={({ pressed }) => [
              styles.dot,
              { backgroundColor: THEMES[id].swatch },
              active && [styles.dotActive, { borderColor: colors.cream }],
              pressed && styles.pressed,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dotActive: {
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.8,
  },
});
