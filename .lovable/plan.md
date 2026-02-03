
# خطة إصلاح روز 🌹 - التعلم التفاعلي والذكاء المحلي

## المشاكل اللي لقيتها

من الكود والصور:

1. **روز بتحكي "مش فاهمة" بدل ما تسأل الـ AI أو تطلب تعليم**
2. **لما الـ AI مش متوفر (402)، بتوقف بدون ما تعرض بديل**
3. **مافي طريقة سهلة للمستخدم يعلم روز خطوة بخطوة**
4. **العنوان مكتوب "Assistant" بدل "Roz" بالـ Index.tsx**
5. **الـ matching للأوامر ضعيف** - أوامر موجودة بس ما بتتطابق

---

## الحل المقترح

### 1. نظام "علميني" التفاعلي

بدل ما روز تحكي "مش فاهمة"، رح تطلب مساعدة:

```text
أنت: اعطيني مصروف اليوم
روز: 🌹 هاي جديدة علي! بتقدر تعلمني بواحدة من هالطرق:

📝 **طريقة 1 - علمني الخطوات:**
احكيلي: "علميني: اعطيني مصروف اليوم"
ورح أسألك شو أعمل خطوة بخطوة

🔄 **طريقة 2 - هاي نفس هاي:**
احكيلي: "هاي نفس: مصاريف اليوم"
ورح أفهم إنهم نفس الإشي

💡 **طريقة 3 - الجواب مباشرة:**
احكيلي: "تعلم: اعطيني مصروف = مصاريف اليوم"
```

### 2. تعليم خطوة بخطوة

```text
أنت: علميني: اعطيني مصروف اليوم
روز: 🌹 تمام! خليني أفهم...

شو بدك أعمل لما تحكي "اعطيني مصروف اليوم"؟

• احسب مصاريف اليوم 💰
• افتح صفحة المصاريف 📄
• شي تاني (اكتبلي)

---

أنت: احسب مصاريف اليوم
روز: 🌹 تمام! يعني "اعطيني مصروف اليوم" = "احسب مصاريف اليوم"

حفظت! 🎯 جربي هلأ قول "اعطيني مصروف اليوم"
```

### 3. المرادفات (هاي نفس هاي)

```text
أنت: هاي نفس: مصاريف اليوم
روز: 🌹 تمام! "اعطيني مصروف اليوم" = "مصاريف اليوم"

من هلأ لما تحكي "اعطيني مصروف اليوم" رح أفهم إنك بدك مصاريف اليوم! ✨
```

---

## التغييرات التقنية

### 1. تحديث `ProcessResult` interface

```typescript
interface ProcessResult {
  handled: boolean;
  response?: string;
  source: 'local' | 'cached' | 'ai';
  needsInput?: boolean;
  options?: string[];
  pendingAction?: any;
  shouldLearn?: boolean;
  originalQuery?: string;
  // ⭐ جديد - طلب تعليم
  askForTeaching?: boolean;
  teachingMode?: 'steps' | 'synonym' | 'direct';
}
```

### 2. إضافة `handleTeachingMode` في AssistantCommandProcessor

```typescript
// جدول جديد للمرادفات
interface Synonym {
  original: string;
  synonym: string;
  created_at: string;
}

// السياق الجديد
interface ConversationContext {
  // ... existing fields
  teachingMode?: 'awaiting_action' | 'awaiting_steps' | 'awaiting_synonym';
  teachingQuery?: string; // السؤال اللي بنتعلمه
  teachingSteps?: string[]; // الخطوات اللي جمعناها
}

// دالة جديدة للتعامل مع التعليم
private async handleTeachingRequest(normalized: string, original: string): Promise<ProcessResult | null> {
  // Pattern 1: علميني: [query]
  const teachMeMatch = original.match(/(?:علميني|علمني|عرفيني)[:؛\s]+(.+)/i);
  if (teachMeMatch) {
    const query = teachMeMatch[1].trim();
    this.context.teachingMode = 'awaiting_action';
    this.context.teachingQuery = query;
    
    return {
      handled: true,
      response: `${this.getRozPrefix()}تمام! خليني أفهم...\n\nشو بدك أعمل لما تحكي "${query}"?\n\n• احسب مصاريف 💰\n• اعرض معلومات 📊\n• افتح صفحة 📄\n• شي تاني (اكتبلي)`,
      source: 'local',
      needsInput: true,
      options: ['احسب مصاريف', 'اعرض معلومات', 'افتح صفحة']
    };
  }
  
  // Pattern 2: هاي نفس: [existing command]
  const synonymMatch = original.match(/(?:هاي نفس|نفس|يعني|زي)[:؛\s]+(.+)/i);
  if (synonymMatch && this.context.lastQuery) {
    const existingCommand = synonymMatch[1].trim();
    
    // Check if existingCommand is valid
    const existingResult = await this.process(existingCommand);
    if (existingResult.handled) {
      // Save synonym
      await supabase.from('roz_synonyms').insert({
        original_phrase: this.context.lastQuery,
        synonym_phrase: existingCommand
      });
      
      return {
        handled: true,
        response: `${this.getRozPrefix()}${this.random(DIALECT.learning)}\n\n"${this.context.lastQuery}" = "${existingCommand}"\n\nمن هلأ رح أفهمهم نفس الإشي! ✨`,
        source: 'local'
      };
    }
  }
  
  return null;
}

// دالة للتعامل مع متابعة التعليم
private async handleTeachingFollowUp(message: string): Promise<ProcessResult | null> {
  if (!this.context.teachingMode || !this.context.teachingQuery) {
    return null;
  }
  
  const normalized = this.normalize(message);
  
  if (this.context.teachingMode === 'awaiting_action') {
    // User is telling us what action to take
    const actionConfig = this.parseActionFromDescription(message);
    
    if (actionConfig.config) {
      // Save the learned pattern
      await supabase.from('learned_patterns').insert({
        trigger_phrases: [this.context.teachingQuery],
        intent_type: actionConfig.intent,
        action_config: actionConfig.config
      });
      
      this.context.teachingMode = undefined;
      this.context.teachingQuery = undefined;
      await this.reloadCommands();
      
      return {
        handled: true,
        response: `${this.getRozPrefix()}${this.random(DIALECT.learning)}\n\n**تعلمت:**\n"${this.context.teachingQuery}" = ${message}\n\nجربي هلأ! ✨`,
        source: 'local'
      };
    }
    
    // If we can't parse it, ask for clarification
    return {
      handled: true,
      response: `${this.getRozPrefix()}مش فاهمة "${message}"...\n\nممكن توضحلي أكتر؟ مثلاً:\n• "احسب مصاريف اليوم"\n• "اعرض مواقيت الصلاة"\n• "افتح صفحة الجيم"`,
      source: 'local',
      needsInput: true
    };
  }
  
  return null;
}
```

### 3. تحديث الـ fallback response

```typescript
// في process() بدل ما نرجع "مش فاهمة":
// Not understood - offer teaching options!
return { 
  handled: true,
  response: `${this.getRozPrefix()}هاي جديدة علي! 🤔\n\n` +
    `بتقدر تعلمني بواحدة من هالطرق:\n\n` +
    `📝 **علميني الخطوات:**\n` +
    `قول: "علميني: ${message}"\n\n` +
    `🔄 **هاي نفس أمر تاني:**\n` +
    `قول: "هاي نفس: [الأمر الموجود]"\n\n` +
    `💡 **أو احكيلي مباشرة:**\n` +
    `قول: "تعلم: ${message} = [شو أعمل]"`,
  source: 'local',
  askForTeaching: true,
  originalQuery: message
};
```

### 4. جدول المرادفات (Migration)

```sql
CREATE TABLE public.roz_synonyms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_phrase TEXT NOT NULL,
  synonym_phrase TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(original_phrase, synonym_phrase)
);

ALTER TABLE public.roz_synonyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on roz_synonyms"
ON public.roz_synonyms FOR ALL USING (true) WITH CHECK (true);
```

### 5. تحديث `matchCommand` لدعم المرادفات

```typescript
private matchCommand(normalized: string): Command | null {
  // First check synonyms
  for (const syn of this.cachedData.rozSynonyms) {
    if (normalized.includes(this.normalize(syn.original_phrase))) {
      // Replace with synonym and try again
      normalized = normalized.replace(
        this.normalize(syn.original_phrase), 
        this.normalize(syn.synonym_phrase)
      );
    }
  }
  
  // Then do normal matching with scoring
  let bestMatch: { command: Command; score: number } | null = null;
  
  for (const cmd of this.commands) {
    for (const pattern of cmd.trigger_patterns) {
      const patternNorm = this.normalize(pattern);
      
      // Exact match - highest priority
      if (normalized === patternNorm) {
        return cmd;
      }
      
      // Contains match with scoring
      if (normalized.includes(patternNorm) || patternNorm.includes(normalized)) {
        const score = cmd.priority + (patternNorm.length / Math.max(normalized.length, 1));
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { command: cmd, score };
        }
      }
    }
  }
  
  return bestMatch?.command || null;
}
```

### 6. تحديث `Index.tsx` - تغيير "Assistant" لـ "Roz"

```typescript
// Line 60-64
{showChat ? (
  <>
    <LayoutDashboard className="h-4 w-4" />
    {!isMobile && "Dashboard"}
  </>
) : (
  <>
    <MessageCircle className="h-4 w-4" />
    {!isMobile && "Roz"} // ⭐ بدل "Assistant"
  </>
)}
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `supabase/migrations/xxx_roz_synonyms.sql` | **جديد** - جدول المرادفات |
| `src/services/AssistantCommandProcessor.ts` | إضافة التعليم التفاعلي، المرادفات، تحسين الـ matching |
| `src/hooks/useAssistant.ts` | تحسين error handling للـ 402 |
| `src/pages/Index.tsx` | تغيير "Assistant" لـ "Roz" |
| `src/integrations/supabase/types.ts` | تحديث تلقائي بعد Migration |

---

## أمثلة على التفاعل بعد الإصلاح

### مثال 1: سؤال جديد - طلب تعليم
```
أنت: اعطيني مصروف اليوم
روز: 🌹 هاي جديدة علي! 🤔

بتقدر تعلمني بواحدة من هالطرق:

📝 علميني الخطوات:
قول: "علميني: اعطيني مصروف اليوم"

🔄 هاي نفس أمر تاني:
قول: "هاي نفس: مصاريف اليوم"

💡 أو احكيلي مباشرة:
قول: "تعلم: اعطيني مصروف = مصاريف اليوم"
```

### مثال 2: تعليم بالمرادفات
```
أنت: هاي نفس: مصاريف اليوم
روز: 🌹 تعلمت!

"اعطيني مصروف اليوم" = "مصاريف اليوم"

من هلأ رح أفهمهم نفس الإشي! ✨
```

### مثال 3: تعليم خطوة بخطوة
```
أنت: علميني: شو أكلت
روز: 🌹 تمام! خليني أفهم...

شو بدك أعمل لما تحكي "شو أكلت"?

• اعرض وجبات اليوم 🍽️
• اعرض السعرات 📊
• شي تاني (اكتبلي)

أنت: اعرض وجبات اليوم
روز: 🌹 تعلمت!

**تعلمت:**
"شو أكلت" = اعرض وجبات اليوم

جربي هلأ! ✨
```

### مثال 4: السؤال بعد التعليم
```
أنت: اعطيني مصروف اليوم
روز: 🌹 💸 **مصاريف اليوم:**

• أكل: 45 ₪
• مواصلات: 20 ₪

**المجموع: 65 ₪** ⚡
```

---

## ترتيب التنفيذ

1. **Migration** - إنشاء جدول `roz_synonyms`
2. **AssistantCommandProcessor** - إضافة التعليم التفاعلي
3. **useAssistant** - تحسين error handling
4. **Index.tsx** - تغيير العنوان لـ "Roz"
