// ============================================================================
// src/lib/validation/image.ts
// SIH PS26034 — Legal Metrology Packaging Image Validation Utility
//
// Client and server-side image validation:
//   - Strict MIME type whitelist (image/jpeg, image/png, image/webp)
//   - Magic bytes verification to detect spoofed MIME / executable files
//   - File size limits (Max 10MB)
//   - Dimension verification (Min 400x400px, Max 12000x12000px)
//   - Pure TypeScript binary header parser for dimensions without native deps
// ============================================================================

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

export const IMAGE_VALIDATION_RULES = {
  maxSizeBytes: 10 * 1024 * 1024, // 10 MB limit (Supabase bucket allows up to 15MB)
  minWidthPx: 400,
  minHeightPx: 400,
  maxWidthPx: 12000,
  maxHeightPx: 12000,
} as const;

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  detectedMimeType?: AllowedImageMimeType;
  dimensions?: ImageDimensions;
  sizeBytes?: number;
}

/**
 * Verifies magic bytes of buffer to detect genuine image format.
 * Rejects disguised scripts, HTML, executables, or corrupted buffers.
 */
export function detectImageMimeFromBuffer(buffer: Uint8Array): AllowedImageMimeType | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // WebP: RIFF ... WEBP (Bytes 0-3: 52 49 46 46, Bytes 8-11: 57 45 42 50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Extracts dimensions (width, height) directly from image header bytes.
 */
export function extractImageDimensions(
  buffer: Uint8Array,
  mimeType: AllowedImageMimeType
): ImageDimensions | null {
  try {
    if (mimeType === 'image/png') {
      return extractPngDimensions(buffer);
    }
    if (mimeType === 'image/jpeg') {
      return extractJpegDimensions(buffer);
    }
    if (mimeType === 'image/webp') {
      return extractWebpDimensions(buffer);
    }
  } catch {
    return null;
  }
  return null;
}

function extractPngDimensions(buffer: Uint8Array): ImageDimensions | null {
  // PNG IHDR chunk starts at byte 12 with chunk type 'IHDR' (49 48 44 52)
  // Width: bytes 16-19 (32-bit big-endian)
  // Height: bytes 20-23 (32-bit big-endian)
  if (buffer.length < 24) return null;

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);

  if (width > 0 && height > 0) {
    return { width, height };
  }
  return null;
}

function extractJpegDimensions(buffer: Uint8Array): ImageDimensions | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  while (offset < buffer.length - 8) {
    // Check marker start
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }

    // Skip padding 0xFF bytes
    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset++;
    }

    if (offset >= buffer.length) break;

    const marker = buffer[offset];
    offset++;

    // Ignore standalone markers SOI, EOI, RST0-RST7
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    if (offset + 2 > buffer.length) break;
    const blockLength = view.getUint16(offset, false);

    // SOF markers: SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2), etc.
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isSof && offset + 7 <= buffer.length) {
      // Byte 0-1: blockLength
      // Byte 2: precision
      // Byte 3-4: height (big-endian)
      // Byte 5-6: width (big-endian)
      const height = view.getUint16(offset + 3, false);
      const width = view.getUint16(offset + 5, false);
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }

    offset += blockLength;
  }

  return null;
}

function extractWebpDimensions(buffer: Uint8Array): ImageDimensions | null {
  if (buffer.length < 30) return null;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Chunk format at bytes 12..15
  const chunkType = String.fromCharCode(buffer[12], buffer[13], buffer[14], buffer[15]);

  if (chunkType === 'VP8 ') {
    // Lossy WebP: check start code 0x9D 0x01 0x2A at offset 23
    if (buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
      const width = view.getUint16(26, true) & 0x3fff;
      const height = view.getUint16(28, true) & 0x3fff;
      return { width, height };
    }
  } else if (chunkType === 'VP8L') {
    // Lossless WebP: 1-byte signature 0x2F at offset 20
    if (buffer[20] === 0x2f) {
      const b1 = buffer[21];
      const b2 = buffer[22];
      const b3 = buffer[23];
      const b4 = buffer[24];
      const width = 1 + (((b2 & 0x3f) << 8) | b1);
      const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
      return { width, height };
    }
  } else if (chunkType === 'VP8X') {
    // Extended WebP: canvas dimensions 24-bit little endian
    // Width at offset 24..26 (3 bytes) + 1
    // Height at offset 27..29 (3 bytes) + 1
    const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
    const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
    return { width, height };
  }

  return null;
}

/**
 * Validates an image file's buffer, declared MIME, size, and dimensions.
 * Suitable for both Node.js route handlers and server actions.
 */
export function validateImageBuffer(
  buffer: Uint8Array,
  declaredMimeType?: string,
  filename?: string
): ImageValidationResult {
  const sizeBytes = buffer.length;

  if (sizeBytes === 0) {
    return { valid: false, error: 'Image file is empty.' };
  }

  if (sizeBytes > IMAGE_VALIDATION_RULES.maxSizeBytes) {
    return {
      valid: false,
      error: `Image size exceeds the maximum limit of ${
        IMAGE_VALIDATION_RULES.maxSizeBytes / (1024 * 1024)
      }MB. Provided: ${(sizeBytes / (1024 * 1024)).toFixed(2)}MB.`,
    };
  }

  // Check magic bytes
  const detectedMime = detectImageMimeFromBuffer(buffer);
  if (!detectedMime) {
    return {
      valid: false,
      error: 'Invalid or unsupported image format. Only JPEG, PNG, and WebP are supported.',
    };
  }

  // If declared MIME was given, verify consistency
  if (declaredMimeType) {
    const normalizedDeclared = declaredMimeType.toLowerCase().trim();
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(normalizedDeclared as AllowedImageMimeType)) {
      return {
        valid: false,
        error: `MIME type '${declaredMimeType}' is not supported. Only image/jpeg, image/png, and image/webp are allowed.`,
      };
    }
    // Prevent MIME spoofing (e.g. text/html uploaded with image/jpeg header)
    if (normalizedDeclared !== detectedMime) {
      return {
        valid: false,
        error: `Content mismatch: File content is ${detectedMime}, but declared as ${normalizedDeclared}.`,
      };
    }
  }

  // If filename was given, verify extension
  if (filename) {
    const lowerFilename = filename.toLowerCase();
    const hasValidExt = ALLOWED_IMAGE_EXTENSIONS.some((ext) => lowerFilename.endsWith(ext));
    if (!hasValidExt) {
      return {
        valid: false,
        error: `File extension for '${filename}' is not supported. Use .jpg, .jpeg, .png, or .webp.`,
      };
    }
  }

  // Extract dimensions
  const dimensions = extractImageDimensions(buffer, detectedMime);
  if (!dimensions) {
    return {
      valid: false,
      error: 'Corrupted or unreadable image file: Unable to extract image dimensions.',
    };
  }

  if (
    dimensions.width < IMAGE_VALIDATION_RULES.minWidthPx ||
    dimensions.height < IMAGE_VALIDATION_RULES.minHeightPx
  ) {
    return {
      valid: false,
      error: `Image dimensions (${dimensions.width}×${dimensions.height}px) are too small. Minimum resolution for statutory legal metrology OCR is ${IMAGE_VALIDATION_RULES.minWidthPx}×${IMAGE_VALIDATION_RULES.minHeightPx}px.`,
      detectedMimeType: detectedMime,
      dimensions,
      sizeBytes,
    };
  }

  if (
    dimensions.width > IMAGE_VALIDATION_RULES.maxWidthPx ||
    dimensions.height > IMAGE_VALIDATION_RULES.maxHeightPx
  ) {
    return {
      valid: false,
      error: `Image dimensions (${dimensions.width}×${dimensions.height}px) exceed maximum permissible size (${IMAGE_VALIDATION_RULES.maxWidthPx}×${IMAGE_VALIDATION_RULES.maxHeightPx}px).`,
      detectedMimeType: detectedMime,
      dimensions,
      sizeBytes,
    };
  }

  return {
    valid: true,
    detectedMimeType: detectedMime,
    dimensions,
    sizeBytes,
  };
}
