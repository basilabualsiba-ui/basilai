-- Enable RLS on new Roz tables
ALTER TABLE public.roz_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roz_personality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roz_user_memory ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (single user app)
CREATE POLICY "Allow all operations on roz_knowledge"
ON public.roz_knowledge FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on roz_personality"
ON public.roz_personality FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on roz_user_memory"
ON public.roz_user_memory FOR ALL USING (true) WITH CHECK (true);