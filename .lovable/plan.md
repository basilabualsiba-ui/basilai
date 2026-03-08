

# Plan: Add 100 Diverse Questions + Add Expense Intent

## Overview
Expand the local Basilix assistant with ~100 unique questions covering all app domains, plus add an "add expense" intent that can either guide the user or open the add transaction dialog.

## Current State
- ~35 intents exist covering: spending, categories, weight, workouts, supplements, media, games, dreams, prayers, schedule
- Add Transaction Dialog exists at `src/components/financial/add-transaction-dialog.tsx` - it's a drawer component

## New Questions by Domain (100 total)

### 💰 Financial - New Questions (~25)
| Question | Intent |
|----------|--------|
| أضف صرف | Guide to add expense flow |
| سجلي مصروف | Guide to add expense flow |
| بدي أسجل صرفة | Guide to add expense flow |
| كم صرفت بالسيارة | spending_by_category (Car) |
| كم صرفت على البنزين | spending_by_subcategory |
| شو أكثر يوم صرفت فيه | most_expensive_day (NEW) |
| معدل صرفي الأسبوعي | weekly_average (NEW) |
| كم صرفت بالأكل الشهر الفائت | existing + time |
| نسبة كل فئة من المصاريف | category_percentages (NEW) |
| قارن هالشهر مع اللي قبله | monthly_comparison |
| كم صرفت هالسنة | total_spending + year |
| كم حولت بين الحسابات | transfers_count (NEW) |
| شو أقل يوم صرفت فيه | cheapest_day (NEW) |
| كم معاملة عملت هالشهر | transactions_count (NEW) |
| شو أغلى معاملة | biggest_transaction (NEW) |
| شو أرخص معاملة | smallest_transaction (NEW) |
| كم صرفت بعد الساعة 6 | evening_spending (NEW) |
| كم صرفت الصبح | morning_spending (NEW) |
| كم صرفت بالويكند | weekend_spending (NEW) |
| كم مكان صرفت فيه | unique_places_count (NEW) |
| شو آخر 5 معاملات | last_5_transactions (NEW) |
| كم صرفت بالدولار | spending_by_currency (NEW) |
| كم صرفت بالدينار | spending_by_currency (NEW) |
| معدل صرفي الشهري | monthly_average (NEW) |
| شو الفئة اللي ما صرفت عليها | unused_categories (NEW) |

### 💪 Health & Gym - New Questions (~15)
| Question | Intent |
|----------|--------|
| كم تمرين صدر عملت | workout_by_muscle (NEW) |
| شو أكثر عضلة اشتغلت عليها | most_trained_muscle (NEW) |
| كم ساعة تمرين هالشهر | total_workout_hours (NEW) |
| معدل مدة التمرين | avg_workout_duration (NEW) |
| شو الفرق بين وزني الحالي والشهر الفائت | weight_change (NEW) |
| أقل وزن وصلتلو | lowest_weight (NEW) |
| أعلى وزن وصلتلو | highest_weight (NEW) |
| كم مرة سجلت وزني | weight_entries_count (NEW) |
| شو آخر 3 أوزان سجلتها | last_3_weights (NEW) |
| كم سكوب بروتين أخذت هالشهر | supplement_doses_count (NEW) |
| شو المكمل اللي أكثر استخدمتو | most_used_supplement (NEW) |
| شو آخر مكمل أخذتو | last_supplement (NEW) |
| كم يوم أخذت كمالات هالشهر | supplement_days_count (NEW) |
| كم مرة تمرنت هالأسبوع | workouts_count + week |
| معدل تمارين بالأسبوع | avg_workouts_weekly (NEW) |

### 🎮 Entertainment - New Questions (~15)
| Question | Intent |
|----------|--------|
| كم فيلم شفت هالشهر | movies_watched (NEW) |
| كم حلقة شفت | episodes_watched (NEW) |
| شو آخر فيلم شفته | last_movie (NEW) |
| شو آخر مسلسل بلشته | last_series (NEW) |
| كم لعبة خلصت | games_completed (NEW) |
| شو أطول مسلسل عندي | longest_series (NEW) |
| كم صرفت على الألعاب | games_total_spent (NEW) |
| شو اللعبة اللي أكثر صرفت عليها | most_expensive_game (NEW) |
| كم لعبة PS5 عندي | games_by_platform (NEW) |
| كم لعبة PC عندي | games_by_platform (NEW) |
| شو أنواع الأفلام عندي | movie_genres (NEW) |
| كم فيلم أكشن شفت | movies_by_genre (NEW) |
| شو الفيلم اللي أعلى تقييم IMDB | highest_rated_movie (NEW) |
| شو المسلسل اللي أعلى تقييم | highest_rated_series (NEW) |
| اقترح فيلم أشوفه | suggest_movie (NEW) |

### 🌟 Dreams - New Questions (~10)
| Question | Intent |
|----------|--------|
| كم حلم حققت | completed_dreams (NEW) |
| شو أقرب حلم لتاريخ الهدف | nearest_deadline_dream (NEW) |
| شو الحلم اللي أقرب للإكمال | closest_to_complete (NEW) |
| كم خطوة باقي لأحقق أحلامي | remaining_steps (NEW) |
| شو الحلم اللي أغلى | most_expensive_dream (NEW) |
| كم حلم ملغي عندي | cancelled_dreams (NEW) |
| كم حلم موقوف | paused_dreams (NEW) |
| شو آخر حلم أضفتو | last_added_dream (NEW) |
| كم حلم سفر عندي | dreams_by_type (NEW) |
| شو تقدم أحلامي | dreams_overall_progress (NEW) |

### 🕌 Prayer & Schedule - New Questions (~10)
| Question | Intent |
|----------|--------|
| كم مرة صليت الظهر | prayer_by_name (NEW) |
| كم مرة صليت العصر | prayer_by_name (NEW) |
| كم مرة صليت المغرب | prayer_by_name (NEW) |
| كم مرة صليت العشاء | prayer_by_name (NEW) |
| شو أكثر صلاة صليتها | most_prayed (NEW) |
| شو أقل صلاة صليتها | least_prayed (NEW) |
| معدل صلواتي اليومي | prayer_daily_avg |
| كم يوم صليت فيه كل الصلوات | full_prayer_days (NEW) |
| شو عندي بكرا بالجدول | tomorrow_schedule (NEW) |
| كم مهمة خلصت هالأسبوع | completed_tasks (NEW) |

### 🔄 Comparison - New Questions (~10)
| Question | Intent |
|----------|--------|
| قارن الأكل مع السيارة | compare_categories |
| قارن هالأسبوع مع الأسبوع الفائت | weekly_comparison (NEW) |
| قارن يناير مع فبراير | month_to_month (NEW) |
| قارن صرفي اليوم مع مبارح | day_comparison (NEW) |
| قارن الألعاب مع الأفلام (صرف) | compare_entertainment (NEW) |
| قارن PS5 مع PC | compare_platforms (NEW) |
| قارن الأفلام مع المسلسلات | compare_media_types (NEW) |
| قارن وزني الشهر الفائت مع هالشهر | weight_comparison (NEW) |
| قارن تمارين هالشهر مع الفائت | workout_comparison (NEW) |
| قارن صلواتي هالأسبوع مع الفائت | prayer_comparison (NEW) |

### 📊 Stats & Insights - New Questions (~15)
| Question | Intent |
|----------|--------|
| لخصلي الشهر | monthly_summary (NEW) |
| شو إحصائياتي | overall_stats (NEW) |
| أعطيني تقرير مالي | financial_report (NEW) |
| كيف كانت السنة ماليًا | yearly_review (NEW) |
| شو أنجزت هالشهر | monthly_achievements (NEW) |
| كم يوم متتالي تمرنت | workout_streak (NEW) |
| كم يوم متتالي صليت الفجر | fajr_streak (NEW) |
| شو أكثر شي صرفت عليه | top_spending_item (NEW) |
| شو أقل شي صرفت عليه | lowest_spending_item (NEW) |
| شو اليوم اللي أكثر صرفت فيه بالأسبوع | busiest_day_of_week (NEW) |
| كم صرفت بالسبت | day_of_week_spending (NEW) |
| كم صرفت يوم الجمعة | day_of_week_spending (NEW) |
| شو معدل إنجازي بالأحلام | dream_completion_rate (NEW) |
| كم تمرين عملت هالسنة | yearly_workout_count (NEW) |
| شو الحساب اللي أكثر صرفت منه | most_used_account (NEW) |

## Add Expense Intent
Since the assistant is a floating bubble overlay, it can't directly open the drawer. Instead:

1. **Option A**: Guide user to the Financial page
   - Reply: "🧾 بدك تضيف صرفة؟\nروح لصفحة Wallet واختار أي فئة وابدأ بالتسجيل!"
   - Show chip: "روح للمحفظة"

2. **Option B**: (Future) Add a simple quick-add within the assistant
   - Parse "صرفت 50 شيكل على حشاش" and add directly via `addTransaction()`

For now, implement **Option A** as it's simpler and consistent with current UX.

## File Changes

| File | Change |
|------|--------|
| `src/components/dashboard/AssistantBubble.tsx` | Add ~40 new intents, expand SUGGESTION_GROUPS with more diverse questions, add "add_expense" guidance intent |

## New Intents Summary (40+ new handlers)
- `most_expensive_day` - GROUP BY day ORDER BY SUM DESC
- `cheapest_day` - GROUP BY day ORDER BY SUM ASC
- `category_percentages` - Calculate % per category
- `transactions_count` - COUNT transactions
- `biggest_transaction` - MAX amount
- `smallest_transaction` - MIN amount
- `last_5_transactions` - Last 5 with details
- `evening_spending` - time >= 18:00
- `morning_spending` - time < 12:00
- `weekend_spending` - day_of_week in (5,6)
- `unique_places_count` - COUNT DISTINCT subcategory_id
- `workout_by_muscle` - Filter by muscle_groups
- `most_trained_muscle` - Most common in muscle_groups
- `total_workout_hours` - SUM duration
- `weight_change` - Current vs previous month
- `lowest_weight` / `highest_weight` - MIN/MAX
- `supplement_doses_count` - SUM doses_taken
- `most_used_supplement` - GROUP BY supplement_id
- `movies_watched` - COUNT completed movies
- `episodes_watched` - COUNT watched episodes
- `last_movie` / `last_series` - Latest watched
- `games_by_platform` - Filter by platform
- `completed_dreams` - status='completed'
- `dreams_overall_progress` - AVG progress
- `prayer_by_name` - Filter by prayer_name
- `full_prayer_days` - Days with 5 prayers
- `tomorrow_schedule` - Tomorrow's activities
- `monthly_summary` - Combined stats output
- `add_expense` - Guidance to wallet page

Single file change. All 100 questions will be covered by existing + new intents.

