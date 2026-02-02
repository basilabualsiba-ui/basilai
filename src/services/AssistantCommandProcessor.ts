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

interface RozKnowledge {
  id: string;
  query_pattern: string;
  query_examples: string[];
  response_type: string;
  action_config: any;
  response_template: string;
  sql_template?: string;
  tables_used: string[];
  success_count: number;
}

interface RozPersonality {
  trait_type: string;
  trait_key: string;
  trait_value: any;
}

interface RozUserMemory {
  id: string;
  memory_type: string;
  memory_key: string;
  memory_value: any;
  context?: string;
}

// Full database cache interface
interface CachedData {
  // Financial
  accounts: any[];
  transactions: any[];
  categories: any[];
  subcategories: any[];
  budgets: any[];
  currencyRatios: any[];
  // Gym
  workoutSessions: any[];
  workoutPlans: any[];
  workoutPlanDays: any[];
  exercises: any[];
  exerciseSets: any[];
  muscleGroups: any[];
  workouts: any[];
  workoutExercises: any[];
  planWorkouts: any[];
  workoutPlaylists: any[];
  // Food
  meals: any[];
  mealPlans: any[];
  mealPlanMeals: any[];
  mealFoods: any[];
  foodItems: any[];
  mealConsumptions: any[];
  // Prayer
  prayerTimes: any | null;
  prayerCompletions: any[];
  // Schedule
  dailyActivities: any[];
  activityCompletions: any[];
  // Dreams
  dreams: any[];
  dreamSteps: any[];
  dreamPhotos: any[];
  // Supplements
  supplements: any[];
  supplementLogs: any[];
  // Personal
  bodyStats: any[];
  userPreferences: any[];
  // Roz's Brain
  rozKnowledge: RozKnowledge[];
  rozPersonality: RozPersonality[];
  rozUserMemory: RozUserMemory[];
  // Metadata
  lastFetch: number;
}

interface ProcessResult {
  handled: boolean;
  response?: string;
  source: 'local' | 'cached' | 'ai';
  needsInput?: boolean;
  options?: string[];
  pendingAction?: any;
  shouldLearn?: boolean;
  originalQuery?: string;
}

interface ConversationContext {
  lastIntent?: string;
  pendingAction?: any;
  pendingParams?: any;
  awaitingInput?: string;
  lastQuery?: string;
}

const CACHE_DURATION = 5 * 60 * 1000;

// Roz's personality - loaded from DB but with fallbacks
const ROZ_DEFAULT_PERSONALITY = {
  name: 'روز',
  nameEn: 'Roz',
  gender: 'female',
  emoji: '🌹',
};

// Palestinian Jenin dialect responses
const DIALECT = {
  greeting: ["هلا!", "أهلين!", "كيفك؟", "شو أخبارك؟", "هلا والله!"],
  understanding: ["فهمت عليك!", "تمام!", "ماشي!", "زبط!", "أكيد!"],
  asking: ["شو بدك بالضبط؟", "وين بدك؟", "أي فترة؟", "وضحلي أكتر"],
  thinking: ["استنى شوي...", "خليني أشوف...", "لحظة...", "دقيقة..."],
  success: ["خلصت!", "تم!", "هيك أحسن!", "زبط معي!"],
  notFound: ["مش لاقية شي", "مافي شي", "فاضي", "ما لقيت"],
  learning: ["تعلمت!", "حفظت!", "صار عندي!", "فهمت!"],
  error: ["في إشي غلط", "مش مزبوط", "جرب تاني"],
  goodbye: ["مع السلامة!", "يلا باي!", "الله معك!", "بنشوفك!"],
  personality: ["أنا روز 🌹", "خدامتك!", "شو بدك مني؟", "حاضرة!"]
};

class AssistantCommandProcessor {
  private commands: Command[] = [];
  private learnedPatterns: LearnedPattern[] = [];
  private intentKeywords: IntentKeyword[] = [];
  private cachedData: CachedData = this.getEmptyCache();
  private context: ConversationContext = {};
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private personality = ROZ_DEFAULT_PERSONALITY;

  private getEmptyCache(): CachedData {
    return {
      accounts: [], transactions: [], categories: [], subcategories: [], budgets: [], currencyRatios: [],
      workoutSessions: [], workoutPlans: [], workoutPlanDays: [], exercises: [], exerciseSets: [],
      muscleGroups: [], workouts: [], workoutExercises: [], planWorkouts: [], workoutPlaylists: [],
      meals: [], mealPlans: [], mealPlanMeals: [], mealFoods: [], foodItems: [], mealConsumptions: [],
      prayerTimes: null, prayerCompletions: [], dailyActivities: [], activityCompletions: [],
      dreams: [], dreamSteps: [], dreamPhotos: [], supplements: [], supplementLogs: [],
      bodyStats: [], userPreferences: [], rozKnowledge: [], rozPersonality: [], rozUserMemory: [],
      lastFetch: 0
    };
  }

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

      // Fetch ALL data in parallel for Roz's full access
      const results = await Promise.all([
        // Commands & patterns
        supabase.from('assistant_commands').select('*').eq('is_active', true).order('priority', { ascending: false }),
        supabase.from('learned_patterns').select('*').order('usage_count', { ascending: false }),
        supabase.from('intent_keywords').select('*').order('priority', { ascending: false }),
        // Financial (6)
        supabase.from('accounts').select('*'),
        supabase.from('transactions').select('*, categories(name, icon), subcategories(name, location), accounts(name)').order('date', { ascending: false }),
        supabase.from('categories').select('*'),
        supabase.from('subcategories').select('*'),
        supabase.from('budgets').select('*'),
        supabase.from('currency_ratios').select('*'),
        // Gym (10)
        supabase.from('workout_sessions').select('*').order('scheduled_date', { ascending: false }),
        supabase.from('workout_plans').select('*'),
        supabase.from('workout_plan_days').select('*'),
        supabase.from('exercises').select('*'),
        supabase.from('exercise_sets').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('muscle_groups').select('*'),
        supabase.from('workouts').select('*'),
        supabase.from('workout_exercises').select('*'),
        supabase.from('plan_workouts').select('*'),
        supabase.from('workout_playlists').select('*'),
        // Food (6)
        supabase.from('meals').select('*'),
        supabase.from('meal_plans').select('*'),
        supabase.from('meal_plan_meals').select('*'),
        supabase.from('meal_foods').select('*'),
        supabase.from('food_items').select('*'),
        supabase.from('meal_consumptions').select('*').gte('consumed_at', startOfWeek),
        // Prayer (2)
        supabase.from('prayer_times').select('*').eq('date', today).limit(1),
        supabase.from('prayer_completions').select('*').gte('completion_date', startOfWeek),
        // Schedule (2)
        supabase.from('daily_activities').select('*'),
        supabase.from('activity_completions').select('*').gte('completion_date', startOfWeek),
        // Dreams (3)
        supabase.from('dreams').select('*').order('created_at', { ascending: false }),
        supabase.from('dream_steps').select('*'),
        supabase.from('dream_photos').select('*'),
        // Supplements (2)
        supabase.from('supplements').select('*'),
        supabase.from('supplement_logs').select('*').gte('logged_date', startOfMonth),
        // Personal
        supabase.from('user_body_stats').select('*').order('recorded_at', { ascending: false }).limit(100),
        supabase.from('user_preferences').select('*'),
        // Roz's Brain (3)
        supabase.from('roz_knowledge').select('*').order('success_count', { ascending: false }),
        supabase.from('roz_personality').select('*'),
        supabase.from('roz_user_memory').select('*').order('reference_count', { ascending: false })
      ]);

      const [
        commandsRes, patternsRes, keywordsRes,
        accountsRes, transactionsRes, categoriesRes, subcategoriesRes, budgetsRes, currencyRes,
        sessionsRes, plansRes, planDaysRes, exercisesRes, setsRes, muscleRes, workoutsRes, workoutExRes, planWorkoutsRes, playlistsRes,
        mealsRes, mealPlansRes, mealPlanMealsRes, mealFoodsRes, foodItemsRes, mealConsumptionsRes,
        prayerRes, prayerCompRes,
        activitiesRes, activityCompRes,
        dreamsRes, stepsRes, photosRes,
        suppRes, suppLogsRes,
        bodyRes, prefsRes,
        knowledgeRes, personalityRes, memoryRes
      ] = results;

      // Map commands
      this.commands = (commandsRes.data || []).map(cmd => ({
        id: cmd.id, trigger_patterns: cmd.trigger_patterns, response_template: cmd.response_template,
        action_type: cmd.action_type as ActionType, action_config: cmd.action_config,
        category: cmd.category ?? undefined, priority: cmd.priority ?? 0, is_active: cmd.is_active ?? true
      }));

      this.learnedPatterns = (patternsRes.data || []).map(p => ({
        id: p.id, trigger_phrases: p.trigger_phrases, intent_type: p.intent_type,
        action_config: p.action_config, required_params: p.required_params, default_params: p.default_params
      }));

      this.intentKeywords = (keywordsRes.data || []).map(k => ({
        intent_type: k.intent_type, keywords: k.keywords, action_template: k.action_template, priority: k.priority ?? 0
      }));

      // Cache ALL data
      this.cachedData = {
        accounts: accountsRes.data || [],
        transactions: transactionsRes.data || [],
        categories: categoriesRes.data || [],
        subcategories: subcategoriesRes.data || [],
        budgets: budgetsRes.data || [],
        currencyRatios: currencyRes.data || [],
        workoutSessions: sessionsRes.data || [],
        workoutPlans: plansRes.data || [],
        workoutPlanDays: planDaysRes.data || [],
        exercises: exercisesRes.data || [],
        exerciseSets: setsRes.data || [],
        muscleGroups: muscleRes.data || [],
        workouts: workoutsRes.data || [],
        workoutExercises: workoutExRes.data || [],
        planWorkouts: planWorkoutsRes.data || [],
        workoutPlaylists: playlistsRes.data || [],
        meals: mealsRes.data || [],
        mealPlans: mealPlansRes.data || [],
        mealPlanMeals: mealPlanMealsRes.data || [],
        mealFoods: mealFoodsRes.data || [],
        foodItems: foodItemsRes.data || [],
        mealConsumptions: mealConsumptionsRes.data || [],
        prayerTimes: prayerRes.data?.[0] || null,
        prayerCompletions: prayerCompRes.data || [],
        dailyActivities: activitiesRes.data || [],
        activityCompletions: activityCompRes.data || [],
        dreams: dreamsRes.data || [],
        dreamSteps: stepsRes.data || [],
        dreamPhotos: photosRes.data || [],
        supplements: suppRes.data || [],
        supplementLogs: suppLogsRes.data || [],
        bodyStats: bodyRes.data || [],
        userPreferences: prefsRes.data || [],
        rozKnowledge: (knowledgeRes.data || []).map(k => ({
          id: k.id, query_pattern: k.query_pattern, query_examples: k.query_examples || [],
          response_type: k.response_type, action_config: k.action_config,
          response_template: k.response_template || '', sql_template: k.sql_template,
          tables_used: k.tables_used || [], success_count: k.success_count || 0
        })),
        rozPersonality: (personalityRes.data || []).map(p => ({
          trait_type: p.trait_type, trait_key: p.trait_key, trait_value: p.trait_value
        })),
        rozUserMemory: (memoryRes.data || []).map(m => ({
          id: m.id, memory_type: m.memory_type, memory_key: m.memory_key,
          memory_value: m.memory_value, context: m.context
        })),
        lastFetch: Date.now()
      };

      // Load Roz's personality from DB
      this.loadPersonality();
      
      this.initialized = true;
      console.log(`🌹 روز جاهزة! ${this.commands.length} أوامر, ${this.cachedData.rozKnowledge.length} معرفة, ${this.cachedData.rozUserMemory.length} ذكريات`);
    } catch (error) {
      console.error('Failed to initialize Roz:', error);
    }
  }

  private loadPersonality(): void {
    const getName = this.cachedData.rozPersonality.find(p => p.trait_type === 'identity' && p.trait_key === 'name');
    if (getName) {
      try {
        this.personality.name = JSON.parse(getName.trait_value);
      } catch { this.personality.name = getName.trait_value; }
    }
  }

  private normalize(text: string): string {
    return text.toLowerCase().trim()
      .replace(/[؟?!.,،:;]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي');
  }

  private random<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private getRozPrefix(): string {
    return `${this.personality.emoji} `;
  }

  async process(message: string): Promise<ProcessResult> {
    await this.initialize();
    const normalized = this.normalize(message);
    this.context.lastQuery = message;

    // Log interaction
    this.logInteraction(message);

    // Step 1: Check if awaiting input (follow-up)
    if (this.context.awaitingInput) {
      return this.handleFollowUp(message);
    }

    // Step 2: Check for personality commands (about Roz)
    const personalityResult = await this.handlePersonalityCommand(normalized, message);
    if (personalityResult) return personalityResult;

    // Step 3: Check for user memory commands
    const memoryResult = await this.handleMemoryCommand(normalized, message);
    if (memoryResult) return memoryResult;

    // Step 4: Check for learning commands
    const learningResult = await this.handleLearningCommand(message);
    if (learningResult) return learningResult;

    // Step 5: Check Roz's learned knowledge first (AI-learned patterns)
    const knowledgeResult = await this.matchRozKnowledge(normalized, message);
    if (knowledgeResult) return knowledgeResult;

    // Step 6: Check learned patterns (user-defined)
    const patternResult = await this.matchLearnedPattern(normalized);
    if (patternResult) return patternResult;

    // Step 7: Smart intent detection
    const intentResult = await this.detectIntent(normalized, message);
    if (intentResult) return intentResult;

    // Step 8: Try exact command match
    const command = this.matchCommand(normalized);
    if (command) {
      if (command.action_type === 'response') {
        return { handled: true, response: this.getRozPrefix() + command.response_template, source: 'local' };
      }
      if (command.action_type === 'action') {
        const response = await this.executeAction(command);
        return { handled: true, response: this.getRozPrefix() + response, source: 'cached' };
      }
    }

    // Step 9: Dynamic pattern matching
    const dynamic = this.matchDynamicCommand(normalized);
    if (dynamic) {
      const response = await this.runAction(dynamic.config, dynamic.params);
      return { handled: true, response: this.getRozPrefix() + response, source: 'cached' };
    }

    // Step 10: Math
    const mathResult = this.handleMath(message);
    if (mathResult) return { handled: true, response: this.getRozPrefix() + mathResult, source: 'local' };

    // Not understood - needs AI (and will learn from it!)
    return { 
      handled: false, 
      source: 'ai',
      shouldLearn: true,
      originalQuery: message
    };
  }

  // Learn from AI response
  async learnFromAIResponse(userQuery: string, aiResponse: string): Promise<void> {
    try {
      // Extract pattern from query
      const pattern = this.extractQueryPattern(userQuery);
      
      // Detect action type from response
      const actionInfo = this.detectActionFromResponse(aiResponse, userQuery);
      
      // Check if we already have similar knowledge
      const existing = this.cachedData.rozKnowledge.find(k => 
        this.normalize(k.query_pattern) === this.normalize(pattern)
      );

      if (existing) {
        // Update existing knowledge
        await supabase.from('roz_knowledge').update({
          query_examples: [...new Set([...(existing.query_examples || []), userQuery])],
          success_count: existing.success_count + 1,
          last_used_at: new Date().toISOString()
        }).eq('id', existing.id);
      } else {
        // Insert new knowledge
        await supabase.from('roz_knowledge').insert({
          query_pattern: pattern,
          query_examples: [userQuery],
          response_type: actionInfo.type,
          action_config: actionInfo.config,
          response_template: this.createResponseTemplate(aiResponse),
          tables_used: actionInfo.tables,
          learned_from_ai: true
        });
      }

      // Refresh knowledge cache
      const { data } = await supabase.from('roz_knowledge').select('*').order('success_count', { ascending: false });
      if (data) {
        this.cachedData.rozKnowledge = data.map(k => ({
          id: k.id, query_pattern: k.query_pattern, query_examples: k.query_examples || [],
          response_type: k.response_type, action_config: k.action_config,
          response_template: k.response_template || '', sql_template: k.sql_template,
          tables_used: k.tables_used || [], success_count: k.success_count || 0
        }));
      }

      console.log(`🌹 تعلمت نمط جديد: "${pattern}"`);
    } catch (error) {
      console.error('Error learning from AI:', error);
    }
  }

  private extractQueryPattern(query: string): string {
    let pattern = this.normalize(query);
    
    // Replace specific values with placeholders
    // Replace place names
    for (const sub of this.cachedData.subcategories) {
      const subNorm = this.normalize(sub.name);
      if (pattern.includes(subNorm)) {
        pattern = pattern.replace(subNorm, '{place}');
        break;
      }
    }

    // Replace periods
    const periods = [
      { patterns: ['امبارح', 'أمس', 'البارحه'], placeholder: '{period}' },
      { patterns: ['اليوم', 'هاليوم'], placeholder: '{period}' },
      { patterns: ['هالأسبوع', 'اسبوع', 'أسبوع'], placeholder: '{period}' },
      { patterns: ['هالشهر', 'شهر'], placeholder: '{period}' }
    ];

    for (const p of periods) {
      for (const pat of p.patterns) {
        if (pattern.includes(pat)) {
          pattern = pattern.replace(pat, p.placeholder);
          break;
        }
      }
    }

    // Replace numbers
    pattern = pattern.replace(/\d+/g, '{number}');

    return pattern;
  }

  private detectActionFromResponse(response: string, query: string): { type: string; config: any; tables: string[] } {
    const queryNorm = this.normalize(query);
    const respNorm = this.normalize(response);

    // Detect spending queries
    if (queryNorm.includes('صرف') || queryNorm.includes('مصاريف')) {
      return {
        type: 'spending_query',
        config: { type: 'get_spending_by_place' },
        tables: ['transactions', 'subcategories', 'categories']
      };
    }

    // Detect prayer queries
    if (queryNorm.includes('صلا') || queryNorm.includes('مواقيت')) {
      return {
        type: 'prayer_query',
        config: { type: 'get_prayer_times' },
        tables: ['prayer_times']
      };
    }

    // Detect gym queries
    if (queryNorm.includes('تمرين') || queryNorm.includes('جيم')) {
      return {
        type: 'gym_query',
        config: { type: 'get_gym_stats' },
        tables: ['workout_sessions', 'exercises']
      };
    }

    // Detect supplement queries
    if (queryNorm.includes('مكمل')) {
      return {
        type: 'supplement_query',
        config: { type: 'get_supplements_status' },
        tables: ['supplements', 'supplement_logs']
      };
    }

    // Detect dream queries
    if (queryNorm.includes('حلم') || queryNorm.includes('أحلام')) {
      return {
        type: 'dream_query',
        config: { type: 'get_dreams_status' },
        tables: ['dreams', 'dream_steps']
      };
    }

    // Default - general response
    return {
      type: 'general_response',
      config: { type: 'template_response' },
      tables: []
    };
  }

  private createResponseTemplate(response: string): string {
    // Extract template with placeholders
    let template = response;
    
    // Replace specific numbers with placeholders
    template = template.replace(/\d+(?:,\d+)*(?:\.\d+)?/g, '{value}');
    
    return template;
  }

  private async matchRozKnowledge(normalized: string, original: string): Promise<ProcessResult | null> {
    for (const knowledge of this.cachedData.rozKnowledge) {
      const patternNorm = this.normalize(knowledge.query_pattern);
      
      // Check if query matches pattern
      const patternRegex = patternNorm
        .replace(/\{place\}/g, '(.+?)')
        .replace(/\{period\}/g, '(امبارح|اليوم|هالأسبوع|هالشهر|أمس|اسبوع|شهر)')
        .replace(/\{number\}/g, '(\\d+)');

      const regex = new RegExp(patternRegex);
      const match = normalized.match(regex);

      if (match || patternNorm.includes(normalized) || normalized.includes(patternNorm)) {
        // Extract entities
        const entities = this.extractEntities(normalized);

        // Execute the action
        if (knowledge.action_config?.type) {
          const response = await this.runAction(knowledge.action_config, entities as any);
          
          // Update success count
          supabase.from('roz_knowledge').update({
            success_count: knowledge.success_count + 1,
            last_used_at: new Date().toISOString()
          }).eq('id', knowledge.id).then();

          return { handled: true, response: this.getRozPrefix() + response, source: 'cached' };
        }

        // Use template response
        if (knowledge.response_template) {
          return { handled: true, response: this.getRozPrefix() + knowledge.response_template, source: 'cached' };
        }
      }
    }

    return null;
  }

  private async handlePersonalityCommand(normalized: string, original: string): Promise<ProcessResult | null> {
    // Check if asking about Roz
    if (normalized.includes('مين انت') || normalized.includes('شو اسمك') || normalized.includes('عرفيني على حالك')) {
      return {
        handled: true,
        response: `${this.getRozPrefix()}أنا ${this.personality.name}! مساعدتك الشخصية بلهجة جنينية 🇵🇸\n\nبقدر أساعدك ب:\n💰 المصاريف والميزانية\n🕌 مواقيت الصلاة\n💪 الجيم والتمارين\n💊 المكملات\n🌟 أحلامك وأهدافك\n🍽️ خطط الأكل\n\nوبتعلم منك كل يوم! ${this.random(DIALECT.personality)}`,
        source: 'local'
      };
    }

    // Check for personality modification commands
    const personalityPatterns = [
      /(?:روز\s+)?(?:خليكي|كوني|صيري)\s+(.+)/i,
      /(?:بدي\s+)?(?:اياكي|إياكي)\s+(.+)/i
    ];

    for (const pattern of personalityPatterns) {
      const match = original.match(pattern);
      if (match?.[1]) {
        const trait = match[1].trim();
        
        // Save personality trait
        await supabase.from('roz_personality').upsert({
          trait_type: 'user_requested',
          trait_key: 'tone_modifier',
          trait_value: JSON.stringify(trait)
        }, { onConflict: 'trait_type,trait_key' });

        return {
          handled: true,
          response: `${this.getRozPrefix()}${this.random(DIALECT.understanding)} من هلأ رح أكون ${trait} ❤️`,
          source: 'local'
        };
      }
    }

    return null;
  }

  private async handleMemoryCommand(normalized: string, original: string): Promise<ProcessResult | null> {
    // Check for memory save commands
    const memoryPatterns = [
      /(?:احفظي?|تذكري?)\s+(?:انو?|إنو?|أنو?)?\s*(.+)/i,
      /(?:أنا\s+)?(?:بحب|بفضل|بكره|ما بحب)\s+(.+)/i
    ];

    for (const pattern of memoryPatterns) {
      const match = original.match(pattern);
      if (match?.[1]) {
        const memory = match[1].trim();
        
        // Detect memory type
        let memoryType = 'fact';
        let context = 'general';
        
        if (normalized.includes('بحب') || normalized.includes('بفضل')) {
          memoryType = 'preference';
        } else if (normalized.includes('بكره') || normalized.includes('ما بحب')) {
          memoryType = 'dislike';
        }

        // Detect context
        if (normalized.includes('اكل') || normalized.includes('طعام')) context = 'food';
        else if (normalized.includes('تمرين') || normalized.includes('جيم')) context = 'gym';
        else if (normalized.includes('مصاري') || normalized.includes('فلوس')) context = 'finance';

        // Save memory
        await supabase.from('roz_user_memory').insert({
          memory_type: memoryType,
          memory_key: memory.substring(0, 50),
          memory_value: JSON.stringify(memory),
          context: context,
          source: 'user_told'
        });

        return {
          handled: true,
          response: `${this.getRozPrefix()}${this.random(DIALECT.learning)} رح أتذكر إنك ${memory} ❤️`,
          source: 'local'
        };
      }
    }

    // Check for memory recall
    if (normalized.includes('شو بتعرفي عني') || normalized.includes('شو بتتذكري')) {
      const memories = this.cachedData.rozUserMemory.slice(0, 5);
      if (!memories.length) {
        return {
          handled: true,
          response: `${this.getRozPrefix()}لسا ما حكيتلي كتير عن حالك! احكيلي شو بتحب وشو بتكره 😊`,
          source: 'local'
        };
      }

      const memoryList = memories.map(m => {
        try {
          return `• ${JSON.parse(m.memory_value)}`;
        } catch {
          return `• ${m.memory_value}`;
        }
      }).join('\n');

      return {
        handled: true,
        response: `${this.getRozPrefix()}هاي اللي بتذكره عنك:\n\n${memoryList}`,
        source: 'local'
      };
    }

    return null;
  }

  private async handleFollowUp(message: string): Promise<ProcessResult> {
    const normalized = this.normalize(message);
    const pending = this.context.pendingAction;

    if (!pending) {
      this.context.awaitingInput = undefined;
      return { handled: false, source: 'ai' };
    }

    // Check for period selection
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
      return { handled: true, response: this.getRozPrefix() + response, source: 'cached' };
    }

    this.context.awaitingInput = undefined;
    return { handled: false, source: 'ai' };
  }

  private async detectIntent(normalized: string, original: string): Promise<ProcessResult | null> {
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

    switch (intent.intent_type) {
      case 'spending_by_place':
        if (entities.place) {
          if (entities.period) {
            return {
              handled: true,
              response: this.getRozPrefix() + await this.getSpendingByPlaceWithPeriod(entities.place, entities.period),
              source: 'cached'
            };
          } else {
            this.context.awaitingInput = 'period';
            this.context.pendingAction = {
              config: { type: 'get_spending_by_place' },
              params: { place: entities.place }
            };
            return {
              handled: true,
              response: `${this.getRozPrefix()}${this.random(DIALECT.asking)}\n\n• امبارح\n• هالأسبوع\n• هالشهر`,
              source: 'local',
              needsInput: true,
              options: ['امبارح', 'هالأسبوع', 'هالشهر']
            };
          }
        }
        return null;

      case 'spending_period':
        if (entities.period && this.context.pendingAction) {
          return this.handleFollowUp(original);
        }
        return null;

      case 'start_learning':
        return {
          handled: true,
          response: `${this.getRozPrefix()}${this.random(DIALECT.understanding)}\n\nعلميني بهالشكل:\n"تعلم: لما أقول [كلمة] اعمل [شو تبدي]"\n\nمثال:\n"تعلم: لما أقول حشاش احسب مصاريف الحشاش"`,
          source: 'local'
        };

      default:
        if (intent.action_template?.type) {
          const response = await this.runAction(intent.action_template);
          return { handled: true, response: this.getRozPrefix() + response, source: 'cached' };
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
                  response: `${this.getRozPrefix()}${this.random(DIALECT.asking)}\n\n${options.map(o => `• ${o}`).join('\n')}`,
                  source: 'local',
                  needsInput: true,
                  options
                };
              }
            }
          }

          // Execute the action
          const response = await this.runAction(pattern.action_config, pattern.default_params);
          return { handled: true, response: this.getRozPrefix() + response, source: 'cached' };
        }
      }
    }
    return null;
  }

  private async handleLearningCommand(message: string): Promise<ProcessResult | null> {
    const learnPatterns = [
      /(?:تعلم|احفظ|علمني)[:؛\s]+(?:لما|عندما|اذا)\s+(?:اقول|قلت|أقول)\s+["']?(.+?)["']?\s+(?:اعمل|احسب|قول|افتح|اظهر)\s+["']?(.+?)["']?$/i,
      /(?:تعلم|احفظ)[:؛\s]+["']?(.+?)["']?\s*[=→]\s*["']?(.+?)["']?$/i
    ];

    for (const pattern of learnPatterns) {
      const match = message.match(pattern);
      if (match?.[1] && match?.[2]) {
        const trigger = match[1].trim();
        const action = match[2].trim();

        const actionConfig = this.parseActionFromDescription(action);
        
        if (actionConfig.needsParams) {
          const { error } = await supabase.from('learned_patterns').insert({
            trigger_phrases: [trigger],
            intent_type: actionConfig.intent,
            action_config: actionConfig.config,
            required_params: { period: ['امبارح', 'هالأسبوع', 'هالشهر'] }
          });

          if (error) {
            return { handled: true, response: `${this.getRozPrefix()}${this.random(DIALECT.error)} - مش قادرة أحفظ`, source: 'local' };
          }

          await this.reloadCommands();
          return {
            handled: true,
            response: `${this.getRozPrefix()}${this.random(DIALECT.learning)}\n\n**الكلمة:** "${trigger}"\n**الفعل:** ${action}\n\nلما تقول "${trigger}" رح أسألك عن الفترة! 🎯`,
            source: 'local'
          };
        } else {
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
                response: `${this.getRozPrefix()}${this.random(DIALECT.learning)}\n\n**الكلمة:** "${trigger}"\n**الفعل:** ${action}\n\nجربي قولي "${trigger}" هلأ! ✨`,
                source: 'local'
              };
            }
          } else {
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
                response: `${this.getRozPrefix()}${this.random(DIALECT.learning)}\n\n**الكلمة:** "${trigger}"\n**الرد:** "${action}"\n\nجربي هلأ! ✨`,
                source: 'local'
              };
            }
          }
        }

        return { handled: true, response: `${this.getRozPrefix()}${this.random(DIALECT.error)}`, source: 'local' };
      }
    }

    return null;
  }

  private parseActionFromDescription(description: string): { intent: string; config: any; needsParams: boolean } {
    const normalized = this.normalize(description);

    if (normalized.includes('مصاريف') || normalized.includes('صرفيات') || normalized.includes('صرفت')) {
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

    if (normalized.includes('صلا') || normalized.includes('مواقيت')) {
      return { intent: 'prayer', config: { type: 'get_prayer_times' }, needsParams: false };
    }

    if (normalized.includes('تمرين') || normalized.includes('جيم')) {
      return { intent: 'gym', config: { type: 'get_gym_stats' }, needsParams: false };
    }

    if (normalized.includes('مكمل')) {
      return { intent: 'supplements', config: { type: 'get_supplements_status' }, needsParams: false };
    }

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
    
    if (!sub) return `${this.random(DIALECT.notFound)} - مش لاقية "${place}"`;

    const exp = this.cachedData.transactions.filter(t => 
      t.subcategory_id === sub.id && t.type === 'expense' && t.date >= start && t.date <= end
    );
    const total = exp.reduce((s, t) => s + Number(t.amount), 0);

    if (!exp.length) return `${this.random(DIALECT.notFound)} - ما صرفت على ${sub.name} ${periodName}`;

    const details = exp.slice(0, 5).map(t => `• ${t.date}: ${Number(t.amount).toLocaleString()} ₪`).join('\n');
    return `📍 **صرفياتك على ${sub.name} ${periodName}:**\n\n${details}${exp.length > 5 ? `\n... و ${exp.length - 5} كمان` : ''}\n\n**المجموع: ${total.toLocaleString()} ₪** ${this.random(DIALECT.success)}`;
  }

  // Command matching
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
      case 'get_trainer_sessions': return this.getTrainerSessionsResponse();
      default: return `${this.random(DIALECT.error)} - مش فاهمة`;
    }
  }

  // Response generators
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
    return `🌹 **أنا روز! شو بقدر أعمللك:**\n\n📿 مواقيت الصلاة\n💰 المصاريف والميزانية\n📅 جدولك اليومي\n💪 الجيم والتمارين\n🌟 أحلامك وأهدافك\n💊 المكملات\n🍽️ خطط الأكل\n\n📚 **علميني:**\nقولي: "تعلم: لما أقول [كلمة] اعمل [شو تبدي]"\n\n❤️ **احكيلي عن حالك:**\n"احفظي إني بحب..."`;
  }

  private getSavedCommandsResponse(): string {
    const learned = this.commands.filter(c => c.category === 'learned');
    const patterns = this.learnedPatterns;
    const knowledge = this.cachedData.rozKnowledge;
    if (!learned.length && !patterns.length && !knowledge.length) return `📚 ما حفظت إشي بعد`;
    let result = '📚 **اللي بتذكره:**\n\n';
    if (learned.length) result += '**أوامر بسيطة:**\n' + learned.map(c => `• "${c.trigger_patterns[0]}"`).join('\n') + '\n\n';
    if (patterns.length) result += '**أوامر ذكية:**\n' + patterns.map(p => `• "${p.trigger_phrases[0]}"`).join('\n') + '\n\n';
    if (knowledge.length) result += '**تعلمته من AI:**\n' + knowledge.slice(0, 5).map(k => `• ${k.query_pattern}`).join('\n');
    return result;
  }

  private getTrainerSessionsResponse(): string {
    const startOfMonth = this.getStartOfMonth();
    const trainerSessions = this.cachedData.workoutSessions.filter(s => s.with_trainer && s.completed_at && s.scheduled_date >= startOfMonth);
    const count = trainerSessions.length;
    const remaining = 8 - count; // Assuming 8 sessions per payment
    return `🏋️ **جلسات المدرب:**\n\nخلصت **${count}** جلسات هالشهر\nباقي **${Math.max(0, remaining)}** جلسات للدفعة الجاية`;
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

  // Utilities
  private getTodayDate = () => new Date().toISOString().split('T')[0];
  private getYesterdayDate = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; };
  private getStartOfWeek = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0]; };
  private getStartOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
  private formatTime = (t: string) => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'م' : 'ص'}`; };

  async reloadCommands(): Promise<void> { this.initialized = false; this.initPromise = null; await this.initialize(); }
  async forceRefreshCache(): Promise<void> { this.cachedData.lastFetch = 0; await this.initialize(); }
  getCachedAccounts() { return this.cachedData.accounts; }
  getPersonality() { return this.personality; }
}

export const assistantProcessor = new AssistantCommandProcessor();
