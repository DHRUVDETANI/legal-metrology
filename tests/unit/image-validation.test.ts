import { describe, it, expect } from 'vitest';
import {
  detectImageMimeFromBuffer,
  extractImageDimensions,
  validateImageBuffer,
  IMAGE_VALIDATION_RULES,
} from '@/lib/validation/image';

/**
 * Creates a valid synthetic PNG buffer with given width and height
 */
function createMockPngBuffer(width: number, height: number): Uint8Array {
  const buffer = new Uint8Array(33);
  // PNG signature
  buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // IHDR chunk length (13)
  const view = new DataView(buffer.buffer);
  view.setUint32(8, 13, false);
  // Chunk type 'IHDR' (49 48 44 52)
  buffer.set([0x49, 0x48, 0x44, 0x52], 12);
  // Dimensions
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  // Depth, color, compression, filter, interlace
  buffer.set([0x08, 0x02, 0x00, 0x00, 0x00], 24);
  // CRC
  view.setUint32(29, 0x12345678, false);
  return buffer;
}

/**
 * Creates a valid synthetic JPEG buffer with given width and height
 */
function createMockJpegBuffer(width: number, height: number): Uint8Array {
  const buffer = new Uint8Array(30);
  // SOI (FF D8)
  buffer[0] = 0xff;
  buffer[1] = 0xd8;
  // SOF0 marker (FF C0)
  buffer[2] = 0xff;
  buffer[3] = 0xc0;
  // SOF0 length (11 bytes: marker length + precision + height + width + components)
  const view = new DataView(buffer.buffer);
  view.setUint16(4, 11, false);
  // Precision (8-bit)
  buffer[6] = 0x08;
  // Height and Width
  view.setUint16(7, height, false);
  view.setUint16(9, width, false);
  // Components (3 for YCbCr)
  buffer[11] = 0x03;
  return buffer;
}

/**
 * Creates a valid synthetic WebP Extended (VP8X) buffer with given width and height
 */
function createMockWebpBuffer(width: number, height: number): Uint8Array {
  const buffer = new Uint8Array(32);
  // 'RIFF'
  buffer.set([0x52, 0x49, 0x46, 0x46], 0);
  // File size (placeholder)
  const view = new DataView(buffer.buffer);
  view.setUint32(4, 24, true);
  // 'WEBP'
  buffer.set([0x57, 0x45, 0x42, 0x50], 8);
  // 'VP8X' chunk
  buffer.set([0x56, 0x50, 0x38, 0x58], 12);
  // Chunk size (10 bytes)
  view.setUint32(16, 10, true);
  // Flags (4 bytes at 20)
  view.setUint32(20, 0, true);
  // Canvas width - 1 (24-bit at 24..26)
  const wMinus1 = width - 1;
  buffer[24] = wMinus1 & 0xff;
  buffer[25] = (wMinus1 >> 8) & 0xff;
  buffer[26] = (wMinus1 >> 16) & 0xff;
  // Canvas height - 1 (24-bit at 27..29)
  const hMinus1 = height - 1;
  buffer[27] = hMinus1 & 0xff;
  buffer[28] = (hMinus1 >> 8) & 0xff;
  buffer[29] = (hMinus1 >> 16) & 0xff;
  return buffer;
}

describe('Phase 3 Image Validation Utilities', () => {
  describe('Magic Bytes Detection', () => {
    it('detects PNG magic bytes correctly', () => {
      const buf = createMockPngBuffer(800, 600);
      expect(detectImageMimeFromBuffer(buf)).toBe('image/png');
    });

    it('detects JPEG magic bytes correctly', () => {
      const buf = createMockJpegBuffer(1920, 1080);
      expect(detectImageMimeFromBuffer(buf)).toBe('image/jpeg');
    });

    it('detects WebP magic bytes correctly', () => {
      const buf = createMockWebpBuffer(1280, 720);
      expect(detectImageMimeFromBuffer(buf)).toBe('image/webp');
    });

    it('rejects text/plain or html content disguised as image', () => {
      const scriptBuffer = new TextEncoder().encode('<html><script>alert("xss")</script></html>');
      expect(detectImageMimeFromBuffer(scriptBuffer)).toBeNull();
    });

    it('rejects empty or truncated buffers', () => {
      expect(detectImageMimeFromBuffer(new Uint8Array([]))).toBeNull();
      expect(detectImageMimeFromBuffer(new Uint8Array([0x89, 0x50]))).toBeNull();
    });
  });

  describe('Dimension Extraction', () => {
    it('extracts exact dimensions from PNG headers', () => {
      const buf = createMockPngBuffer(1024, 768);
      const dims = extractImageDimensions(buf, 'image/png');
      expect(dims).toEqual({ width: 1024, height: 768 });
    });

    it('extracts exact dimensions from JPEG headers', () => {
      const buf = createMockJpegBuffer(1920, 1080);
      const dims = extractImageDimensions(buf, 'image/jpeg');
      expect(dims).toEqual({ width: 1920, height: 1080 });
    });

    it('extracts exact dimensions from WebP headers', () => {
      const buf = createMockWebpBuffer(1200, 800);
      const dims = extractImageDimensions(buf, 'image/webp');
      expect(dims).toEqual({ width: 1200, height: 800 });
    });
  });

  describe('Comprehensive Image Buffer Validation', () => {
    it('accepts valid 1920x1080 JPEG within size limit', () => {
      const buf = createMockJpegBuffer(1920, 1080);
      const result = validateImageBuffer(buf, 'image/jpeg', 'label-front.jpg');
      expect(result.valid).toBe(true);
      expect(result.detectedMimeType).toBe('image/jpeg');
      expect(result.dimensions).toEqual({ width: 1920, height: 1080 });
    });

    it('accepts valid 800x600 PNG within size limit', () => {
      const buf = createMockPngBuffer(800, 600);
      const result = validateImageBuffer(buf, 'image/png', 'product.png');
      expect(result.valid).toBe(true);
      expect(result.detectedMimeType).toBe('image/png');
    });

    it('rejects image with dimensions below minimum threshold (< 400px)', () => {
      const buf = createMockPngBuffer(300, 300);
      const result = validateImageBuffer(buf, 'image/png', 'icon.png');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too small');
      expect(result.error).toContain(`${IMAGE_VALIDATION_RULES.minWidthPx}×${IMAGE_VALIDATION_RULES.minHeightPx}px`);
    });

    it('rejects image with dimensions above maximum permissible resolution', () => {
      const buf = createMockJpegBuffer(15000, 15000);
      const result = validateImageBuffer(buf, 'image/jpeg', 'huge.jpg');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceed maximum permissible size');
    });

    it('rejects oversized buffer exceeding 10MB limit', () => {
      // Create a buffer that is over 10MB
      const hugeBuf = new Uint8Array(11 * 1024 * 1024);
      const result = validateImageBuffer(hugeBuf, 'image/jpeg', 'huge.jpg');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Image size exceeds the maximum limit');
    });

    it('rejects content-type mismatch (MIME spoofing)', () => {
      // JPEG bytes but declared as PNG
      const buf = createMockJpegBuffer(1200, 800);
      const result = validateImageBuffer(buf, 'image/png', 'photo.png');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Content mismatch');
    });

    it('rejects unsupported extensions such as .gif, .pdf, or .exe', () => {
      const buf = createMockPngBuffer(800, 600);
      const result = validateImageBuffer(buf, 'image/png', 'malicious.exe');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File extension for \'malicious.exe\' is not supported');
    });

    it('rejects empty file payload', () => {
      const result = validateImageBuffer(new Uint8Array([]));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Image file is empty.');
    });
  });
});
