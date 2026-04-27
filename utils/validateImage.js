'use strict';

const MAX_BASE64_BYTES = 1.4 * 1024 * 1024;
const ALLOWED_TYPES    = new Set(['image/jpeg','image/png','image/webp']);

function validateImage({ imageData, mediaType }) {
  if (!imageData || typeof imageData !== 'string')
    return { valid: false, error: 'imageData is required (base64 string).' };
  if (!mediaType || !ALLOWED_TYPES.has(mediaType))
    return { valid: false, error: 'mediaType must be image/jpeg, image/png, or image/webp.' };
  if (imageData.length > MAX_BASE64_BYTES)
    return { valid: false, error: 'Image too large. Max ~1MB.' };
  return { valid: true };
}

module.exports = { validateImage };
