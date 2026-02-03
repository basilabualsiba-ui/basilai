import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { assistantProcessor } from '@/services/AssistantCommandProcessor';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  source?: 'local' | 'cached' | 'ai';
}

export function useAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize the command processor on mount
  useEffect(() => {
    assistantProcessor.initialize();
  }, []);

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
      // Step 1: Try local processing FIRST (offline-capable)
      const localResult = await assistantProcessor.process(content.trim());

      if (localResult.handled && localResult.response) {
        // Respond instantly without API call! ⚡
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: localResult.response,
          timestamp: new Date(),
          source: localResult.source,
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
        
        // If it was an "ask for teaching" response, we don't need AI
        if (localResult.askForTeaching) {
          console.log('🌹 روز بتطلب تعليم!');
        }
        return;
      }

      // Step 2: Fall back to AI only for complex queries
      console.log('🌹 روز بتسأل AI الخارجي...');
      const response = await supabase.functions.invoke('personal-assistant', {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          currentTime: new Date().toISOString(),
        },
      });

      // Handle function invocation errors
      if (response.error) {
        console.error('Function invoke error:', response.error);
        
        // Check for billing/rate limit errors - try local fallback
        if (response.error.message?.includes('402') || response.error.message?.includes('429')) {
          const fallback = await assistantProcessor.getLocalFallback(content.trim());
          if (fallback) {
            const fallbackMessage: Message = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: fallback,
              timestamp: new Date(),
              source: 'local',
            };
            setMessages(prev => [...prev, fallbackMessage]);
            setIsLoading(false);
            return;
          }
        }
        throw new Error(response.error.message || 'Function invocation failed');
      }

      // Handle errors returned in data
      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const aiResponse = response.data?.message || "مش فاهمة شو بدك. حاولي تاني.";

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `🌹 ${aiResponse}`,
        timestamp: new Date(),
        source: 'ai',
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Step 3: LEARN from AI response! 🧠
      if (localResult.shouldLearn && localResult.originalQuery) {
        await assistantProcessor.learnFromAIResponse(localResult.originalQuery, aiResponse);
        console.log('🌹 روز تعلمت من AI!');
      }

    } catch (error: any) {
      console.error('Assistant error:', error);
      
      let errorMessage = "🌹 عذراً، في مشكلة. حاولي تاني.";
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        errorMessage = "🌹 مشغولة شوي. استنى لحظة.";
      } else if (error.message?.includes('402')) {
        errorMessage = "🌹 انتهى الرصيد. تحققي من الاشتراك.";
      }
      
      toast.error(errorMessage);
      
      const errorAssistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
        source: 'local',
      };
      
      setMessages(prev => [...prev, errorAssistantMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Force refresh cache (useful after data changes)
  const refreshCache = useCallback(async () => {
    await assistantProcessor.forceRefreshCache();
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    refreshCache,
  };
}
