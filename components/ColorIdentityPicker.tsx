import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ManaPip, type ManaColor } from '@/components/ManaPip';
import { Text, View } from '@/components/Themed';
import { useAppTheme } from '@/components/AppTheme';
import {
  COLOR_LETTERS,
  colorIdentityName,
  type ColorLetter,
} from '@/lib/game-types';

function letterToMana(letter: ColorLetter): ManaColor {
  switch (letter) {
    case 'W':
      return 'white';
    case 'U':
      return 'blue';
    case 'B':
      return 'black';
    case 'R':
      return 'red';
    case 'G':
      return 'green';
  }
}

const PIP_GAP = 8;
const PIP_CHROME = 12;

type ColorIdentityPickerProps = {
  value: ColorLetter[] | null;
  disabled?: boolean;
  onChange: (colors: ColorLetter[]) => void;
};

export function ColorIdentityPicker({ value, disabled, onChange }: ColorIdentityPickerProps) {
  const { colors } = useAppTheme();
  const selected = value ?? [];
  const [slotSize, setSlotSize] = useState(44);

  const toggleLetter = (letter: ColorLetter) => {
    if (value === null || selected.length === 0) {
      onChange([letter]);
      return;
    }
    if (selected.includes(letter)) {
      onChange(selected.filter((item) => item !== letter));
      return;
    }
    onChange([...selected, letter]);
  };

  const pipSize = Math.max(24, slotSize - PIP_CHROME);

  return (
    <View style={styles.wrap} lightColor="transparent" darkColor="transparent">
      <View
        style={styles.pips}
        lightColor="transparent"
        darkColor="transparent"
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          const next = Math.floor(
            (width - PIP_GAP * (COLOR_LETTERS.length - 1)) / COLOR_LETTERS.length
          );
          if (next > 0 && next !== slotSize) {
            setSlotSize(next);
          }
        }}>
        {COLOR_LETTERS.map((letter) => {
          const active = selected.includes(letter);
          return (
            <Pressable
              key={letter}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              disabled={disabled}
              onPress={() => toggleLetter(letter)}
              style={({ pressed }) => [
                styles.pipButton,
                {
                  width: slotSize,
                  height: slotSize,
                  borderRadius: slotSize / 2,
                  borderColor: colors.gold,
                },
                active && { backgroundColor: colors.gold },
                (pressed || disabled) && styles.pressed,
              ]}>
              <ManaPip color={letterToMana(letter)} size={pipSize} />
            </Pressable>
          );
        })}
      </View>

      {value !== null && value.length > 0 ? (
        <Text style={[styles.identity, { color: colors.gold }]}>{colorIdentityName(selected)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    gap: 10,
  },
  pips: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: PIP_GAP,
    width: '100%',
  },
  pipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  identity: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
