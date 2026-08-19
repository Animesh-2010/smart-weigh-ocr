import sharp from 'sharp';
import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  weight: number | null;
  unit: string | null;
  processingTimeMs: number;
  rawDetections: string[];
}

function preprocess(buffer: Buffer, strategy: 'gentle' | 'threshold' | 'highcontrast'): Promise<Buffer> {
  let img = sharp(buffer);

  if (strategy === 'gentle') {
    img = img.greyscale().normalize().sharpen({ sigma: 0.8 });
  } else if (strategy === 'threshold') {
    img = img.greyscale().normalize().sharpen({ sigma: 1.2 }).threshold(160);
  } else {
    img = img.greyscale().linear(1.4, -30).sharpen({ sigma: 1.5 }).threshold(128);
  }

  return img.toBuffer();
}

async function runOCR(imageBuffer: Buffer, psm?: number): Promise<{ text: string; confidence: number; rawDetections: string[] }> {
  const config: Record<string, string | number> = { tessedit_pageseg_mode: psm ?? 6 };
  const result = await Tesseract.recognize(imageBuffer, 'eng', {
    logger: () => {},
    ...config,
  });
  return {
    text: result.data.text,
    confidence: result.data.confidence / 100,
    rawDetections: result.data.lines.map(l => l.text.trim()).filter(t => t.length > 0),
  };
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
  if (/\b(kg|kgs|KG|KGS|Kg)\b/.test(text)) return 'kg';
  if (/\b(g|G)\b/.test(text)) return 'g';
  return null;
}

export async function extractWeightFromImage(imageBuffer: Buffer): Promise<OCRResult> {
  const startTime = Date.now();
  const strategies: Array<{ buffer: Buffer; label: string }> = [];

  try {
    const metadata = await sharp(imageBuffer).metadata();
    const w = metadata.width || 640;
    const h = metadata.height || 480;

    const fullResize = sharp(imageBuffer).resize({ width: Math.min(w, 1600), height: Math.min(h, 1600), fit: 'inside' });
    const fullBuffer = await fullResize.toBuffer();

    const cropLeft = Math.floor(w * 0.05);
    const cropTop = Math.floor(h * 0.1);
    const cropW = Math.floor(w * 0.9);
    const cropH = Math.floor(h * 0.55);
    const cropped = await sharp(imageBuffer)
      .extract({ left: cropLeft, top: cropTop, width: Math.min(cropW, w - cropLeft), height: Math.min(cropH, h - cropTop) })
      .resize({ width: 1200, fit: 'inside' })
      .toBuffer();

    for (const buf of [fullBuffer, cropped]) {
      for (const strat of ['gentle', 'threshold', 'highcontrast'] as const) {
        strategies.push({ buffer: await preprocess(buf, strat), label: strat });
      }
    }

    let bestWeight: number | null = null;
    let bestUnit: string | null = null;
    let bestConfidence = 0;
    let bestText = '';
    let bestRawDetections: string[] = [];

    for (const { buffer } of strategies) {
      for (const psm of [7, 6, 13]) {
        const result = await runOCR(buffer, psm);
        const w = parseWeight(result.text);
        if (w && result.confidence > bestConfidence) {
          bestWeight = w;
          bestUnit = parseUnit(result.text);
          bestConfidence = result.confidence;
          bestText = result.text;
          bestRawDetections = result.rawDetections;
        }
        if (bestWeight && bestConfidence > 0.3) break;
      }
      if (bestWeight && bestConfidence > 0.3) break;
    }

    return {
      text: bestText.trim(),
      confidence: bestConfidence,
      weight: bestWeight,
      unit: bestUnit,
      processingTimeMs: Date.now() - startTime,
      rawDetections: bestRawDetections,
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

  const unit = ocrResult.unit || 'kg';
  const grams = unit === 'kg' ? ocrResult.weight * 1000 : ocrResult.weight;

  if (grams < 1 || grams > 500000) {
    return {
      valid: false,
      confidence: 'medium',
      error: `Detected weight ${ocrResult.weight} ${unit} seems unreasonable`,
    };
  }

  const confidenceLevel = ocrResult.confidence >= 0.6 ? 'high' :
    ocrResult.confidence >= 0.3 ? 'medium' : 'low';

  return {
    valid: true,
    confidence: confidenceLevel,
  };
}
