import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { extractWeightFromImage, validateOCRResult } from '../services/ocr';

export async function processImage(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Image file is required' });
      return;
    }

    const ocrResult = await extractWeightFromImage(req.file.buffer);
    const validation = validateOCRResult(ocrResult);

    res.json({
      ocr: {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        confidence_level: validation.confidence,
        weight: ocrResult.weight,
        unit: ocrResult.unit,
        processing_time_ms: ocrResult.processingTimeMs,
        raw_detections: ocrResult.rawDetections,
      },
      validation: {
        valid: validation.valid,
        error: validation.error || null,
      },
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
}
