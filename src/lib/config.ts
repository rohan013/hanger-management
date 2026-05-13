export const STORAGE_CONFIG = {
  MAX_BLOB_USAGE_BYTES: 900 * 1024 * 1024,   // 900MB of 1GB blob limit
  MAX_POSTGRES_USAGE_MB: 230,                  // 230MB of 256MB postgres limit
  MAX_CLOTHING_ITEMS: 150,
  MAX_IMAGE_UPLOAD_BYTES: 10 * 1024 * 1024,   // 10MB raw upload limit
  TARGET_IMAGE_WIDTH: 800,                     // resize to this width before storing
  TARGET_IMAGE_QUALITY: 80,                    // JPEG quality
};
