import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Supplement {
  id: string;
  name: string;
  description: string | null;
  dose_unit: string;
  total_doses: number;
  remaining_doses: number;
  warning_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface SupplementLog {
  id: string;
  supplement_id: string;
  doses_taken: number;
  logged_date: string;
  logged_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  supplement?: Supplement;
}

interface SupplementContextType {
  supplements: Supplement[];
  supplementLogs: SupplementLog[];
  isLoading: boolean;
  addSupplement: (supplement: Omit<Supplement, 'id' | 'created_at' | 'updated_at'>) => Promise<Supplement | null>;
  updateSupplement: (id: string, updates: Partial<Supplement>) => Promise<boolean>;
  deleteSupplement: (id: string) => Promise<boolean>;
  logSupplement: (supplementId: string, doses: number, date?: string, notes?: string) => Promise<boolean>;
  deleteLog: (logId: string) => Promise<boolean>;
  getLogsForDate: (date: string) => SupplementLog[];
  getLowStockSupplements: () => Supplement[];
  refillSupplement: (id: string, doses: number) => Promise<boolean>;
  refreshData: () => Promise<void>;
}

const SupplementContext = createContext<SupplementContextType | undefined>(undefined);

export function SupplementProvider({ children }: { children: ReactNode }) {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [supplementLogs, setSupplementLogs] = useState<SupplementLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSupplements = async () => {
    const { data, error } = await supabase
      .from('supplements')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching supplements:', error);
      return;
    }
    setSupplements(data || []);
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('supplement_logs')
      .select('*')
      .order('logged_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching supplement logs:', error);
      return;
    }
    setSupplementLogs(data || []);
  };

  const refreshData = async () => {
    setIsLoading(true);
    await Promise.all([fetchSupplements(), fetchLogs()]);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const addSupplement = async (supplement: Omit<Supplement, 'id' | 'created_at' | 'updated_at'>): Promise<Supplement | null> => {
    const { data, error } = await supabase
      .from('supplements')
      .insert([supplement])
      .select()
      .single();
    
    if (error) {
      toast({ title: 'Error adding supplement', variant: 'destructive' });
      return null;
    }
    
    setSupplements(prev => [...prev, data]);
    toast({ title: 'Supplement added successfully' });
    return data;
  };

  const updateSupplement = async (id: string, updates: Partial<Supplement>): Promise<boolean> => {
    const { error } = await supabase
      .from('supplements')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      toast({ title: 'Error updating supplement', variant: 'destructive' });
      return false;
    }
    
    setSupplements(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    toast({ title: 'Supplement updated' });
    return true;
  };

  const deleteSupplement = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('supplements')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast({ title: 'Error deleting supplement', variant: 'destructive' });
      return false;
    }
    
    setSupplements(prev => prev.filter(s => s.id !== id));
    setSupplementLogs(prev => prev.filter(l => l.supplement_id !== id));
    toast({ title: 'Supplement deleted' });
    return true;
  };

  const logSupplement = async (supplementId: string, doses: number, date?: string, notes?: string): Promise<boolean> => {
    const logDate = date || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('supplement_logs')
      .insert([{
        supplement_id: supplementId,
        doses_taken: doses,
        logged_date: logDate,
        notes
      }])
      .select()
      .single();
    
    if (error) {
      toast({ title: 'Error logging supplement', variant: 'destructive' });
      return false;
    }
    
    // Update remaining doses
    const supplement = supplements.find(s => s.id === supplementId);
    if (supplement) {
      const newRemaining = Math.max(0, supplement.remaining_doses - doses);
      await supabase
        .from('supplements')
        .update({ remaining_doses: newRemaining })
        .eq('id', supplementId);
      
      setSupplements(prev => prev.map(s => 
        s.id === supplementId ? { ...s, remaining_doses: newRemaining } : s
      ));
      
      // Check if low stock warning needed
      if (newRemaining <= supplement.warning_threshold && newRemaining > 0) {
        toast({ 
          title: `${supplement.name} is running low!`, 
          description: `Only ${newRemaining} ${supplement.dose_unit}(s) remaining`,
          variant: 'destructive'
        });
      } else if (newRemaining === 0) {
        toast({ 
          title: `${supplement.name} is empty!`, 
          description: 'Please refill your supplement',
          variant: 'destructive'
        });
      }
    }
    
    setSupplementLogs(prev => [data, ...prev]);
    toast({ title: 'Supplement logged' });
    return true;
  };

  const deleteLog = async (logId: string): Promise<boolean> => {
    const log = supplementLogs.find(l => l.id === logId);
    
    const { error } = await supabase
      .from('supplement_logs')
      .delete()
      .eq('id', logId);
    
    if (error) {
      toast({ title: 'Error deleting log', variant: 'destructive' });
      return false;
    }
    
    // Restore doses to supplement
    if (log) {
      const supplement = supplements.find(s => s.id === log.supplement_id);
      if (supplement) {
        const newRemaining = supplement.remaining_doses + log.doses_taken;
        await supabase
          .from('supplements')
          .update({ remaining_doses: newRemaining })
          .eq('id', log.supplement_id);
        
        setSupplements(prev => prev.map(s => 
          s.id === log.supplement_id ? { ...s, remaining_doses: newRemaining } : s
        ));
      }
    }
    
    setSupplementLogs(prev => prev.filter(l => l.id !== logId));
    toast({ title: 'Log deleted' });
    return true;
  };

  const getLogsForDate = (date: string): SupplementLog[] => {
    return supplementLogs
      .filter(log => log.logged_date === date)
      .map(log => ({
        ...log,
        supplement: supplements.find(s => s.id === log.supplement_id)
      }));
  };

  const getLowStockSupplements = (): Supplement[] => {
    return supplements.filter(s => s.remaining_doses <= s.warning_threshold);
  };

  const refillSupplement = async (id: string, doses: number): Promise<boolean> => {
    const supplement = supplements.find(s => s.id === id);
    if (!supplement) return false;
    
    const newTotal = supplement.total_doses + doses;
    const newRemaining = supplement.remaining_doses + doses;
    
    const { error } = await supabase
      .from('supplements')
      .update({ total_doses: newTotal, remaining_doses: newRemaining })
      .eq('id', id);
    
    if (error) {
      toast({ title: 'Error refilling supplement', variant: 'destructive' });
      return false;
    }
    
    setSupplements(prev => prev.map(s => 
      s.id === id ? { ...s, total_doses: newTotal, remaining_doses: newRemaining } : s
    ));
    toast({ title: 'Supplement refilled' });
    return true;
  };

  return (
    <SupplementContext.Provider value={{
      supplements,
      supplementLogs,
      isLoading,
      addSupplement,
      updateSupplement,
      deleteSupplement,
      logSupplement,
      deleteLog,
      getLogsForDate,
      getLowStockSupplements,
      refillSupplement,
      refreshData
    }}>
      {children}
    </SupplementContext.Provider>
  );
}

export function useSupplement() {
  const context = useContext(SupplementContext);
  if (!context) {
    throw new Error('useSupplement must be used within a SupplementProvider');
  }
  return context;
}
