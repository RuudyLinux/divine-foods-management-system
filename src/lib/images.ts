/**
 * Image intake for the pictures users attach to records (product photos, the
 * company logo).
 *
 * Images are stored inline as data URLs in the local database, so they are
 * downscaled and re-encoded before storage: a phone photo is several megabytes
 * and browser storage runs out at around 5 MB for the entire database.
 */

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

/** Rejected before decoding, to avoid loading a huge file into memory. */
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

/** Above this, the encoded result is refused rather than silently filling storage. */
const MAX_STORED_BYTES = 900 * 1024;

export interface ImageIntakeOptions {
  /** Longest edge of the stored image, in pixels. */
  maxEdge?: number;
  /** Keeps transparency when true; otherwise the image is flattened onto white. */
  preserveTransparency?: boolean;
}

export interface ImageIntakeResult {
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read that file. Please try another image.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That file could not be opened as an image.'));
    img.src = dataUrl;
  });
}

/** Rough byte size of a data URL payload. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return 0;
  const payload = dataUrl.slice(comma + 1);
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/**
 * Validates, downscales and encodes a picked file for storage.
 * Throws an Error with a message suitable for showing to the user.
 */
export async function prepareImageForStorage(
  file: File,
  options: ImageIntakeOptions = {}
): Promise<ImageIntakeResult> {
  const { maxEdge = 800, preserveTransparency = false } = options;

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Please choose a PNG, JPG, WEBP or SVG image.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error(`That image is ${formatBytes(file.size)}. Please choose one under 12 MB.`);
  }

  const sourceDataUrl = await readFileAsDataUrl(file);

  // SVG is already small and resolution independent, so it is stored as-is.
  if (file.type === 'image/svg+xml') {
    const bytes = dataUrlBytes(sourceDataUrl);
    if (bytes > MAX_STORED_BYTES) {
      throw new Error(`That image is too large to store (${formatBytes(bytes)}).`);
    }
    return { dataUrl: sourceDataUrl, width: 0, height: 0, bytes };
  }

  const img = await loadImage(sourceDataUrl);
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser could not process the image.');

  const keepAlpha = preserveTransparency && file.type === 'image/png';
  if (!keepAlpha) {
    // JPEG has no alpha; without this, transparent areas turn black.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);

  let dataUrl = keepAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85);

  // A large transparent PNG can still be heavy; step the quality down before
  // refusing it outright.
  if (dataUrlBytes(dataUrl) > MAX_STORED_BYTES && keepAlpha) {
    dataUrl = canvas.toDataURL('image/png');
  }
  if (dataUrlBytes(dataUrl) > MAX_STORED_BYTES) {
    dataUrl = canvas.toDataURL('image/jpeg', 0.7);
  }

  const bytes = dataUrlBytes(dataUrl);
  if (bytes > MAX_STORED_BYTES) {
    throw new Error(
      `That image is still ${formatBytes(bytes)} after resizing. Please choose a smaller one.`
    );
  }

  return { dataUrl, width, height, bytes };
}
