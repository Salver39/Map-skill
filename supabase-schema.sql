-- Таблица для хранения ответов по сессиям
-- Выполните этот SQL в Supabase Dashboard → SQL Editor

CREATE TABLE assessment_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_code TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('self', 'team_lead', 'product_lead')),
  answers JSONB NOT NULL DEFAULT '{}',
  competency_index INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_code, role)
);

CREATE INDEX idx_responses_session ON assessment_responses(session_code);

-- Разрешаем анонимный доступ (MVP без авторизации)
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read" ON assessment_responses
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert" ON assessment_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update" ON assessment_responses
  FOR UPDATE USING (true) WITH CHECK (true);
