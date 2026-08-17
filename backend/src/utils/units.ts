export function gramsToKg(grams: number): number {
  return Math.round(grams) / 1000;
}

export function kgToGrams(kg: number): number {
  return Math.round(kg * 1000);
}

export function convertToGrams(weight: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case 'kg':
      return kgToGrams(weight);
    case 'g':
      return Math.round(weight);
    default:
      return kgToGrams(weight);
  }
}

export function convertFromGrams(grams: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case 'kg':
      return gramsToKg(grams);
    case 'g':
      return Math.round(grams);
    default:
      return gramsToKg(grams);
    }
}

export function formatWeight(grams: number, unit: string): string {
  const value = convertFromGrams(grams, unit);
  return `${value} ${unit}`;
}

export function validateWeight(value: number, unit: string): { valid: boolean; error?: string } {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: 'Weight must be a number' };
  }
  if (value <= 0) {
    return { valid: false, error: 'Weight must be positive' };
  }
  const grams = convertToGrams(value, unit);
  const minGrams = 10;
  const maxGrams = 500000;
  if (grams < minGrams) {
    return { valid: false, error: `Weight too small (minimum ${formatWeight(minGrams, unit)})` };
  }
  if (grams > maxGrams) {
    return { valid: false, error: `Weight too large (maximum ${formatWeight(maxGrams, unit)})` };
  }
  return { valid: true };
}
