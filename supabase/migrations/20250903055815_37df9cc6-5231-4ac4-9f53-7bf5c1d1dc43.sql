-- Add brand and image_embedding columns to clothes table
ALTER TABLE public.clothes 
ADD COLUMN brand text,
ADD COLUMN image_embedding vector(512);

-- Create index for similarity search on embeddings
CREATE INDEX IF NOT EXISTS clothes_embedding_idx ON public.clothes 
USING ivfflat (image_embedding vector_cosine_ops)
WITH (lists = 100);

-- Create function to find similar clothes by embedding
CREATE OR REPLACE FUNCTION public.find_similar_clothes(
  query_embedding vector(512),
  similarity_threshold float DEFAULT 0.7,
  match_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  brand text,
  colors text[],
  style_tags text[],
  image_url text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    c.id,
    c.name,
    c.type,
    c.brand,
    c.colors,
    c.style_tags,
    c.image_url,
    1 - (c.image_embedding <=> query_embedding) as similarity
  FROM clothes c
  WHERE c.image_embedding IS NOT NULL
    AND 1 - (c.image_embedding <=> query_embedding) > similarity_threshold
  ORDER BY c.image_embedding <=> query_embedding
  LIMIT match_limit;
$$;