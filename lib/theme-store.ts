import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  DEFAULT_THEME_ID,
  isThemeId,
  type ThemeId,
} from '@/lib/theme';

const STORAGE_KEY = 'magicstats-theme';
const FILE_NAME = 'magicstats-theme.txt';

function nativeFile(): File {
  return new File(Paths.document, FILE_NAME);
}

export async function loadThemeId(): Promise<ThemeId> {
  try {
    if (Platform.OS === 'web') {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      return isThemeId(raw) ? raw : DEFAULT_THEME_ID;
    }

    const file = nativeFile();
    if (!file.exists) {
      return DEFAULT_THEME_ID;
    }
    const raw = (await file.text()).trim();
    return isThemeId(raw) ? raw : DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export async function saveThemeId(id: ThemeId): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(STORAGE_KEY, id);
    return;
  }

  const file = nativeFile();
  if (!file.exists) {
    file.create();
  }
  file.write(id);
}
