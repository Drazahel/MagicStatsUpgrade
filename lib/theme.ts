export const THEME_IDS = ['parchemin', 'nuit', 'forge'] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME_ID: ThemeId = 'parchemin';

export type AppColors = {
  screen: string;
  header: string;
  frame: string;
  card: string;
  gold: string;
  cream: string;
  ink: string;
  parchment: string;
  parchmentBorder: string;
  success: string;
  error: string;
  fallback: string;
  swatch: string;
};

export const THEME_LABELS: Record<ThemeId, string> = {
  parchemin: 'Parchemin',
  nuit: 'Nuit',
  forge: 'Forge',
};

export const THEMES: Record<ThemeId, AppColors> = {
  parchemin: {
    screen: '#0F1A14',
    header: '#1A140C',
    frame: '#1A140C',
    card: '#1A2A22',
    gold: '#C4A35A',
    cream: '#E8D9B8',
    ink: '#1A140C',
    parchment: '#E8D9B8',
    parchmentBorder: '#8A7340',
    success: '#8FCB8F',
    error: '#E07070',
    fallback: '#1A140C',
    swatch: '#C4A35A',
  },
  nuit: {
    screen: '#0A0814',
    header: '#120F1C',
    frame: '#161221',
    card: '#1C1830',
    gold: '#B8A4F0',
    cream: '#EDE6FF',
    ink: '#120E1C',
    parchment: '#DDD6F0',
    parchmentBorder: '#6E6490',
    success: '#8FCB8F',
    error: '#E07070',
    fallback: '#120E1C',
    swatch: '#B8A4F0',
  },
  forge: {
    screen: '#12100E',
    header: '#1C1612',
    frame: '#1A1410',
    card: '#241C16',
    gold: '#D4894A',
    cream: '#F0E2D0',
    ink: '#1A1008',
    parchment: '#F3E4D4',
    parchmentBorder: '#8A6240',
    success: '#7EC8A0',
    error: '#E07070',
    fallback: '#1A1008',
    swatch: '#D4894A',
  },
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

export function fill(color: string): { lightColor: string; darkColor: string } {
  return { lightColor: color, darkColor: color };
}
