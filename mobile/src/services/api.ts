import { SUPABASE, OCR_BACKEND_URL } from '../config/supabase';

// ─── Supabase helpers ────────────────────────────────────────────

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user?: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
}

interface SupabaseUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthSession {
  user: SupabaseUser;
  token: string;
  refreshToken: string;
  expiresAt: number;
}

async function supabaseAuthRequest<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${SUPABASE.url}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE.anonKey,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try { parsed = JSON.parse(text); } catch { parsed = text; }
  }

  if (!res.ok) {
    const msg =
      (parsed as { error_description?: string } | null)?.error_description ??
      (parsed as { msg?: string } | null)?.msg ??
      (parsed as { error?: string } | null)?.error ??
      `Auth failed (${res.status})`;
    throw new Error(msg);
  }

  return parsed as T;
}

function toUser(res: TokenResponse): SupabaseUser {
  const email = res.user?.email ?? '';
  const meta = (res.user?.user_metadata ?? {}) as { name?: string };
  return {
    id: res.user?.id ?? email,
    email,
    name: meta.name ?? email.split('@')[0],
  };
}

function toSession(res: TokenResponse): AuthSession {
  if (!res.access_token || !res.refresh_token) {
    throw new Error('Incomplete auth response from Supabase');
  }
  return {
    user: toUser(res),
    token: res.access_token,
    refreshToken: res.refresh_token,
    expiresAt: res.expires_at ?? Math.floor(Date.now() / 1000) + res.expires_in,
  };
}

// ─── Supabase REST helper ────────────────────────────────────────

async function supabaseRest<T>(
  path: string,
  token: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    apikey: SUPABASE.anonKey,
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    headers['Prefer'] = 'return=representation';
  }

  const res = await fetch(`${SUPABASE.url}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try { parsed = JSON.parse(text); } catch { parsed = text; }
  }

  if (!res.ok) {
    const msg =
      (parsed as { message?: string } | null)?.message ??
      (parsed as { error_description?: string } | null)?.error_description ??
      `Supabase error (${res.status})`;
    throw new Error(msg);
  }

  return parsed as T;
}

// ─── Weight helpers ──────────────────────────────────────────────

function toGrams(weight: number, unit: string): number {
  return unit === 'kg' ? Math.round(weight * 1000) : Math.round(weight);
}

function fromGrams(grams: number, unit: string): number {
  return unit === 'kg' ? Math.round(grams) / 1000 : Math.round(grams);
}

// ─── Auth API ────────────────────────────────────────────────────

async function authSignup(name: string, email: string, password: string): Promise<AuthSession> {
  const res = await supabaseAuthRequest<TokenResponse>('/auth/v1/signup', {
    email,
    password,
    data: { name },
  });
  return toSession(res);
}

async function authLogin(email: string, password: string): Promise<AuthSession> {
  const res = await supabaseAuthRequest<TokenResponse>('/auth/v1/token?grant_type=password', {
    email,
    password,
  });
  return toSession(res);
}

async function authRefresh(refreshToken: string): Promise<AuthSession> {
  const res = await supabaseAuthRequest<TokenResponse>('/auth/v1/token?grant_type=refresh_token', {
    refresh_token: refreshToken,
  });
  return toSession(res);
}

// ─── Bins API (Supabase REST) ───────────────────────────────────

interface BinRow {
  id: string;
  user_id: string;
  name: string;
  empty_weight_grams: number;
  unit: string;
  tare_image_url: string | null;
  ocr_confidence: number | null;
  created_at: string;
  updated_at: string;
}

function formatBin(row: BinRow) {
  return {
    id: row.id,
    name: row.name,
    empty_weight: fromGrams(row.empty_weight_grams, row.unit),
    empty_weight_grams: row.empty_weight_grams,
    unit: row.unit,
    tare_image_url: row.tare_image_url,
    ocr_confidence: row.ocr_confidence,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getBins(token: string) {
  const rows = await supabaseRest<BinRow[]>(
    '/rest/v1/bins?order=created_at.desc',
    token,
  );
  return { bins: rows.map(formatBin) };
}

async function getBin(token: string, binId: string) {
  const rows = await supabaseRest<BinRow[]>(
    `/rest/v1/bins?id=eq.${binId}`,
    token,
  );
  if (rows.length === 0) throw new Error('Bin not found');
  return { bin: formatBin(rows[0]) };
}

async function createBin(
  token: string,
  userId: string,
  name: string,
  emptyWeight: number,
  unit: string,
  tareImageUrl?: string,
  ocrConfidence?: number,
) {
  const emptyWeightGrams = toGrams(emptyWeight, unit);
  const now = new Date().toISOString();

  const rows = await supabaseRest<BinRow[]>(
    '/rest/v1/bins',
    token,
    {
      method: 'POST',
      body: {
        user_id: userId,
        name,
        empty_weight_grams: emptyWeightGrams,
        unit,
        tare_image_url: tareImageUrl || null,
        ocr_confidence: ocrConfidence || null,
        created_at: now,
        updated_at: now,
      },
    },
  );
  return { bin: formatBin(rows[0]) };
}

async function updateBinTare(
  token: string,
  binId: string,
  emptyWeight: number,
  unit: string,
  tareImageUrl?: string,
  ocrConfidence?: number,
) {
  const emptyWeightGrams = toGrams(emptyWeight, unit);
  const now = new Date().toISOString();

  const rows = await supabaseRest<BinRow[]>(
    `/rest/v1/bins?id=eq.${binId}`,
    token,
    {
      method: 'PATCH',
      body: {
        empty_weight_grams: emptyWeightGrams,
        unit,
        tare_image_url: tareImageUrl || null,
        ocr_confidence: ocrConfidence || null,
        updated_at: now,
      },
    },
  );
  if (rows.length === 0) throw new Error('Bin not found');
  return { bin: formatBin(rows[0]) };
}

async function deleteBin(token: string, binId: string) {
  await supabaseRest(
    `/rest/v1/bins?id=eq.${binId}`,
    token,
    { method: 'DELETE' },
  );
  return { message: 'Bin deleted successfully' };
}

// ─── Weighings API (Supabase REST) ──────────────────────────────

interface WeighingRow {
  id: string;
  user_id: string;
  bin_id: string;
  gross_weight_grams: number;
  tare_weight_grams: number;
  net_weight_grams: number;
  unit: string;
  ocr_confidence: number | null;
  ocr_raw_result: string | null;
  ocr_engine: string | null;
  processing_time_ms: number | null;
  validation_status: string;
  image_url: string | null;
  created_at: string;
  bins?: { name: string } | null;
}

function formatWeighing(row: WeighingRow) {
  const unit = row.unit;
  return {
    id: row.id,
    bin_id: row.bin_id,
    bin_name: row.bins?.name ?? null,
    gross_weight: fromGrams(row.gross_weight_grams, unit),
    tare_weight: fromGrams(row.tare_weight_grams, unit),
    net_weight: fromGrams(row.net_weight_grams, unit),
    gross_weight_grams: row.gross_weight_grams,
    tare_weight_grams: row.tare_weight_grams,
    net_weight_grams: row.net_weight_grams,
    unit: row.unit,
    ocr_confidence: row.ocr_confidence,
    ocr_raw_result: row.ocr_raw_result,
    ocr_engine: row.ocr_engine,
    processing_time_ms: row.processing_time_ms,
    validation_status: row.validation_status,
    image_url: row.image_url,
    created_at: row.created_at,
  };
}

async function createWeighing(
  token: string,
  userId: string,
  binId: string,
  grossWeight: number,
  unit: string,
  ocrConfidence?: number,
  ocrRawResult?: string,
  processingTimeMs?: number,
  imageUrl?: string,
) {
  // Fetch the bin to get tare weight
  const binRows = await supabaseRest<BinRow[]>(
    `/rest/v1/bins?id=eq.${binId}`,
    token,
  );
  if (binRows.length === 0) throw new Error('Bin not found');
  const bin = binRows[0];

  const grossWeightGrams = toGrams(grossWeight, unit);
  const tareWeightGrams = bin.empty_weight_grams;
  const netWeightGrams = grossWeightGrams - tareWeightGrams;

  if (netWeightGrams < 0) {
    throw new Error('Gross weight cannot be less than the empty-bin weight');
  }

  const now = new Date().toISOString();

  const rows = await supabaseRest<WeighingRow[]>(
    '/rest/v1/weighing_records',
    token,
    {
      method: 'POST',
      body: {
        user_id: userId,
        bin_id: binId,
        gross_weight_grams: grossWeightGrams,
        tare_weight_grams: tareWeightGrams,
        net_weight_grams: netWeightGrams,
        unit,
        ocr_confidence: ocrConfidence || null,
        ocr_raw_result: ocrRawResult || null,
        ocr_engine: 'tesseract',
        processing_time_ms: processingTimeMs || null,
        validation_status: 'confirmed',
        image_url: imageUrl || null,
        created_at: now,
      },
    },
  );

  // Fetch with bin name join
  const fullRows = await supabaseRest<WeighingRow[]>(
    `/rest/v1/weighing_records?id=eq.${rows[0].id}&select=*,bins(name)`,
    token,
  );

  return { weighing: formatWeighing(fullRows[0]) };
}

async function getWeighings(token: string, limit = 50, offset = 0, binId?: string) {
  let query = `/rest/v1/weighing_records?select=*,bins(name)&order=created_at.desc&limit=${limit}&offset=${offset}`;
  if (binId) query += `&bin_id=eq.${binId}`;

  const rows = await supabaseRest<WeighingRow[]>(query, token);

  // Get total count
  let countQuery = '/rest/v1/weighing_records?select=id&count=exact';
  if (binId) countQuery += `&bin_id=eq.${binId}`;

  const countRes = await fetch(`${SUPABASE.url}${countQuery}`, {
    headers: {
      apikey: SUPABASE.anonKey,
      Authorization: `Bearer ${token}`,
      Prefer: 'count=exact',
    },
  });
  const total = parseInt(countRes.headers.get('content-range')?.split('/')[1] || '0', 10);

  return {
    weighings: rows.map(formatWeighing),
    total,
    limit,
    offset,
  };
}

async function getWeighing(token: string, id: string) {
  const rows = await supabaseRest<WeighingRow[]>(
    `/rest/v1/weighing_records?id=eq.${id}&select=*,bins(name)`,
    token,
  );
  if (rows.length === 0) throw new Error('Weighing record not found');
  return { weighing: formatWeighing(rows[0]) };
}

// ─── OCR API (Render backend) ───────────────────────────────────

async function processOCR(imageUri: string, token: string) {
  const { readAsStringAsync, EncodingType } = require('expo-file-system/legacy');
  const base64 = await readAsStringAsync(imageUri, {
    encoding: EncodingType.Base64,
  });

  const res = await fetch(`${OCR_BACKEND_URL}/ocr/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ image: base64 }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'OCR processing failed');
  }
  return data;
}

// ─── Public API ──────────────────────────────────────────────────

export const api = {
  // Auth
  signup: authSignup,
  login: authLogin,
  refresh: authRefresh,

  // Bins
  getBins,
  getBin,
  createBin,
  updateBinTare,
  deleteBin,

  // Weighings
  createWeighing,
  getWeighings,
  getWeighing,

  // OCR
  processOCR,
};
