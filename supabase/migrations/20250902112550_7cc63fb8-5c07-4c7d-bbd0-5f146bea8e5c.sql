-- Create clothes table
CREATE TABLE public.clothes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- t-shirt, jeans, shoes, jacket, etc.
  colors TEXT[] NOT NULL DEFAULT '{}', -- array of detected colors
  style_tags TEXT[] NOT NULL DEFAULT '{}', -- casual, formal, sporty, etc.
  season TEXT, -- spring, summer, fall, winter
  image_url TEXT NOT NULL, -- URL to the background-removed image
  original_image_url TEXT, -- URL to the original image
  worn_count INTEGER NOT NULL DEFAULT 0,
  last_worn DATE,
  confidence_score NUMERIC, -- AI detection confidence
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create outfits table
CREATE TABLE public.outfits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  top_id UUID REFERENCES public.clothes(id),
  bottom_id UUID REFERENCES public.clothes(id),
  shoes_id UUID REFERENCES public.clothes(id),
  jacket_id UUID REFERENCES public.clothes(id),
  score NUMERIC DEFAULT 0, -- outfit matching score
  created_by TEXT DEFAULT 'ai', -- 'ai' or 'user'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wear history table
CREATE TABLE public.wear_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outfit_id UUID REFERENCES public.outfits(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weather TEXT, -- sunny, rainy, cold, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user preferences table
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  styles TEXT[] NOT NULL DEFAULT '{}', -- preferred styles
  favorite_colors TEXT[] NOT NULL DEFAULT '{}',
  disliked_colors TEXT[] NOT NULL DEFAULT '{}',
  weather_integration BOOLEAN DEFAULT false,
  location TEXT, -- for weather API
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create outfit plan table (optional)
CREATE TABLE public.outfit_plan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER NOT NULL, -- 1-7 (Monday-Sunday)
  outfit_id UUID REFERENCES public.outfits(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clothes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wear_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfit_plan ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on authentication needs)
CREATE POLICY "Anyone can view clothes" ON public.clothes FOR SELECT USING (true);
CREATE POLICY "Anyone can create clothes" ON public.clothes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update clothes" ON public.clothes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete clothes" ON public.clothes FOR DELETE USING (true);

CREATE POLICY "Anyone can view outfits" ON public.outfits FOR SELECT USING (true);
CREATE POLICY "Anyone can create outfits" ON public.outfits FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update outfits" ON public.outfits FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete outfits" ON public.outfits FOR DELETE USING (true);

CREATE POLICY "Anyone can view wear history" ON public.wear_history FOR SELECT USING (true);
CREATE POLICY "Anyone can create wear history" ON public.wear_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update wear history" ON public.wear_history FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete wear history" ON public.wear_history FOR DELETE USING (true);

CREATE POLICY "Anyone can view preferences" ON public.user_preferences FOR SELECT USING (true);
CREATE POLICY "Anyone can create preferences" ON public.user_preferences FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update preferences" ON public.user_preferences FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete preferences" ON public.user_preferences FOR DELETE USING (true);

CREATE POLICY "Anyone can view outfit plan" ON public.outfit_plan FOR SELECT USING (true);
CREATE POLICY "Anyone can create outfit plan" ON public.outfit_plan FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update outfit plan" ON public.outfit_plan FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete outfit plan" ON public.outfit_plan FOR DELETE USING (true);

-- Create storage bucket for wardrobe images
INSERT INTO storage.buckets (id, name, public) VALUES ('wardrobe', 'wardrobe', true);

-- Create storage policies
CREATE POLICY "Anyone can view wardrobe images" ON storage.objects FOR SELECT USING (bucket_id = 'wardrobe');
CREATE POLICY "Anyone can upload wardrobe images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'wardrobe');
CREATE POLICY "Anyone can update wardrobe images" ON storage.objects FOR UPDATE USING (bucket_id = 'wardrobe');
CREATE POLICY "Anyone can delete wardrobe images" ON storage.objects FOR DELETE USING (bucket_id = 'wardrobe');

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers
CREATE TRIGGER update_clothes_updated_at BEFORE UPDATE ON public.clothes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_outfits_updated_at BEFORE UPDATE ON public.outfits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_outfit_plan_updated_at BEFORE UPDATE ON public.outfit_plan FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();