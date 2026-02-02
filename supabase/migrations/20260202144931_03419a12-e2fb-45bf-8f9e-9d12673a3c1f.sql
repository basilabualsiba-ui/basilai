-- ============================================
-- Roz Smart Learning Tables
-- ============================================

-- Table: Knowledge learned from AI responses
CREATE TABLE public.roz_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_pattern TEXT NOT NULL,
  query_examples TEXT[] DEFAULT '{}',
  response_type TEXT NOT NULL DEFAULT 'data_query',
  action_config JSONB,
  response_template TEXT,
  sql_template TEXT,
  tables_used TEXT[] DEFAULT '{}',
  learned_from_ai BOOLEAN DEFAULT true,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: Roz's personality traits and preferences
CREATE TABLE public.roz_personality (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trait_type TEXT NOT NULL,
  trait_key TEXT NOT NULL,
  trait_value JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trait_type, trait_key)
);

-- Table: Roz's memory about the user
CREATE TABLE public.roz_user_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_type TEXT NOT NULL,
  memory_key TEXT NOT NULL,
  memory_value JSONB NOT NULL,
  context TEXT,
  confidence FLOAT DEFAULT 1.0,
  source TEXT DEFAULT 'observation',
  last_referenced TIMESTAMPTZ,
  reference_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create update triggers
CREATE TRIGGER update_roz_knowledge_updated_at
BEFORE UPDATE ON public.roz_knowledge
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roz_personality_updated_at
BEFORE UPDATE ON public.roz_personality
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roz_user_memory_updated_at
BEFORE UPDATE ON public.roz_user_memory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Initialize Roz's Default Personality
-- ============================================

INSERT INTO public.roz_personality (trait_type, trait_key, trait_value, is_default) VALUES
  ('identity', 'name', '"روز"', true),
  ('identity', 'name_en', '"Roz"', true),
  ('identity', 'gender', '"female"', true),
  ('identity', 'emoji', '"🌹"', true),
  ('dialect', 'region', '"jenin_palestine"', true),
  ('dialect', 'greetings', '["هلا!", "أهلين!", "كيفك؟", "شو أخبارك؟", "هلا والله!"]', true),
  ('dialect', 'affirmative', '["تمام!", "ماشي!", "زبط!", "حاضر!", "أكيد!"]', true),
  ('dialect', 'thinking', '["استنى شوي...", "خليني أشوف...", "لحظة...", "دقيقة..."]', true),
  ('dialect', 'not_found', '["مش لاقية", "مافي", "ما لقيت إشي"]', true),
  ('dialect', 'success', '["خلصت!", "تم!", "هيك أحسن!", "زبط!"]', true),
  ('dialect', 'learning', '["تعلمت!", "حفظت!", "صار عندي!", "فهمت!"]', true),
  ('dialect', 'error', '["في إشي غلط", "مش مزبوط", "جرب تاني"]', true),
  ('dialect', 'goodbye', '["مع السلامة!", "يلا باي!", "الله معك!", "بنشوفك!"]', true),
  ('personality', 'tone', '"friendly_warm"', true),
  ('personality', 'formality', '"informal"', true),
  ('personality', 'helpfulness', '10', true);

-- Create indexes for faster queries
CREATE INDEX idx_roz_knowledge_pattern ON public.roz_knowledge USING gin(to_tsvector('arabic', query_pattern));
CREATE INDEX idx_roz_knowledge_type ON public.roz_knowledge(response_type);
CREATE INDEX idx_roz_user_memory_type ON public.roz_user_memory(memory_type);
CREATE INDEX idx_roz_user_memory_context ON public.roz_user_memory(context);