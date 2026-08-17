export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Bin {
  id: string;
  name: string;
  empty_weight: number;
  empty_weight_grams: number;
  unit: string;
  tare_image_url: string | null;
  ocr_confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface WeighingRecord {
  id: string;
  bin_id: string;
  bin_name: string | null;
  gross_weight: number;
  tare_weight: number;
  net_weight: number;
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
}

export interface OCRResponse {
  ocr: {
    text: string;
    confidence: number;
    confidence_level: 'high' | 'medium' | 'low';
    weight: number | null;
    unit: string | null;
    processing_time_ms: number;
    raw_detections: string[];
  };
  validation: {
    valid: boolean;
    error: string | null;
  };
}

export type UnitType = 'kg' | 'g';
