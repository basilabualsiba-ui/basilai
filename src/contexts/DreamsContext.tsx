import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Dream {
  id: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  progress_percentage: number;
  estimated_cost?: number;
  target_date?: string;
  completed_at?: string;
  completion_notes?: string;
  why_important?: string;
  lessons_learned?: string;
  rating?: number;
  cover_image_url?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

interface DreamStep {
  id: string;
  dream_id: string;
  title: string;
  is_completed: boolean;
  completed_at?: string;
  order_index: number;
  created_at: string;
}

interface DreamPhoto {
  id: string;
  dream_id: string;
  photo_url: string;
  caption?: string;
  is_before: boolean;
  uploaded_at: string;
}

interface DreamsContextType {
  dreams: Dream[];
  loading: boolean;
  addDream: (dream: Partial<Dream>) => Promise<void>;
  updateDream: (id: string, updates: Partial<Dream>) => Promise<void>;
  deleteDream: (id: string) => Promise<void>;
  getDreamSteps: (dreamId: string) => Promise<DreamStep[]>;
  addDreamStep: (step: Partial<DreamStep>) => Promise<void>;
  updateDreamStep: (id: string, updates: Partial<DreamStep>) => Promise<void>;
  deleteDreamStep: (id: string) => Promise<void>;
  getDreamPhotos: (dreamId: string) => Promise<DreamPhoto[]>;
  addDreamPhoto: (photo: Partial<DreamPhoto>) => Promise<void>;
  deleteDreamPhoto: (id: string) => Promise<void>;
  refreshDreams: () => Promise<void>;
}

const DreamsContext = createContext<DreamsContextType | undefined>(undefined);

export const DreamsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDreams = async () => {
    try {
      const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDreams(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDreams();

    // Live realtime updates
    const ch = supabase.channel('rt:dreams')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'dreams' }, fetchDreams)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const addDream = async (dream: Partial<Dream>) => {
    try {
      const tempId = `temp-${Date.now()}`;
      const tempDream = { id: tempId, ...dream } as Dream;
      setDreams(prev => [tempDream, ...prev]);

      const { data, error } = await supabase.from('dreams').insert([dream as any]).select().single();
      if (error) throw error;
      setDreams(prev => prev.map(dr => dr.id === tempId ? data as Dream : dr));
      toast({ title: "Success", description: "Dream added successfully!" });
    } catch (error: any) {
      await fetchDreams();
      toast({ title: "Error", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  const updateDream = async (id: string, updates: Partial<Dream>) => {
    try {
      setDreams(prev => prev.map(dr => dr.id === id ? { ...dr, ...updates } : dr));
      const { error } = await supabase.from('dreams').update(updates).eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Dream updated successfully!" });
    } catch (error: any) {
      await fetchDreams();
      toast({ title: "Error", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  const deleteDream = async (id: string) => {
    try {
      setDreams(prev => prev.filter(dr => dr.id !== id));
      const { error } = await supabase.from('dreams').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Dream deleted successfully!" });
    } catch (error: any) {
      await fetchDreams();
      toast({ title: "Error", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  const getDreamSteps = async (dreamId: string): Promise<DreamStep[]> => {
    const { data, error } = await supabase
      .from('dream_steps')
      .select('*')
      .eq('dream_id', dreamId)
      .order('order_index', { ascending: true });
    if (error) throw error;
    return data || [];
  };

  const addDreamStep = async (step: Partial<DreamStep>) => {
    const { error } = await supabase.from('dream_steps').insert([step as any]);
    if (error) throw error;
  };

  const updateDreamStep = async (id: string, updates: Partial<DreamStep>) => {
    const { error } = await supabase.from('dream_steps').update(updates).eq('id', id);
    if (error) throw error;
  };

  const deleteDreamStep = async (id: string) => {
    const { error } = await supabase.from('dream_steps').delete().eq('id', id);
    if (error) throw error;
  };

  const getDreamPhotos = async (dreamId: string): Promise<DreamPhoto[]> => {
    const { data, error } = await supabase
      .from('dream_photos')
      .select('*')
      .eq('dream_id', dreamId)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const addDreamPhoto = async (photo: Partial<DreamPhoto>) => {
    const { error } = await supabase.from('dream_photos').insert([photo as any]);
    if (error) throw error;
  };

  const deleteDreamPhoto = async (id: string) => {
    const { error } = await supabase.from('dream_photos').delete().eq('id', id);
    if (error) throw error;
  };

  return (
    <DreamsContext.Provider
      value={{
        dreams,
        loading,
        addDream,
        updateDream,
        deleteDream,
        getDreamSteps,
        addDreamStep,
        updateDreamStep,
        deleteDreamStep,
        getDreamPhotos,
        addDreamPhoto,
        deleteDreamPhoto,
        refreshDreams: fetchDreams,
      }}
    >
      {children}
    </DreamsContext.Provider>
  );
};

export const useDreams = () => {
  const context = useContext(DreamsContext);
  if (!context) {
    throw new Error('useDreams must be used within a DreamsProvider');
  }
  return context;
};
