import { supabase } from "@/integrations/supabase/client";

type ActionType = 'response' | 'query' | 'action';

interface Command {
  id: string;
  trigger_patterns: string[];
  response_template: string;
  action_type: ActionType;
  action_config?: {
    type?: string;
    account_name?: string;
    table?: string;
    select?: string;
    filter?: string;
  };
  category?: string;
  priority: number;
  is_active: boolean;
}

interface CachedData {
  accounts?: any[];
  lastWorkout?: any;
  supplements?: any[];
  lastFetch: number;
}

interface ProcessResult {
  handled: boolean;
  response?: string;
  source: 'local' | 'cached' | 'ai';
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class AssistantCommandProcessor {
  private commands: Command[] = [];
  private cachedData: CachedData = { lastFetch: 0 };
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      // Load commands from database
      const { data: commands, error } = await supabase
        .from('assistant_commands')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) {
        console.error('Failed to load assistant commands:', error);
        return;
      }

      this.commands = (commands || []).map(cmd => ({
        id: cmd.id,
        trigger_patterns: cmd.trigger_patterns,
        response_template: cmd.response_template,
        action_type: cmd.action_type as ActionType,
        action_config: cmd.action_config as Command['action_config'],
        category: cmd.category ?? undefined,
        priority: cmd.priority,
        is_active: cmd.is_active
      }));

      // Pre-cache some data
      await this.refreshCache();
      
      this.initialized = true;
      console.log(`AssistantCommandProcessor initialized with ${this.commands.length} commands`);
    } catch (error) {
      console.error('Failed to initialize AssistantCommandProcessor:', error);
    }
  }

  private async refreshCache(): Promise<void> {
    const now = Date.now();
    if (now - this.cachedData.lastFetch < CACHE_DURATION) return;

    try {
      // Cache accounts
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*');
      this.cachedData.accounts = accounts || [];

      // Cache last workout
      const { data: lastWorkout } = await supabase
        .from('workout_sessions')
        .select('*')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();
      this.cachedData.lastWorkout = lastWorkout;

      // Cache supplements
      const { data: supplements } = await supabase
        .from('supplements')
        .select('*');
      this.cachedData.supplements = supplements || [];

      this.cachedData.lastFetch = now;
    } catch (error) {
      console.error('Failed to refresh cache:', error);
    }
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[؟?!.,،]/g, '')
      .replace(/\s+/g, ' ');
  }

  private matchCommand(message: string): Command | null {
    const normalized = this.normalizeText(message);
    
    for (const command of this.commands) {
      for (const pattern of command.trigger_patterns) {
        const normalizedPattern = this.normalizeText(pattern);
        // Check if message contains the pattern or starts with it
        if (normalized.includes(normalizedPattern) || normalizedPattern.includes(normalized)) {
          return command;
        }
      }
    }
    
    return null;
  }

  private getIsraelTime(): { time: string; date: string; dayName: string } {
    const now = new Date();
    const israelTime = new Intl.DateTimeFormat('ar-EG', {
      timeZone: 'Asia/Jerusalem',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(now);

    const israelDate = new Intl.DateTimeFormat('ar-EG', {
      timeZone: 'Asia/Jerusalem',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(now);

    const dayName = new Intl.DateTimeFormat('ar-EG', {
      timeZone: 'Asia/Jerusalem',
      weekday: 'long'
    }).format(now);

    return { time: israelTime, date: israelDate, dayName };
  }

  private async executeAction(command: Command): Promise<string> {
    const config = command.action_config;
    if (!config?.type) return command.response_template;

    await this.refreshCache();

    switch (config.type) {
      case 'get_time': {
        const { time } = this.getIsraelTime();
        return `الساعة الآن ${time} بتوقيت فلسطين 🕐`;
      }

      case 'get_date': {
        const { date } = this.getIsraelTime();
        return `اليوم هو ${date} 📅`;
      }

      case 'get_accounts_summary': {
        const accounts = this.cachedData.accounts || [];
        if (accounts.length === 0) {
          return 'لا توجد حسابات مسجلة حالياً.';
        }
        
        const total = accounts.reduce((sum, acc) => sum + (acc.amount || 0), 0);
        const accountsList = accounts
          .map(acc => `• ${acc.name}: ${acc.amount?.toLocaleString()} ${acc.currency}`)
          .join('\n');
        
        return `💰 **ملخص حساباتك:**\n${accountsList}\n\n**المجموع:** ${total.toLocaleString()} شيكل`;
      }

      case 'get_account': {
        const accounts = this.cachedData.accounts || [];
        const account = accounts.find(acc => 
          acc.name.toLowerCase().includes(config.account_name?.toLowerCase() || '')
        );
        
        if (!account) {
          return `لم أجد حساب "${config.account_name}"`;
        }
        
        return `💵 **${account.name}:** ${account.amount?.toLocaleString()} ${account.currency}`;
      }

      case 'get_last_workout': {
        const workout = this.cachedData.lastWorkout;
        if (!workout) {
          return 'لا يوجد تمارين مسجلة بعد.';
        }
        
        const date = new Date(workout.completed_at);
        const formattedDate = new Intl.DateTimeFormat('ar-EG', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        }).format(date);
        
        const muscles = workout.muscle_groups?.join('، ') || 'غير محدد';
        return `💪 **آخر تمرين:** ${formattedDate}\n**العضلات:** ${muscles}\n**المدة:** ${workout.total_duration_minutes || 0} دقيقة`;
      }

      case 'check_today_workout': {
        const workout = this.cachedData.lastWorkout;
        if (!workout) {
          return '❌ لم تتمرن اليوم بعد. هيا انطلق! 💪';
        }
        
        const today = new Date().toDateString();
        const workoutDate = new Date(workout.completed_at).toDateString();
        
        if (today === workoutDate) {
          return '✅ نعم! لقد تمرنت اليوم. أحسنت! 🎉';
        }
        
        return '❌ لم تتمرن اليوم بعد. هيا انطلق! 💪';
      }

      case 'get_supplements_status': {
        const supplements = this.cachedData.supplements || [];
        if (supplements.length === 0) {
          return 'لا توجد مكملات مسجلة.';
        }
        
        const status = supplements.map(supp => {
          const percent = Math.round((supp.remaining_doses / supp.total_doses) * 100);
          const emoji = percent < 20 ? '🔴' : percent < 50 ? '🟡' : '🟢';
          return `${emoji} **${supp.name}:** ${supp.remaining_doses}/${supp.total_doses} ${supp.dose_unit}`;
        }).join('\n');
        
        return `💊 **حالة المكملات:**\n${status}`;
      }

      default:
        return command.response_template;
    }
  }

  async process(message: string): Promise<ProcessResult> {
    await this.initialize();

    // Try to match a predefined command
    const command = this.matchCommand(message);
    
    if (command) {
      if (command.action_type === 'response') {
        return {
          handled: true,
          response: command.response_template,
          source: 'local'
        };
      }
      
      if (command.action_type === 'action') {
        const response = await this.executeAction(command);
        return {
          handled: true,
          response,
          source: command.action_config?.type?.startsWith('get_') ? 'cached' : 'local'
        };
      }
    }

    // Handle simple math
    const mathResult = this.handleMath(message);
    if (mathResult) {
      return {
        handled: true,
        response: mathResult,
        source: 'local'
      };
    }

    // No local match - needs AI
    return {
      handled: false,
      source: 'ai'
    };
  }

  private handleMath(message: string): string | null {
    // Simple math pattern: number operator number
    const mathPattern = /(\d+(?:\.\d+)?)\s*([+\-*/×÷])\s*(\d+(?:\.\d+)?)/;
    const match = message.match(mathPattern);
    
    if (match) {
      const num1 = parseFloat(match[1]);
      const operator = match[2];
      const num2 = parseFloat(match[3]);
      let result: number;
      
      switch (operator) {
        case '+': result = num1 + num2; break;
        case '-': result = num1 - num2; break;
        case '*':
        case '×': result = num1 * num2; break;
        case '/':
        case '÷': result = num2 !== 0 ? num1 / num2 : NaN; break;
        default: return null;
      }
      
      if (isNaN(result)) {
        return 'لا يمكن القسمة على صفر! 🙈';
      }
      
      return `🔢 **النتيجة:** ${num1} ${operator} ${num2} = ${result}`;
    }
    
    return null;
  }

  // Reload commands (useful after adding new ones)
  async reloadCommands(): Promise<void> {
    this.initialized = false;
    this.initPromise = null;
    await this.initialize();
  }

  // Force refresh cached data
  async forceRefreshCache(): Promise<void> {
    this.cachedData.lastFetch = 0;
    await this.refreshCache();
  }

  // Get cached accounts for external use
  getCachedAccounts() {
    return this.cachedData.accounts;
  }
}

// Singleton instance
export const assistantProcessor = new AssistantCommandProcessor();
