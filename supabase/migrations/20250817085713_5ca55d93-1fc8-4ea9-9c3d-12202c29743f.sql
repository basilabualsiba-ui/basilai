-- Disable RLS on all tables for single-user app
ALTER TABLE public.accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.icons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies since RLS is disabled
DROP POLICY IF EXISTS "Allow operations for single user app" ON public.accounts;
DROP POLICY IF EXISTS "Allow operations for single user app" ON public.categories;
DROP POLICY IF EXISTS "Allow operations for single user app" ON public.transactions;
DROP POLICY IF EXISTS "Allow operations for single user app" ON public.budgets;
DROP POLICY IF EXISTS "Allow operations for single user app" ON public.icons;
DROP POLICY IF EXISTS "Users can create subcategories for their categories" ON public.subcategories;
DROP POLICY IF EXISTS "Users can view subcategories of their categories" ON public.subcategories;
DROP POLICY IF EXISTS "Users can update subcategories of their categories" ON public.subcategories;
DROP POLICY IF EXISTS "Users can delete subcategories of their categories" ON public.subcategories;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Make user_id columns nullable since we won't be using them
ALTER TABLE public.accounts ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.categories ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.budgets ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.icons ALTER COLUMN user_id DROP NOT NULL;