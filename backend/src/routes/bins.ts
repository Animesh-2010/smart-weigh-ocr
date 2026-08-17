import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getOne, getAll, run } from '../database';
import { AuthRequest } from '../middleware/auth';
import { convertToGrams, validateWeight, convertFromGrams } from '../utils/units';
import { config } from '../config';

export function createBin(req: AuthRequest, res: Response): void {
  try {
    const { name, empty_weight, unit, tare_image_url, ocr_confidence } = req.body;

    if (!name || empty_weight === undefined) {
      res.status(400).json({ error: 'Bin name and empty weight are required' });
      return;
    }

    const weightUnit = unit || config.defaultUnit;

    if (!config.supportedUnits.includes(weightUnit)) {
      res.status(400).json({ error: `Unsupported unit. Supported: ${config.supportedUnits.join(', ')}` });
      return;
    }

    const validation = validateWeight(empty_weight, weightUnit);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const emptyWeightGrams = convertToGrams(empty_weight, weightUnit);
    const id = uuidv4();
    const now = new Date().toISOString();

    run(
      'INSERT INTO bins (id, user_id, name, empty_weight_grams, unit, tare_image_url, ocr_confidence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.userId, name, emptyWeightGrams, weightUnit, tare_image_url || null, ocr_confidence || null, now, now]
    );

    const bin = getOne('SELECT * FROM bins WHERE id = ?', [id]);
    res.status(201).json({ bin: formatBin(bin) });
  } catch (error) {
    console.error('Create bin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function getBins(req: AuthRequest, res: Response): void {
  try {
    const bins = getAll('SELECT * FROM bins WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    res.json({ bins: bins.map(formatBin) });
  } catch (error) {
    console.error('Get bins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function getBin(req: AuthRequest, res: Response): void {
  try {
    const { bin_id } = req.params;
    const bin = getOne('SELECT * FROM bins WHERE id = ? AND user_id = ?', [bin_id, req.userId]);

    if (!bin) {
      res.status(404).json({ error: 'Bin not found' });
      return;
    }

    res.json({ bin: formatBin(bin) });
  } catch (error) {
    console.error('Get bin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function updateBinTare(req: AuthRequest, res: Response): void {
  try {
    const { bin_id } = req.params;
    const { empty_weight, unit, tare_image_url, ocr_confidence } = req.body;

    const bin = getOne('SELECT * FROM bins WHERE id = ? AND user_id = ?', [bin_id, req.userId]);

    if (!bin) {
      res.status(404).json({ error: 'Bin not found' });
      return;
    }

    const weightUnit = unit || bin.unit;

    if (empty_weight !== undefined) {
      const validation = validateWeight(empty_weight, weightUnit);
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }
    }

    const newWeightGrams = empty_weight !== undefined ? convertToGrams(empty_weight, weightUnit) : bin.empty_weight_grams;
    const newUnit = unit || bin.unit;
    const newImageUrl = tare_image_url !== undefined ? tare_image_url : bin.tare_image_url;
    const newConfidence = ocr_confidence !== undefined ? ocr_confidence : bin.ocr_confidence;
    const now = new Date().toISOString();

    run(
      'UPDATE bins SET empty_weight_grams = ?, unit = ?, tare_image_url = ?, ocr_confidence = ?, updated_at = ? WHERE id = ?',
      [newWeightGrams, newUnit, newImageUrl, newConfidence, now, bin_id]
    );

    const updated = getOne('SELECT * FROM bins WHERE id = ?', [bin_id]);
    res.json({ bin: formatBin(updated) });
  } catch (error) {
    console.error('Update bin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function deleteBin(req: AuthRequest, res: Response): void {
  try {
    const { bin_id } = req.params;
    const bin = getOne('SELECT * FROM bins WHERE id = ? AND user_id = ?', [bin_id, req.userId]);

    if (!bin) {
      res.status(404).json({ error: 'Bin not found' });
      return;
    }

    run('DELETE FROM weighing_records WHERE bin_id = ?', [bin_id]);
    run('DELETE FROM bins WHERE id = ?', [bin_id]);
    res.json({ message: 'Bin deleted successfully' });
  } catch (error) {
    console.error('Delete bin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function formatBin(bin: any) {
  if (!bin) return null;
  return {
    id: bin.id,
    name: bin.name,
    empty_weight: convertFromGrams(bin.empty_weight_grams, bin.unit),
    empty_weight_grams: bin.empty_weight_grams,
    unit: bin.unit,
    tare_image_url: bin.tare_image_url,
    ocr_confidence: bin.ocr_confidence,
    created_at: bin.created_at,
    updated_at: bin.updated_at,
  };
}
