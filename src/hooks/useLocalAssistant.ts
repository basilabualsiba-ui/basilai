// Hook for Local Assistant with AI teaching support

import { useState, useCallback, useEffect } from 'react';
import { localAssistant, ProcessResult, ActionButton } from '@/services/LocalAssistant';
import { supabase } from '@/integrations/supabase/client';
import { queryLibrary } from '@/services/LocalAssistant/QueryLibrary';
import { TABLE_CATEGORIES } from '@/types/assistant';
import type { AssistantMessage, SavedQuery, TeachingContext, QuickAction, ActionButton as ActionButtonType } from '@/types/assistant';
import { QUICK_ACTIONS } from '@/types/assistant';
import { toast } from 'sonner';

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
  const [pendingAiQuestion, setPendingAiQuestion] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await localAssistant.initialize();
        setQueries(localAssistant.getQueries());
        setIsInitialized(true);
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

  const addAssistantMessage = useCallback((content: string, extras?: Partial<MessageWithActions>) => {
    const msg: MessageWithActions = {
      id: `assistant-${Date.now()}-${Math.random()}`,
      type: 'assistant',
      content,
      timestamp: new Date(),
      ...extras,
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  // Ask external AI for query suggestion
  const askAI = useCallback(async (question: string) => {
    setIsLoading(true);
    addAssistantMessage('🤖 جاري سؤال الذكاء الاصطناعي...');

    try {
      // Build schema info
      const schema = Object.entries(TABLE_CATEGORIES).map(([name, category]) => ({
        name,
        category,
      }));

      const { data, error } = await supabase.functions.invoke('suggest-query', {
        body: { question, schema },
      });

      if (error) throw error;
      if (!data?.suggestion) throw new Error('No suggestion returned');

      const suggestion = data.suggestion;
      
      // Show the suggestion for approval
      addAssistantMessage(
        `🤖 **اقتراح الذكاء:**\n\n` +
        `**الاسم:** ${suggestion.query_name}\n` +
        `**الفئة:** ${suggestion.category}\n` +
        `**الغرض:** ${suggestion.purpose}\n` +
        `**الجدول:** ${suggestion.query_config?.table}\n` +
        (suggestion.explanation ? `\n${suggestion.explanation}` : '') +
        `\n\n**الأنماط:**\n${(suggestion.trigger_patterns || []).map((p: string) => `• ${p}`).join('\n')}` +
        (suggestion.output_template ? `\n\n**القالب:** ${suggestion.output_template}` : ''),
        {
          actionButtons: [
            { id: 'approve', label: '✅ موافق، احفظ', action: 'approve_ai', data: suggestion },
            { id: 'reject', label: '❌ رفض', action: 'reject_ai' },
          ],
        }
      );
    } catch (error) {
      console.error('AI suggestion error:', error);
      addAssistantMessage('❌ حصل خطأ في سؤال الذكاء. جرب مرة تانية أو علمني يدوي.');
    }
    setIsLoading(false);
  }, [addAssistantMessage]);

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
        tableData: result.tableData,
        actionButtons: result.actionButtons,
      };

      // If needs teaching, add AI teaching buttons
      if (result.needsTeaching && !result.actionButtons?.length) {
        assistantMessage.actionButtons = [
          { id: 'teach_manual', label: '📝 علمني يدوي', action: 'teach_manual', data: message },
          { id: 'ask_ai', label: '🤖 اسأل الذكاء', action: 'ask_ai', data: message },
          { id: 'skip', label: '⏭️ تخطي', action: 'skip' },
        ];
      }

      setMessages(prev => [...prev, assistantMessage]);
      setTeachingContext(result.teachingContext || null);
    } catch (error) {
      console.error('Error processing message:', error);
      addAssistantMessage('❌ حصل خطأ. جرب مرة تانية.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, addAssistantMessage]);

  const sendAction = useCallback(async (action: string, data?: any) => {
    if (isLoading) return;

    switch (action) {
      case 'ask_ai':
        const question = data || pendingAiQuestion;
        if (question) {
          setPendingAiQuestion(null);
          await askAI(question);
        }
        break;

      case 'teach_manual':
        // Redirect to teaching command
        await sendMessage(`علمني: ${data || ''}`);
        break;

      case 'approve_ai':
        if (data) {
          setIsLoading(true);
          try {
            const newQuery = await queryLibrary.addQuery({
              query_name: data.query_name,
              category: data.category || 'general',
              purpose: data.purpose,
              trigger_patterns: data.trigger_patterns || [],
              query_config: data.query_config,
              output_template: data.output_template || null,
            });
            if (newQuery) {
              await localAssistant.reload();
              setQueries(localAssistant.getQueries());
              addAssistantMessage('✅ تم حفظ الاستعلام! جرب اسألني هلأ.');
              toast.success('تم إضافة استعلام جديد');
            } else {
              addAssistantMessage('❌ خطأ في الحفظ');
            }
          } catch {
            addAssistantMessage('❌ خطأ في الحفظ');
          }
          setIsLoading(false);
        }
        break;

      case 'reject_ai':
        addAssistantMessage('👌 تمام، ما حفظت شي.');
        break;

      case 'skip':
        addAssistantMessage('👌 تمام!');
        break;

      case 'confirm':
      case 'cancel':
      default:
        const actionMessage = action === 'confirm' ? 'نعم' : action === 'cancel' ? 'لا' : action;
        await sendMessage(actionMessage);
        break;
    }
  }, [isLoading, sendMessage, askAI, addAssistantMessage, pendingAiQuestion]);

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

  const clearTeachingContext = useCallback(() => {
    setTeachingContext(null);
    localAssistant.clearTeachingContext();
  }, []);

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
