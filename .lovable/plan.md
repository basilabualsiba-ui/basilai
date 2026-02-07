

# Fix Assistant Errors, Add Queries, and Improve Teaching System

## Issues Found

### 1. Database Column Mismatches (Critical Bugs)
- **`get_accounts_balances_details`** query references `balance` column but accounts table uses `amount` -- needs to select `amount` instead of `balance`
- **`spending_yesterday`** query references `transactions.currency` -- this column does not exist in transactions table; the `currency` field is on the `accounts` table, not transactions

### 2. Missing Queries (User Requests)
The user wants many more query types:
- Top spending places/categories
- Spending at specific subcategory (e.g., "الحشاش")
- Monthly comparison (this month vs last month)
- Savings tracking
- Average daily spending
- Gym: bicep/tricep training details, muscle recovery, exercise details with photo/video
- Gym: last training date per muscle, exercise PR, workout count by muscle
- Dreams: "احلامي" not working (needs debugging)

### 3. AI Suggestions Quality
- The `suggest-query` edge function needs a more comprehensive schema (include actual column names and types, not just table names)
- AI should validate its output and self-correct
- Send full column details to AI so it generates correct queries

### 4. Pending Queries showing "لا توجد اقتراحات" 
- The pending queries page works but there are no pending queries -- this is correct behavior but needs a way to generate suggestions

### 5. Query Editor UX Improvements
- Add dropdowns for column selection based on selected table
- Better filter value suggestions

---

## Implementation Plan

### Step 1: Fix Broken Queries in Database

Fix the two broken seed queries:
- **`get_accounts_balances_details`**: Change `select: ["name", "balance", "currency"]` to `select: ["name", "amount", "currency"]`
- **`spending_yesterday`**: Remove `currency` from select since it doesn't exist on transactions; the query should just select `amount` and `subcategories.name`

This will be done via SQL update statements.

### Step 2: Add 20+ New Seed Queries

Add comprehensive queries across all categories:

**Financial (8 new):**
- `top_spending_places` - Top places by spending amount (table output)
- `top_spending_categories` - Top categories by spending (table output)
- `spending_this_month_vs_last` - Compare current month to previous month spending
- `savings_last_month` - Total savings (income - expenses) last month
- `average_daily_spending` - Average daily spending this month
- `spending_at_place_this_month` - Spending at specific subcategory this month
- `total_income_vs_expenses` - Income vs expenses summary
- `last_5_transactions` - Recent transactions list

**Gym (8 new):**
- `exercise_details` - Exercise info with photo, video, instructions by name
- `muscle_last_trained` - When was a specific muscle last trained
- `muscle_recovery_status` - All muscles and their recovery status
- `workouts_by_muscle` - How many times trained a specific muscle
- `exercise_pr` - Personal record (max weight) for an exercise
- `bicep_training` - Bicep workout history
- `tricep_training` - Tricep workout history
- `total_volume_this_month` - Total weight volume lifted this month

**Dreams (2 new):**
- Fix `active_dreams` query if broken, add more trigger patterns
- `completed_dreams` - List of completed goals

**General (2 new):**
- `my_stats_summary` - Overview of all app data (accounts, workouts, dreams)
- More trigger pattern synonyms for existing queries

### Step 3: Add Extensive Synonyms

Insert Arabic synonyms into `assistant_synonyms`:
- Financial: صرفت، دفعت، حطيت، مصروف، مصاري
- Gym: تمرين، جيم، نادي، رياضة، عضلة
- Prayer: صلاة، صلوات، مواقيت
- Time: اليوم، مبارح، هالشهر، هالاسبوع
- Places: الحشاش، حشاش (matching variations)

### Step 4: Improve AI Suggestion Edge Function

Update `suggest-query` to:
1. Send full schema with **actual column names and types** (not just table names)
2. Add instructions to validate column names exist
3. Add a second validation step in the prompt telling AI to double-check columns
4. Include examples of correct query configs in the system prompt
5. Add `result_code` and `filter_code` examples for complex queries

### Step 5: Improve Query Editor UX

- When a table is selected, fetch and show its columns as dropdown options for:
  - Select columns (multi-select checkboxes)
  - Filter columns (dropdown)
  - Order by column (dropdown)
  - Aggregation column (dropdown)
  - Join `on` field (dropdown of foreign key columns)
- Show column types next to names

### Step 6: Fix Dreams Query

Debug why "احلامي" doesn't return results:
- Check if the `active_dreams` query config correctly matches the `dreams` table columns
- Ensure `status` column value `in_progress` is correct (verify actual data)

### Step 7: Add Gym Exercise Detail Queries with Rich Output

For queries like "شو هاد التمرين bench press":
- Query exercises table for name, photo_url, video_url, instructions, muscle_group, equipment, difficulty_level
- Use `result_code` to format rich output with image/video links
- Add trigger patterns in Arabic and English

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/new_migration.sql` | Fix broken queries, add 20+ new queries, add synonyms |
| `supabase/functions/suggest-query/index.ts` | Send full column schema, add validation instructions |
| `src/components/assistant/QueryEditor.tsx` | Add column dropdowns based on selected table |
| `src/services/LocalAssistant/ResponseFormatter.ts` | Add gym exercise detail formatter with photo/video |
| `src/services/LocalAssistant/QueryExecutor.ts` | Handle exercise detail rich output |
| `src/hooks/useLocalAssistant.ts` | Pass schema with columns to AI function |
| `src/types/assistant.ts` | Add column metadata to TABLE_CATEGORIES |
| `src/components/assistant/DatabaseExplorer.tsx` | Export schema fetching for reuse |

---

## Technical Details

### Rich Exercise Output Format
When user asks about an exercise, the response will include:
```text
💪 Bench Press
📋 تمرين ضغط الصدر
🎯 العضلة: صدر | المعدات: بنش + بار
📊 الصعوبة: متوسط
🏆 أعلى وزن: 80 كغ
📸 [صورة]
🎬 [فيديو]
📝 التعليمات: ...
```

### Monthly Comparison Logic
Uses `result_code` to:
1. Fetch current month expenses
2. Compare with previous month (via date filter)
3. Calculate percentage change
4. Format as "صرفت هالشهر X شيكل (Y% أكثر/أقل من الشهر اللي قبل)"

### Schema for AI
Instead of sending just table names, send:
```json
{
  "name": "transactions",
  "category": "financial",
  "columns": [
    {"name": "id", "type": "uuid"},
    {"name": "amount", "type": "numeric"},
    {"name": "type", "type": "text"},
    {"name": "date", "type": "date"},
    ...
  ]
}
```

