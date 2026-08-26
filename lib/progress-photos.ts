import { PROGRESS_PHOTOS_KEY } from './constants';
import { fail, readJsonStorageResult, writeJsonStorage } from './browser-storage';
import type { PersistenceReadResult, PersistenceResult, ProgressPhoto, ProgressPhotoPose } from './types';
import { formatDateKey } from './workout-utils';

export function loadProgressPhotos(): ProgressPhoto[] {
  return loadProgressPhotosResult().value;
}

export function loadProgressPhotosResult(): PersistenceReadResult<ProgressPhoto[]> {
  return readJsonStorageResult(PROGRESS_PHOTOS_KEY, [], (value) => Array.isArray(value) && value.every(isProgressPhoto) ? value as ProgressPhoto[] : null);
}

export function listProgressPhotos(): ProgressPhoto[] {
  return loadProgressPhotos().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveProgressPhoto(input: {
  date?: Date;
  pose?: ProgressPhotoPose;
  imageData: string;
  note?: string;
}): PersistenceResult {
  const loaded = loadProgressPhotosResult();
  if (!loaded.success) {
    return fail(`Progress photo was not saved because existing photos could not be read: ${loaded.reason}`, loaded.error);
  }

  const now = input.date ?? new Date();
  const photo: ProgressPhoto = {
    id: crypto.randomUUID(),
    dateKey: formatDateKey(now),
    createdAt: now.toISOString(),
    pose: input.pose ?? 'front',
    imageData: input.imageData,
    note: input.note?.trim() || undefined,
  };

  return writeJsonStorage(PROGRESS_PHOTOS_KEY, [...loaded.value, photo]);
}

export function saveProgressPhotos(photos: ProgressPhoto[]): PersistenceResult {
  return writeJsonStorage(PROGRESS_PHOTOS_KEY, photos);
}

export function deleteProgressPhoto(id: string): PersistenceResult {
  const loaded = loadProgressPhotosResult();
  if (!loaded.success) {
    return fail(`Progress photo was not deleted because existing photos could not be read: ${loaded.reason}`, loaded.error);
  }
  return writeJsonStorage(PROGRESS_PHOTOS_KEY, loaded.value.filter((photo) => photo.id !== id));
}

export async function compressProgressPhotoFile(file: File): Promise<string> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(imageUrl);
    const maxLongEdge = 1600;
    const scale = Math.min(1, maxLongEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare image compression.');
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/webp', 0.82);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not read that image.'));
    image.src = src;
  });
}

function isProgressPhoto(value: unknown): value is ProgressPhoto {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.dateKey === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.imageData === 'string' &&
    (candidate.pose === 'front' || candidate.pose === 'side' || candidate.pose === 'back' || candidate.pose === 'other') &&
    (candidate.note === undefined || typeof candidate.note === 'string')
  );
}
