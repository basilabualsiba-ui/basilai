-- Create assistant_queries table for saved query library
CREATE TABLE public.assistant_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  purpose TEXT NOT NULL,
  trigger_patterns TEXT[] NOT NULL,
  query_config JSONB NOT NULL,
  output_template TEXT,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create assistant_synonyms table for word mappings
CREATE TABLE public.assistant_synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  synonyms TEXT[] NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create assistant_pending_queries for AI suggestions
CREATE TABLE public.assistant_pending_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_query JSONB NOT NULL,
  suggestion_reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assistant_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_pending_queries ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (single user app)
CREATE POLICY "Allow all on assistant_queries" ON public.assistant_queries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on assistant_synonyms" ON public.assistant_synonyms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on assistant_pending_queries" ON public.assistant_pending_queries FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_assistant_queries_updated_at
  BEFORE UPDATE ON public.assistant_queries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial queries
INSERT INTO public.assistant_queries (query_name, category, purpose, trigger_patterns, query_config, output_template) VALUES
-- Financial Queries
('spending_today', 'financial', 'Total spending for today', 
 ARRAY['كم صرفت اليوم', 'مصاريف اليوم', 'spending today', 'مصروف اليوم'],
 '{"table": "transactions", "select": ["amount", "categories.name", "subcategories.name"], "joins": [{"table": "categories", "on": "category_id"}, {"table": "subcategories", "on": "subcategory_id"}], "filters": [{"column": "type", "operator": "eq", "value": "expense"}, {"column": "date", "operator": "eq", "value": "{today}"}], "aggregation": {"type": "sum", "column": "amount"}}'::jsonb,
 '💰 صرفت اليوم {total} شيكل'),

('spending_by_place', 'financial', 'Spending at a specific merchant/place',
 ARRAY['كم صرفت على {place}', 'كم صرفت في {place}', 'كم صرفت ب{place}', 'مصاريف {place}'],
 '{"table": "transactions", "select": ["amount", "date", "subcategories.name"], "joins": [{"table": "subcategories", "on": "subcategory_id"}], "filters": [{"column": "type", "operator": "eq", "value": "expense"}, {"column": "subcategory_id", "operator": "eq", "value": "{place_id}"}, {"column": "date", "operator": "gte", "value": "{start_date}"}], "aggregation": {"type": "sum", "column": "amount"}}'::jsonb,
 '📍 صرفت على {place} {total} شيكل {period}'),

('monthly_spending', 'financial', 'Spending breakdown by category this month',
 ARRAY['مصاريف الشهر', 'كم صرفت هالشهر', 'monthly expenses', 'مصروف الشهر'],
 '{"table": "transactions", "select": ["categories.name", "amount"], "joins": [{"table": "categories", "on": "category_id"}], "filters": [{"column": "type", "operator": "eq", "value": "expense"}, {"column": "date", "operator": "gte", "value": "{month_start}"}], "aggregation": {"type": "sum", "column": "amount"}, "group_by": ["category_id"]}'::jsonb,
 '📊 مصاريف الشهر: {total} شيكل'),

('account_balances', 'financial', 'Current balance of all accounts',
 ARRAY['كم معي فلوس', 'رصيدي', 'حساباتي', 'my balance', 'كم معي'],
 '{"table": "accounts", "select": ["name", "amount", "currency"], "aggregation": {"type": "sum", "column": "amount"}}'::jsonb,
 '💵 الرصيد الإجمالي: {total} شيكل'),

-- Gym Queries
('today_workout', 'gym', 'Today''s planned workout',
 ARRAY['شو تمريني اليوم', 'تمرين اليوم', 'today''s workout', 'تمريني'],
 '{"table": "workout_plan_days", "select": ["muscle_groups", "name", "start_time"], "joins": [{"table": "workout_plans", "on": "plan_id"}], "filters": [{"column": "workout_plans.is_active", "operator": "eq", "value": true}, {"column": "day_of_week", "operator": "eq", "value": "{today_dow}"}]}'::jsonb,
 '💪 تمرين اليوم: {muscle_groups}'),

('workouts_this_month', 'gym', 'Count of completed workouts this month',
 ARRAY['كم تمرين عملت هالشهر', 'workouts this month', 'تمارين الشهر'],
 '{"table": "workout_sessions", "select": ["id"], "filters": [{"column": "completed_at", "operator": "not_null"}, {"column": "scheduled_date", "operator": "gte", "value": "{month_start}"}], "aggregation": {"type": "count", "column": "id"}}'::jsonb,
 '🏋️ عملت {count} تمارين هالشهر'),

('weight_progress', 'gym', 'Weight tracking progress',
 ARRAY['وزني', 'تقدم الوزن', 'weight progress', 'كم وزني'],
 '{"table": "user_body_stats", "select": ["weight", "recorded_at"], "order_by": {"column": "recorded_at", "ascending": false}, "limit": 5}'::jsonb,
 '⚖️ وزنك الحالي: {weight} كغ'),

-- Prayer Queries
('prayer_times_today', 'prayer', 'Today''s prayer times',
 ARRAY['مواقيت الصلاة', 'اوقات الصلاة', 'prayer times', 'الصلاة'],
 '{"table": "prayer_times", "select": ["fajr", "dhuhr", "asr", "maghrib", "isha"], "filters": [{"column": "date", "operator": "eq", "value": "{today}"}]}'::jsonb,
 '🕌 مواقيت الصلاة اليوم'),

-- Supplements Queries
('supplements_status', 'supplements', 'Current supplement stock levels',
 ARRAY['المكملات', 'كم باقي مكملات', 'supplement status', 'مكملاتي'],
 '{"table": "supplements", "select": ["name", "remaining_doses", "total_doses", "warning_threshold"]}'::jsonb,
 '💊 حالة المكملات'),

('low_stock_supplements', 'supplements', 'Supplements running low',
 ARRAY['مكملات خلصت', 'لازم اشتري', 'low supplements'],
 '{"table": "supplements", "select": ["name", "remaining_doses"], "filters": [{"column": "remaining_doses", "operator": "lte", "column_ref": "warning_threshold"}]}'::jsonb,
 '⚠️ مكملات قربت تخلص'),

-- Dreams Queries
('active_dreams', 'dreams', 'Current active goals and their progress',
 ARRAY['احلامي', 'اهدافي', 'my goals', 'my dreams'],
 '{"table": "dreams", "select": ["title", "progress_percentage", "target_date"], "filters": [{"column": "status", "operator": "eq", "value": "in_progress"}], "order_by": {"column": "progress_percentage", "ascending": false}}'::jsonb,
 '🌟 أهدافك النشطة'),

-- Schedule Queries
('today_schedule', 'schedule', 'Today''s activities and schedule',
 ARRAY['جدول اليوم', 'شو عندي اليوم', 'today''s schedule', 'جدولي'],
 '{"table": "daily_activities", "select": ["title", "start_time", "end_time", "is_completed"], "filters": [{"column": "date", "operator": "eq", "value": "{today}"}], "order_by": {"column": "start_time", "ascending": true}}'::jsonb,
 '📅 جدول اليوم');

-- Seed common Arabic synonyms
INSERT INTO public.assistant_synonyms (word, synonyms, category) VALUES
('صرفت', ARRAY['دفعت', 'حطيت', 'خسرت', 'راحوا'], 'financial'),
('فلوس', ARRAY['مصاري', 'قروش', 'كاش', 'رصيد'], 'financial'),
('اليوم', ARRAY['هلأ', 'النهار', 'اليوم هاد'], 'time'),
('الشهر', ARRAY['هالشهر', 'الشهر هاد'], 'time'),
('تمرين', ARRAY['جيم', 'رياضة', 'workout'], 'gym'),
('وزن', ARRAY['كيلو', 'ثقل'], 'gym'),
('صلاة', ARRAY['صلوات', 'مواقيت'], 'prayer'),
('مكملات', ARRAY['فيتامينات', 'حبوب', 'supplements'], 'supplements'),
('احلام', ARRAY['اهداف', 'طموحات', 'امنيات'], 'dreams');