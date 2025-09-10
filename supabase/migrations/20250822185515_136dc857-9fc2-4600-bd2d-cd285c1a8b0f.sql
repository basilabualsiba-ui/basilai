-- Add recurring activity support to daily_activities table
ALTER TABLE public.daily_activities 
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN recurrence_type TEXT DEFAULT 'daily' CHECK (recurrence_type IN ('daily', 'weekly', 'monthly')),
ADD COLUMN created_date DATE DEFAULT CURRENT_DATE;