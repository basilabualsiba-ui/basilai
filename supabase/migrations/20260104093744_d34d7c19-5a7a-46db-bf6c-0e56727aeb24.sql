-- Create user_preferences table for teachable assistant
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preference_type TEXT NOT NULL, -- 'shortcut', 'default', 'learned_behavior', 'correction'
  key TEXT NOT NULL, -- e.g., 'coffee' for shortcuts, 'default_account' for defaults
  value JSONB NOT NULL, -- e.g., {amount: 25, category: 'food', account: 'cash'}
  description TEXT, -- Human readable description
  usage_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth in this app)
CREATE POLICY "User preferences are viewable by everyone" 
ON public.user_preferences 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create user preferences" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update user preferences" 
ON public.user_preferences 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete user preferences" 
ON public.user_preferences 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_user_preferences_type_key ON public.user_preferences(preference_type, key);
CREATE INDEX idx_user_preferences_key ON public.user_preferences(key);