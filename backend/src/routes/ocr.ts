import { Response, Request } from 'express';
import { extractWeightFromImage, validateOCRResult } from '../services/ocr';

export async function processImage(req: Request, res: Response): Promise<void> {
  try {
    const { image } = req.body;

    if (!image) {
      res.status(400).json({ error: 'Image base64 data is required' });
      return;
    }

    console.log(`OCR request received - base64 length: ${image.length}`);

    const imageBuffer = Buffer.from(image, 'base64');
    console.log(`Image buffer size: ${imageBuffer.length} bytes`);

    const ocrResult = await extractWeightFromImage(imageBuffer);
    const validation = validateOCRResult(ocrResult);

    console.log(`OCR result - weight: ${ocrResult.weight}, unit: ${ocrResult.unit}, confidence: ${ocrResult.confidence}, valid: ${validation.valid}`);

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
