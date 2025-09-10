-- Create monthly_budgets table for total monthly budget tracking
CREATE TABLE public.monthly_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_amount NUMERIC NOT NULL,
  spent_amount NUMERIC NOT NULL DEFAULT 0,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(month, year)
);

-- Create budget_recommendations table for category/subcategory spending suggestions
CREATE TABLE public.budget_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  monthly_budget_id UUID NOT NULL REFERENCES public.monthly_budgets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE CASCADE,
  recommended_amount NUMERIC NOT NULL,
  historical_average NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies for monthly_budgets
CREATE POLICY "Monthly budgets are viewable by everyone" 
ON public.monthly_budgets 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create monthly budgets" 
ON public.monthly_budgets 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update monthly budgets" 
ON public.monthly_budgets 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete monthly budgets" 
ON public.monthly_budgets 
FOR DELETE 
USING (true);

-- Create policies for budget_recommendations
CREATE POLICY "Budget recommendations are viewable by everyone" 
ON public.budget_recommendations 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create budget recommendations" 
ON public.budget_recommendations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update budget recommendations" 
ON public.budget_recommendations 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete budget recommendations" 
ON public.budget_recommendations 
FOR DELETE 
USING (true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_monthly_budgets_updated_at
BEFORE UPDATE ON public.monthly_budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budget_recommendations_updated_at
BEFORE UPDATE ON public.budget_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_monthly_budgets_month_year ON public.monthly_budgets(month, year);
CREATE INDEX idx_budget_recommendations_monthly_budget_id ON public.budget_recommendations(monthly_budget_id);
CREATE INDEX idx_budget_recommendations_category_id ON public.budget_recommendations(category_id);
CREATE INDEX idx_budget_recommendations_subcategory_id ON public.budget_recommendations(subcategory_id);