-- Create icons table for custom user icons
CREATE TABLE public.icons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.icons ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own icons" 
ON public.icons 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own icons" 
ON public.icons 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own icons" 
ON public.icons 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own icons" 
ON public.icons 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage bucket for custom icons
INSERT INTO storage.buckets (id, name, public) VALUES ('account-icons', 'account-icons', true);

-- Create policies for icon uploads
CREATE POLICY "Users can view account icons" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'account-icons');

CREATE POLICY "Users can upload their own account icons" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'account-icons' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own account icons" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'account-icons' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own account icons" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'account-icons' AND auth.uid()::text = (storage.foldername(name))[1]);