/**
 * useRealtime — wraps Supabase Realtime subscription for a table.
 * Calls `onUpdate` whenever INSERT, UPDATE or DELETE fires on that table.
 * Works across all open tabs/devices simultaneously.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useRealtime(table: string, onUpdate: () => void) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const channel = supabase
      .channel(`realtime:${table}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table },
        () => onUpdateRef.current()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [table]);
}
