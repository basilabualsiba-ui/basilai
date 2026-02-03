-- Create table for Roz synonyms (user-taught phrase mappings)
CREATE TABLE public.roz_synonyms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_phrase TEXT NOT NULL,
  synonym_phrase TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(original_phrase, synonym_phrase)
);

-- Enable RLS
ALTER TABLE public.roz_synonyms ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single user app)
CREATE POLICY "Allow all operations on roz_synonyms"
ON public.roz_synonyms FOR ALL USING (true) WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_roz_synonyms_original ON public.roz_synonyms(original_phrase);
CREATE INDEX idx_roz_synonyms_usage ON public.roz_synonyms(usage_count DESC);

-- Create trigger for updating timestamps
CREATE TRIGGER update_roz_synonyms_updated_at
BEFORE UPDATE ON public.roz_synonyms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();