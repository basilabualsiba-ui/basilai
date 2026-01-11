import { supabase } from "@/integrations/supabase/client";

type ActionType = 'response' | 'query' | 'action';

interface Command {
  id: string;
  trigger_patterns: string[];
  response_template: string;
  action_type: ActionType;
  action_config?: any;
  category?: string;
  priority: number;
  is_active: boolean;
}

interface LearnedPattern {
  id: string;
  trigger_phrases: string[];
  intent_type: string;
  action_config: any;
  required_params?: any;
  default_params?: any;
}

interface IntentKeyword {
  intent_type: string;
  keywords: string[];
  action_template: any;
  priority: number;
}

interface CachedData {
  accounts: any[]; transactions: any[]; categories: any[]; subcategories: any[]; budgets: any[];
  workoutSessions: any[]; workoutPlans: any[]; workoutPlanDays: any[];
  prayerTimes: any | null; prayerCompletions: any[]; dailyActivities: any[]; activityCompletions: any[];
  dreams: any[]; dreamSteps: any[]; supplements: any[]; supplementLogs: any[]; bodyStats: any[];
  meals: any[]; mealPlans: any[]; mealPlanMeals: any[]; lastFetch: number;
}

interface ProcessResult {
  handled: boolean;
  response?: string;
  source: 'local' | 'cached' | 'ai';
  needsInput?: boolean;
  options?: string[];
  pendingAction?: any;
}

interface ConversationContext {
  lastIntent?: string;
  pendingAction?: any;
  pendingParams?: any;
  awaitingInput?: string;
}

const CACHE_DURATION = 5 * 60 * 1000;

// Palestinian Jenin dialect responses
const DIALECT = {
  greeting: ["كيفك؟", "شو أخبارك؟", "هلا والله!"],
  understanding: ["فهمت عليك!", "تمام!", "ماشي!", "زبط!"],
  asking: ["شو بدك بالضبط؟", "وين بدك؟", "أي فترة؟"],
  success: ["خلصت!", "تم!", "هيك أحسن!", "زبط معي!"],
  notFound: ["مش لاقي شي", "مافي شي", "فاضي"],
  learning: ["تعلمت!", "حفظت!", "صار عندي!"],
  error: ["في إشي غلط", "مش مزبوط", "جرب تاني"]
};

class AssistantCommandProcessor {
  private commands: Command[] = [];
  private learnedPatterns: LearnedPattern[] = [];
  private intentKeywords: IntentKeyword[] = [];
  private cachedData: CachedData = {
    accounts: [], transactions: [], categories: [], subcategories: [], budgets: [],
    workoutSessions: [], workoutPlans: [], workoutPlanDays: [],
    prayerTimes: null, prayerCompletions: [], dailyActivities: [], activityCompletions: [],
    dreams: [], dreamSteps: [], supplements: [], supplementLogs: [], bodyStats: [],
    meals: [], mealPlans: [], mealPlanMeals: [], lastFetch: 0
  };
  private context: ConversationContext = {};
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    if (this.initialized && Date.now() - this.cachedData.lastFetch < CACHE_DURATION) return;
    this.initPromise = this._doInitialize();
    await this.initPromise;
    this.initPromise = null;
  }

  private async _doInitialize(): Promise<void> {
    try {
      const today = this.getTodayDate();
      const startOfMonth = this.getStartOfMonth();
      const startOfWeek = this.getStartOfWeek();

      const results = await Promise.all([
        supabase.from('assistant_commands').select('*').eq('is_active', true).order('priority', { ascending: false }),
        supabase.from('learned_patterns').select('*').order('usage_count', { ascending: false }),
        supabase.from('intent_keywords').select('*').order('priority', { ascending: false }),
        supabase.from('accounts').select('*'),
        supabase.from('transactions').select('*, categories(name, icon), subcategories(name, location), accounts(name)').order('date', { ascending: false }).limit(500),
        supabase.from('categories').select('*'),
        supabase.from('subcategories').select('*'),
        supabase.from('budgets').select('*'),
        supabase.from('workout_sessions').select('*').order('scheduled_date', { ascending: false }).limit(100),
        supabase.from('workout_plans').select('*'),
        supabase.from('workout_plan_days').select('*'),
        supabase.from('prayer_times').select('*').eq('date', today).limit(1),
        supabase.from('prayer_completions').select('*').gte('completion_date', startOfWeek),
        supabase.from('daily_activities').select('*'),
        supabase.from('dreams').select('*').order('created_at', { ascending: false }),
        supabase.from('dream_steps').select('*'),
        supabase.from('supplements').select('*'),
        supabase.from('supplement_logs').select('*').gte('logged_date', startOfMonth),
        supabase.from('user_body_stats').select('*').order('recorded_at', { ascending: false }).limit(30),
        supabase.from('meals').select('*'),
        supabase.from('meal_plans').select('*'),
        supabase.from('meal_plan_meals').select('*')
      ]);

      const [commandsRes, patternsRes, keywordsRes, accountsRes, transactionsRes, categoriesRes, subcategoriesRes,
        budgetsRes, sessionsRes, plansRes, planDaysRes, prayerRes, prayerCompRes, activitiesRes,
        dreamsRes, stepsRes, suppRes, suppLogsRes, bodyRes, mealsRes, mealPlansRes, mealPlanMealsRes] = results;

      this.commands = (commandsRes.data || []).map(cmd => ({
        id: cmd.id, trigger_patterns: cmd.trigger_patterns, response_template: cmd.response_template,
        action_type: cmd.action_type as ActionType, action_config: cmd.action_config,
        category: cmd.category ?? undefined, priority: cmd.priority, is_active: cmd.is_active
      }));

      this.learnedPatterns = (patternsRes.data || []).map(p => ({
        id: p.id, trigger_phrases: p.trigger_phrases, intent_type: p.intent_type,
        action_config: p.action_config, required_params: p.required_params, default_params: p.default_params
      }));

      this.intentKeywords = (keywordsRes.data || []).map(k => ({
        intent_type: k.intent_type, keywords: k.keywords, action_template: k.action_template, priority: k.priority
      }));

      this.cachedData = {
        accounts: accountsRes.data || [], transactions: transactionsRes.data || [],
        categories: categoriesRes.data || [], subcategories: subcategoriesRes.data || [],
        budgets: budgetsRes.data || [], workoutSessions: sessionsRes.data || [],
        workoutPlans: plansRes.data || [], workoutPlanDays: planDaysRes.data || [],
        prayerTimes: prayerRes.data?.[0] || null, prayerCompletions: prayerCompRes.data || [],
        dailyActivities: activitiesRes.data || [], activityCompletions: [],
        dreams: dreamsRes.data || [], dreamSteps: stepsRes.data || [],
        supplements: suppRes.data || [], supplementLogs: suppLogsRes.data || [],
        bodyStats: bodyRes.data || [], meals: mealsRes.data || [],
        mealPlans: mealPlansRes.data || [], mealPlanMeals: mealPlanMealsRes.data || [],
        lastFetch: Date.now()
      };
      
      this.initialized = true;
      console.log(`AssistantCommandProcessor: ${this.commands.length} commands, ${this.learnedPatterns.length} patterns, ${this.intentKeywords.length} keywords`);
    } catch (error) {
      console.error('Failed to initialize:', error);
    }
  }

  private normalize(text: string): string {
    return text.toLowerCase().trim().replace(/[؟?!.,،:;]/g, '').replace(/\s+/g, ' ')
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  }

  private random<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  async process(message: string): Promise<ProcessResult> {
    await this.initialize();
    const normalized = this.normalize(message);

    // Log interaction for learning
    this.logInteraction(message);

    // Step 1: Check if we're waiting for user input (follow-up question)
    if (this.context.awaitingInput) {
      return this.handleFollowUp(message);
    }

    // Step 2: Check for learning command
    const learningResult = await this.handleLearningCommand(message);
    if (learningResult) return learningResult;

    // Step 3: Check learned patterns first (user-defined shortcuts)
    const patternResult = await this.matchLearnedPattern(normalized);
    if (patternResult) return patternResult;

    // Step 4: Smart intent detection - understand what user wants
    const intentResult = await this.detectIntent(normalized, message);
    if (intentResult) return intentResult;

    // Step 5: Try exact command match
    const command = this.matchCommand(normalized);
    if (command) {
      if (command.action_type === 'response') {
        return { handled: true, response: command.response_template, source: 'local' };
      }
      if (command.action_type === 'action') {
        const response = await this.executeAction(command);
        return { handled: true, response, source: 'cached' };
      }
    }

    // Step 6: Dynamic pattern matching
    const dynamic = this.matchDynamicCommand(normalized);
    if (dynamic) {
      const response = await this.runAction(dynamic.config, dynamic.params);
      return { handled: true, response, source: 'cached' };
    }

    // Step 7: Math
    const mathResult = this.handleMath(message);
    if (mathResult) return { handled: true, response: mathResult, source: 'local' };

    // Not understood - needs AI
    return { handled: false, source: 'ai' };
  }

  private async handleFollowUp(message: string): Promise<ProcessResult> {
    const normalized = this.normalize(message);
    const pending = this.context.pendingAction;

    if (!pending) {
      this.context.awaitingInput = undefined;
      return { handled: false, source: 'ai' };
    }

    // Check if user selected an option
    if (this.context.awaitingInput === 'period') {
      let period = 'month';
      if (normalized.includes('امبارح') || normalized.includes('أمس')) period = 'yesterday';
      else if (normalized.includes('اليوم')) period = 'today';
      else if (normalized.includes('أسبوع') || normalized.includes('اسبوع')) period = 'week';
      else if (normalized.includes('شهر')) period = 'month';

      pending.params = { ...pending.params, period };
      this.context.awaitingInput = undefined;
      this.context.pendingAction = undefined;

      const response = await this.runAction(pending.config, pending.params);
      return { handled: true, response, source: 'cached' };
    }

    this.context.awaitingInput = undefined;
    return { handled: false, source: 'ai' };
  }

  private async detectIntent(normalized: string, original: string): Promise<ProcessResult | null> {
    // Extract entities from the message
    const entities = this.extractEntities(normalized);
    
    // Find matching intent keywords
    let bestMatch: { intent: IntentKeyword; score: number } | null = null;
    
    for (const intent of this.intentKeywords) {
      let score = 0;
      for (const keyword of intent.keywords) {
        if (normalized.includes(this.normalize(keyword))) {
          score += intent.priority;
        }
      }
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { intent, score };
      }
    }

    if (!bestMatch) return null;

    const intent = bestMatch.intent;

    // Handle different intents
    switch (intent.intent_type) {
      case 'spending_by_place':
        // Check if we have a place
        if (entities.place) {
          // Check if we have a period
          if (entities.period) {
            return {
              handled: true,
              response: await this.getSpendingByPlaceWithPeriod(entities.place, entities.period),
              source: 'cached'
            };
          } else {
            // Ask for period
            this.context.awaitingInput = 'period';
            this.context.pendingAction = {
              config: { type: 'get_spending_by_place' },
              params: { place: entities.place }
            };
            return {
              handled: true,
              response: `${this.random(DIALECT.asking)}\n\n• امبارح\n• هالأسبوع\n• هالشهر`,
              source: 'local',
              needsInput: true,
              options: ['امبارح', 'هالأسبوع', 'هالشهر']
            };
          }
        }
        return null;

      case 'spending_period':
        // Just a period mentioned, might be spending query
        if (entities.period && this.context.pendingAction) {
          return this.handleFollowUp(original);
        }
        return null;

      case 'start_learning':
        return {
          handled: true,
          response: `${this.random(DIALECT.understanding)}\n\nعلمني بهالشكل:\n"تعلم: لما أقول [كلمة] اعمل [شو تبدي]"\n\nمثال:\n"تعلم: لما أقول حشاش احسب مصاريف الحشاش"`,
          source: 'local'
        };

      default:
        // Try to execute the action template
        if (intent.action_template?.type) {
          const response = await this.runAction(intent.action_template);
          return { handled: true, response, source: 'cached' };
        }
    }

    return null;
  }

  private extractEntities(normalized: string): { place?: string; period?: string; amount?: number } {
    const entities: { place?: string; period?: string; amount?: number } = {};

    // Extract place (subcategory)
    for (const sub of this.cachedData.subcategories) {
      if (normalized.includes(this.normalize(sub.name))) {
        entities.place = sub.name;
        break;
      }
    }

    // Extract period
    if (normalized.includes('امبارح') || normalized.includes('أمس')) entities.period = 'yesterday';
    else if (normalized.includes('اليوم')) entities.period = 'today';
    else if (normalized.includes('أسبوع') || normalized.includes('اسبوع') || normalized.includes('هالأسبوع')) entities.period = 'week';
    else if (normalized.includes('شهر') || normalized.includes('هالشهر')) entities.period = 'month';

    // Extract amount
    const amountMatch = normalized.match(/(\d+)/);
    if (amountMatch) entities.amount = parseInt(amountMatch[1]);

    return entities;
  }

  private async matchLearnedPattern(normalized: string): Promise<ProcessResult | null> {
    for (const pattern of this.learnedPatterns) {
      for (const phrase of pattern.trigger_phrases) {
        if (normalized.includes(this.normalize(phrase))) {
          // Update usage count
          supabase.from('learned_patterns').update({ 
            usage_count: (pattern as any).usage_count + 1,
            last_used_at: new Date().toISOString()
          }).eq('id', pattern.id).then();

          // Check if we need to ask for params
          if (pattern.required_params) {
            const keys = Object.keys(pattern.required_params);
            if (keys.length > 0) {
              const paramKey = keys[0];
              const options = pattern.required_params[paramKey];
              
              if (Array.isArray(options)) {
                this.context.awaitingInput = paramKey;
                this.context.pendingAction = {
                  config: pattern.action_config,
                  params: pattern.default_params || {}
                };
                return {
                  handled: true,
                  response: `${this.random(DIALECT.asking)}\n\n${options.map(o => `• ${o}`).join('\n')}`,
                  source: 'local',
                  needsInput: true,
                  options
                };
              }
            }
          }

          // Execute the action
          const response = await this.runAction(pattern.action_config, pattern.default_params);
          return { handled: true, response, source: 'cached' };
        }
      }
    }
    return null;
  }

  private async handleLearningCommand(message: string): Promise<ProcessResult | null> {
    // Pattern: "تعلم: لما أقول X اعمل/احسب Y"
    const learnPatterns = [
      /(?:تعلم|احفظ|علمني)[:؛\s]+(?:لما|عندما|اذا)\s+(?:اقول|قلت|أقول)\s+["']?(.+?)["']?\s+(?:اعمل|احسب|قول|افتح|اظهر)\s+["']?(.+?)["']?$/i,
      /(?:تعلم|احفظ)[:؛\s]+["']?(.+?)["']?\s*[=→]\s*["']?(.+?)["']?$/i
    ];

    for (const pattern of learnPatterns) {
      const match = message.match(pattern);
      if (match?.[1] && match?.[2]) {
        const trigger = match[1].trim();
        const action = match[2].trim();

        // Detect what kind of action this is
        const actionConfig = this.parseActionFromDescription(action);
        
        if (actionConfig.needsParams) {
          // Save as learned pattern with required params
          const { error } = await supabase.from('learned_patterns').insert({
            trigger_phrases: [trigger],
            intent_type: actionConfig.intent,
            action_config: actionConfig.config,
            required_params: { period: ['امبارح', 'هالأسبوع', 'هالشهر'] }
          });

          if (error) {
            return { handled: true, response: `${this.random(DIALECT.error)} - مش قادر أحفظ`, source: 'local' };
          }

          await this.reloadCommands();
          return {
            handled: true,
            response: `${this.random(DIALECT.learning)}\n\n**الكلمة:** "${trigger}"\n**الفعل:** ${action}\n\nلما تقول "${trigger}" رح أسألك عن الفترة! 🎯`,
            source: 'local'
          };
        } else {
          // Simple response or direct action
          if (actionConfig.config) {
            const { error } = await supabase.from('learned_patterns').insert({
              trigger_phrases: [trigger],
              intent_type: actionConfig.intent,
              action_config: actionConfig.config
            });
            
            if (!error) {
              await this.reloadCommands();
              return {
                handled: true,
                response: `${this.random(DIALECT.learning)}\n\n**الكلمة:** "${trigger}"\n**الفعل:** ${action}\n\nجرب قول "${trigger}" هلأ! ✨`,
                source: 'local'
              };
            }
          } else {
            // Save as simple text response
            const { error } = await supabase.from('assistant_commands').insert({
              trigger_patterns: [trigger],
              response_template: action,
              action_type: 'response',
              category: 'learned',
              priority: 10
            });

            if (!error) {
              await this.reloadCommands();
              return {
                handled: true,
                response: `${this.random(DIALECT.learning)}\n\n**الكلمة:** "${trigger}"\n**الرد:** "${action}"\n\nجرب هلأ! ✨`,
                source: 'local'
              };
            }
          }
        }

        return { handled: true, response: `${this.random(DIALECT.error)}`, source: 'local' };
      }
    }

    return null;
  }

  private parseActionFromDescription(description: string): { intent: string; config: any; needsParams: boolean } {
    const normalized = this.normalize(description);

    // Check for spending queries
    if (normalized.includes('مصاريف') || normalized.includes('صرفيات') || normalized.includes('صرفت')) {
      // Find place
      for (const sub of this.cachedData.subcategories) {
        if (normalized.includes(this.normalize(sub.name))) {
          return {
            intent: 'spending_by_place',
            config: { type: 'get_spending_by_place', place: sub.name },
            needsParams: !normalized.includes('امبارح') && !normalized.includes('اليوم') && !normalized.includes('شهر')
          };
        }
      }
      return { intent: 'spending', config: { type: 'get_spending_this_month' }, needsParams: false };
    }

    // Check for prayer
    if (normalized.includes('صلا') || normalized.includes('مواقيت')) {
      return { intent: 'prayer', config: { type: 'get_prayer_times' }, needsParams: false };
    }

    // Check for gym
    if (normalized.includes('تمرين') || normalized.includes('جيم')) {
      return { intent: 'gym', config: { type: 'get_gym_stats' }, needsParams: false };
    }

    // Check for supplements
    if (normalized.includes('مكمل')) {
      return { intent: 'supplements', config: { type: 'get_supplements_status' }, needsParams: false };
    }

    // Default - no recognized action
    return { intent: 'response', config: null, needsParams: false };
  }

  private async logInteraction(message: string) {
    try {
      await supabase.from('assistant_interactions').insert({
        user_message: message,
        parsed_intent: this.context.lastIntent
      });
    } catch {}
  }

  private async getSpendingByPlaceWithPeriod(place: string, period: string): Promise<string> {
    let start: string, end = this.getTodayDate(), periodName: string;
    switch (period) {
      case 'today': start = this.getTodayDate(); periodName = 'اليوم'; break;
      case 'yesterday': start = end = this.getYesterdayDate(); periodName = 'امبارح'; break;
      case 'week': start = this.getStartOfWeek(); periodName = 'هالأسبوع'; break;
      default: start = this.getStartOfMonth(); periodName = 'هالشهر';
    }

    const norm = this.normalize(place);
    const sub = this.cachedData.subcategories.find(s => this.normalize(s.name).includes(norm) || norm.includes(this.normalize(s.name)));
    
    if (!sub) return `${this.random(DIALECT.notFound)} - مش لاقي "${place}"`;

    const exp = this.cachedData.transactions.filter(t => 
      t.subcategory_id === sub.id && t.type === 'expense' && t.date >= start && t.date <= end
    );
    const total = exp.reduce((s, t) => s + Number(t.amount), 0);

    if (!exp.length) return `${this.random(DIALECT.notFound)} - ما صرفت على ${sub.name} ${periodName}`;

    const details = exp.slice(0, 5).map(t => `• ${t.date}: ${Number(t.amount).toLocaleString()} ₪`).join('\n');
    return `📍 **صرفياتك على ${sub.name} ${periodName}:**\n\n${details}${exp.length > 5 ? `\n... و ${exp.length - 5} كمان` : ''}\n\n**المجموع: ${total.toLocaleString()} ₪** ${this.random(DIALECT.success)}`;
  }

  // === All other methods from before ===
  
  private matchCommand(normalized: string): Command | null {
    for (const cmd of this.commands) {
      for (const pattern of cmd.trigger_patterns) {
        if (normalized.includes(this.normalize(pattern)) || this.normalize(pattern).includes(normalized)) return cmd;
      }
    }
    return null;
  }

  private matchDynamicCommand(msg: string): { config: any; params: Record<string, string> } | null {
    const placeMatch = msg.match(/كم صرفت (?:على|في|ب)\s+(.+?)(?:\s+هذا الشهر|\s+هالشهر)?$/);
    if (placeMatch) return { config: { type: 'get_spending_by_place' }, params: { place: placeMatch[1] } };
    const prayerMatch = msg.match(/متى\s+(?:صلاه\s+)?(الفجر|الظهر|العصر|المغرب|العشاء|فجر|ظهر|عصر|مغرب|عشاء)/);
    if (prayerMatch) {
      const map: Record<string, string> = { 'الفجر': 'fajr', 'فجر': 'fajr', 'الظهر': 'dhuhr', 'ظهر': 'dhuhr', 'العصر': 'asr', 'عصر': 'asr', 'المغرب': 'maghrib', 'مغرب': 'maghrib', 'العشاء': 'isha', 'عشاء': 'isha' };
      return { config: { type: 'get_specific_prayer' }, params: { prayer: map[prayerMatch[1]] || 'fajr' } };
    }
    return null;
  }

  private async executeAction(command: Command, params?: Record<string, string>): Promise<string> {
    return this.runAction(command.action_config, params);
  }

  private async runAction(config: any, params?: Record<string, string>): Promise<string> {
    const type = config?.type;
    switch (type) {
      case 'get_time': return `🕐 الساعة هلأ **${this.getIsraelTime().time}**`;
      case 'get_date': return `📅 اليوم **${this.getIsraelTime().date}**`;
      case 'get_prayer_times': return this.getPrayerTimesResponse();
      case 'get_next_prayer': return this.getNextPrayerResponse();
      case 'get_specific_prayer': return this.getSpecificPrayerResponse(config.prayer || params?.prayer || 'fajr');
      case 'get_today_schedule': return this.getTodayScheduleResponse();
      case 'get_spending_today': return this.getSpendingResponse('today');
      case 'get_spending_yesterday': return this.getSpendingResponse('yesterday');
      case 'get_spending_this_week': return this.getSpendingResponse('week');
      case 'get_spending_this_month': return this.getSpendingResponse('month');
      case 'get_spending_by_place': 
        const place = config.place || params?.place || '';
        const period = params?.period || 'month';
        return this.getSpendingByPlaceWithPeriod(place, period);
      case 'get_budget_status': return this.getBudgetStatusResponse();
      case 'get_income_this_month': return this.getIncomeResponse();
      case 'get_accounts_summary': return this.getAccountsSummaryResponse();
      case 'get_recent_transactions': return this.getRecentTransactionsResponse();
      case 'get_dreams_status': return this.getDreamsStatusResponse();
      case 'get_gym_stats': return this.getGymStatsResponse();
      case 'get_last_workout': return this.getLastWorkoutResponse();
      case 'get_today_workout': return this.getTodayWorkoutResponse();
      case 'get_weight_progress': return this.getWeightProgressResponse();
      case 'get_supplements_status': return this.getSupplementsStatusResponse();
      case 'get_supplements_due': return this.getSupplementsDueResponse();
      case 'get_food_today': return this.getFoodTodayResponse();
      case 'get_capabilities': return this.getCapabilitiesResponse();
      case 'get_saved_commands': return this.getSavedCommandsResponse();
      default: return `${this.random(DIALECT.error)} - مش فاهم`;
    }
  }

  // === Response generators ===
  private getIsraelTime() {
    const now = new Date();
    return {
      time: new Intl.DateTimeFormat('ar-EG', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: true }).format(now),
      date: new Intl.DateTimeFormat('ar-EG', { timeZone: 'Asia/Jerusalem', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(now)
    };
  }

  private getPrayerTimesResponse(): string {
    const p = this.cachedData.prayerTimes;
    if (!p) return `${this.random(DIALECT.notFound)} - مافي مواقيت صلاة محفوظة`;
    return `🕌 **مواقيت الصلاة:**\n\n🌅 الفجر: **${this.formatTime(p.fajr)}**\n☀️ الظهر: **${this.formatTime(p.dhuhr)}**\n🌇 العصر: **${this.formatTime(p.asr)}**\n🌆 المغرب: **${this.formatTime(p.maghrib)}**\n🌙 العشاء: **${this.formatTime(p.isha)}**`;
  }

  private getNextPrayerResponse(): string {
    const p = this.cachedData.prayerTimes;
    if (!p) return `${this.random(DIALECT.notFound)}`;
    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' });
    const order = [{ k: 'fajr', n: 'الفجر', e: '🌅' }, { k: 'dhuhr', n: 'الظهر', e: '☀️' }, { k: 'asr', n: 'العصر', e: '🌇' }, { k: 'maghrib', n: 'المغرب', e: '🌆' }, { k: 'isha', n: 'العشاء', e: '🌙' }];
    for (const pr of order) { if (p[pr.k] > now) return `${pr.e} الصلاة الجاية **${pr.n}** الساعة **${this.formatTime(p[pr.k])}**`; }
    return `🌅 الصلاة الجاية **الفجر** بكرا **${this.formatTime(p.fajr)}**`;
  }

  private getSpecificPrayerResponse(prayer: string): string {
    const p = this.cachedData.prayerTimes;
    if (!p) return `${this.random(DIALECT.notFound)}`;
    const names: Record<string, { n: string; e: string }> = { fajr: { n: 'الفجر', e: '🌅' }, dhuhr: { n: 'الظهر', e: '☀️' }, asr: { n: 'العصر', e: '🌇' }, maghrib: { n: 'المغرب', e: '🌆' }, isha: { n: 'العشاء', e: '🌙' } };
    const info = names[prayer]; if (!info || !p[prayer]) return `${this.random(DIALECT.notFound)}`;
    return `${info.e} صلاة **${info.n}** الساعة **${this.formatTime(p[prayer])}**`;
  }

  private getTodayScheduleResponse(): string {
    const today = this.getTodayDate(), dow = new Date().getDay() || 7;
    const acts = this.cachedData.dailyActivities.filter(a => a.date === today || (a.is_recurring && a.days_of_week?.includes(dow)));
    if (!acts.length) return `📅 ${this.random(DIALECT.notFound)} - مافي إشي مجدول اليوم`;
    return `📅 **جدولك اليوم:**\n\n${acts.sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99')).map(a => `${a.is_completed ? '✅' : '⬜'} **${a.start_time ? this.formatTime(a.start_time) : '⏰'}** ${a.title}`).join('\n')}`;
  }

  private getSpendingResponse(period: 'today' | 'yesterday' | 'week' | 'month'): string {
    let start: string, end = this.getTodayDate(), name: string;
    switch (period) {
      case 'today': start = this.getTodayDate(); name = 'اليوم'; break;
      case 'yesterday': start = end = this.getYesterdayDate(); name = 'امبارح'; break;
      case 'week': start = this.getStartOfWeek(); name = 'هالأسبوع'; break;
      default: start = this.getStartOfMonth(); name = 'هالشهر';
    }
    const exp = this.cachedData.transactions.filter(t => t.type === 'expense' && t.date >= start && t.date <= end);
    const total = exp.reduce((s, t) => s + Number(t.amount), 0);
    if (!exp.length) return `💸 ${this.random(DIALECT.notFound)} - ما صرفت إشي ${name}`;
    const byCat: Record<string, number> = {}; exp.forEach(t => { const c = t.categories?.name || 'تاني'; byCat[c] = (byCat[c] || 0) + Number(t.amount); });
    return `💸 **مصاريف ${name}:**\n\n${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([n, a]) => `• ${n}: ${a.toLocaleString()} ₪`).join('\n')}\n\n**المجموع: ${total.toLocaleString()} ₪**`;
  }

  private getBudgetStatusResponse(): string {
    const m = new Date().getMonth() + 1, y = new Date().getFullYear();
    const budgets = this.cachedData.budgets.filter(b => b.month === m && b.year === y);
    if (!budgets.length) return `📊 ${this.random(DIALECT.notFound)} - مافي ميزانية`;
    const start = this.getStartOfMonth();
    return `📊 **الميزانية:**\n\n${budgets.map(b => {
      const cat = this.cachedData.categories.find(c => c.id === b.category_id);
      const spent = this.cachedData.transactions.filter(t => t.category_id === b.category_id && t.type === 'expense' && t.date >= start).reduce((s, t) => s + Number(t.amount), 0);
      const pct = Math.round((spent / Number(b.amount)) * 100);
      return `${pct > 90 ? '🔴' : pct > 70 ? '🟡' : '🟢'} **${cat?.name || '?'}**: ${spent}/${Number(b.amount)} (${pct}%)`;
    }).join('\n')}`;
  }

  private getIncomeResponse(): string {
    const start = this.getStartOfMonth();
    const inc = this.cachedData.transactions.filter(t => t.type === 'income' && t.date >= start);
    const total = inc.reduce((s, t) => s + Number(t.amount), 0);
    if (!inc.length) return `💰 ${this.random(DIALECT.notFound)} - مافي دخل هالشهر`;
    return `💰 **دخلك هالشهر: ${total.toLocaleString()} ₪**`;
  }

  private getAccountsSummaryResponse(): string {
    if (!this.cachedData.accounts.length) return `💳 ${this.random(DIALECT.notFound)}`;
    const total = this.cachedData.accounts.reduce((s, a) => s + Number(a.amount), 0);
    return `💳 **حساباتك:**\n\n${this.cachedData.accounts.map(a => `• **${a.name}**: ${Number(a.amount).toLocaleString()} ${a.currency}`).join('\n')}\n\n**المجموع: ${total.toLocaleString()} ₪**`;
  }

  private getRecentTransactionsResponse(): string {
    const recent = this.cachedData.transactions.slice(0, 10);
    if (!recent.length) return `📝 ${this.random(DIALECT.notFound)}`;
    return `📝 **آخر العمليات:**\n\n${recent.map(t => `${t.type === 'expense' ? '🔴' : '🟢'} ${t.date} - ${Number(t.amount).toLocaleString()} ₪ ${t.categories?.name || ''}`).join('\n')}`;
  }

  private getDreamsStatusResponse(): string {
    const active = this.cachedData.dreams.filter(d => d.status === 'in_progress');
    if (!this.cachedData.dreams.length) return `🌟 ${this.random(DIALECT.notFound)} - ما سجلت أحلام`;
    return `🌟 **أحلامك:**\n\n${active.length ? active.map(d => `🎯 ${d.title} - ${d.progress_percentage || 0}%`).join('\n') : 'مافي أحلام نشطة'}`;
  }

  private getGymStatsResponse(): string {
    const month = this.cachedData.workoutSessions.filter(s => s.scheduled_date >= this.getStartOfMonth() && s.completed_at).length;
    const week = this.cachedData.workoutSessions.filter(s => s.scheduled_date >= this.getStartOfWeek() && s.completed_at).length;
    return `💪 **الجيم:**\n\n📅 هالأسبوع: **${week}** تمارين\n📆 هالشهر: **${month}** تمارين`;
  }

  private getLastWorkoutResponse(): string {
    const last = this.cachedData.workoutSessions.find(s => s.completed_at);
    if (!last) return `💪 ${this.random(DIALECT.notFound)} - ما تمرنت بعد`;
    return `💪 **آخر تمرين:** ${last.scheduled_date}\n🎯 ${last.muscle_groups?.join(', ') || ''}`;
  }

  private getTodayWorkoutResponse(): string {
    const today = this.getTodayDate(), dow = new Date().getDay() || 7;
    const session = this.cachedData.workoutSessions.find(s => s.scheduled_date === today);
    if (session) return `💪 **تمرين اليوم:** ${session.muscle_groups?.join(', ') || ''} ${session.completed_at ? '✅' : '⏳'}`;
    const plan = this.cachedData.workoutPlans.find(p => p.is_active);
    if (plan) { const day = this.cachedData.workoutPlanDays.find(d => d.plan_id === plan.id && d.day_of_week === dow); if (day) return `💪 **مخطط اليوم:** ${day.muscle_groups?.join(', ') || ''}`; }
    return `💪 يوم راحة! 😌`;
  }

  private getWeightProgressResponse(): string {
    if (!this.cachedData.bodyStats.length) return `⚖️ ${this.random(DIALECT.notFound)}`;
    const latest = this.cachedData.bodyStats[0];
    return `⚖️ **وزنك:** ${Number(latest.weight).toFixed(1)} كغ`;
  }

  private getSupplementsStatusResponse(): string {
    if (!this.cachedData.supplements.length) return `💊 ${this.random(DIALECT.notFound)}`;
    return `💊 **المكملات:**\n\n${this.cachedData.supplements.map(s => `${Number(s.remaining_doses) <= s.warning_threshold ? '⚠️' : '✅'} **${s.name}**: ${s.remaining_doses}/${s.total_doses}`).join('\n')}`;
  }

  private getSupplementsDueResponse(): string {
    const today = this.getTodayDate();
    const taken = this.cachedData.supplementLogs.filter(l => l.logged_date === today).map(l => l.supplement_id);
    const notTaken = this.cachedData.supplements.filter(s => !taken.includes(s.id));
    if (!notTaken.length) return `✅ أخذت كل المكملات!`;
    return `💊 **لازم تاخذ:**\n\n${notTaken.map(s => `• ${s.name}`).join('\n')}`;
  }

  private getFoodTodayResponse(): string {
    const dow = new Date().getDay() || 7, today = this.getTodayDate();
    const plan = this.cachedData.mealPlans.find(p => p.is_active && (!p.end_date || p.end_date >= today) && p.start_date <= today);
    if (!plan) return `🍽️ ${this.random(DIALECT.notFound)} - مافي خطة أكل`;
    const meals = this.cachedData.mealPlanMeals.filter(pm => pm.meal_plan_id === plan.id && (pm.day_of_week === dow || !pm.day_of_week));
    if (!meals.length) return `🍽️ ${this.random(DIALECT.notFound)}`;
    return `🍽️ **وجبات اليوم:**\n\n${meals.map(pm => { const m = this.cachedData.meals.find(x => x.id === pm.meal_id); return `• ${pm.meal_time ? this.formatTime(pm.meal_time) : ''} **${m?.name || ''}**`; }).join('\n')}`;
  }

  private getCapabilitiesResponse(): string {
    return `🤖 **شو بقدر أعمل:**\n\n📿 الصلاة\n💰 المصاريف والميزانية\n📅 الجدول\n💪 الجيم\n🌟 الأحلام\n💊 المكملات\n🍽️ الأكل\n\n📚 **علمني:**\nقول: "تعلم: لما أقول [كلمة] اعمل [شو تبدي]"`;
  }

  private getSavedCommandsResponse(): string {
    const learned = this.commands.filter(c => c.category === 'learned');
    const patterns = this.learnedPatterns;
    if (!learned.length && !patterns.length) return `📚 ما حفظت إشي بعد`;
    let result = '📚 **الأوامر المحفوظة:**\n\n';
    if (learned.length) result += learned.map(c => `• "${c.trigger_patterns[0]}" → "${c.response_template}"`).join('\n');
    if (patterns.length) result += '\n\n**أوامر ذكية:**\n' + patterns.map(p => `• "${p.trigger_phrases[0]}" → ${p.intent_type}`).join('\n');
    return result;
  }

  private handleMath(message: string): string | null {
    const match = message.match(/(\d+(?:\.\d+)?)\s*([+\-*/×÷])\s*(\d+(?:\.\d+)?)/);
    if (match) {
      const [, n1, op, n2] = match;
      const num1 = parseFloat(n1), num2 = parseFloat(n2);
      let result: number;
      switch (op) { case '+': result = num1 + num2; break; case '-': result = num1 - num2; break; case '*': case '×': result = num1 * num2; break; case '/': case '÷': result = num2 !== 0 ? num1 / num2 : NaN; break; default: return null; }
      if (isNaN(result)) return 'مش ممكن تقسم على صفر! 🙈';
      return `🔢 **النتيجة:** ${num1} ${op} ${num2} = ${result}`;
    }
    return null;
  }

  // Utility
  private getTodayDate = () => new Date().toISOString().split('T')[0];
  private getYesterdayDate = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; };
  private getStartOfWeek = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0]; };
  private getStartOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
  private formatTime = (t: string) => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'م' : 'ص'}`; };

  async reloadCommands(): Promise<void> { this.initialized = false; this.initPromise = null; await this.initialize(); }
  async forceRefreshCache(): Promise<void> { this.cachedData.lastFetch = 0; await this.initialize(); }
  getCachedAccounts() { return this.cachedData.accounts; }
}

export const assistantProcessor = new AssistantCommandProcessor();
