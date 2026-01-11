-- Create assistant_commands table for reference commands
CREATE TABLE public.assistant_commands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_patterns TEXT[] NOT NULL,
  response_template TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'response',
  action_config JSONB,
  category TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  requires_context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assistant_commands ENABLE ROW LEVEL SECURITY;

-- Allow public read (no auth in this app)
CREATE POLICY "Anyone can read assistant commands"
ON public.assistant_commands
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert assistant commands"
ON public.assistant_commands
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update assistant commands"
ON public.assistant_commands
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete assistant commands"
ON public.assistant_commands
FOR DELETE
USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_assistant_commands_updated_at
BEFORE UPDATE ON public.assistant_commands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial commands
INSERT INTO public.assistant_commands (trigger_patterns, response_template, action_type, action_config, category, priority) VALUES
-- Greetings
('{"مرحبا","هاي","hello","hi","اهلا","السلام عليكم","هلا","صباح الخير","مساء الخير"}', 'مرحبا باسل! كيف يمكنني مساعدتك اليوم؟ 😊', 'response', NULL, 'greeting', 10),
('{"شكرا","thanks","thank you","مشكور","يسلمو"}', 'على الرحب والسعة! هل تحتاج شيء آخر؟ 🙏', 'response', NULL, 'greeting', 10),
('{"باي","bye","مع السلامة","وداعا"}', 'مع السلامة باسل! أتمنى لك يوماً رائعاً! 👋', 'response', NULL, 'greeting', 10),

-- Identity
('{"ما اسمك","شو اسمك","who are you","مين انت","مين انتي"}', 'أنا روز 🌹، مساعدتك الشخصية الذكية! أنا هنا لمساعدتك في إدارة مصاريفك، تمارينك، مكملاتك، وأحلامك.', 'response', NULL, 'identity', 10),
('{"كيف حالك","كيفك","how are you","شو اخبارك"}', 'أنا بخير، شكراً لسؤالك! 😊 كيف يمكنني مساعدتك اليوم؟', 'response', NULL, 'greeting', 10),

-- Time & Date
('{"كم الساعة","what time","الوقت","الساعة كم","كم الوقت"}', '', 'action', '{"type": "get_time"}', 'time', 20),
('{"ما هو اليوم","what day","اي يوم","شو اليوم","ما التاريخ","شو التاريخ"}', '', 'action', '{"type": "get_date"}', 'date', 20),

-- Quick account queries (cached)
('{"كم عندي فلوس","كم معي","رصيدي","كم بالحساب","مصاري"}', '', 'action', '{"type": "get_accounts_summary"}', 'finance', 15),
('{"كم بالكاش","الكاش","النقد"}', '', 'action', '{"type": "get_account", "account_name": "Cash"}', 'finance', 15),

-- Gym quick queries
('{"متى اخر تمرين","اخر تمرين","last workout"}', '', 'action', '{"type": "get_last_workout"}', 'gym', 15),
('{"هل تمرنت اليوم","تمرنت اليوم"}', '', 'action', '{"type": "check_today_workout"}', 'gym', 15),

-- Supplements
('{"مكملاتي","المكملات","supplements"}', '', 'action', '{"type": "get_supplements_status"}', 'supplements', 15),

-- Help
('{"مساعدة","help","شو بتقدري تساعديني","ماذا يمكنك","شو بتعرفي"}', 'يمكنني مساعدتك في:
💰 **المالية**: تتبع المصاريف، الميزانية، الحسابات
💪 **التمارين**: جدول التمارين، التقدم، آخر تمرين
💊 **المكملات**: التذكير، المخزون، الجرعات
🌟 **الأحلام**: متابعة أهدافك وتقدمك
⏰ **الوقت**: التاريخ والساعة

جرب تسألني أي سؤال! 😊', 'response', NULL, 'help', 5);

-- Create index for faster pattern matching
CREATE INDEX idx_assistant_commands_active ON public.assistant_commands(is_active, priority DESC);