import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getOne, getAll, run } from '../database';
import { AuthRequest } from '../middleware/auth';
import { convertToGrams, convertFromGrams } from '../utils/units';

export function createWeighing(req: AuthRequest, res: Response): void {
  try {
    const { bin_id, gross_weight, unit, ocr_confidence, ocr_raw_result, ocr_engine, processing_time_ms, image_url } = req.body;

    if (!bin_id || gross_weight === undefined) {
      res.status(400).json({ error: 'Bin ID and gross weight are required' });
      return;
    }

    const bin = getOne('SELECT * FROM bins WHERE id = ? AND user_id = ?', [bin_id, req.userId]);

    if (!bin) {
      res.status(404).json({ error: 'Bin not found' });
      return;
    }

    const weightUnit = unit || bin.unit;
    const grossWeightGrams = convertToGrams(gross_weight, weightUnit);
    const tareWeightGrams = bin.empty_weight_grams;
    const netWeightGrams = grossWeightGrams - tareWeightGrams;

    if (netWeightGrams < 0) {
      res.status(400).json({
        error: 'Invalid weighing',
        message: 'Gross weight cannot be less than the empty-bin weight',
        gross_weight: gross_weight,
        tare_weight: convertFromGrams(tareWeightGrams, weightUnit),
        unit: weightUnit,
      });
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    run(
      `INSERT INTO weighing_records 
      (id, user_id, bin_id, gross_weight_grams, tare_weight_grams, net_weight_grams, unit, 
       ocr_confidence, ocr_raw_result, ocr_engine, processing_time_ms, validation_status, image_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.userId, bin_id, grossWeightGrams, tareWeightGrams, netWeightGrams, weightUnit,
       ocr_confidence || null, ocr_raw_result || null, ocr_engine || 'tesseract',
       processing_time_ms || null, 'confirmed', image_url || null, now]
    );

    const record = getOne('SELECT wr.*, b.name as bin_name FROM weighing_records wr LEFT JOIN bins b ON wr.bin_id = b.id WHERE wr.id = ?', [id]);
    res.status(201).json({ weighing: formatWeighing(record) });
  } catch (error) {
    console.error('Create weighing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function getWeighings(req: AuthRequest, res: Response): void {
  try {
    const { limit, offset, bin_id } = req.query;
    const lim = Math.min(parseInt(limit as string) || 50, 100);
    const off = parseInt(offset as string) || 0;

    let sql = 'SELECT wr.*, b.name as bin_name FROM weighing_records wr LEFT JOIN bins b ON wr.bin_id = b.id WHERE wr.user_id = ?';
    const params: any[] = [req.userId];

    if (bin_id) {
      sql += ' AND wr.bin_id = ?';
      params.push(bin_id);
    }

    sql += ' ORDER BY wr.created_at DESC LIMIT ? OFFSET ?';
    params.push(lim, off);

    const records = getAll(sql, params);

    let countSql = 'SELECT COUNT(*) as count FROM weighing_records WHERE user_id = ?';
    const countParams: any[] = [req.userId];
    if (bin_id) {
      countSql += ' AND bin_id = ?';
      countParams.push(bin_id);
    }
    const countResult = getOne(countSql, countParams);
    const total = countResult ? countResult.count : 0;

    res.json({
      weighings: records.map(formatWeighing),
      total,
      limit: lim,
      offset: off,
    });
  } catch (error) {
    console.error('Get weighings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function getWeighing(req: AuthRequest, res: Response): void {
  try {
    const { id } = req.params;

    const record = getOne(
      'SELECT wr.*, b.name as bin_name FROM weighing_records wr LEFT JOIN bins b ON wr.bin_id = b.id WHERE wr.id = ? AND wr.user_id = ?',
      [id, req.userId]
    );

    if (!record) {
      res.status(404).json({ error: 'Weighing record not found' });
      return;
    }

    res.json({ weighing: formatWeighing(record) });
  } catch (error) {
    console.error('Get weighing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function formatWeighing(record: any) {
  if (!record) return null;
  return {
    id: record.id,
    bin_id: record.bin_id,
    bin_name: record.bin_name || null,
    gross_weight: convertFromGrams(record.gross_weight_grams, record.unit),
    tare_weight: convertFromGrams(record.tare_weight_grams, record.unit),
    net_weight: convertFromGrams(record.net_weight_grams, record.unit),
    gross_weight_grams: record.gross_weight_grams,
    tare_weight_grams: record.tare_weight_grams,
    net_weight_grams: record.net_weight_grams,
    unit: record.unit,
    ocr_confidence: record.ocr_confidence,
    ocr_raw_result: record.ocr_raw_result,
    ocr_engine: record.ocr_engine,
    processing_time_ms: record.processing_time_ms,
    validation_status: record.validation_status,
    image_url: record.image_url,
    created_at: record.created_at,
  };
}
