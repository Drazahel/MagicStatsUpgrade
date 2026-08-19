import { Directory, File, Paths } from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import {
  type AppExport,
  buildExportFilename,
  snapshotForExport,
} from '@/lib/export-format';

const EXPORT_DIR_PREF = 'export-directory-uri.txt';

export class ExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportError';
  }
}

export type ExportResult = {
  filename: string;
};

function downloadOnWeb(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function isCancelled(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes('cancel') || message.includes('dismiss');
}

function toExportError(error: unknown): ExportError {
  if (error instanceof ExportError) {
    return error;
  }
  const message = error instanceof Error ? error.message.trim() : '';
  return new ExportError(
    message
      ? `Impossible d’enregistrer le fichier : ${message}`
      : 'Impossible d’enregistrer le fichier sur l’appareil.'
  );
}

function prefFile(): File {
  return new File(Paths.document, EXPORT_DIR_PREF);
}

function readSavedDirectoryUri(): string | null {
  const file = prefFile();
  if (!file.exists) {
    return null;
  }
  const uri = file.textSync().trim();
  return uri || null;
}

function saveDirectoryUri(uri: string): void {
  const file = prefFile();
  if (!file.exists) {
    file.create();
  }
  file.write(uri);
}

function jsonBaseName(filename: string): string {
  return filename.replace(/\.json$/i, '');
}

async function writeAndroidSaf(directoryUri: string, filename: string, json: string): Promise<void> {
  const fileUri = await StorageAccessFramework.createFileAsync(
    directoryUri,
    jsonBaseName(filename),
    'application/json'
  );
  await StorageAccessFramework.writeAsStringAsync(fileUri, json);
}

async function pickAndroidDirectoryUri(): Promise<string | null> {
  const downloadUri = StorageAccessFramework.getUriForDirectoryInRoot('Download');
  const result = await StorageAccessFramework.requestDirectoryPermissionsAsync(downloadUri);
  return result.granted ? result.directoryUri : null;
}

function writeIntoPickedDirectory(directory: Directory, filename: string, json: string): void {
  const created = directory.createFile(filename, 'application/json');
  created.write(json);
}

async function pickIosDirectory(): Promise<Directory | null> {
  try {
    return await Directory.pickDirectoryAsync();
  } catch (error) {
    if (isCancelled(error)) {
      return null;
    }
    throw error;
  }
}

async function downloadOnAndroid(json: string, filename: string): Promise<boolean> {
  const savedUri = readSavedDirectoryUri();
  if (savedUri) {
    try {
      await writeAndroidSaf(savedUri, filename, json);
      return true;
    } catch {
      // Permission expirée ou dossier plus accessible.
    }
  }

  const directoryUri = await pickAndroidDirectoryUri();
  if (!directoryUri) {
    return false;
  }

  await writeAndroidSaf(directoryUri, filename, json);
  saveDirectoryUri(directoryUri);
  return true;
}

async function downloadOnIos(json: string, filename: string): Promise<boolean> {
  const directory = await pickIosDirectory();
  if (!directory) {
    return false;
  }
  writeIntoPickedDirectory(directory, filename, json);
  return true;
}

export async function downloadAppExport(data: AppExport): Promise<ExportResult | null> {
  const snapshot = snapshotForExport(data);
  const json = JSON.stringify(snapshot, null, 2);
  const filename = buildExportFilename(snapshot.exportedAt);

  if (Platform.OS === 'web') {
    downloadOnWeb(json, filename);
    return { filename };
  }

  try {
    const saved =
      Platform.OS === 'android'
        ? await downloadOnAndroid(json, filename)
        : await downloadOnIos(json, filename);
    return saved ? { filename } : null;
  } catch (error) {
    if (isCancelled(error)) {
      return null;
    }
    throw toExportError(error);
  }
}
