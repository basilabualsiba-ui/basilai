

# Enhance Assistant: Alternative Phrasings + Follow-up Chips for Every Intent

## Overview
Expand every intent with more Arabic keyword variations and add contextual follow-up chips to every response, making the assistant feel like a real conversation.

## Changes (all in `AssistantBubble.tsx`)

### 1. Add Alternative Keywords to Every Intent

Expand `keywords` arrays with common Arabic phrasings. Examples:

| Intent | Current | Adding |
|--------|---------|--------|
| `total_spending` | كم صرفت | مصاريفي, مجموع الصرف, اجمالي مصاريف, قديش صرفت, أديش صرفت |
| `current_weight` | وزني, وزن | كم وزني, شو وزني, وزني هلق, وزني الحالي, كم وزني هلق |
| `last_transaction` | آخر اشي صرفتو | آخر صرفة عملتها, شو آخر مصروف, آخر اشي دفعتو, متى آخر مصروف |
| `workouts_count` | كم مرة اشتغلت | كم مرة تمرنت, كم تمرين عملت, كم مرة رحت الجيم, كم يوم تمرنت |
| `prayer_count` | كم صلاة | كم صلاة صليت, كم مرة صليت, نسبة صلواتي |
| `supplements_today` | كمالات | كمالاتي اليوم, شو أخذت اليوم, مكملاتي اليومية |
| `watching_now` | بتشاهد | شو عم بشاهد, شو بشوف, ايش بتابع |
| `active_dreams` | أحلام | أهدافي, شو أهدافي, طموحاتي |
| `schedule_today` | جدولي | شو عندي, ايش عندي, برنامج اليوم |
| `account_balances` | رصيدي | كم ضايل, كم بالحساب, كم فلوسي, كم معي فلوس |
| `games_count` | كم لعبة | شو ألعابي, ألعاب عندي |
| `media_count` | كم فيلم | كم شي شفت, مكتبتي |
| `monthly_summary` | لخصلي | عطيني ملخص, شو صار هالشهر |

...and similar expansions for all ~60+ intents.

### 2. Add "متى آخر مرة" Intents

New intents with high priority for "when was the last time" questions:

- **متى آخر مرة صرفت** → queries last expense date
- **متى آخر مرة تمرنت** → queries last workout date
- **متى آخر مرة صليت الفجر** → queries last fajr date
- **متى آخر مرة أخذت مكمل** → queries last supplement date
- **متى آخر مرة سجلت وزني** → queries last weight date
- **متى آخر مرة شفت فيلم** → queries last watched movie date

### 3. Add Follow-up Chips to EVERY Intent Response

Currently only spending intents get follow-ups. The plan is to build a `followUpMap` that maps each intent ID to relevant follow-up chips. After every intent handler runs, append appropriate chips.

```text
Intent Response Flow:
  [User asks] → [Intent matched] → [Handler runs] → [Add follow-up chips] → [Display]
```

Examples of follow-up chips per domain:

**Finance intents** (total_spending, daily_average, etc.):
- "📊 حسب الفئات", "📍 حسب الأماكن", "🔄 قارن مع الشهر الفائت", "💳 آخر 5 معاملات"

**Weight intents** (current_weight, weight_change, etc.):
- "📉 أقل وزن وصلتلو", "📈 أعلى وزن", "⚖️ فرق وزني", "📋 آخر 3 أوزان"

**Workout intents** (workouts_count, last_workout, etc.):
- "💪 أكثر عضلة", "⏱️ كم ساعة تمرين", "🔥 كم يوم متتالي", "📋 تفاصيل آخر تمرين"

**Prayer intents** (prayer_count, fajr_count, etc.):
- "🌅 كم فجر صليت", "🕌 أكثر صلاة", "✅ كم يوم كل الصلوات", "🔥 ستريك فجر"

**Supplement intents**:
- "💊 أكثر مكمل استخدمتو", "📅 كم يوم أخذت كمالات", "💊 آخر مكمل"

**Entertainment intents** (movies, series, games):
- "🎬 آخر فيلم شفته", "📺 شو بتشاهد", "⭐ أعلى تقييم", "🎮 كم صرفت على الألعاب"

**Dreams intents**:
- "🌟 أقرب للإكمال", "📋 كم خطوة باقي", "✅ كم حققت", "📊 تقدم أحلامي"

**Schedule intents**:
- "📋 شو عندي بكرا", "✅ كم مهمة خلصت هالأسبوع"

### 4. Update SUGGESTION_GROUPS

Add the new alternative phrasings to the suggestion groups so users see more variety.

### Implementation Approach

After `intent.handler()` returns a reply, instead of only checking `spendingIntents`, use a comprehensive mapping:

```typescript
const followUpChips: Record<string, string[]> = {
  // Finance
  total_spending: ["📊 حسب الفئات", "📍 حسب الأماكن", "💳 آخر 5 معاملات", "🔄 قارن مع الشهر الفائت"],
  // Health
  current_weight: ["📉 أقل وزن وصلتلو", "📈 أعلى وزن", "📋 آخر 3 أوزان", "⚖️ فرق وزني"],
  workouts_count: ["💪 أكثر عضلة اشتغلت عليها", "⏱️ كم ساعة تمرين", "📋 تفاصيل آخر تمرين"],
  // ... etc for all intents
};

const chips = followUpChips[intent.id];
if (chips) return { content: reply, reply_chips: chips };
```

This replaces the current limited spending-only follow-up logic with a universal system.

### Summary of Scale

- ~60+ intents get expanded keywords (2-5 new phrasings each)
- ~6 new "متى آخر مرة" intents added
- ~40+ intents get follow-up chips
- SUGGESTION_GROUPS updated with new phrasing variety

