import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { assistantProcessor } from '@/services/AssistantCommandProcessor';

export interface AssistantCommand {
  id: string;
  trigger_patterns: string[];
  response_template: string;
  action_type: 'response' | 'query' | 'action';
  action_config?: any;
  category?: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function mapDbToCommand(data: any): AssistantCommand {
  return {
    id: data.id,
    trigger_patterns: data.trigger_patterns,
    response_template: data.response_template,
    action_type: data.action_type as 'response' | 'query' | 'action',
    action_config: data.action_config,
    category: data.category ?? undefined,
    priority: data.priority,
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
}

export function useAssistantCommands() {
  const [commands, setCommands] = useState<AssistantCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCommands = async () => {
    try {
      const { data, error } = await supabase
        .from('assistant_commands')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setCommands((data || []).map(mapDbToCommand));
    } catch (error) {
      console.error('Failed to fetch commands:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل الأوامر',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommands();
  }, []);

  const addCommand = async (command: Omit<AssistantCommand, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('assistant_commands')
        .insert(command)
        .select()
        .single();

      if (error) throw error;

      const mappedData = mapDbToCommand(data);
      setCommands(prev => [mappedData, ...prev]);
      await assistantProcessor.reloadCommands();
      
      toast({
        title: 'تم الإضافة',
        description: 'تمت إضافة الأمر بنجاح'
      });

      return mappedData;
    } catch (error) {
      console.error('Failed to add command:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إضافة الأمر',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateCommand = async (id: string, updates: Partial<AssistantCommand>) => {
    try {
      const { data, error } = await supabase
        .from('assistant_commands')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const mappedData = mapDbToCommand(data);
      setCommands(prev => prev.map(cmd => cmd.id === id ? mappedData : cmd));
      await assistantProcessor.reloadCommands();

      toast({
        title: 'تم التحديث',
        description: 'تم تحديث الأمر بنجاح'
      });

      return mappedData;
    } catch (error) {
      console.error('Failed to update command:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث الأمر',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteCommand = async (id: string) => {
    try {
      const { error } = await supabase
        .from('assistant_commands')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCommands(prev => prev.filter(cmd => cmd.id !== id));
      await assistantProcessor.reloadCommands();

      toast({
        title: 'تم الحذف',
        description: 'تم حذف الأمر بنجاح'
      });
    } catch (error) {
      console.error('Failed to delete command:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الأمر',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const toggleCommand = async (id: string, is_active: boolean) => {
    return updateCommand(id, { is_active });
  };

  return {
    commands,
    isLoading,
    addCommand,
    updateCommand,
    deleteCommand,
    toggleCommand,
    refetch: fetchCommands
  };
}
