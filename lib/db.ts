import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  type AppExport,
  createEmptyExport,
  parseAppExport,
} from '@/lib/export-format';

const STORAGE_KEY = 'magicstats-data';
const FILE_NAME = 'magicstats-data.json';

function nativeFile(): File {
  return new File(Paths.document, FILE_NAME);
}

export async function loadDb(): Promise<AppExport> {
  try {
    if (Platform.OS === 'web') {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (!raw) {
        return createEmptyExport();
      }
      return parseAppExport(raw);
    }

    const file = nativeFile();
    if (!file.exists) {
      return createEmptyExport();
    }
    return parseAppExport(await file.text());
  } catch {
    return createEmptyExport();
  }
}

export async function saveDb(data: AppExport): Promise<void> {
  const raw = JSON.stringify(data, null, 2);

  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(STORAGE_KEY, raw);
    return;
  }

  const file = nativeFile();
  if (!file.exists) {
    file.create();
  }
  file.write(raw);
}

export async function replaceAll(data: AppExport): Promise<void> {
  await saveDb(data);
}
