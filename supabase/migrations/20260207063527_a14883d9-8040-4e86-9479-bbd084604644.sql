
-- Fix broken query: get_accounts_balances_details (balance -> amount)
UPDATE public.assistant_queries 
SET query_config = '{"table": "accounts", "select": ["name", "amount", "currency"]}'::jsonb
WHERE query_name = 'get_accounts_balances_details';

-- Fix broken query: spending_yesterday (remove currency from select)
UPDATE public.assistant_queries 
SET query_config = '{"table": "transactions", "select": ["amount", "description", "date"], "joins": [{"on": "subcategory_id", "table": "subcategories"}, {"on": "category_id", "table": "categories"}], "filters": [{"value": "expense", "column": "type", "operator": "eq"}, {"value": "{yesterday}", "column": "date", "operator": "eq"}], "aggregation": {"type": "sum", "column": "amount"}}'::jsonb
WHERE query_name = 'spending_yesterday';

-- Fix yesterday_expenses_list query too
UPDATE public.assistant_queries 
SET query_config = '{"table": "transactions", "select": ["amount", "description", "date"], "joins": [{"on": "subcategory_id", "table": "subcategories"}, {"on": "category_id", "table": "categories"}], "filters": [{"value": "expense", "column": "type", "operator": "eq"}, {"value": "{yesterday}", "column": "date", "operator": "eq"}], "order_by": {"column": "amount", "ascending": false}}'::jsonb,
    output_mode = 'table'
WHERE query_name = 'yesterday_expenses_list';

-- Add more trigger patterns to active_dreams
UPDATE public.assistant_queries 
SET trigger_patterns = ARRAY['احلامي', 'اهدافي', 'my goals', 'my dreams', 'شو احلامي', 'اهداف', 'وين وصلت بالاهداف', 'تقدم الاهداف']
WHERE query_name = 'active_dreams';

-- ====== NEW QUERIES ======

-- Top spending places (table output)
INSERT INTO public.assistant_queries (query_name, category, purpose, trigger_patterns, query_config, output_template, output_mode, action_type)
VALUES (
  'top_spending_places',
  'financial',
  'Top places by spending amount',
  ARRAY['اكتر اماكن صرفت فيها', 'وين بصرف اكتر', 'top spending places', 'اكثر مكان صرفت فيه', 'اكتر اشي صرفت عليه'],
  '{"table": "transactions", "select": ["amount"], "joins": [{"on": "subcategory_id", "table": "subcategories"}], "filters": [{"value": "expense", "column": "type", "operator": "eq"}], "aggregation": {"type": "sum", "column": "amount"}, "group_by": ["subcategories.name"], "order_by": {"column": "amount", "ascending": false}, "limit": 10}'::jsonb,
  NULL,
  'table',
  'query'
);

-- Top spending categories
INSERT INTO public.assistant_queries (query_name, category, purpose, trigger_patterns, query_config, output_template, output_mode, action_type)
VALUES (
  'top_spending_categories',
  'financial',
  'Top categories by spending',
  ARRAY['اكتر فئة صرفت فيها', 'تصنيف المصاريف', 'top spending categories', 'على شو بصرف'],
  '{"table": "transactions", "select": ["amount"], "joins": [{"on": "category_id", "table": "categories"}], "filters": [{"value": "expense", "column": "type", "operator": "eq"}], "aggregation": {"type": "sum", "column": "amount"}, "group_by": ["categories.name"], "order_by": {"column": "amount", "ascending": false}, "limit": 10}'::jsonb,
  NULL,
  'table',
  'query'
);

-- Spending at specific place (subcategory)
INSERT INTO public.assistant_queries (query_name, category, purpose, trigger_patterns, query_config, output_template, output_mode, action_type)
VALUES (
  'spending_at_place',
  'financial',
  'Spending at a specific subcategory/place',
  ARRAY['كم صرفت بال{place}', 'كم صرفت في ال{place}', 'صرف ال{place}', 'مصاريف ال{place}', 'وين صرفت بال{place}'],
  '{"table": "transactions", "select": ["amount", "date", "description"], "joins": [{"on": "subcategory_id", "table": "subcategories"}], "filters": [{"value": "expense", "column": "type", "operator": "eq"}, {"value": "{place}", "column": "subcategories.name", "operator": "ilike"}], "aggregation": {"type": "sum", "column": "amount"}, "order_by": {"column": "date", "ascending": false}}'::jsonb,
  '💰 صرفت في {place}: {total} شيكل',
  'text',
  'query'
);

-- Monthly comparison
INSERT INTO public.assistant_queries (query_name, category, purpose, trigger_patterns, query_config, output_template, output_mode, action_type, result_code)
VALUES (
  'spending_this_month_vs_last',
  'financial',
  'Compare this month spending to last month',
  ARRAY['كم صرفت هاد الشهر مقارنة باللي قبل', 'مقارنة مصاريف الشهر', 'مصاريف الشهر مقارنة', 'صرف الشهر مقارنة باللي قبلو'],
  '{"table": "transactions", "select": ["amount", "date"], "filters": [{"value": "expense", "column": "type", "operator": "eq"}, {"value": "{first_of_last_month}", "column": "date", "operator": "gte"}]}'::jsonb,
  NULL,
  'text',
  'query',
  'const now = new Date(); const thisMonth = now.getMonth(); const lastMonth = thisMonth - 1; const thisMonthTotal = data.filter(r => new Date(r.date).getMonth() === thisMonth).reduce((s, r) => s + r.amount, 0); const lastMonthTotal = data.filter(r => new Date(r.date).getMonth() === lastMonth).reduce((s, r) => s + r.amount, 0); const diff = thisMonthTotal - lastMonthTotal; const pct = lastMonthTotal > 0 ? Math.round((diff / lastMonthTotal) * 100) : 0; const emoji = diff > 0 ? "📈" : "📉"; return `💰 هالشهر: ${thisMonthTotal.toLocaleString()} شيكل\n💰 الشهر اللي قبل: ${lastMonthTotal.toLocaleString()} شيكل\n${emoji} الفرق: ${diff > 0 ? "+" : ""}${diff.toLocaleString()} شيكل (${pct}%)`'
);

-- Average daily spending
INSERT INTO public.assistant_queries (query_name, category, purpose, trigger_patterns, query_config, output_template, output_mode, action_type, result_code)
VALUES (
  'average_daily_spending',
  'financial',
  'Average daily spending this month',
  ARRAY['معدل صرفي هالشهر', 'معدل الصرف اليومي', 'كم بصرف باليوم', 'average daily spending'],
  '{"table": "transactions", "select": ["amount", "date"], "filters": [{"value": "expense", "column": "type", "operator": "eq"}, {"value": "{first_of_month}", "column": "date", "operator": "gte"}]}'::jsonb,
  NULL,
  'text',
  'query',
  'const total = data.reduce((s, r) => s + r.amount, 0); const days = new Set(data.map(r => r.date)).size || 1; const avg = Math.round(total / days); return `📊 معدل صرفك اليومي: ${avg.toLocaleString()} شيكل/يوم\n💰 المجموع: ${total.toLocaleString()} شيكل خلال ${days} يوم`'
);

-- Savings last month
INSERT INTO public.assistant_queries (query_name, category, purpose, trigger_patterns, query_config, output_template, output_mode, action_type, result_code)
VALUES (
  'savings_last_month',
  'financial',
  'Savings (income - expenses) last month',
  ARRAY['كم عملت سافنجز الشهر اللي قبل', 'كم وفرت الشهر الماضي', 'savings last month', 'توفير الشهر اللي فات'],
  '{"table": "transactions", "select": ["amount", "type", "date"], "filters": [{"value": "{first_of_last_month}", "column": "date", "operator": "gte"}, {"value": "{first_of_month}", "column": "date", "operator": "lt"}]}'::jsonb,
  NULL,
  'text',
  'query',
  'const income = data.filter(r => r.type === "income").reduce((s, r) => s + r.amount, 0); const expenses = data.filter(r => r.type === "expense").reduce((s, r) => s + r.amount, 0); const savings = income - expenses; const emoji = savings > 0 ? "🎉" : "😬"; return `${emoji} الشهر اللي فات:\n💵 الدخل: ${income.toLocaleString()} شيكل\n💸 المصاريف: ${expenses.toLocaleString()} شيكل\n💰 التوفير: ${savings.toLocaleString()} شيكل`'
);

-- Last 5 transactions
INSERT INTO public.assistant_queries (query_name, category, purpose, trigger_patterns, query_config, output_template, output_mode, action_type)
VALUES (
  'last_transactions',
  'financial',
  'Last 5 transactions',
  ARRAY['اخر المعاملات', 'اخر المصاريف', 'last transactions', 'شو اخر اشي صرفت'],
  '{"table": "transactions", "select": ["amount", "date", "type", "description"], "joins": [{"on": "category_id", "table": "categories"}, {"on": "subcategory_id", "table": "subcategories"}], "order_by": {"column": "date", "ascending": false}, "limit": 5}'::jsonb,
  NULL,
  'table',
  'query'
);

-- Exercise details
INSERT INTO public.assistant_queries (query_name, category, purpose, trigger_patterns, query_config, output_template, output_mode, action_type, result_code)
VALUES (
  'exercise_details',
  'gym',
  'Get exercise details with photo and video',
  ARRAY['شو هاد التمرين {exercise}', 'تفاصيل تمرين {exercise}', 'معلومات عن {exercise}', 'exercise details {exercise}', 'شو تمرين {exercise}'],
  '{"table": "exercises", "select": ["name", "muscle_group", "equipment", "difficulty_level", "instructions", "photo_url", "video_url", "side_muscle_groups"], "filters": [{"value": "%{exercise}%", "column": "name", "operator": "ilike"}], "limit": 1}'::jsonb,
  NULL,
  'text',
  'query',
  'if (!data.length) return "❌ ما لقيت هاد التمرين"; const e = data[0]; let r = `💪 **${e.name}**\n🎯 العضلة: ${e.muscle_group}`; if (e.side_muscle_groups?.length) r += ` | عضلات ثانوية: ${e.side_muscle_groups.join(", ")}`; if (e.equipment) r += `\n🏋️ المعدات: ${e.equipment}`; if (e.difficulty_level) r += `\n📊 الصعوبة: ${e.difficulty_level}`; if (e.instructions) r += `\n📝 التعليمات: ${e.instructions}`; if (e.photo_url) r += `\n📸 الصورة: ${e.photo_url}`; if (e.video_url) r += `\n🎬 الفيديو: ${e.video_url}`; return r'
);

-- Muscle last trained
INSERT INTO public.assistant_queries (query_name, category, purpose, trigger_patterns, query_config, output_template, output_mode, action_type, result_code)
VALUES (
  'muscle_last_trained',
  'gym',
  'When was a muscle last trained',
  ARRAY['متى اخر مرة تدربت {muscle}', 'كم هاي ال{muscle} مرتاحة', 'اخر تمرين {muscle}', '{muscle} متى تدربت'],
  '{"table": "workout_sessions", "select": ["scheduled_date", "muscle_groups", "completed_at"], "filters": [{"column": "completed_at", "operator": "not_null"}], "order_by": {"column": "scheduled_date", "ascending": false}, "limit": 50}'::jsonb,
  NULL,
  'text',
  'query',
  'const muscle = variables.muscle || ""; const sessions = data.filter(s => s.muscle_groups && s.muscle_groups.some(m => m.toLowerCase().includes(muscle.toLowerCase()))); if (!sessions.length) return `❌ ما لقيت تمارين ل${muscle}`; const last = sessions[0]; const days = Math.floor((Date.now() - new Date(last.scheduled_date).getTime()) / 86400000); return `💪 اخر مرة تدربت ${muscle}: ${last.scheduled_date}\n⏰ من ${days} يوم\n${days <= 2 ? "🔴 لسا مرهقة" : days <= 4 ? "🟡 جاهزة تقريباً" : "🟢 مرتاحة وجاهزة!"}`'
);

-- Exercise PR (personal record)
INSERT INTO public.assistant_queries (query_name, category, purpose, trigger_patterns, query_config, output_template, output_mode, action_type, result_code)
VALUES (
  'exercise_pr',
  'gym',
  'Personal record for an exercise',
  ARRAY['اعلى وزن ب{exercise}', 'رقم قياسي {exercise}', 'PR {exercise}', 'كم اكتر اشي حملت ب{exercise}', 'اكتر وزن {exercise}'],
  '{"table": "exercise_sets", "select": ["weight", "reps", "created_at"], "joins": [{"on": "exercise_id", "table": "exercises"}], "filters": [{"value": "%{exercise}%", "column": "exercises.name", "operator": "ilike"}, {"column": "weight", "operator": "not_null"}], "order_by": {"column": "weight", "ascending": false}, "limit": 1}'::jsonb,
  NULL,
  'text',
  'query',
  'if (!data.length) return "❌ ما في سجل لهاد التمرين"; const s = data[0]; return `🏆 أعلى وزن: ${s.weight} كغ × ${s.reps} تكرار\n📅 بتاريخ: ${s.created_at?.split("T")[0] || ""}`'
);

-- Bicep training history
INSERT INTO public.assistant_queries (query_name, category, purpose, trigger_patterns, query_config, output_template, output_mode, action_type, result_code)
VALUES (
  'bicep_training',
  'gym',
  'Bicep workout history',
  ARRAY['تدريب باي', 'تمارين باي', 'تمارين البايسبس', 'bicep training', 'باي', 'بايسبس'],
  '{"table": "workout_sessions", "select": ["scheduled_date", "muscle_groups", "total_duration_minutes", "completed_at"], "filters": [{"column": "completed_at", "operator": "not_null"}], "order_by": {"column": "scheduled_date", "ascending": false}, "limit": 50}'::jsonb,
  NULL,
  'text',
  'query',
  'const sessions = data.filter(s => s.muscle_groups && s.muscle_groups.some(m => m.toLowerCase().includes("bicep") || m.includes("باي"))); if (!sessions.length) return "💪 ما في تمارين باي مسجلة"; const count = sessions.length; const last = sessions[0]; const days = Math.floor((Date.now() - new Date(last.scheduled_date).getTime()) / 86400000); return `💪 **تمارين الباي:**\n📊 عدد الجلسات: ${count}\n📅 آخر مرة: ${last.scheduled_date} (من ${days} يوم)\n${days <= 3 ? "🔴 لسا مرهقة" : days <= 5 ? "🟡 تقريباً جاهزة" : "🟢 جاهزة!"}`'
);

-- Tricep training history
INSERT INTO public.assistant_queries (query_name, category, purpose, trigger_patterns, query_config, output_template, output_mode, action_type, result_code)
VALUES (
  'tricep_training',
  'gym',
  'Tricep workout history',
  ARRAY['تدريب تراي', 'تمارين تراي', 'تمارين الترايسبس', 'tricep training', 'تراي', 'ترايسبس'],
  '{"table": "workout_sessions", "select": ["scheduled_date", "muscle_groups", "total_duration_minutes", "completed_at"], "filters": [{"column": "completed_at", "operator": "not_null"}], "order_by": {"column": "scheduled_date", "ascending": false}, "limit": 50}'::jsonb,
  NULL,
  'text',
  'query',
  'const sessions = data.filter(s => s.muscle_groups && s.muscle_groups.some(m => m.toLowerCase().includes("tricep") || m.includes("تراي"))); if (!sessions.length) return "💪 ما في تمارين تراي مسجلة"; const count = sessions.length; const last = sessions[0]; const days = Math.floor((Date.now() - new Date(last.scheduled_date).getTime()) / 86400000); return `💪 **تمارين التراي:**\n📊 عدد الجلسات: ${count}\n📅 آخر مرة: ${last.scheduled_date} (من ${days} يوم)\n${days <= 3 ? "🔴 لسا مرهقة" : days <= 5 ? "🟡 تقريباً جاهزة" : "🟢 جاهزة!"}`'
);

-- Completed dreams
INSERT INTO public.assistant_queries (query_name, category, purpose, trigger_patterns, query_config, output_template, output_mode, action_type)
VALUES (
  'completed_dreams',
  'dreams',
  'List of completed goals',
  ARRAY['اهداف محققة', 'احلام تحققت', 'completed goals', 'شو حققت'],
  '{"table": "dreams", "select": ["title", "completed_at", "rating"], "filters": [{"value": "completed", "column": "status", "operator": "eq"}], "order_by": {"column": "completed_at", "ascending": false}}'::jsonb,
  NULL,
  'table',
  'query'
);

-- Total income vs expenses
INSERT INTO public.assistant_queries (query_name, category, purpose, trigger_patterns, query_config, output_template, output_mode, action_type, result_code)
VALUES (
  'income_vs_expenses',
  'financial',
  'Income vs expenses summary',
  ARRAY['الدخل مقابل المصاريف', 'income vs expenses', 'ملخص مالي'],
  '{"table": "transactions", "select": ["amount", "type", "date"], "filters": [{"value": "{first_of_month}", "column": "date", "operator": "gte"}]}'::jsonb,
  NULL,
  'text',
  'query',
  'const income = data.filter(r => r.type === "income").reduce((s, r) => s + r.amount, 0); const expenses = data.filter(r => r.type === "expense").reduce((s, r) => s + r.amount, 0); return `📊 **ملخص الشهر:**\n💵 الدخل: ${income.toLocaleString()} شيكل\n💸 المصاريف: ${expenses.toLocaleString()} شيكل\n💰 الصافي: ${(income - expenses).toLocaleString()} شيكل`'
);

-- ====== SYNONYMS ======
INSERT INTO public.assistant_synonyms (word, synonyms, category) VALUES
  ('مبارح', ARRAY['امس', 'البارحة', 'امبارح'], 'time'),
  ('هالاسبوع', ARRAY['الاسبوع', 'هاد الاسبوع', 'الاسبوع هاد'], 'time'),
  ('نادي', ARRAY['جيم', 'صالة', 'رياضة', 'gym'], 'gym'),
  ('عضلة', ARRAY['عضلات', 'muscle', 'muscles'], 'gym'),
  ('باي', ARRAY['بايسبس', 'bicep', 'biceps'], 'gym'),
  ('تراي', ARRAY['ترايسبس', 'tricep', 'triceps'], 'gym'),
  ('صدر', ARRAY['chest', 'بنش', 'bench'], 'gym'),
  ('ظهر', ARRAY['back', 'ضهر'], 'gym'),
  ('اكتاف', ARRAY['كتف', 'shoulders', 'shoulder'], 'gym'),
  ('ارجل', ARRAY['رجل', 'legs', 'leg', 'سكوات'], 'gym'),
  ('حشاش', ARRAY['الحشاش', 'hashash'], 'places'),
  ('مصروف', ARRAY['مصاريف', 'صرف', 'مصروفات'], 'financial'),
  ('دخل', ARRAY['راتب', 'معاش', 'income', 'salary'], 'financial'),
  ('توفير', ARRAY['سافنجز', 'savings', 'ادخار', 'وفرت'], 'financial')
ON CONFLICT DO NOTHING;
