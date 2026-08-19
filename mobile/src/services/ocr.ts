import { recognizeText } from 'expo-mlkit-ocr';
import * as ImageManipulator from 'expo-image-manipulator';

export interface LocalOCRResult {
  weight: number | null;
  unit: string | null;
  confidence: number;
  rawText: string;
  rawLines: string[];
}

function parseWeight(text: string): number | null {
  const cleaned = text
    .replace(/[oO]/g, '0')
    .replace(/[lI|]/g, '1')
    .replace(/[zZ]/g, '2')
    .replace(/[sS]/g, '5')
    .replace(/[B]/g, '8')
    .replace(/[gG](?=\s|$)/gi, '')
    .trim();

  const patterns = [
    /(\d+\.?\d*)\s*(kg|g|KG|G|Kg|kgs|KGS)\b/,
    /\b(\d{1,5}\.\d{1,3})\b/,
    /\b(\d{2,6})\b/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && value > 0) {
        if (value > 0.001 && value < 100000) {
          return value;
        }
      }
    }
  }

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

export async function processImageLocally(imageUri: string): Promise<LocalOCRResult> {
  const manipulated = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 1600 } }],
    {
      compress: 0.95,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  const result = await recognizeText(manipulated.uri);

  const rawText = result.text || '';
  const rawLines = result.blocks
    .flatMap((b) => b.lines)
    .map((l) => l.text.trim())
    .filter((t) => t.length > 0);

  let bestWeight: number | null = null;
  let bestUnit: string | null = null;

  for (const line of rawLines) {
    const w = parseWeight(line);
    if (w) {
      bestWeight = w;
      bestUnit = parseUnit(line);
      break;
    }
  }

  if (!bestWeight) {
    const allText = rawLines.join(' ');
    bestWeight = parseWeight(allText);
    bestUnit = parseUnit(allText);
  }

  if (!bestWeight) {
    for (const block of result.blocks) {
      for (const line of block.lines) {
        for (const element of line.elements) {
          const w = parseWeight(element.text);
          if (w) {
            bestWeight = w;
            bestUnit = parseUnit(element.text);
            break;
          }
        }
        if (bestWeight) break;
      }
      if (bestWeight) break;
    }
  }

  const hasWeight = bestWeight !== null;
  const confidence = hasWeight ? 0.85 : (rawText.length > 0 ? 0.4 : 0);

  return {
    weight: bestWeight,
    unit: bestUnit,
    confidence,
    rawText: rawText.trim(),
    rawLines,
  };
}
