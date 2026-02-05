-- Add more useful queries for teaching
INSERT INTO public.assistant_queries (query_name, category, purpose, trigger_patterns, query_config, output_template, is_active)
VALUES 
  -- Income queries
  ('income_this_month', 'financial', 'Total income this month',
   ARRAY['دخلي هالشهر', 'كم دخلي', 'المعاش', 'الراتب', 'كم استلمت'],
   '{"table": "transactions", "select": ["amount", "description"], "filters": [{"column": "type", "operator": "eq", "value": "income"}, {"column": "date", "operator": "gte", "value": "{month_start}"}], "aggregation": {"type": "sum", "column": "amount"}}'::jsonb,
   '💵 الدخل هالشهر: {total} شيكل', true),
   
  -- Trainer sessions
  ('trainer_sessions', 'gym', 'Trainer sessions this month',
   ARRAY['جلسات المدرب', 'كم جلسة مع المدرب', 'جلسات التدريب', 'تمارين المدرب'],
   '{"table": "workout_sessions", "select": ["id"], "filters": [{"column": "with_trainer", "operator": "eq", "value": true}, {"column": "completed_at", "operator": "not_null"}, {"column": "scheduled_date", "operator": "gte", "value": "{month_start}"}], "aggregation": {"type": "count", "column": "id"}}'::jsonb,
   '🏋️ عملت {count} جلسات مع المدرب هالشهر', true),
   
  -- Last workout
  ('last_workout', 'gym', 'Last completed workout',
   ARRAY['اخر تمرين', 'متى تمرنت', 'اخر مرة تمرنت'],
   '{"table": "workout_sessions", "select": ["scheduled_date", "muscle_groups", "total_duration_minutes"], "filters": [{"column": "completed_at", "operator": "not_null"}], "order_by": {"column": "completed_at", "ascending": false}, "limit": 1}'::jsonb,
   '💪 آخر تمرين: {scheduled_date}', true),
   
  -- Yesterday spending
  ('spending_yesterday', 'financial', 'Spending yesterday',
   ARRAY['كم صرفت مبارح', 'مصاريف مبارح', 'صرفت امس'],
   '{"table": "transactions", "select": ["amount", "subcategories.name"], "joins": [{"table": "subcategories", "on": "subcategory_id"}], "filters": [{"column": "type", "operator": "eq", "value": "expense"}, {"column": "date", "operator": "eq", "value": "{yesterday}"}], "aggregation": {"type": "sum", "column": "amount"}}'::jsonb,
   '💰 صرفت مبارح: {total} شيكل', true)
   
ON CONFLICT (query_name) DO NOTHING;