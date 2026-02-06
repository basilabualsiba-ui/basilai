
ALTER TABLE public.assistant_queries 
ADD COLUMN IF NOT EXISTS output_mode TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'query',
ADD COLUMN IF NOT EXISTS filter_code TEXT,
ADD COLUMN IF NOT EXISTS result_code TEXT;
