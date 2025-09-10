-- Create storage bucket for muscle group photos
INSERT INTO storage.buckets (id, name, public) VALUES ('muscle-group-photos', 'muscle-group-photos', true);

-- Create storage policies for muscle group photos
CREATE POLICY "Muscle group photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'muscle-group-photos');

CREATE POLICY "Anyone can upload muscle group photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'muscle-group-photos');

CREATE POLICY "Anyone can update muscle group photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'muscle-group-photos');

CREATE POLICY "Anyone can delete muscle group photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'muscle-group-photos');