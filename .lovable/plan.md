
# Local Personal Assistant System - Roz 2.0

## Overview

This plan creates a **query-based local personal assistant** that works entirely with the app's database using predefined and dynamically generated queries. The assistant maps user questions to database queries, executes them locally, and formats results using AI-generated natural language.

---

## System Architecture

```text
+------------------+     +----------------------+     +------------------+
|                  |     |                      |     |                  |
|   User Question  | --> |  Query Matcher       | --> |  Query Executor  |
|                  |     |  (Pattern Matching)  |     |  (Supabase)      |
+------------------+     +----------------------+     +------------------+
                                   |                          |
                                   v                          v
                         +------------------+     +------------------+
                         |                  |     |                  |
                         |  Query Library   |     |  Result Formatter|
                         |  (Saved Queries) |     |  (AI Response)   |
                         +------------------+     +------------------+
```

---

## Database Schema (28 Tables)

### Financial (6 tables)
| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `accounts` | id, name, amount, currency, type | Bank/cash accounts |
| `transactions` | id, amount, type, category_id, subcategory_id, account_id, date | All financial transactions |
| `categories` | id, name, type (income/expense), icon | Transaction categories |
| `subcategories` | id, name, category_id, location | Merchants/places |
| `budgets` | id, category_id, amount, month, year | Monthly budgets |
| `currency_ratios` | from_currency, to_currency, rate | Exchange rates |

### Gym/Fitness (13 tables)
| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `exercises` | id, name, muscle_group, equipment, difficulty_level | Exercise library |
| `exercise_sets` | id, exercise_id, session_id, weight, reps, set_number | Workout sets |
| `workout_sessions` | id, scheduled_date, completed_at, muscle_groups, with_trainer | Training sessions |
| `workout_plans` | id, name, is_active, start_date | Training programs |
| `workout_plan_days` | id, plan_id, day_of_week, muscle_groups | Daily plan schedule |
| `muscle_groups` | id, name, color | Body parts |
| `user_body_stats` | id, weight, height, recorded_at | Body measurements |

### Food/Nutrition (6 tables)
| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `food_items` | id, name, calories, protein, carbs, fat | Food database |
| `meals` | id, name, meal_type, total_calories | Meal definitions |
| `meal_plans` | id, name, is_active, start_date | Weekly meal plans |
| `meal_consumptions` | id, meal_plan_meal_id, consumed_at | Food consumption log |

### Dreams/Goals (3 tables)
| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `dreams` | id, title, status, progress_percentage, estimated_cost | Life goals |
| `dream_steps` | id, dream_id, title, is_completed | Goal milestones |
| `dream_photos` | id, dream_id, photo_url | Progress photos |

### Prayer (2 tables)
| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `prayer_times` | id, date, fajr, dhuhr, asr, maghrib, isha | Daily prayer times |
| `prayer_completions` | id, prayer_name, completion_date | Prayer tracking |

### Supplements (2 tables)
| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `supplements` | id, name, remaining_doses, total_doses, warning_threshold | Supplement inventory |
| `supplement_logs` | id, supplement_id, doses_taken, logged_date | Intake tracking |

### Schedule (2 tables)
| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `daily_activities` | id, title, start_time, is_recurring, days_of_week | Daily schedule |
| `activity_completions` | id, activity_id, completion_date | Completion tracking |

---

## New Database Tables

### 1. `assistant_queries` - Saved Query Library

```sql
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
```

**query_config structure:**
```json
{
  "table": "transactions",
  "select": ["amount", "date", "categories.name"],
  "joins": [{"table": "categories", "on": "category_id"}],
  "filters": [
    {"column": "type", "operator": "eq", "value": "expense"},
    {"column": "date", "operator": "gte", "value": "{start_date}"},
    {"column": "subcategory_id", "operator": "eq", "value": "{place_id}"}
  ],
  "aggregation": {"type": "sum", "column": "amount"},
  "group_by": ["category_id"],
  "order_by": {"column": "date", "ascending": false},
  "limit": 10
}
```

### 2. `assistant_synonyms` - Word Mappings

```sql
CREATE TABLE public.assistant_synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  synonyms TEXT[] NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(word)
);
```

### 3. `assistant_pending_queries` - Queries Awaiting Approval

```sql
CREATE TABLE public.assistant_pending_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_query JSONB NOT NULL,
  suggestion_reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Pre-built Query Library (Initial Seed)

### Financial Queries

```json
[
  {
    "query_name": "spending_today",
    "category": "financial",
    "purpose": "Total spending for today",
    "trigger_patterns": ["كم صرفت اليوم", "مصاريف اليوم", "spending today"],
    "query_config": {
      "table": "transactions",
      "select": ["amount", "categories.name", "subcategories.name"],
      "joins": [
        {"table": "categories", "on": "category_id"},
        {"table": "subcategories", "on": "subcategory_id"}
      ],
      "filters": [
        {"column": "type", "operator": "eq", "value": "expense"},
        {"column": "date", "operator": "eq", "value": "{today}"}
      ],
      "aggregation": {"type": "sum", "column": "amount"}
    },
    "output_template": "صرفت اليوم {total} شيكل"
  },
  {
    "query_name": "spending_by_place",
    "category": "financial",
    "purpose": "Spending at a specific merchant/place",
    "trigger_patterns": ["كم صرفت على {place}", "كم صرفت في {place}", "كم صرفت ب{place}"],
    "query_config": {
      "table": "transactions",
      "select": ["amount", "date", "subcategories.name"],
      "joins": [{"table": "subcategories", "on": "subcategory_id"}],
      "filters": [
        {"column": "type", "operator": "eq", "value": "expense"},
        {"column": "subcategory_id", "operator": "eq", "value": "{place_id}"},
        {"column": "date", "operator": "gte", "value": "{start_date}"}
      ],
      "aggregation": {"type": "sum", "column": "amount"}
    },
    "output_template": "صرفت على {place} {total} شيكل {period}"
  },
  {
    "query_name": "monthly_spending_by_category",
    "category": "financial",
    "purpose": "Spending breakdown by category this month",
    "trigger_patterns": ["مصاريف الشهر", "كم صرفت هالشهر", "monthly expenses"],
    "query_config": {
      "table": "transactions",
      "select": ["categories.name", "sum:amount"],
      "joins": [{"table": "categories", "on": "category_id"}],
      "filters": [
        {"column": "type", "operator": "eq", "value": "expense"},
        {"column": "date", "operator": "gte", "value": "{month_start}"}
      ],
      "group_by": ["category_id"],
      "order_by": {"column": "sum", "ascending": false}
    }
  },
  {
    "query_name": "account_balances",
    "category": "financial",
    "purpose": "Current balance of all accounts",
    "trigger_patterns": ["كم معي فلوس", "رصيدي", "حساباتي", "my balance"],
    "query_config": {
      "table": "accounts",
      "select": ["name", "amount", "currency"],
      "aggregation": {"type": "sum", "column": "amount"}
    },
    "output_template": "الرصيد الإجمالي: {total} شيكل"
  },
  {
    "query_name": "budget_status",
    "category": "financial",
    "purpose": "Budget vs actual spending this month",
    "trigger_patterns": ["الميزانية", "كم باقيلي", "budget status"],
    "query_config": {
      "table": "budgets",
      "select": ["categories.name", "amount"],
      "joins": [{"table": "categories", "on": "category_id"}],
      "filters": [
        {"column": "month", "operator": "eq", "value": "{current_month}"},
        {"column": "year", "operator": "eq", "value": "{current_year}"}
      ],
      "computed": ["spent_amount", "remaining_percentage"]
    }
  }
]
```

### Gym/Fitness Queries

```json
[
  {
    "query_name": "today_workout",
    "category": "gym",
    "purpose": "Today's planned workout",
    "trigger_patterns": ["شو تمريني اليوم", "تمرين اليوم", "today's workout"],
    "query_config": {
      "table": "workout_plan_days",
      "select": ["muscle_groups", "name", "start_time"],
      "joins": [{"table": "workout_plans", "on": "plan_id"}],
      "filters": [
        {"column": "workout_plans.is_active", "operator": "eq", "value": true},
        {"column": "day_of_week", "operator": "eq", "value": "{today_dow}"}
      ]
    }
  },
  {
    "query_name": "workouts_this_month",
    "category": "gym",
    "purpose": "Count of completed workouts this month",
    "trigger_patterns": ["كم تمرين عملت هالشهر", "workouts this month"],
    "query_config": {
      "table": "workout_sessions",
      "select": ["count:id"],
      "filters": [
        {"column": "completed_at", "operator": "not_null"},
        {"column": "scheduled_date", "operator": "gte", "value": "{month_start}"}
      ]
    },
    "output_template": "عملت {count} تمارين هالشهر 💪"
  },
  {
    "query_name": "trainer_sessions_count",
    "category": "gym",
    "purpose": "Count of trainer sessions this month",
    "trigger_patterns": ["كم جلسة مع المدرب", "جلسات المدرب", "trainer sessions"],
    "query_config": {
      "table": "workout_sessions",
      "select": ["count:id"],
      "filters": [
        {"column": "with_trainer", "operator": "eq", "value": true},
        {"column": "completed_at", "operator": "not_null"},
        {"column": "scheduled_date", "operator": "gte", "value": "{month_start}"}
      ]
    }
  },
  {
    "query_name": "weight_progress",
    "category": "gym",
    "purpose": "Weight tracking progress",
    "trigger_patterns": ["وزني", "تقدم الوزن", "weight progress"],
    "query_config": {
      "table": "user_body_stats",
      "select": ["weight", "recorded_at"],
      "order_by": {"column": "recorded_at", "ascending": false},
      "limit": 10
    }
  },
  {
    "query_name": "max_weight_exercise",
    "category": "gym",
    "purpose": "Personal record for an exercise",
    "trigger_patterns": ["أعلى وزن في {exercise}", "رقمي القياسي", "PR for {exercise}"],
    "query_config": {
      "table": "exercise_sets",
      "select": ["max:weight", "reps", "created_at"],
      "joins": [{"table": "exercises", "on": "exercise_id"}],
      "filters": [
        {"column": "exercises.name", "operator": "ilike", "value": "%{exercise}%"}
      ]
    }
  }
]
```

### Prayer Queries

```json
[
  {
    "query_name": "prayer_times_today",
    "category": "prayer",
    "purpose": "Today's prayer times",
    "trigger_patterns": ["مواقيت الصلاة", "اوقات الصلاة", "prayer times"],
    "query_config": {
      "table": "prayer_times",
      "select": ["fajr", "dhuhr", "asr", "maghrib", "isha"],
      "filters": [
        {"column": "date", "operator": "eq", "value": "{today}"}
      ]
    }
  },
  {
    "query_name": "next_prayer",
    "category": "prayer",
    "purpose": "Next upcoming prayer",
    "trigger_patterns": ["الصلاة الجاية", "متى الصلاة", "next prayer"],
    "query_config": {
      "table": "prayer_times",
      "select": ["fajr", "dhuhr", "asr", "maghrib", "isha"],
      "filters": [
        {"column": "date", "operator": "eq", "value": "{today}"}
      ],
      "computed": ["next_prayer_from_current_time"]
    }
  },
  {
    "query_name": "prayer_completion_rate",
    "category": "prayer",
    "purpose": "Prayer completion percentage this week",
    "trigger_patterns": ["نسبة الصلوات", "صلواتي هالاسبوع"],
    "query_config": {
      "table": "prayer_completions",
      "select": ["count:id"],
      "filters": [
        {"column": "completion_date", "operator": "gte", "value": "{week_start}"}
      ],
      "computed": ["percentage_of_35"]
    }
  }
]
```

### Supplements Queries

```json
[
  {
    "query_name": "supplements_status",
    "category": "supplements",
    "purpose": "Current supplement stock levels",
    "trigger_patterns": ["المكملات", "كم باقي مكملات", "supplement status"],
    "query_config": {
      "table": "supplements",
      "select": ["name", "remaining_doses", "total_doses", "warning_threshold"]
    }
  },
  {
    "query_name": "low_stock_supplements",
    "category": "supplements",
    "purpose": "Supplements running low",
    "trigger_patterns": ["مكملات خلصت", "لازم اشتري", "low supplements"],
    "query_config": {
      "table": "supplements",
      "select": ["name", "remaining_doses"],
      "filters": [
        {"column": "remaining_doses", "operator": "lte", "column_ref": "warning_threshold"}
      ]
    }
  },
  {
    "query_name": "supplements_due_today",
    "category": "supplements",
    "purpose": "Supplements not yet taken today",
    "trigger_patterns": ["شو لازم آخذ اليوم", "مكملات اليوم"],
    "query_config": {
      "table": "supplements",
      "select": ["name", "dose_unit"],
      "computed": ["not_logged_today"]
    }
  }
]
```

### Dreams/Goals Queries

```json
[
  {
    "query_name": "active_dreams",
    "category": "dreams",
    "purpose": "Current active goals and their progress",
    "trigger_patterns": ["احلامي", "اهدافي", "my goals", "my dreams"],
    "query_config": {
      "table": "dreams",
      "select": ["title", "progress_percentage", "target_date"],
      "filters": [
        {"column": "status", "operator": "eq", "value": "in_progress"}
      ],
      "order_by": {"column": "progress_percentage", "ascending": false}
    }
  },
  {
    "query_name": "dream_progress",
    "category": "dreams",
    "purpose": "Detailed progress of a specific dream",
    "trigger_patterns": ["تقدم حلم {dream}", "كم خلصت من {dream}"],
    "query_config": {
      "table": "dreams",
      "select": ["title", "progress_percentage", "description"],
      "joins": [{"table": "dream_steps", "on": "id=dream_id"}],
      "filters": [
        {"column": "title", "operator": "ilike", "value": "%{dream}%"}
      ]
    }
  }
]
```

### Schedule Queries

```json
[
  {
    "query_name": "today_schedule",
    "category": "schedule",
    "purpose": "Today's activities and schedule",
    "trigger_patterns": ["جدول اليوم", "شو عندي اليوم", "today's schedule"],
    "query_config": {
      "table": "daily_activities",
      "select": ["title", "start_time", "end_time", "is_completed"],
      "filters": [
        {"column": "date", "operator": "eq", "value": "{today}"}
      ],
      "order_by": {"column": "start_time", "ascending": true}
    }
  }
]
```

---

## File Structure

```
src/
├── components/
│   └── assistant/
│       ├── AssistantChat.tsx          # Main chat interface
│       ├── AssistantInput.tsx         # Voice + text input
│       ├── AssistantMessage.tsx       # Message bubble with formatting
│       ├── QuerySuggestions.tsx       # Quick action buttons
│       └── QueryApprovalDialog.tsx    # Review & approve new queries
├── services/
│   └── LocalAssistant/
│       ├── index.ts                   # Main export
│       ├── QueryMatcher.ts            # Pattern matching engine
│       ├── QueryExecutor.ts           # Supabase query runner
│       ├── ResponseFormatter.ts       # AI-like response generation
│       ├── VariableResolver.ts        # {place}, {date} resolution
│       ├── SynonymResolver.ts         # Word synonym handling
│       └── QueryLibrary.ts            # Query CRUD operations
├── hooks/
│   └── useLocalAssistant.ts           # React hook for assistant
└── types/
    └── assistant.ts                   # TypeScript interfaces
```

---

## Core Components

### 1. QueryMatcher.ts - Pattern Matching Engine

```typescript
interface MatchResult {
  query: SavedQuery;
  confidence: number;
  extractedVariables: Record<string, string>;
}

class QueryMatcher {
  private queries: SavedQuery[];
  private synonyms: Map<string, string[]>;
  
  // Normalize Arabic text
  private normalize(text: string): string;
  
  // Extract variables from patterns like {place}, {date}
  private extractVariables(pattern: string, input: string): Record<string, string>;
  
  // Match user input to query patterns
  public match(userInput: string): MatchResult | null;
  
  // Score similarity between input and pattern
  private calculateSimilarity(input: string, pattern: string): number;
}
```

### 2. QueryExecutor.ts - Database Query Runner

```typescript
interface QueryResult {
  data: any[];
  aggregations?: Record<string, number>;
  error?: string;
}

class QueryExecutor {
  // Build Supabase query from config
  private buildQuery(config: QueryConfig, variables: Record<string, any>): PostgrestQuery;
  
  // Execute query and return results
  public async execute(query: SavedQuery, variables: Record<string, any>): Promise<QueryResult>;
  
  // Handle computed fields (next_prayer, percentage, etc.)
  private computeFields(data: any[], computations: string[]): any[];
}
```

### 3. ResponseFormatter.ts - Natural Language Generator

```typescript
class ResponseFormatter {
  // Format query results into natural language
  public format(template: string, data: QueryResult, variables: Record<string, any>): string;
  
  // Generate response when no template exists
  public generateResponse(queryName: string, data: QueryResult): string;
  
  // Format numbers with Arabic numerals and currency
  private formatNumber(num: number, type: 'currency' | 'count' | 'percentage'): string;
  
  // Format dates in Arabic
  private formatDate(date: Date, format: 'full' | 'relative'): string;
}
```

### 4. VariableResolver.ts - Dynamic Value Resolution

```typescript
class VariableResolver {
  // Resolve system variables
  public resolveSystemVariables(): Record<string, any> {
    return {
      today: new Date().toISOString().split('T')[0],
      yesterday: /* ... */,
      week_start: /* ... */,
      month_start: /* ... */,
      current_month: new Date().getMonth() + 1,
      current_year: new Date().getFullYear(),
      today_dow: new Date().getDay() || 7,
      current_time: /* ... */
    };
  }
  
  // Resolve entity variables (place names to IDs)
  public async resolveEntityVariables(
    variables: Record<string, string>
  ): Promise<Record<string, any>>;
}
```

---

## User Flow

### Flow 1: Basic Query

```text
User: "كم صرفت اليوم؟"
        |
        v
+------------------+
| QueryMatcher     |
| Match: spending_today (95% confidence)
| Variables: {}
+------------------+
        |
        v
+------------------+
| VariableResolver |
| {today} = "2026-02-04"
+------------------+
        |
        v
+------------------+
| QueryExecutor    |
| SELECT SUM(amount) FROM transactions
| WHERE type='expense' AND date='2026-02-04'
| Result: 127.50
+------------------+
        |
        v
+------------------+
| ResponseFormatter|
| Template: "صرفت اليوم {total} شيكل"
| Output: "صرفت اليوم 127.50 شيكل"
+------------------+
```

### Flow 2: Query with Variables

```text
User: "كم صرفت على الحشاش هالشهر؟"
        |
        v
+------------------+
| QueryMatcher     |
| Match: spending_by_place (90% confidence)
| Variables: {place: "الحشاش", period: "هالشهر"}
+------------------+
        |
        v
+------------------+
| VariableResolver |
| - Lookup subcategory "حشاش" -> ID: abc123
| - {start_date} = month_start
+------------------+
        |
        v
+------------------+
| QueryExecutor    |
| SELECT SUM(amount) FROM transactions
| WHERE subcategory_id='abc123' 
|   AND date >= '2026-02-01'
| Result: 340.00
+------------------+
        |
        v
+------------------+
| ResponseFormatter|
| "صرفت على الحشاش 340 شيكل هالشهر"
+------------------+
```

### Flow 3: No Match - Teaching Mode

```text
User: "كم أكلت بروتين اليوم؟"
        |
        v
+------------------+
| QueryMatcher     |
| No match found!
+------------------+
        |
        v
+------------------+
| Teaching Mode    |
| "ما فهمت السؤال. ممكن تعلمني؟
|  
|  اختر واحدة:
|  📝 علمني كيف أجاوب على هاي
|  🔄 هاي نفس سؤال تاني
|  ⏭️ تخطي"
+------------------+
```

---

## Teaching System

### Method 1: Step-by-Step Teaching

```text
User: "علمني"
Assistant: "تمام! شو السؤال اللي بدك إياني أفهمه؟"
User: "كم أكلت بروتين"
Assistant: "شو لازم أعمل لما تسألني هيك؟
  • احسب بروتين الوجبات اليوم
  • اعرض وجبات اليوم
  • شي تاني"
User: "احسب بروتين الوجبات اليوم"
Assistant: "حفظت! ✅
  'كم أكلت بروتين' = احسب مجموع البروتين من وجبات اليوم"
```

### Method 2: Synonym Mapping

```text
User: "هاي نفس: مصاريف اليوم"
Assistant: "تمام! من هلأ:
  'كم دفعت اليوم' = 'مصاريف اليوم'"
```

### Method 3: AI-Suggested Queries

The system analyzes database structure and suggests new queries:

```text
Assistant: "💡 اقتراحات أسئلة جديدة:

1. كم سعرة حرارية أكلت اليوم؟
   (مجموع السعرات من meal_consumptions)

2. ما هو أكثر تمرين عملته؟
   (التمرين الأكثر تكراراً في exercise_sets)

3. كم يوم متتالي أكملت الصلوات؟
   (streak من prayer_completions)

تريد أحفظ أي وحدة؟"
```

---

## UI Components

### Main Chat Interface

```text
┌─────────────────────────────────────────────────┐
│  🌹 Roz - Local Assistant                   ⚙️  │
│  مساعدك المحلي - يعمل بدون انترنت              │
├─────────────────────────────────────────────────┤
│                                                 │
│  [User] كم صرفت على الحشاش هالشهر؟            │
│                                                 │
│  [Roz] 📍 صرفت على الحشاش 340₪ هالشهر         │
│        ━━━━━━━━━━━━━━━━━━━━━━━━━━              │
│        📅 آخر زيارة: أمس                        │
│        📊 معدل: 85₪/أسبوع                       │
│                                                 │
├─────────────────────────────────────────────────┤
│  Quick Actions:                                 │
│  [💰 مصاريف] [🕌 صلاة] [💪 جيم] [📅 جدول]      │
│                                                 │
├─────────────────────────────────────────────────┤
│  [🎤]  اكتب سؤالك...                   [إرسال] │
└─────────────────────────────────────────────────┘
```

### Query Management Dialog

```text
┌─────────────────────────────────────────────────┐
│  📚 إدارة الأسئلة المحفوظة                      │
├─────────────────────────────────────────────────┤
│  🔍 بحث: [________________]                    │
│                                                 │
│  💰 مالية (12 سؤال)                            │
│  ├─ كم صرفت اليوم           ✏️ 🗑️              │
│  ├─ كم صرفت على {مكان}      ✏️ 🗑️              │
│  ├─ رصيد الحسابات           ✏️ 🗑️              │
│  └─ ...                                        │
│                                                 │
│  💪 جيم (8 أسئلة)                              │
│  ├─ تمرين اليوم             ✏️ 🗑️              │
│  └─ ...                                        │
│                                                 │
│  ➕ [إضافة سؤال جديد]                          │
├─────────────────────────────────────────────────┤
│  💡 اقتراحات الذكاء (3)                         │
│  [مراجعة الاقتراحات]                           │
└─────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Database Setup
1. Create `assistant_queries` table with initial seed data
2. Create `assistant_synonyms` table with common Arabic synonyms
3. Create `assistant_pending_queries` for AI suggestions

### Phase 2: Core Services
1. Implement `QueryMatcher.ts` with Arabic normalization
2. Implement `QueryExecutor.ts` for Supabase queries
3. Implement `VariableResolver.ts` for date/entity resolution
4. Implement `ResponseFormatter.ts` for natural language

### Phase 3: UI Components
1. Create `AssistantChat.tsx` main interface
2. Create `AssistantInput.tsx` with voice support
3. Create `AssistantMessage.tsx` with rich formatting
4. Create `QueryApprovalDialog.tsx` for teaching

### Phase 4: Integration
1. Add assistant toggle to Index.tsx
2. Create `useLocalAssistant.ts` hook
3. Wire up all components

### Phase 5: Refinement
1. Add more pre-built queries
2. Implement synonym learning
3. Add query suggestions engine

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/xxx_assistant_queries.sql` | **NEW** - Database tables |
| `src/services/LocalAssistant/QueryMatcher.ts` | **NEW** |
| `src/services/LocalAssistant/QueryExecutor.ts` | **NEW** |
| `src/services/LocalAssistant/ResponseFormatter.ts` | **NEW** |
| `src/services/LocalAssistant/VariableResolver.ts` | **NEW** |
| `src/services/LocalAssistant/SynonymResolver.ts` | **NEW** |
| `src/services/LocalAssistant/QueryLibrary.ts` | **NEW** |
| `src/services/LocalAssistant/index.ts` | **NEW** |
| `src/types/assistant.ts` | **NEW** |
| `src/hooks/useLocalAssistant.ts` | **NEW** |
| `src/components/assistant/AssistantChat.tsx` | **NEW** |
| `src/components/assistant/AssistantInput.tsx` | **NEW** |
| `src/components/assistant/AssistantMessage.tsx` | **NEW** |
| `src/components/assistant/QuerySuggestions.tsx` | **NEW** |
| `src/components/assistant/QueryApprovalDialog.tsx` | **NEW** |
| `src/pages/Index.tsx` | **MODIFY** - Add assistant toggle |

---

## Key Features

1. **100% Local Execution** - No external AI calls for answered questions
2. **Query-Based Architecture** - Predictable, debuggable, extensible
3. **Teaching System** - Users can teach new questions step-by-step
4. **Synonym Support** - Understands Arabic word variations
5. **Rich Responses** - Formatted output with related data
6. **Quick Actions** - Common queries as buttons
7. **Voice Support** - Arabic speech recognition
8. **Query Management** - View, edit, delete saved queries
9. **AI Suggestions** - System suggests new useful queries
