
# خطة بناء المساعدة الذكية المحلية "روز" 🌹

## الملخص
سنبني مساعدة ذكية محلية اسمها **روز** (أنثى) بلهجة جنينية فلسطينية، تتعلم من الـ AI الخارجي وتحفظ الأنماط محلياً للاستخدام المستقبلي.

---

## الميزات الرئيسية

### 1. التعلم التلقائي من AI الخارجي
- عندما روز ما بتفهم سؤال، بتسأل الـ Lovable AI
- بعد ما تحصل على الجواب، بتحلله وتحفظ النمط
- المرة الجاية نفس السؤال، بتجاوب محلياً بدون AI

### 2. وصول كامل لقاعدة البيانات
- كل الجداول (43 جدول) متاحة لروز
- بدون حدود على البيانات

### 3. الصوت
- مايكروفون للتحدث مع روز
- روز بتحكي (Text-to-Speech) بصوت عربي

### 4. شخصية روز
- اسمها: روز (🌹)
- أنثى - لهجة جنينية فلسطينية
- بتحفظ شو بتحب، شو بتعمل، أحلامك، عاداتك
- شخصية قابلة للتخصيص

### 5. واجهة تفاعلية حديثة
- رسائل متعددة إذا لزم
- أزرار خيارات تفاعلية
- مؤشر صوتي (موجات)
- تصميم عصري

---

## المخطط التقني

```
┌──────────────────────────────────────────────────────────────┐
│                    User Message                               │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 1: Check Roz's Memory & Learned Patterns               │
│  - user_preferences (personality, facts about user)          │
│  - learned_patterns (command patterns)                       │
│  - roz_knowledge (AI-learned responses)                      │
└──────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │ Found local pattern?          │
              ▼                               ▼
        ┌─────────┐                    ┌─────────────┐
        │  YES    │                    │    NO       │
        │ Respond │                    │ Ask Remote  │
        │ Locally │                    │    AI       │
        └─────────┘                    └─────────────┘
                                              │
                                              ▼
                                  ┌─────────────────────┐
                                  │ Learn from Response │
                                  │ Extract Pattern     │
                                  │ Save to Database    │
                                  └─────────────────────┘
```

---

## التغييرات المطلوبة

### Phase 1: قاعدة بيانات روز

**جدول جديد: `roz_knowledge`**
```sql
CREATE TABLE roz_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_pattern TEXT NOT NULL,           -- النمط المستخرج
  query_examples TEXT[] DEFAULT '{}',    -- أمثلة على الأسئلة
  response_type TEXT NOT NULL,           -- نوع الجواب (data_query, calculation, info)
  action_config JSONB,                   -- كيف تنفذ الطلب
  response_template TEXT,                -- قالب الرد
  learned_from_ai BOOLEAN DEFAULT true,  -- تعلمته من AI؟
  success_count INTEGER DEFAULT 0,       -- عدد النجاحات
  created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول شخصية روز
CREATE TABLE roz_personality (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trait_type TEXT NOT NULL,              -- name, tone, preferences
  trait_key TEXT NOT NULL,
  trait_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trait_type, trait_key)
);

-- جدول ذاكرة روز عن المستخدم
CREATE TABLE roz_user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_type TEXT NOT NULL,             -- habit, preference, fact, location
  memory_key TEXT NOT NULL,
  memory_value JSONB NOT NULL,
  context TEXT,                          -- السياق (gym, food, spending)
  confidence FLOAT DEFAULT 1.0,
  last_referenced TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### Phase 2: تحديث AssistantCommandProcessor.ts

**الإضافات الرئيسية:**

1. **شخصية روز**
```typescript
const ROZ_PERSONALITY = {
  name: 'روز',
  nameEn: 'Roz',
  gender: 'female',
  emoji: '🌹',
  dialect: {
    greetings: ['هلا!', 'أهلين!', 'كيفك؟', 'شو أخبارك؟'],
    affirmative: ['تمام!', 'ماشي!', 'زبط!', 'حاضر!'],
    thinking: ['استنى شوي...', 'خليني أشوف...', 'لحظة...'],
    notFound: ['مش لاقية', 'مافي', 'ما لقيت'],
    success: ['خلصت!', 'تم!', 'هيك أحسن!'],
    learning: ['تعلمت!', 'حفظت!', 'صار عندي!'],
    personality: ['أنا روز 🌹', 'خدامتك!', 'شو بدك مني؟']
  }
};
```

2. **التعلم من AI**
```typescript
async learnFromAIResponse(userQuery: string, aiResponse: string): Promise<void> {
  // Extract pattern from the query
  const pattern = this.extractQueryPattern(userQuery);
  
  // Detect what type of action was performed
  const actionConfig = this.detectActionFromResponse(aiResponse);
  
  // Save to roz_knowledge
  await supabase.from('roz_knowledge').insert({
    query_pattern: pattern,
    query_examples: [userQuery],
    response_type: actionConfig.type,
    action_config: actionConfig.config,
    response_template: this.createTemplate(aiResponse),
    learned_from_ai: true
  });
}
```

3. **وصول كامل للبيانات**
```typescript
// Cache ALL database tables
interface FullDatabaseCache {
  // Financial (6 tables)
  accounts: any[];
  transactions: any[];
  categories: any[];
  subcategories: any[];
  budgets: any[];
  currency_ratios: any[];
  
  // Gym (10 tables)
  workout_sessions: any[];
  workout_plans: any[];
  workout_plan_days: any[];
  exercises: any[];
  exercise_sets: any[];
  muscle_groups: any[];
  workouts: any[];
  workout_exercises: any[];
  plan_workouts: any[];
  workout_playlists: any[];
  
  // Food (6 tables)
  meals: any[];
  meal_plans: any[];
  meal_plan_meals: any[];
  meal_foods: any[];
  food_items: any[];
  meal_consumptions: any[];
  
  // Prayer (2 tables)
  prayer_times: any;
  prayer_completions: any[];
  
  // Schedule (2 tables)
  daily_activities: any[];
  activity_completions: any[];
  
  // Dreams (3 tables)
  dreams: any[];
  dream_steps: any[];
  dream_photos: any[];
  
  // Supplements (2 tables)
  supplements: any[];
  supplement_logs: any[];
  
  // Body & Personal
  user_body_stats: any[];
  user_preferences: any[];
  
  // Roz's Memory
  roz_knowledge: any[];
  roz_personality: any[];
  roz_user_memory: any[];
}
```

---

### Phase 3: واجهة صوت جديدة

**ملف جديد: `src/hooks/useVoiceChat.ts`**
```typescript
export function useVoiceChat() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Web Speech API - Speech Recognition
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA'; // Arabic
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
    };
    recognition.start();
  };
  
  // Text-to-Speech for Roz
  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.9;
    // Try to find Arabic female voice
    const voices = speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.includes('ar'));
    if (arabicVoice) utterance.voice = arabicVoice;
    speechSynthesis.speak(utterance);
  };
  
  return { isListening, isSpeaking, startListening, stopListening, speak };
}
```

---

### Phase 4: واجهة تفاعلية محدثة

**تحديث: `src/components/assistant/chat-interface.tsx`**

```
┌────────────────────────────────────────────┐
│  🌹 روز                              ⚙️ 🗑️  │
│  مساعدتك الشخصية                          │
├────────────────────────────────────────────┤
│                                            │
│  [User Avatar] مرحبا روز                   │
│                                            │
│  [Roz Avatar 🌹] هلا! كيفك؟                │
│  شو بدك مني؟                               │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 💰 مصاريف │ 🕌 صلاة │ 💪 جيم │ 🍽️ أكل │  │
│  └──────────────────────────────────────┘  │
│                                            │
├────────────────────────────────────────────┤
│  [🎤]  اكتب رسالة...              [إرسال]  │
│  ⬆️ Voice Waves Animation                  │
└────────────────────────────────────────────┘
```

**ميزات جديدة:**
- زر مايكروفون مع animation للموجات الصوتية
- صورة روز 🌹 بدل أيقونة Bot
- أزرار سريعة عربية
- مؤشر "روز بتفكر..." متحرك
- رسائل متعددة (Split long responses)

---

### Phase 5: تدفق التعلم

```
User: "كم صرفت على الحشاش هالشهر؟"
                     │
                     ▼
┌─────────────────────────────────────────────┐
│ روز: Check roz_knowledge for pattern        │
│ Pattern: "كم صرفت على {place} {period}"     │
└─────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │ Found?                  │
        ▼                         ▼
    ┌───────┐               ┌───────────────┐
    │  YES  │               │      NO       │
    │Execute│               │ Call Lovable  │
    │Locally│               │     AI        │
    └───────┘               └───────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────┐
                    │ AI Response:            │
                    │ "صرفت 240 شيكل على      │
                    │ الحشاش هالشهر"          │
                    └─────────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────┐
                    │ روز: Learn Pattern!     │
                    │                         │
                    │ Pattern: spending_place │
                    │ Config: {               │
                    │   type: get_spending,   │
                    │   params: [place,period]│
                    │ }                       │
                    │                         │
                    │ Save to roz_knowledge   │
                    └─────────────────────────┘
                                   │
                                   ▼
                    Next time: Answer locally! ⚡
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `supabase/migrations/xxx_roz_tables.sql` | **جديد** - جداول روز |
| `src/services/AssistantCommandProcessor.ts` | **تحديث كبير** - شخصية روز + تعلم من AI |
| `src/hooks/useVoiceChat.ts` | **جديد** - صوت |
| `src/hooks/useAssistant.ts` | **تحديث** - دعم الصوت + التعلم |
| `src/components/assistant/chat-interface.tsx` | **تحديث كبير** - واجهة حديثة |
| `src/components/assistant/chat-message.tsx` | **تحديث** - رسائل متعددة |
| `src/components/assistant/chat-input.tsx` | **تحديث** - زر مايكروفون |
| `src/components/assistant/quick-suggestions.tsx` | **تحديث** - عربي + أيقونات |
| `src/components/assistant/voice-visualizer.tsx` | **جديد** - موجات صوتية |
| `src/components/assistant/roz-avatar.tsx` | **جديد** - صورة روز |

---

## أمثلة على التفاعل

**مثال 1: سؤال جديد**
```
أنت: كم صرفت على حشاش امبارح؟
روز: 🌹 لحظة خليني أشوف...
      (تسأل AI الخارجي)
روز: 📍 صرفت 43 شيكل على حشاش امبارح!
      (تحفظ النمط للمستقبل)
```

**مثال 2: نفس السؤال لاحقاً**
```
أنت: كم صرفت على حشاش هالأسبوع؟
روز: 📍 صرفت 127 شيكل على حشاش هالأسبوع! ⚡
      (إجابة فورية - محلي!)
```

**مثال 3: حفظ شخصية**
```
أنت: روز خليكي تحكي معي بود أكتر
روز: 🌹 تمام حبيبي! من هلأ رح أكون أحلى معك ❤️
      (تحفظ في roz_personality)
```

**مثال 4: صوت**
```
🎤 (تضغط على المايكروفون)
أنت: (تحكي) "شو الصلاة الجاية؟"
روز: (تحكي بصوت) "صلاة المغرب الساعة 4:47!"
```

---

## الجدول الزمني

1. **Phase 1** (الآن): جداول قاعدة البيانات
2. **Phase 2** (التالي): تحديث AssistantCommandProcessor
3. **Phase 3** (التالي): واجهة الصوت
4. **Phase 4** (الأخير): الواجهة التفاعلية الجديدة
