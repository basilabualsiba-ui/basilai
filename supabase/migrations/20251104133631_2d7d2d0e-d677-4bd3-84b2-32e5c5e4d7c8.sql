-- Create dreams table
CREATE TABLE public.dreams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'in_progress',
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  estimated_cost NUMERIC,
  target_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  why_important TEXT,
  lessons_learned TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  cover_image_url TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dream_photos table
CREATE TABLE public.dream_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  is_before BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dream_steps table
CREATE TABLE public.dream_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dream_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dream_steps ENABLE ROW LEVEL SECURITY;

-- Create policies for dreams
CREATE POLICY "Dreams are viewable by everyone" 
ON public.dreams FOR SELECT USING (true);

CREATE POLICY "Anyone can create dreams" 
ON public.dreams FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update dreams" 
ON public.dreams FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete dreams" 
ON public.dreams FOR DELETE USING (true);

-- Create policies for dream_photos
CREATE POLICY "Dream photos are viewable by everyone" 
ON public.dream_photos FOR SELECT USING (true);

CREATE POLICY "Anyone can create dream photos" 
ON public.dream_photos FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete dream photos" 
ON public.dream_photos FOR DELETE USING (true);

-- Create policies for dream_steps
CREATE POLICY "Dream steps are viewable by everyone" 
ON public.dream_steps FOR SELECT USING (true);

CREATE POLICY "Anyone can create dream steps" 
ON public.dream_steps FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update dream steps" 
ON public.dream_steps FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete dream steps" 
ON public.dream_steps FOR DELETE USING (true);

-- Create trigger for automatic timestamp updates on dreams
CREATE TRIGGER update_dreams_updated_at
BEFORE UPDATE ON public.dreams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();