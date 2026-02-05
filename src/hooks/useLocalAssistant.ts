// Hook for Local Assistant

import { useState, useCallback, useEffect } from 'react';
import { localAssistant, ProcessResult, ActionButton } from '@/services/LocalAssistant';
import type { AssistantMessage, SavedQuery, TeachingContext, QuickAction, ActionButton as ActionButtonType } from '@/types/assistant';
import { QUICK_ACTIONS } from '@/types/assistant';

interface MessageWithActions extends AssistantMessage {
  actionButtons?: ActionButton[];
}

interface UseLocalAssistantReturn {
  messages: MessageWithActions[];
  isLoading: boolean;
  isInitialized: boolean;
  teachingContext: TeachingContext | null;
  queries: SavedQuery[];
  quickActions: QuickAction[];
  sendMessage: (message: string) => Promise<void>;
  sendAction: (action: string, data?: any) => Promise<void>;
  clearMessages: () => void;
  clearTeachingContext: () => void;
  reloadQueries: () => Promise<void>;
}

export function useLocalAssistant(): UseLocalAssistantReturn {
  const [messages, setMessages] = useState<MessageWithActions[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [teachingContext, setTeachingContext] = useState<TeachingContext | null>(null);
  const [queries, setQueries] = useState<SavedQuery[]>([]);

  // Initialize assistant on mount
  useEffect(() => {
    const init = async () => {
      try {
        await localAssistant.initialize();
        setQueries(localAssistant.getQueries());
        setIsInitialized(true);
        
        // Add welcome message
        setMessages([{
          id: 'welcome',
          type: 'assistant',
          content: '🌹 أهلاً! أنا روز، مساعدتك المحلية.\n\n**اسألني عن:**\n• 💰 المصاريف والحسابات\n• 💪 التمارين والوزن\n• 🕌 مواقيت الصلاة\n• 💊 المكملات\n• 🌟 الأهداف\n\n**أو سجل مباشرة:**\n• "صرفت 20 شيكل في الحشاش"\n• "اخدت معاش 5000 شيكل"\n• "وزني 75 كيلو"\n\nأو استخدم الأزرار السريعة! 👇',
          timestamp: new Date(),
        }]);
      } catch (error) {
        console.error('Failed to initialize assistant:', error);
      }
    };

    init();
  }, []);

  // Send a message
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: MessageWithActions = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const result = await localAssistant.process(message);

      const assistantMessage: MessageWithActions = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: result.message,
        timestamp: new Date(),
        queryUsed: result.queryUsed,
        data: result.data,
        actionButtons: result.actionButtons,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setTeachingContext(result.teachingContext || null);

    } catch (error) {
      console.error('Error processing message:', error);
      
      const errorMessage: MessageWithActions = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: '❌ حصل خطأ. جرب مرة تانية.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Send an action (button click)
  const sendAction = useCallback(async (action: string, data?: any) => {
    if (isLoading) return;
    
    // Convert action to message
    const actionMessage = action === 'confirm' ? 'نعم' : action === 'cancel' ? 'لا' : action;
    await sendMessage(actionMessage);
  }, [isLoading, sendMessage]);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([{
      id: 'welcome',
      type: 'assistant',
      content: '🌹 أهلاً! كيف بقدر أساعدك؟',
      timestamp: new Date(),
    }]);
    setTeachingContext(null);
    localAssistant.clearTeachingContext();
  }, []);

  // Clear teaching context
  const clearTeachingContext = useCallback(() => {
    setTeachingContext(null);
    localAssistant.clearTeachingContext();
  }, []);

  // Reload queries
  const reloadQueries = useCallback(async () => {
    await localAssistant.reload();
    setQueries(localAssistant.getQueries());
  }, []);

  return {
    messages,
    isLoading,
    isInitialized,
    teachingContext,
    queries,
    quickActions: QUICK_ACTIONS,
    sendMessage,
    sendAction,
    clearMessages,
    clearTeachingContext,
    reloadQueries,
  };
}
