-- Create table for learned action patterns (complex commands with parameters)
CREATE TABLE public.learned_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_phrases TEXT[] NOT NULL, -- ["حشاش", "مصاريف الحشاش"]
  intent_type TEXT NOT NULL, -- 'spending_query', 'gym_query', etc.
  action_config JSONB NOT NULL, -- {action: "get_spending_by_place", place: "حشاش", period: "ask"}
  required_params JSONB, -- params that need to be asked: {period: ["امبارح", "هالأسبوع", "هالشهر"]}
  default_params JSONB, -- default values learned from usage
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to track user interactions for learning
CREATE TABLE public.assistant_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_message TEXT NOT NULL,
  parsed_intent TEXT, -- detected intent
  action_taken TEXT, -- what action was executed
  params_used JSONB, -- what parameters were used
  was_successful BOOLEAN DEFAULT true,
  feedback TEXT, -- user feedback if any
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for intent keywords (for local intent detection)
CREATE TABLE public.intent_keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intent_type TEXT NOT NULL, -- 'spending', 'gym', 'prayer', 'schedule', etc.
  keywords TEXT[] NOT NULL, -- ["صرفت", "مصاريف", "صرفيات", "كم دفعت"]
  action_template JSONB, -- template for the action config
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seed intent keywords for local detection
INSERT INTO intent_keywords (intent_type, keywords, action_template, priority) VALUES
('spending_by_place', '{"صرفت على", "مصاريف", "صرفيات", "كم دفعت", "كم صرفت"}', '{"type": "get_spending_by_place"}', 10),
('spending_period', '{"امبارح", "أمس", "اليوم", "هالأسبوع", "هالشهر", "هذا الشهر"}', '{}', 5),
('prayer', '{"صلاة", "الصلاة", "مواقيت", "متى", "فجر", "ظهر", "عصر", "مغرب", "عشاء"}', '{"type": "get_prayer_times"}', 10),
('gym', '{"تمرين", "جيم", "رياضة", "تمرنت", "وزني", "عضلات"}', '{"type": "get_gym_stats"}', 10),
('supplements', '{"مكملات", "مكمل", "فيتامين", "بروتين"}', '{"type": "get_supplements_status"}', 10),
('schedule', '{"جدول", "برنامج", "نشاطات", "مواعيد"}', '{"type": "get_today_schedule"}', 10),
('dreams', '{"أحلام", "حلم", "أهداف", "هدف"}', '{"type": "get_dreams_status"}', 10),
('food', '{"أكل", "وجبات", "طعام", "وجبة", "سعرات"}', '{"type": "get_food_today"}', 10),
('accounts', '{"حساب", "رصيد", "كاش", "بنك", "فلوس", "مصاري"}', '{"type": "get_accounts_summary"}', 10),
('learning', '{"تعلم", "احفظ", "علمني", "خليني أعلمك"}', '{"type": "start_learning"}', 20);

-- Enable RLS
ALTER TABLE learned_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_keywords ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can manage learned patterns" ON learned_patterns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can manage interactions" ON assistant_interactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read intent keywords" ON intent_keywords FOR SELECT USING (true);
CREATE POLICY "Anyone can manage intent keywords" ON intent_keywords FOR ALL USING (true) WITH CHECK (true);