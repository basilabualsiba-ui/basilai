

# Add Average Comparison + Per-Category Average Intents

## New Intents to Add (in `AssistantBubble.tsx`)

### 1. Compare Daily Average Between Months
**Intent ID**: `compare_daily_average`
**Keywords**: `قارن المعدل اليومي`, `معدل يومي هالشهر مع`, `فرق المعدل اليومي`, `قارن المعدل لليوم`, `المعدل اليومي مقارنة`, `معدل يوم هالشهر والفائت`
**Logic**: Fetch expenses for current month + previous month, compute `total / uniqueDays` for each, show both with arrow + percentage difference.

### 2. Compare Weekly Average Between Months
**Intent ID**: `compare_weekly_average`
**Keywords**: `قارن المعدل الأسبوعي`, `معدل أسبوعي هالشهر مع`, `فرق المعدل الاسبوعي`, `قارن المعدل للأسبوع`, `المعدل الاسبوعي مقارنة`
**Logic**: Same as above but divide by weeks instead of days.

### 3. Compare Monthly Average (Overall)
**Intent ID**: `compare_monthly_average`
**Keywords**: `قارن المعدل الشهري`, `قارن المعدل للشهور`, `معدلات الشهور`, `قارن المعدل لليومين والاسبوعين للاشهر`
**Logic**: Show a combined view: daily avg this month vs last, weekly avg this month vs last, total this month vs last -- all in one response.

### 4. Average Spending Per Category
**Intent ID**: `avg_spending_by_category`
**Keywords**: `معدل الصرف حسب الفئات`, `المعدل حسب الفئات`, `متوسط كل فئة`, `معدل كل فئة`, `كم المعدل حسب الفئات`, `معدل صرفي بكل فئة`
**Logic**: Fetch all expenses for period, group by category, compute `categoryTotal / uniqueDays` for daily avg per category. Show sorted list.

### 5. Expand Keywords on Existing Intents

| Intent | New Keywords |
|--------|-------------|
| `daily_average` | `كم المعدل اليومي`, `المعدل باليوم`, `بالمعدل كل يوم`, `average يومي`, `كم بصرف باليوم` |
| `weekly_average` | `كم المعدل الأسبوعي`, `المعدل بالأسبوع`, `بالمعدل كل أسبوع`, `كم بصرف بالأسبوع` |
| `monthly_average` | `كم المعدل الشهري`, `المعدل بالشهر`, `بالمعدل كل شهر`, `كم بصرف بالشهر` |
| `monthly_comparison` | `قارن الشهور`, `قارن مع الشهر الفائت`, `مقارنة شهرية` |

### 6. Follow-up Chips for New Intents

```typescript
compare_daily_average: ["📊 قارن المعدل الأسبوعي", "📊 حسب الفئات", "💰 كم صرفت هالشهر؟"],
compare_weekly_average: ["📊 قارن المعدل اليومي", "📊 حسب الفئات", "💰 كم صرفت هالشهر؟"],
compare_monthly_average: ["📊 حسب الفئات", "📍 حسب الأماكن", "📊 المعدل حسب الفئات"],
avg_spending_by_category: ["📊 حسب الفئات", "📍 حسب الأماكن", "📊 معدل يومي", "🔄 قارن المعدل لهالشهر مع الفائت"],
```

### 7. Update SUGGESTION_GROUPS

Add to "📊 تحليل" group:
- `"قارن المعدل اليومي مع الشهر الفائت"`
- `"قارن المعدل الأسبوعي مع الفائت"`
- `"كم المعدل حسب الفئات هالشهر؟"`

All changes in a single file: `src/components/dashboard/AssistantBubble.tsx`.

