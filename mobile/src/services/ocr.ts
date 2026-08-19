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
  if (/\b(g)\b/.test(text)) return 'g';
  return null;
}

export async function processImageLocally(imageUri: string): Promise<LocalOCRResult> {
  const manipulated = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 1200 } }],
    {
      compress: 0.9,
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

  const allText = rawLines.join(' ');
  bestWeight = parseWeight(allText);
  bestUnit = parseUnit(allText);

  if (!bestWeight) {
    for (const line of rawLines) {
      const w = parseWeight(line);
      if (w) {
        bestWeight = w;
        bestUnit = parseUnit(line);
        break;
      }
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
