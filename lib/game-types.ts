export const GAME_TYPES = ['kingdom', 'commander_ffa', 'sealed', 'draft'] as const;

export type GameType = (typeof GAME_TYPES)[number];

export const DEFAULT_GAME_TYPE: GameType = 'commander_ffa';

export const COLOR_LETTERS = ['W', 'U', 'B', 'R', 'G'] as const;

export type ColorLetter = (typeof COLOR_LETTERS)[number];

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  kingdom: 'Kingdom',
  commander_ffa: 'Commander FFA',
  sealed: 'Scellé',
  draft: 'Draft',
};

export function isGameType(value: unknown): value is GameType {
  return typeof value === 'string' && (GAME_TYPES as readonly string[]).includes(value);
}

export function usesCommanders(type: GameType): boolean {
  return type === 'kingdom' || type === 'commander_ffa';
}

export function usesColors(type: GameType): boolean {
  return type === 'sealed' || type === 'draft';
}

export function sortColors(colors: ColorLetter[]): ColorLetter[] {
  return COLOR_LETTERS.filter((letter) => colors.includes(letter));
}

export function sameColors(a: ColorLetter[], b: ColorLetter[]): boolean {
  const left = sortColors(a).join('');
  const right = sortColors(b).join('');
  return left === right;
}

export type ColorCombo = {
  name: string;
  colors: ColorLetter[];
};

export const TWO_COLOR_COMBOS: ColorCombo[] = [
  { name: 'Azorius', colors: ['W', 'U'] },
  { name: 'Dimir', colors: ['U', 'B'] },
  { name: 'Rakdos', colors: ['B', 'R'] },
  { name: 'Gruul', colors: ['R', 'G'] },
  { name: 'Selesnya', colors: ['G', 'W'] },
  { name: 'Orzhov', colors: ['W', 'B'] },
  { name: 'Izzet', colors: ['U', 'R'] },
  { name: 'Golgari', colors: ['B', 'G'] },
  { name: 'Boros', colors: ['R', 'W'] },
  { name: 'Simic', colors: ['G', 'U'] },
];

export const THREE_COLOR_COMBOS: ColorCombo[] = [
  { name: 'Bant', colors: ['W', 'U', 'G'] },
  { name: 'Esper', colors: ['W', 'U', 'B'] },
  { name: 'Grixis', colors: ['U', 'B', 'R'] },
  { name: 'Jund', colors: ['B', 'R', 'G'] },
  { name: 'Naya', colors: ['W', 'R', 'G'] },
  { name: 'Abzan', colors: ['W', 'B', 'G'] },
  { name: 'Jeskai', colors: ['W', 'U', 'R'] },
  { name: 'Sultai', colors: ['U', 'B', 'G'] },
  { name: 'Mardu', colors: ['W', 'B', 'R'] },
  { name: 'Temur', colors: ['U', 'R', 'G'] },
];

const COMBO_NAMES = new Map<string, string>(
  [...TWO_COLOR_COMBOS, ...THREE_COLOR_COMBOS].map((combo) => [
    sortColors(combo.colors).join(''),
    combo.name,
  ])
);

const MONO_NAMES: Record<ColorLetter, string> = {
  W: 'Blanc',
  U: 'Bleu',
  B: 'Noir',
  R: 'Rouge',
  G: 'Vert',
};

export function colorIdentityName(colors: ColorLetter[]): string {
  if (colors.length === 0) {
    return 'Incolore';
  }
  if (colors.length === 1) {
    return MONO_NAMES[colors[0]];
  }
  if (colors.length === 5) {
    return 'Cinq couleurs';
  }
  return COMBO_NAMES.get(sortColors(colors).join('')) ?? sortColors(colors).join('');
}

export function isColorLetter(value: unknown): value is ColorLetter {
  return value === 'W' || value === 'U' || value === 'B' || value === 'R' || value === 'G';
}
