import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CurrencyRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  is_live: boolean;
  created_at: string;
  updated_at: string;
}

interface CurrencyContextType {
  rates: CurrencyRate[];
  isLoading: boolean;
  getRate: (fromCurrency: string, toCurrency: string) => number;
  updateRate: (fromCurrency: string, toCurrency: string, rate: number) => Promise<void>;
  refreshRates: () => Promise<void>;
  getCurrencySymbol: (currency: string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

const getCurrencySymbol = (currency: string) => {
  switch (currency) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    case 'CAD': return 'C$';
    case 'AUD': return 'A$';
    case 'CHF': return 'CHF';
    case 'JOD': return 'JD';
    case 'TL': return '₺';
    case 'ILS':
    default: return '₪';
  }
};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchRates = async () => {
    try {
      const { data, error } = await supabase
        .from('currency_ratios')
        .select('*');

      if (error) throw error;
      setRates(data || []);
    } catch (error) {
      console.error('Error fetching currency rates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch currency rates",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRate = (fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return 1;
    
    const rate = rates.find(r => 
      r.from_currency === fromCurrency && r.to_currency === toCurrency
    );
    
    return rate?.rate || 1;
  };

  const updateRate = async (fromCurrency: string, toCurrency: string, rate: number) => {
    try {
      const { error } = await supabase
        .from('currency_ratios')
        .update({ 
          rate,
          updated_at: new Date().toISOString(),
          is_live: false // Mark as custom when manually updated
        })
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency);

      if (error) throw error;

      // Update the reverse rate as well
      const reverseRate = 1 / rate;
      await supabase
        .from('currency_ratios')
        .update({ 
          rate: reverseRate,
          updated_at: new Date().toISOString(),
          is_live: false
        })
        .eq('from_currency', toCurrency)
        .eq('to_currency', fromCurrency);

      await fetchRates();
      
      toast({
        title: "Success",
        description: "Currency rate updated successfully"
      });
    } catch (error) {
      console.error('Error updating currency rate:', error);
      toast({
        title: "Error",
        description: "Failed to update currency rate",
        variant: "destructive"
      });
    }
  };

  const fetchLiveRates = async () => {
    try {
      // Using exchangerate-api.com for live rates (free tier)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      
      const currencies = ['USD', 'EUR', 'JOD', 'ILS', 'TL'];
      const updates = [];
      
      // Create all currency pair combinations
      for (const fromCurrency of currencies) {
        for (const toCurrency of currencies) {
          if (fromCurrency !== toCurrency) {
            let rate;
            if (fromCurrency === 'USD') {
              rate = data.rates[toCurrency] || 1;
            } else if (toCurrency === 'USD') {
              rate = 1 / (data.rates[fromCurrency] || 1);
            } else {
              const fromToUsd = 1 / (data.rates[fromCurrency] || 1);
              const usdToTarget = data.rates[toCurrency] || 1;
              rate = fromToUsd * usdToTarget;
            }
            
            updates.push({
              from_currency: fromCurrency,
              to_currency: toCurrency,
              rate: parseFloat(rate.toFixed(6)),
              is_live: true,
              updated_at: new Date().toISOString()
            });
          }
        }
      }
      
      // Update all rates in batch
      for (const update of updates) {
        await supabase
          .from('currency_ratios')
          .upsert(update, {
            onConflict: 'from_currency,to_currency'
          });
      }
      
      toast({
        title: "Success",
        description: "Currency rates updated from live data"
      });
      
    } catch (error) {
      console.error('Error fetching live rates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch live currency rates",
        variant: "destructive"
      });
    }
  };

  const refreshRates = async () => {
    setIsLoading(true);
    await fetchLiveRates();
    await fetchRates();
  };

  useEffect(() => {
    fetchRates();

    // Set up real-time subscription
    const channel = supabase
      .channel('currency_ratios_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'currency_ratios' },
        () => {
          fetchRates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <CurrencyContext.Provider value={{
      rates,
      isLoading,
      getRate,
      updateRate,
      refreshRates,
      getCurrencySymbol
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};