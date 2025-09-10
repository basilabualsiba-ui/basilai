-- Create storage bucket for account icons
INSERT INTO storage.buckets (id, name, public) VALUES ('account-icons', 'account-icons', true);

-- Create storage policies for account icons
CREATE POLICY "Account icons are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'account-icons');

CREATE POLICY "Users can upload account icons" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'account-icons');

CREATE POLICY "Users can update account icons" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'account-icons');

CREATE POLICY "Users can delete account icons" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'account-icons');

-- Create icons table for custom account icons
CREATE TABLE public.icons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on icons table
ALTER TABLE public.icons ENABLE ROW LEVEL SECURITY;

-- Create policies for icons (publicly readable for simplicity)
CREATE POLICY "Icons are viewable by everyone" 
ON public.icons 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert icons" 
ON public.icons 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete icons" 
ON public.icons 
FOR DELETE 
USING (true);

-- Create accounts table
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT 'Wallet',
  type TEXT NOT NULL DEFAULT 'cash' CHECK (type IN ('cash', 'bank', 'credit')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on accounts table
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for accounts (publicly accessible for now)
CREATE POLICY "Accounts are viewable by everyone" 
ON public.accounts 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create accounts" 
ON public.accounts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update accounts" 
ON public.accounts 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete accounts" 
ON public.accounts 
FOR DELETE 
USING (true);

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
  icon TEXT NOT NULL DEFAULT 'Wallet',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on categories table
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policies for categories
CREATE POLICY "Categories are viewable by everyone" 
ON public.categories 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update categories" 
ON public.categories 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete categories" 
ON public.categories 
FOR DELETE 
USING (true);

-- Create subcategories table
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on subcategories table
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- Create policies for subcategories
CREATE POLICY "Subcategories are viewable by everyone" 
ON public.subcategories 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create subcategories" 
ON public.subcategories 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update subcategories" 
ON public.subcategories 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete subcategories" 
ON public.subcategories 
FOR DELETE 
USING (true);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC(15,2) NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
  category_id UUID REFERENCES public.categories(id),
  subcategory_id UUID REFERENCES public.subcategories(id),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on transactions table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions
CREATE POLICY "Transactions are viewable by everyone" 
ON public.transactions 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update transactions" 
ON public.transactions 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete transactions" 
ON public.transactions 
FOR DELETE 
USING (true);

-- Create budgets table
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, month, year)
);

-- Enable RLS on budgets table
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Create policies for budgets
CREATE POLICY "Budgets are viewable by everyone" 
ON public.budgets 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create budgets" 
ON public.budgets 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update budgets" 
ON public.budgets 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete budgets" 
ON public.budgets 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subcategories_updated_at
  BEFORE UPDATE ON public.subcategories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default categories
INSERT INTO public.categories (name, type, icon) VALUES
  ('Food & Dining', 'expense', 'Coffee'),
  ('Transportation', 'expense', 'Car'),
  ('Shopping', 'expense', 'ShoppingCart'),
  ('Entertainment', 'expense', 'Gamepad2'),
  ('Bills & Utilities', 'expense', 'Building2'),
  ('Healthcare', 'expense', 'Building2'),
  ('Travel', 'expense', 'Plane'),
  ('Education', 'expense', 'BookOpen'),
  ('Gifts & Donations', 'expense', 'Gift'),
  ('Salary', 'income', 'Banknote'),
  ('Investments', 'income', 'Landmark'),
  ('Other Income', 'income', 'Wallet');

-- Insert some default subcategories
INSERT INTO public.subcategories (name, category_id) 
SELECT 'Restaurants', id FROM public.categories WHERE name = 'Food & Dining'
UNION ALL
SELECT 'Groceries', id FROM public.categories WHERE name = 'Food & Dining'
UNION ALL
SELECT 'Gas', id FROM public.categories WHERE name = 'Transportation'
UNION ALL
SELECT 'Public Transport', id FROM public.categories WHERE name = 'Transportation'
UNION ALL
SELECT 'Clothing', id FROM public.categories WHERE name = 'Shopping'
UNION ALL
SELECT 'Electronics', id FROM public.categories WHERE name = 'Shopping';