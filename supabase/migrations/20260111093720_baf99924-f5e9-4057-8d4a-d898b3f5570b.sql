-- Add more offline commands for comprehensive coverage
INSERT INTO assistant_commands (trigger_patterns, response_template, action_type, action_config, category, priority) VALUES
-- Prayer commands
('{"مواقيت الصلاة", "أوقات الصلاة", "prayer times", "الصلوات", "صلوات اليوم"}', '', 'action', '{"type": "get_prayer_times"}', 'prayer', 20),
('{"الصلاة القادمة", "متى الصلاة", "next prayer", "الصلاة الجاية", "الصلاة اللي جاية"}', '', 'action', '{"type": "get_next_prayer"}', 'prayer', 20),
('{"متى الفجر", "وقت الفجر", "صلاة الفجر"}', '', 'action', '{"type": "get_specific_prayer", "prayer": "fajr"}', 'prayer', 22),
('{"متى الظهر", "وقت الظهر", "صلاة الظهر"}', '', 'action', '{"type": "get_specific_prayer", "prayer": "dhuhr"}', 'prayer', 22),
('{"متى العصر", "وقت العصر", "صلاة العصر"}', '', 'action', '{"type": "get_specific_prayer", "prayer": "asr"}', 'prayer', 22),
('{"متى المغرب", "وقت المغرب", "صلاة المغرب"}', '', 'action', '{"type": "get_specific_prayer", "prayer": "maghrib"}', 'prayer', 22),
('{"متى العشاء", "وقت العشاء", "صلاة العشاء"}', '', 'action', '{"type": "get_specific_prayer", "prayer": "isha"}', 'prayer', 22),

-- Schedule commands
('{"جدول اليوم", "ايش عندي اليوم", "برنامج اليوم", "today schedule", "شو مخطط اليوم", "نشاطات اليوم"}', '', 'action', '{"type": "get_today_schedule"}', 'schedule', 18),
('{"جدول الاسبوع", "برنامج الاسبوع", "week schedule"}', '', 'action', '{"type": "get_week_schedule"}', 'schedule', 18),

-- Spending queries
('{"كم صرفت امبارح", "مصاريف أمس", "صرفيات امس", "spending yesterday", "مصاريف امبارح"}', '', 'action', '{"type": "get_spending_yesterday"}', 'finance', 18),
('{"كم صرفت اليوم", "مصاريف اليوم", "صرفيات اليوم", "spending today"}', '', 'action', '{"type": "get_spending_today"}', 'finance', 18),
('{"كم صرفت هالشهر", "مصاريف الشهر", "كم صرفت هذا الشهر", "monthly spending", "مصاريف شهر"}', '', 'action', '{"type": "get_spending_this_month"}', 'finance', 18),
('{"كم صرفت هالاسبوع", "مصاريف الاسبوع", "weekly spending"}', '', 'action', '{"type": "get_spending_this_week"}', 'finance', 18),
('{"الميزانية", "كم باقي من الميزانية", "budget status", "حالة الميزانية", "البادجت"}', '', 'action', '{"type": "get_budget_status"}', 'finance', 18),
('{"دخلي", "كم دخل", "دخلي هالشهر", "my income", "monthly income", "راتبي"}', '', 'action', '{"type": "get_income_this_month"}', 'finance', 18),
('{"كم بالبنك", "رصيد البنك", "bank balance"}', '', 'action', '{"type": "get_account_balance", "account": "bank"}', 'finance', 18),
('{"اخر المعاملات", "اخر الصرفيات", "recent transactions", "اخر العمليات"}', '', 'action', '{"type": "get_recent_transactions"}', 'finance', 18),

-- Dreams
('{"أحلامي", "أهدافي", "my dreams", "my goals", "شو احلامي", "اهدافي"}', '', 'action', '{"type": "get_dreams_status"}', 'dreams', 15),
('{"تقدم الأحلام", "dream progress", "كم تقدمت"}', '', 'action', '{"type": "get_dreams_progress"}', 'dreams', 15),

-- Gym
('{"احصائيات الجيم", "كم مرة تمرنت", "gym stats", "تمريناتي", "احصائيات التمرين"}', '', 'action', '{"type": "get_gym_stats"}', 'gym', 15),
('{"وزني", "كم وزني", "تقدم الوزن", "my weight", "الوزن"}', '', 'action', '{"type": "get_weight_progress"}', 'gym', 15),
('{"اخر تمرين", "متى تمرنت", "last workout", "اخر تمرينة"}', '', 'action', '{"type": "get_last_workout"}', 'gym', 15),
('{"تمرين اليوم", "شو التمرين اليوم", "today workout"}', '', 'action', '{"type": "get_today_workout"}', 'gym', 15),

-- Supplements
('{"مكملاتي", "المكملات", "supplements", "شو المكملات"}', '', 'action', '{"type": "get_supplements_status"}', 'supplements', 15),
('{"مكملات اليوم", "شو اخذ اليوم", "supplements today"}', '', 'action', '{"type": "get_supplements_due"}', 'supplements', 15),

-- Food
('{"وجباتي اليوم", "شو الأكل اليوم", "today meals", "خطة الأكل", "اكل اليوم"}', '', 'action', '{"type": "get_food_today"}', 'food', 15),
('{"السعرات", "كم كالوري", "calories today"}', '', 'action', '{"type": "get_calories_today"}', 'food', 15),

-- Body stats
('{"احصائياتي", "احصائيات جسمي", "body stats", "معلومات جسمي"}', '', 'action', '{"type": "get_body_stats"}', 'stats', 15),

-- Help and learning
('{"تعلم", "احفظ هذا الأمر", "save command", "علمني", "احفظ امر"}', 'ممتاز! قل لي الأمر بهذا الشكل:\n"تعلم: لما أقول [كلمة] قول [الرد]"\n\nمثال: تعلم: لما أقول قهوة قول سعر القهوة 15 شيكل', 'response', null, 'help', 25),
('{"شو تقدر تسوي", "ايش تعرف", "what can you do", "المساعدة", "help"}', '', 'action', '{"type": "get_capabilities"}', 'help', 20),
('{"الاوامر المحفوظة", "اوامري", "my commands", "saved commands"}', '', 'action', '{"type": "get_saved_commands"}', 'help', 15);