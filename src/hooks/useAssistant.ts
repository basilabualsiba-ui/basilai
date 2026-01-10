import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('personal-assistant', {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          // Send timezone info to the assistant
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          currentTime: new Date().toISOString(),
        },
      });

      // Handle function invocation errors
      if (response.error) {
        console.error('Function invoke error:', response.error);
        throw new Error(response.error.message || 'Function invocation failed');
      }

      // Handle errors returned in data
      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.data?.message || "I'm not sure how to respond to that.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Assistant error:', error);
      
      let errorMessage = "Sorry, I encountered an error. Please try again.";
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        errorMessage = "I'm receiving too many requests. Please wait a moment.";
      } else if (error.message?.includes('402')) {
        errorMessage = "Usage limit reached. Please check your credits.";
      }
      
      toast.error(errorMessage);
      
      const errorAssistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorAssistantMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
