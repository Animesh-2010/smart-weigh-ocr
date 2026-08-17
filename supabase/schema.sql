-- Smart Weigh App - Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Bins table: stores registered bins with their empty weight
CREATE TABLE IF NOT EXISTS bins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  empty_weight_grams REAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  tare_image_url TEXT,
  ocr_confidence REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Weighing records: each time a bin is weighed
CREATE TABLE IF NOT EXISTS weighing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bin_id UUID NOT NULL REFERENCES bins(id) ON DELETE CASCADE,
  gross_weight_grams REAL NOT NULL,
  tare_weight_grams REAL NOT NULL,
  net_weight_grams REAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  ocr_confidence REAL,
  ocr_raw_result TEXT,
  ocr_engine TEXT DEFAULT 'tesseract',
  processing_time_ms INTEGER,
  validation_status TEXT NOT NULL DEFAULT 'confirmed',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bins_user_id ON bins(user_id);
CREATE INDEX IF NOT EXISTS idx_weighings_user_id ON weighing_records(user_id);
CREATE INDEX IF NOT EXISTS idx_weighings_bin_id ON weighing_records(bin_id);
CREATE INDEX IF NOT EXISTS idx_weighings_created_at ON weighing_records(created_at DESC);

-- Row Level Security: users can only see/modify their own data
ALTER TABLE bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE weighing_records ENABLE ROW LEVEL SECURITY;

-- Bins policies
CREATE POLICY "Users can view own bins" ON bins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bins" ON bins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bins" ON bins
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bins" ON bins
  FOR DELETE USING (auth.uid() = user_id);

-- Weighing records policies
CREATE POLICY "Users can view own weighings" ON weighing_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weighings" ON weighing_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weighings" ON weighing_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weighings" ON weighing_records
  FOR DELETE USING (auth.uid() = user_id);
