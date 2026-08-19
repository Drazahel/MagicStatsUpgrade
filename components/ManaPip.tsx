import { StyleSheet, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import type { FC } from 'react';

import BlackMana from '@/assets/images/svg/b.svg';
import ColorlessMana from '@/assets/images/svg/c.svg';
import GreenMana from '@/assets/images/svg/g.svg';
import RedMana from '@/assets/images/svg/r.svg';
import BlueMana from '@/assets/images/svg/u.svg';
import WhiteMana from '@/assets/images/svg/w.svg';
import { sortColors, type ColorLetter } from '@/lib/game-types';

export type ManaColor = 'white' | 'blue' | 'black' | 'red' | 'green' | 'colorless';

const ICONS: Record<ManaColor, FC<SvgProps>> = {
  white: WhiteMana,
  blue: BlueMana,
  black: BlackMana,
  red: RedMana,
  green: GreenMana,
  colorless: ColorlessMana,
};

const PIP: Record<ManaColor, { background: string; glyph: string; label: string }> = {
  white: { background: '#F8F4D8', glyph: '#1A140C', label: 'Mana blanc' },
  blue: { background: '#0E68AB', glyph: '#0A1620', label: 'Mana bleu' },
  black: { background: '#3A3530', glyph: '#0A0A0A', label: 'Mana noir' },
  red: { background: '#D3202A', glyph: '#1A0A08', label: 'Mana rouge' },
  green: { background: '#00733E', glyph: '#06180E', label: 'Mana vert' },
  colorless: { background: '#CBC2C0', glyph: '#1A140C', label: 'Mana incolore' },
};

type ManaPipProps = {
  color: ManaColor;
  size?: number;
};

export function ManaPip({ color, size = 48 }: ManaPipProps) {
  const pip = PIP[color];
  const Icon = ICONS[color];
  const iconSize = Math.round(size * 0.72);

  return (
    <View
      accessibilityLabel={pip.label}
      style={[
        styles.pip,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: pip.background,
        },
      ]}>
      <Icon width={iconSize} height={iconSize} fill={pip.glyph} />
    </View>
  );
}

export function ManaLogo({ size = 22 }: { size?: number }) {
  const colors: ManaColor[] = ['white', 'blue', 'black', 'red', 'green'];

  return (
    <View accessibilityRole="image" accessibilityLabel="Couleurs de mana" style={styles.logo}>
      {colors.map((mana) => (
        <ManaPip key={mana} color={mana} size={size} />
      ))}
    </View>
  );
}

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

export function ColorIdentityPips({
  colors,
  size = 18,
}: {
  colors: ColorLetter[] | null;
  size?: number;
}) {
  if (colors === null) {
    return null;
  }

  const pips: ManaColor[] =
    colors.length === 0 ? ['colorless'] : sortColors(colors).map(letterToMana);

  return (
    <View accessibilityRole="image" accessibilityLabel="Identité de couleur" style={styles.logo}>
      {pips.map((mana, index) => (
        <ManaPip key={`${mana}-${index}`} color={mana} size={size} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pip: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
