import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Account {
  id: string;
  name: string;
  amount: number;
  icon: string;
  type: 'cash' | 'bank' | 'credit';
  currency: 'ILS' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'JOD' | 'TL';
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  subcategories: SubCategory[];
}

export interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
  location?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  categoryId: string;
  subcategoryId: string;
  accountId: string;
  date: Date;
  time?: string;
  description?: string;
  transferId?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  month: number;
  year: number;
  category?: Category;
}

// Simple monthly budget interface for compatibility
export interface MonthlyBudget {
  id: string;
  totalAmount: number;
  spentAmount: number;
  month: number;
  year: number;
  remainingAmount: number;
  dailyAllowance: number;
  daysRemaining: number;
}

interface FinancialContextType {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  monthlyBudgets: MonthlyBudget[];
  budgetRecommendations: any[];
  isLoading: boolean;
  addAccount: (account: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'subcategories'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Omit<Category, 'id' | 'subcategories'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addSubCategory: (categoryId: string, subcategory: Omit<SubCategory, 'id' | 'categoryId'>) => Promise<void>;
  updateSubCategory: (id: string, updates: Partial<Omit<SubCategory, 'id' | 'categoryId'>>) => Promise<void>;
  deleteSubCategory: (id: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  transferBetweenAccounts: (fromAccountId: string, toAccountId: string, amount: number, exchangeRate?: number, date?: Date, time?: string) => Promise<void>;
  addBudget: (budget: Omit<Budget, 'id'>) => Promise<void>;
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  getBudgetByCategory: (categoryId: string, month: number, year: number) => Budget | undefined;
  getSpentInCategory: (categoryId: string, month: number, year: number) => number;
  getTransactionsByDate: (date: Date) => Transaction[];
  getTransactionsByCategory: (categoryId: string) => Transaction[];
  getTransactionsByAccount: (accountId: string) => Transaction[];
  getTotalByCategory: () => { [key: string]: number };
  getAverageSpendingByCategory: (categoryId: string, months: number) => number;
  getDailySpendingAllowance: (categoryId: string, month: number, year: number) => number;
  getBudgetSuggestion: (categoryId: string) => number;
  distributeBudgetAcrossCategories: (totalAmount: number, month: number, year: number) => Promise<void>;
  getCategorySpendingDistribution: (months: number) => { [categoryId: string]: number };
  getMonthComparison: (month: number, year: number) => { current: number; previous: number; change: number };
  addMonthlyBudget: (totalAmount: number, month: number, year: number) => Promise<void>;
  updateMonthlyBudget: (id: string, updates: any) => Promise<void>;
  deleteMonthlyBudget: (id: string) => Promise<void>;
  getMonthlyBudget: (month: number, year: number) => MonthlyBudget | undefined;
  generateBudgetRecommendations: (monthlyBudgetId: string, month: number, year: number) => Promise<void>;
  getCurrentMonthSpent: () => number;
  refreshData: () => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setAccounts(data?.map(item => ({
        id: item.id,
        name: item.name,
        amount: parseFloat(item.amount.toString()),
        icon: item.icon,
        type: item.type as 'cash' | 'bank' | 'credit',
        currency: item.currency as 'ILS' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'JOD' | 'TL'
      })) || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch accounts",
        variant: "destructive"
      });
    }
  };

  const fetchCategories = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (categoriesError) throw categoriesError;

      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('subcategories')
        .select('*')
        .order('created_at', { ascending: true });

      if (subcategoriesError) throw subcategoriesError;

      const categoriesWithSubs = categoriesData?.map(cat => ({
        id: cat.id,
        name: cat.name,
        type: cat.type as 'income' | 'expense',
        icon: cat.icon,
        subcategories: subcategoriesData?.filter(sub => sub.category_id === cat.id).map(sub => ({
          id: sub.id,
          name: sub.name,
          categoryId: sub.category_id,
          location: sub.location
        })) || []
      })) || [];

      setCategories(categoriesWithSubs);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive"
      });
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      setTransactions(data?.map(item => {
        // Parse date correctly to avoid timezone issues
        const dateParts = item.date.split('-');
        const localDate = new Date(
          parseInt(dateParts[0]),
          parseInt(dateParts[1]) - 1,
          parseInt(dateParts[2])
        );
        
        return {
          id: item.id,
          amount: parseFloat(item.amount.toString()),
          type: item.type as 'income' | 'expense' | 'transfer',
          categoryId: item.category_id,
          subcategoryId: item.subcategory_id,
          accountId: item.account_id,
          date: localDate,
          time: item.time || '',
          description: item.description,
          transferId: item.transfer_id
        };
      }) || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive"
      });
    }
  };

  const fetchBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setBudgets(data?.map(item => ({
        id: item.id,
        categoryId: item.category_id,
        amount: parseFloat(item.amount.toString()),
        month: item.month,
        year: item.year
      })) || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch budgets",
        variant: "destructive"
      });
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchAccounts(),
      fetchCategories(),
      fetchTransactions(),
      fetchBudgets()
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const addAccount = async (account: Omit<Account, 'id'>) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .insert({
          name: account.name,
          amount: account.amount,
          icon: account.icon,
          type: account.type,
          currency: account.currency
        });

      if (error) throw error;
      await fetchAccounts();
    } catch (error) {
      console.error('Error adding account:', error);
      toast({
        title: "Error",
        description: "Failed to add account",
        variant: "destructive"
      });
    }
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          name: updates.name,
          amount: updates.amount,
          icon: updates.icon,
          type: updates.type,
          currency: updates.currency as any
        })
        .eq('id', id);

      if (error) throw error;
      await fetchAccounts();
    } catch (error) {
      console.error('Error updating account:', error);
      toast({
        title: "Error",
        description: "Failed to update account",
        variant: "destructive"
      });
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchAccounts();
      
      toast({
        title: "Success",
        description: "Account deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive"
      });
    }
  };

  const addCategory = async (category: Omit<Category, 'id' | 'subcategories'>) => {
    try {
      const { error } = await supabase
        .from('categories')
        .insert({
          name: category.name,
          type: category.type,
          icon: category.icon
        });

      if (error) throw error;
      await fetchCategories();
      
      toast({
        title: "Success",
        description: "Category added successfully"
      });
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive"
      });
    }
  };

  const updateCategory = async (id: string, updates: Partial<Omit<Category, 'id' | 'subcategories'>>) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: updates.name,
          type: updates.type,
          icon: updates.icon
        })
        .eq('id', id);

      if (error) throw error;
      await fetchCategories();
      
      toast({
        title: "Success",
        description: "Category updated successfully"
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive"
      });
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchCategories();
      
      toast({
        title: "Success",
        description: "Category deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive"
      });
    }
  };

  const addSubCategory = async (categoryId: string, subcategory: Omit<SubCategory, 'id' | 'categoryId'>) => {
    try {
      const { error } = await supabase
        .from('subcategories')
        .insert({
          category_id: categoryId,
          name: subcategory.name,
          location: subcategory.location
        });

      if (error) throw error;
      await fetchCategories();
      
      toast({
        title: "Success",
        description: "Subcategory added successfully"
      });
    } catch (error) {
      console.error('Error adding subcategory:', error);
      toast({
        title: "Error",
        description: "Failed to add subcategory",
        variant: "destructive"
      });
    }
  };

  const updateSubCategory = async (id: string, updates: Partial<Omit<SubCategory, 'id' | 'categoryId'>>) => {
    try {
      const { error } = await supabase
        .from('subcategories')
        .update({
          name: updates.name,
          location: updates.location
        })
        .eq('id', id);

      if (error) throw error;
      await fetchCategories();
      
      toast({
        title: "Success",
        description: "Subcategory updated successfully"
      });
    } catch (error) {
      console.error('Error updating subcategory:', error);
      toast({
        title: "Error",
        description: "Failed to update subcategory",
        variant: "destructive"
      });
    }
  };

  const deleteSubCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchCategories();
      
      toast({
        title: "Success",
        description: "Subcategory deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      toast({
        title: "Error",
        description: "Failed to delete subcategory",
        variant: "destructive"
      });
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          amount: transaction.amount,
          type: transaction.type,
          category_id: transaction.categoryId,
          subcategory_id: transaction.subcategoryId,
          account_id: transaction.accountId,
          date: transaction.date.toISOString().split('T')[0],
          time: transaction.time,
          description: transaction.description,
          transfer_id: transaction.transferId
        });

      if (error) throw error;

      // Update account balance
      const account = accounts.find(acc => acc.id === transaction.accountId);
      if (account) {
        const balanceChange = transaction.type === 'income' ? transaction.amount : -transaction.amount;
        await updateAccount(transaction.accountId, { amount: account.amount + balanceChange });
      }

      await fetchTransactions();
      
      toast({
        title: "Success",
        description: "Transaction added successfully"
      });
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive"
      });
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      // Build update object with only provided fields
      const updateData: any = {};
      
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
      if (updates.subcategoryId !== undefined) updateData.subcategory_id = updates.subcategoryId;
      if (updates.accountId !== undefined) updateData.account_id = updates.accountId;
      if (updates.date !== undefined) updateData.date = updates.date.toISOString().split('T')[0];
      if (updates.time !== undefined) updateData.time = updates.time;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.transferId !== undefined) updateData.transfer_id = updates.transferId;

      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      await fetchTransactions();
      
      toast({
        title: "Success",
        description: "Transaction updated successfully"
      });
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive"
      });
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const transaction = transactions.find(t => t.id === id);
      if (transaction) {
        // If this is a transfer, delete the paired transaction too
        if (transaction.type === 'transfer' && transaction.transferId) {
          const pairedTransaction = transactions.find(t => t.transferId === transaction.transferId && t.id !== id);
          if (pairedTransaction) {
            // Reverse balance changes for both accounts
            const fromAccount = accounts.find(acc => acc.id === transaction.accountId);
            const toAccount = accounts.find(acc => acc.id === pairedTransaction.accountId);
            
            if (fromAccount && toAccount) {
              // Determine which is the outgoing and incoming
              const isOutgoing = transaction.amount < 0;
              if (isOutgoing) {
                await updateAccount(transaction.accountId, { amount: fromAccount.amount - transaction.amount });
                await updateAccount(pairedTransaction.accountId, { amount: toAccount.amount - pairedTransaction.amount });
              } else {
                await updateAccount(transaction.accountId, { amount: fromAccount.amount - transaction.amount });
                await updateAccount(pairedTransaction.accountId, { amount: toAccount.amount - pairedTransaction.amount });
              }
            }

            // Delete both transactions
            await supabase.from('transactions').delete().eq('transfer_id', transaction.transferId);
          }
        } else {
          // Regular transaction - reverse the account balance change
          const account = accounts.find(acc => acc.id === transaction.accountId);
          if (account) {
            const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
            await updateAccount(transaction.accountId, { amount: account.amount + balanceChange });
          }
          
          await supabase.from('transactions').delete().eq('id', id);
        }
      } else {
        await supabase.from('transactions').delete().eq('id', id);
      }

      await fetchTransactions();
      
      toast({
        title: "Success",
        description: "Transaction deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive"
      });
    }
  };

  const transferBetweenAccounts = async (fromAccountId: string, toAccountId: string, amount: number, exchangeRate: number = 1, date?: Date, time?: string) => {
    try {
      const fromAccount = accounts.find(acc => acc.id === fromAccountId);
      const toAccount = accounts.find(acc => acc.id === toAccountId);

      if (!fromAccount || !toAccount) {
        throw new Error('Accounts not found');
      }

      const convertedAmount = amount * exchangeRate;
      const transferId = crypto.randomUUID();
      const transferDate = date || new Date();

      // Create outgoing transaction
      const outgoingTransaction = {
        amount: -amount,
        type: 'transfer' as const,
        categoryId: '',
        subcategoryId: '',
        accountId: fromAccountId,
        date: transferDate,
        time: time,
        description: `Transfer to ${toAccount.name}${exchangeRate !== 1 ? ` (Rate: ${exchangeRate})` : ''}`,
        transferId
      };

      // Create incoming transaction
      const incomingTransaction = {
        amount: convertedAmount,
        type: 'transfer' as const,
        categoryId: '',
        subcategoryId: '',
        accountId: toAccountId,
        date: transferDate,
        time: time,
        description: `Transfer from ${fromAccount.name}${exchangeRate !== 1 ? ` (Rate: ${1/exchangeRate})` : ''}`,
        transferId
      };

      // Insert both transactions
      const { error: outError } = await supabase.from('transactions').insert({
        amount: outgoingTransaction.amount,
        type: outgoingTransaction.type,
        account_id: outgoingTransaction.accountId,
        date: outgoingTransaction.date.toISOString().split('T')[0],
        time: outgoingTransaction.time,
        description: outgoingTransaction.description,
        transfer_id: transferId
      });

      if (outError) throw outError;

      const { error: inError } = await supabase.from('transactions').insert({
        amount: incomingTransaction.amount,
        type: incomingTransaction.type,
        account_id: incomingTransaction.accountId,
        date: incomingTransaction.date.toISOString().split('T')[0],
        time: incomingTransaction.time,
        description: incomingTransaction.description,
        transfer_id: transferId
      });

      if (inError) throw inError;

      // Update account balances
      await updateAccount(fromAccountId, { amount: fromAccount.amount - amount });
      await updateAccount(toAccountId, { amount: toAccount.amount + convertedAmount });
      
      await fetchTransactions();
    } catch (error) {
      console.error('Error transferring between accounts:', error);
      toast({
        title: "Error", 
        description: "Failed to transfer between accounts",
        variant: "destructive"
      });
    }
  };

  const addBudget = async (budget: Omit<Budget, 'id'>) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .insert({
          category_id: budget.categoryId,
          amount: budget.amount,
          month: budget.month,
          year: budget.year
        });

      if (error) throw error;
      await fetchBudgets();
      
      toast({
        title: "Success",
        description: "Budget added successfully"
      });
    } catch (error) {
      console.error('Error adding budget:', error);
      toast({
        title: "Error",
        description: "Failed to add budget",
        variant: "destructive"
      });
    }
  };

  const updateBudget = async (id: string, updates: Partial<Budget>) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .update({
          category_id: updates.categoryId,
          amount: updates.amount,
          month: updates.month,
          year: updates.year
        })
        .eq('id', id);

      if (error) throw error;
      await fetchBudgets();
    } catch (error) {
      console.error('Error updating budget:', error);
      toast({
        title: "Error",
        description: "Failed to update budget",
        variant: "destructive"
      });
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchBudgets();
      
      toast({
        title: "Success",
        description: "Budget deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast({
        title: "Error",
        description: "Failed to delete budget",
        variant: "destructive"
      });
    }
  };

  const getBudgetByCategory = (categoryId: string, month: number, year: number) => {
    return budgets.find(b => b.categoryId === categoryId && b.month === month && b.year === year);
  };

  const getSpentInCategory = (categoryId: string, month: number, year: number) => {
    return transactions
      .filter(t => 
        t.categoryId === categoryId && 
        t.type === 'expense' &&
        t.date.getMonth() + 1 === month &&
        t.date.getFullYear() === year
      )
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getTransactionsByDate = (date: Date) => {
    return transactions.filter(trans => 
      trans.date.toDateString() === date.toDateString()
    );
  };

  const getTransactionsByCategory = (categoryId: string) => {
    return transactions.filter(trans => trans.categoryId === categoryId);
  };

  const getTransactionsByAccount = (accountId: string) => {
    return transactions.filter(trans => trans.accountId === accountId);
  };

  const getTotalByCategory = () => {
    const totals: { [key: string]: number } = {};
    transactions.forEach(trans => {
      const category = categories.find(c => c.id === trans.categoryId);
      if (category) {
        totals[category.name] = (totals[category.name] || 0) + trans.amount;
      }
    });
    return totals;
  };

  const getAverageSpendingByCategory = (categoryId: string, months: number) => {
    const currentDate = new Date();
    const monthlySpending: number[] = [];

    for (let i = 1; i <= months; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      const spending = getSpentInCategory(categoryId, month, year);
      if (spending > 0) {
        monthlySpending.push(spending);
      }
    }

    return monthlySpending.length > 0 
      ? monthlySpending.reduce((sum, amount) => sum + amount, 0) / monthlySpending.length 
      : 0;
  };

  const getDailySpendingAllowance = (categoryId: string, month: number, year: number) => {
    const budget = getBudgetByCategory(categoryId, month, year);
    if (!budget) return 0;

    const spent = getSpentInCategory(categoryId, month, year);
    const remaining = budget.amount - spent;
    
    const today = new Date();
    const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;
    
    if (isCurrentMonth) {
      const daysInMonth = new Date(year, month, 0).getDate();
      const currentDay = today.getDate();
      const daysRemaining = daysInMonth - currentDay + 1;
      
      return daysRemaining > 0 ? remaining / daysRemaining : 0;
    }
    
    return 0;
  };

  const getCategorySpendingDistribution = (months: number) => {
    const distribution: { [categoryId: string]: number } = {};
    const currentDate = new Date();
    
    // Calculate total spending per category over the specified months
    categories.filter(cat => cat.type === 'expense').forEach(category => {
      let totalSpent = 0;
      
      for (let i = 1; i <= months; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        totalSpent += getSpentInCategory(category.id, month, year);
      }
      
      distribution[category.id] = totalSpent / months; // Average per month
    });
    
    return distribution;
  };

  const getMonthComparison = (month: number, year: number) => {
    const currentMonthSpending = categories
      .filter(cat => cat.type === 'expense')
      .reduce((total, cat) => total + getSpentInCategory(cat.id, month, year), 0);
    
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    
    const previousMonthSpending = categories
      .filter(cat => cat.type === 'expense')
      .reduce((total, cat) => total + getSpentInCategory(cat.id, prevMonth, prevYear), 0);
    
    const change = previousMonthSpending > 0 
      ? ((currentMonthSpending - previousMonthSpending) / previousMonthSpending) * 100 
      : 0;

    return {
      current: currentMonthSpending,
      previous: previousMonthSpending,
      change
    };
  };

  const distributeBudgetAcrossCategories = async (totalAmount: number, month: number, year: number) => {
    try {
      // Get spending distribution from last 3 months
      const distribution = getCategorySpendingDistribution(3);
      const totalHistoricalSpending = Object.values(distribution).reduce((sum, amount) => sum + amount, 0);
      
      const expenseCategories = categories.filter(cat => cat.type === 'expense');
      
      // If no historical data, distribute equally
      if (totalHistoricalSpending === 0) {
        const amountPerCategory = totalAmount / expenseCategories.length;
        
        for (const category of expenseCategories) {
          // Check if budget already exists for this category
          const existingBudget = budgets.find(b => 
            b.categoryId === category.id && b.month === month && b.year === year
          );
          
          if (existingBudget) {
            await updateBudget(existingBudget.id, { amount: amountPerCategory });
          } else {
            await supabase.from('budgets').insert({
              category_id: category.id,
              amount: amountPerCategory,
              month,
              year
            });
          }
        }
      } else {
        // Distribute based on historical spending patterns
        for (const category of expenseCategories) {
          const categoryRatio = (distribution[category.id] || 0) / totalHistoricalSpending;
          const suggestedAmount = totalAmount * categoryRatio;
          
          // Check if budget already exists for this category
          const existingBudget = budgets.find(b => 
            b.categoryId === category.id && b.month === month && b.year === year
          );
          
          if (existingBudget) {
            await updateBudget(existingBudget.id, { amount: suggestedAmount });
          } else {
            await supabase.from('budgets').insert({
              category_id: category.id,
              amount: suggestedAmount,
              month,
              year
            });
          }
        }
      }
      
      await fetchBudgets();
      
      toast({
        title: "Success",
        description: `Budget of ₪${totalAmount.toLocaleString()} distributed across ${expenseCategories.length} categories`,
      });
    } catch (error) {
      console.error('Error distributing budget:', error);
      toast({
        title: "Error",
        description: "Failed to distribute budget across categories",
        variant: "destructive"
      });
    }
  };

  const getBudgetSuggestion = (categoryId: string) => {
    const average3Months = getAverageSpendingByCategory(categoryId, 3);
    const average6Months = getAverageSpendingByCategory(categoryId, 6);
    
    if (average3Months > 0 && average6Months > 0) {
      // Give more weight to recent 3 months
      return Math.round((average3Months * 0.7 + average6Months * 0.3) * 1.1); // Add 10% buffer
    } else if (average3Months > 0) {
      return Math.round(average3Months * 1.1);
    } else if (average6Months > 0) {
      return Math.round(average6Months * 1.1);
    }
    
    return 0;
  };

  // Simple monthly budget handling without separate table
  const addMonthlyBudget = async (totalAmount: number, month: number, year: number) => {
    try {
      await distributeBudgetAcrossCategories(totalAmount, month, year);
      
      toast({
        title: "Success",
        description: "Monthly budget distributed across categories"
      });
    } catch (error) {
      console.error('Error adding monthly budget:', error);
      toast({
        title: "Error",
        description: "Failed to add monthly budget",
        variant: "destructive"
      });
    }
  };

  const updateMonthlyBudget = async (id: string, updates: any) => {
    // Not implemented - handled through individual budget updates
  };

  const deleteMonthlyBudget = async (id: string) => {
    // Not implemented - handled through individual budget deletions
  };

  const getMonthlyBudget = (month: number, year: number) => {
    const monthBudgets = budgets.filter(b => b.month === month && b.year === year);
    if (monthBudgets.length === 0) return undefined;
    
    const totalAmount = monthBudgets.reduce((sum, b) => sum + b.amount, 0);
    const spentAmount = monthBudgets.reduce((sum, b) => sum + getSpentInCategory(b.categoryId, month, year), 0);
    const remainingAmount = totalAmount - spentAmount;
    
    const currentDate = new Date();
    const isCurrentMonth = currentDate.getMonth() + 1 === month && currentDate.getFullYear() === year;
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysRemaining = isCurrentMonth ? Math.max(0, daysInMonth - currentDate.getDate() + 1) : daysInMonth;
    
    return {
      id: `${month}-${year}`,
      totalAmount,
      spentAmount,
      month,
      year,
      remainingAmount,
      dailyAllowance: daysRemaining > 0 ? remainingAmount / daysRemaining : 0,
      daysRemaining
    };
  };

  const generateBudgetRecommendations = async (monthlyBudgetId: string, month: number, year: number) => {
    // Not implemented - recommendations are handled in distributeBudgetAcrossCategories
  };

  const getCurrentMonthSpent = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    return transactions
      .filter(t => 
        t.type === 'expense' &&
        t.date.getMonth() + 1 === currentMonth &&
        t.date.getFullYear() === currentYear
      )
      .reduce((sum, t) => sum + t.amount, 0);
  };

  return (
    <FinancialContext.Provider value={{
      accounts,
      categories,
      transactions,
      budgets,
      monthlyBudgets: [],
      budgetRecommendations: [],
      isLoading,
      addAccount,
      updateAccount,
      deleteAccount,
      addCategory,
      updateCategory,
      deleteCategory,
      addSubCategory,
      updateSubCategory,
      deleteSubCategory,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      transferBetweenAccounts,
      addBudget,
      updateBudget,
      deleteBudget,
      getBudgetByCategory,
      getSpentInCategory,
      getTransactionsByDate,
      getTransactionsByCategory,
      getTransactionsByAccount,
      getTotalByCategory,
      getAverageSpendingByCategory,
      getDailySpendingAllowance,
      getBudgetSuggestion,
      distributeBudgetAcrossCategories,
      getCategorySpendingDistribution,
      getMonthComparison,
      addMonthlyBudget,
      updateMonthlyBudget,
      deleteMonthlyBudget,
      getMonthlyBudget,
      generateBudgetRecommendations,
      getCurrentMonthSpent,
      refreshData,
    }}>
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (context === undefined) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};
