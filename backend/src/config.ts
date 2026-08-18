export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'smart-weigh-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',
  maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE || '10485760', 10),
  ocr: {
    engine: process.env.OCR_ENGINE || 'tesseract',
    confidenceThreshold: parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD || '0.3'),
    maxWeightKg: parseFloat(process.env.MAX_WEIGHT_KG || '500'),
    minWeightKg: parseFloat(process.env.MIN_WEIGHT_KG || '0.01'),
  },
  supportedUnits: ['kg', 'g'],
  defaultUnit: 'kg',
} as const;
