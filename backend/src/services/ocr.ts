import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import { config } from '../config';

export interface OCRResult {
  text: string;
  confidence: number;
  weight: number | null;
  unit: string | null;
  processingTimeMs: number;
  rawDetections: string[];
}

export interface PreprocessedImage {
  buffer: Buffer;
  width: number;
  height: number;
}

export async function preprocessImage(imageBuffer: Buffer): Promise<PreprocessedImage> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  let processed = image;

  if ((metadata.width || 0) > 1920 || (metadata.height || 0) > 1920) {
    processed = processed.resize({ width: 1920, height: 1920, fit: 'inside' });
  }

  processed = processed
    .greyscale()
    .normalize()
    .sharpen({ sigma: 1.5 })
    .threshold(140);

  const result = await processed.toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    width: result.info.width,
    height: result.info.height,
  };
}

export async function detectDisplayRegion(imageBuffer: Buffer): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  const width = metadata.width || 640;
  const height = metadata.height || 480;

  const cropLeft = Math.floor(width * 0.1);
  const cropTop = Math.floor(height * 0.15);
  const cropWidth = Math.floor(width * 0.8);
  const cropHeight = Math.floor(height * 0.5);

  const cropped = await image
    .extract({
      left: cropLeft,
      top: cropTop,
      width: Math.min(cropWidth, width - cropLeft),
      height: Math.min(cropHeight, height - cropTop),
    })
    .toBuffer();

  return cropped;
}

export async function extractWeightFromImage(imageBuffer: Buffer): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    const displayBuffer = await detectDisplayRegion(imageBuffer);
    const preprocessed = await preprocessImage(displayBuffer);

    const result = await Tesseract.recognize(preprocessed.buffer, 'eng', {
      logger: () => {},
    });

    const rawText = result.data.text;
    const confidence = result.data.confidence / 100;

    const allTexts = result.data.lines.map(line => line.text.trim()).filter(t => t.length > 0);

    const weight = parseWeight(rawText);
    const unit = parseUnit(rawText);

    const processingTimeMs = Date.now() - startTime;

    return {
      text: rawText.trim(),
      confidence,
      weight,
      unit,
      processingTimeMs,
      rawDetections: allTexts,
    };
  } catch (error) {
    console.error('OCR extraction error:', error);
    return {
      text: '',
      confidence: 0,
      weight: null,
      unit: null,
      processingTimeMs: Date.now() - startTime,
      rawDetections: [],
    };
  }
}

function parseWeight(text: string): number | null {
  const patterns = [
    /(\d+\.?\d*)\s*(kg|g|KG|G|Kg|kgs|KGS)\b/,
    /(\d+\.\d{1,3})\b/,
    /(\d+)\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && value > 0) {
        return value;
      }
    }
  }

  return null;
}

function parseUnit(text: string): string | null {
  const unitPatterns = [
    { pattern: /\b(kg|kgs|KG|KGS|Kg)\b/, unit: 'kg' },
    { pattern: /\b(g|G)\b/, unit: 'g' },
  ];

  for (const { pattern, unit } of unitPatterns) {
    if (pattern.test(text)) {
      return unit;
    }
  }

  return null;
}

export function validateOCRResult(ocrResult: OCRResult): {
  valid: boolean;
  confidence: string;
  error?: string;
} {
  if (!ocrResult.weight) {
    return {
      valid: false,
      confidence: 'low',
      error: 'Unable to detect weight from the image',
    };
  }

  if (ocrResult.confidence < config.ocr.confidenceThreshold) {
    return {
      valid: false,
      confidence: ocrResult.confidence > 0.3 ? 'medium' : 'low',
      error: 'Low confidence reading. Please retake the photo.',
    };
  }

  const unit = ocrResult.unit || config.defaultUnit;
  const grams = unit === 'kg' ? ocrResult.weight * 1000 : ocrResult.weight;

  if (grams < 10 || grams > 500000) {
    return {
      valid: false,
      confidence: 'medium',
      error: `Detected weight ${ocrResult.weight} ${unit} seems unreasonable`,
    };
  }

  const confidenceLevel = ocrResult.confidence >= 0.8 ? 'high' :
    ocrResult.confidence >= 0.6 ? 'medium' : 'low';

  return {
    valid: true,
    confidence: confidenceLevel,
  };
}
