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
    prayer?: string;
    account?: string;
  };
  category?: string;
  priority: number;
  is_active: boolean;
}

interface CachedData {
  accounts: any[];
  transactions: any[];
  categories: any[];
  subcategories: any[];
  budgets: any[];
  workoutSessions: any[];
  workoutPlans: any[];
  workoutPlanDays: any[];
  prayerTimes: any | null;
  prayerCompletions: any[];
  dailyActivities: any[];
  activityCompletions: any[];
  dreams: any[];
  dreamSteps: any[];
  supplements: any[];
  supplementLogs: any[];
  bodyStats: any[];
  meals: any[];
  mealPlans: any[];
  mealPlanMeals: any[];
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
  private cachedData: CachedData = {
    accounts: [], transactions: [], categories: [], subcategories: [], budgets: [],
    workoutSessions: [], workoutPlans: [], workoutPlanDays: [],
    prayerTimes: null, prayerCompletions: [], dailyActivities: [], activityCompletions: [],
    dreams: [], dreamSteps: [], supplements: [], supplementLogs: [], bodyStats: [],
    meals: [], mealPlans: [], mealPlanMeals: [], lastFetch: 0
  };
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

      const [commandsResult, accountsResult, transactionsResult, categoriesResult, subcategoriesResult,
        budgetsResult, workoutSessionsResult, workoutPlansResult, workoutPlanDaysResult,
        prayerTimesResult, prayerCompletionsResult, dailyActivitiesResult, activityCompletionsResult,
        dreamsResult, dreamStepsResult, supplementsResult, supplementLogsResult,
        bodyStatsResult, mealsResult, mealPlansResult, mealPlanMealsResult
      ] = await Promise.all([
        supabase.from('assistant_commands').select('*').eq('is_active', true).order('priority', { ascending: false }),
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
        supabase.from('activity_completions').select('*').gte('completion_date', startOfWeek),
        supabase.from('dreams').select('*').order('created_at', { ascending: false }),
        supabase.from('dream_steps').select('*'),
        supabase.from('supplements').select('*'),
        supabase.from('supplement_logs').select('*').gte('logged_date', startOfMonth),
        supabase.from('user_body_stats').select('*').order('recorded_at', { ascending: false }).limit(30),
        supabase.from('meals').select('*'),
        supabase.from('meal_plans').select('*'),
        supabase.from('meal_plan_meals').select('*')
      ]);

      this.commands = (commandsResult.data || []).map(cmd => ({
        id: cmd.id, trigger_patterns: cmd.trigger_patterns, response_template: cmd.response_template,
        action_type: cmd.action_type as ActionType, action_config: cmd.action_config as Command['action_config'],
        category: cmd.category ?? undefined, priority: cmd.priority, is_active: cmd.is_active
      }));

      this.cachedData = {
        accounts: accountsResult.data || [], transactions: transactionsResult.data || [],
        categories: categoriesResult.data || [], subcategories: subcategoriesResult.data || [],
        budgets: budgetsResult.data || [], workoutSessions: workoutSessionsResult.data || [],
        workoutPlans: workoutPlansResult.data || [], workoutPlanDays: workoutPlanDaysResult.data || [],
        prayerTimes: prayerTimesResult.data?.[0] || null, prayerCompletions: prayerCompletionsResult.data || [],
        dailyActivities: dailyActivitiesResult.data || [], activityCompletions: activityCompletionsResult.data || [],
        dreams: dreamsResult.data || [], dreamSteps: dreamStepsResult.data || [],
        supplements: supplementsResult.data || [], supplementLogs: supplementLogsResult.data || [],
        bodyStats: bodyStatsResult.data || [], meals: mealsResult.data || [],
        mealPlans: mealPlansResult.data || [], mealPlanMeals: mealPlanMealsResult.data || [],
        lastFetch: Date.now()
      };
      
      this.initialized = true;
      console.log(`AssistantCommandProcessor initialized with ${this.commands.length} commands and full data cache`);
    } catch (error) {
      console.error('Failed to initialize AssistantCommandProcessor:', error);
    }
  }

  private normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/[؟?!.,،:;]/g, '').replace(/\s+/g, ' ')
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  }

  private matchCommand(message: string): Command | null {
    const normalized = this.normalizeText(message);
    for (const command of this.commands) {
      for (const pattern of command.trigger_patterns) {
        const normalizedPattern = this.normalizeText(pattern);
        if (normalized.includes(normalizedPattern) || normalizedPattern.includes(normalized)) {
          return command;
        }
      }
    }
    return null;
  }

  private matchDynamicCommand(msg: string): { config: any; params: Record<string, string> } | null {
    // Spending by place pattern
    const placeMatch = msg.match(/كم صرفت (?:على|في|ب)\s+(.+?)(?:\s+هذا الشهر|\s+هالشهر)?$/);
    if (placeMatch) return { config: { type: 'get_spending_by_place' }, params: { place: placeMatch[1] } };
    
    // Prayer time pattern
    const prayerMatch = msg.match(/متى\s+(?:صلاه\s+)?(الفجر|الظهر|العصر|المغرب|العشاء|فجر|ظهر|عصر|مغرب|عشاء)/);
    if (prayerMatch) {
      const map: Record<string, string> = { 'الفجر': 'fajr', 'فجر': 'fajr', 'الظهر': 'dhuhr', 'ظهر': 'dhuhr', 'العصر': 'asr', 'عصر': 'asr', 'المغرب': 'maghrib', 'مغرب': 'maghrib', 'العشاء': 'isha', 'عشاء': 'isha' };
      return { config: { type: 'get_specific_prayer' }, params: { prayer: map[prayerMatch[1]] || 'fajr' } };
    }
    
    // Account balance pattern
    const accountMatch = msg.match(/(?:كم (?:في|ب)|رصيد)\s*(?:حساب\s+)?(.+)/);
    if (accountMatch) return { config: { type: 'get_account_balance' }, params: { account: accountMatch[1] } };
    
    return null;
  }

  private async handleLearningCommand(message: string): Promise<ProcessResult | null> {
    const patterns = [
      /(?:تعلم|احفظ)[:؛\s]+(?:لما|عندما)\s+(?:اقول|قلت)\s+["']?(.+?)["']?\s+(?:قول|رد)\s+["']?(.+?)["']?$/i,
      /(?:تعلم|احفظ)[:؛\s]+["']?(.+?)["']?\s*[=→]\s*["']?(.+?)["']?$/i
    ];
    for (const p of patterns) {
      const m = message.match(p);
      if (m?.[1] && m?.[2]) {
        const trigger = m[1].trim(), response = m[2].trim();
        const { error } = await supabase.from('assistant_commands').insert({
          trigger_patterns: [trigger], response_template: response, action_type: 'response', category: 'learned', priority: 10
        });
        if (error) return { handled: true, response: '❌ لم أتمكن من حفظ الأمر.', source: 'local' };
        await this.reloadCommands();
        return { handled: true, response: `✅ تم حفظ الأمر!\n\n**المشغّل:** "${trigger}"\n**الرد:** "${response}"\n\nجرب قول "${trigger}" الآن!`, source: 'local' };
      }
    }
    return null;
  }

  private getIsraelTime(): { time: string; date: string; dayName: string } {
    const now = new Date();
    return {
      time: new Intl.DateTimeFormat('ar-EG', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: true }).format(now),
      date: new Intl.DateTimeFormat('ar-EG', { timeZone: 'Asia/Jerusalem', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(now),
      dayName: new Intl.DateTimeFormat('ar-EG', { timeZone: 'Asia/Jerusalem', weekday: 'long' }).format(now)
    };
  }

  private async executeAction(command: Command, params?: Record<string, string>): Promise<string> {
    const config = command.action_config;
    if (!config?.type) return command.response_template;

    return this.runAction(config, params);
  }

  private async runAction(config: any, params?: Record<string, string>): Promise<string> {
    const type = config?.type;

    switch (type) {
      case 'get_time': return `🕐 الساعة الآن **${this.getIsraelTime().time}** بتوقيت فلسطين`;
      case 'get_date': return `📅 اليوم **${this.getIsraelTime().date}**`;
      
      // === PRAYER ===
      case 'get_prayer_times': return this.getPrayerTimesResponse();
      case 'get_next_prayer': return this.getNextPrayerResponse();
      case 'get_specific_prayer': return this.getSpecificPrayerResponse(config.prayer || params?.prayer || 'fajr');
      
      // === SCHEDULE ===
      case 'get_today_schedule': return this.getTodayScheduleResponse();
      case 'get_week_schedule': return this.getWeekScheduleResponse();
      
      // === SPENDING ===
      case 'get_spending_today': return this.getSpendingResponse('today');
      case 'get_spending_yesterday': return this.getSpendingResponse('yesterday');
      case 'get_spending_this_week': return this.getSpendingResponse('week');
      case 'get_spending_this_month': return this.getSpendingResponse('month');
      case 'get_spending_by_place': return this.getSpendingByPlaceResponse(params?.place || '');
      
      // === BUDGET & ACCOUNTS ===
      case 'get_budget_status': return this.getBudgetStatusResponse();
      case 'get_income_this_month': return this.getIncomeResponse();
      case 'get_accounts_summary': return this.getAccountsSummaryResponse();
      case 'get_account_balance': return this.getAccountBalanceResponse(config.account || params?.account || '');
      case 'get_recent_transactions': return this.getRecentTransactionsResponse();
      
      // === DREAMS ===
      case 'get_dreams_status': return this.getDreamsStatusResponse();
      case 'get_dreams_progress': return this.getDreamsProgressResponse();
      
      // === GYM ===
      case 'get_gym_stats': return this.getGymStatsResponse();
      case 'get_last_workout': return this.getLastWorkoutResponse();
      case 'get_today_workout': return this.getTodayWorkoutResponse();
      case 'check_today_workout': return this.checkTodayWorkoutResponse();
      case 'get_weight_progress': return this.getWeightProgressResponse();
      
      // === SUPPLEMENTS ===
      case 'get_supplements_status': return this.getSupplementsStatusResponse();
      case 'get_supplements_due': return this.getSupplementsDueResponse();
      
      // === FOOD ===
      case 'get_food_today': return this.getFoodTodayResponse();
      case 'get_calories_today': return this.getCaloriesTodayResponse();
      
      // === BODY STATS ===
      case 'get_body_stats': return this.getBodyStatsResponse();
      
      // === HELP ===
      case 'get_capabilities': return this.getCapabilitiesResponse();
      case 'get_saved_commands': return this.getSavedCommandsResponse();

      default: return '❌ لم أفهم هذا الأمر';
    }
  }

  // === PRAYER RESPONSES ===
  private getPrayerTimesResponse(): string {
    const p = this.cachedData.prayerTimes;
    if (!p) return '❌ لا توجد مواقيت صلاة محفوظة لليوم';
    return `🕌 **مواقيت الصلاة:**\n\n🌅 الفجر: **${this.formatTime(p.fajr)}**\n☀️ الظهر: **${this.formatTime(p.dhuhr)}**\n🌇 العصر: **${this.formatTime(p.asr)}**\n🌆 المغرب: **${this.formatTime(p.maghrib)}**\n🌙 العشاء: **${this.formatTime(p.isha)}**`;
  }

  private getNextPrayerResponse(): string {
    const p = this.cachedData.prayerTimes;
    if (!p) return '❌ لا توجد مواقيت صلاة';
    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' });
    const order = [{ k: 'fajr', n: 'الفجر', e: '🌅' }, { k: 'dhuhr', n: 'الظهر', e: '☀️' }, { k: 'asr', n: 'العصر', e: '🌇' }, { k: 'maghrib', n: 'المغرب', e: '🌆' }, { k: 'isha', n: 'العشاء', e: '🌙' }];
    for (const pr of order) { if (p[pr.k] > now) return `${pr.e} الصلاة القادمة **${pr.n}** في **${this.formatTime(p[pr.k])}**`; }
    return `🌅 الصلاة القادمة **الفجر** غداً في **${this.formatTime(p.fajr)}**`;
  }

  private getSpecificPrayerResponse(prayer: string): string {
    const p = this.cachedData.prayerTimes;
    if (!p) return '❌ لا توجد مواقيت صلاة';
    const names: Record<string, { n: string; e: string }> = { fajr: { n: 'الفجر', e: '🌅' }, dhuhr: { n: 'الظهر', e: '☀️' }, asr: { n: 'العصر', e: '🌇' }, maghrib: { n: 'المغرب', e: '🌆' }, isha: { n: 'العشاء', e: '🌙' } };
    const info = names[prayer]; if (!info || !p[prayer]) return '❌ لم أجد هذه الصلاة';
    return `${info.e} صلاة **${info.n}** في **${this.formatTime(p[prayer])}**`;
  }

  // === SCHEDULE RESPONSES ===
  private getTodayScheduleResponse(): string {
    const today = this.getTodayDate(), dow = new Date().getDay() || 7;
    const acts = this.cachedData.dailyActivities.filter(a => a.date === today || (a.is_recurring && a.days_of_week?.includes(dow)));
    if (!acts.length) return '📅 لا يوجد نشاطات مجدولة لليوم';
    const sorted = acts.sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99'));
    return `📅 **جدول اليوم:**\n\n${sorted.map(a => `${a.is_completed ? '✅' : '⬜'} **${a.start_time ? this.formatTime(a.start_time) : '⏰'}** ${a.title}`).join('\n')}`;
  }

  private getWeekScheduleResponse(): string {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const today = new Date().getDay();
    let result = '📅 **جدول الأسبوع:**\n\n';
    for (let i = 0; i < 7; i++) {
      const dayIndex = (today + i) % 7 || 7;
      const activities = this.cachedData.dailyActivities.filter(a => a.is_recurring && a.days_of_week?.includes(dayIndex));
      if (activities.length > 0) {
        result += `**${days[dayIndex === 7 ? 0 : dayIndex]}:**\n${activities.map(a => `  • ${a.start_time ? this.formatTime(a.start_time) : ''} ${a.title}`).join('\n')}\n\n`;
      }
    }
    return result || '📅 لا يوجد نشاطات متكررة';
  }

  // === SPENDING RESPONSES ===
  private getSpendingResponse(period: 'today' | 'yesterday' | 'week' | 'month'): string {
    let start: string, end = this.getTodayDate(), name: string;
    switch (period) {
      case 'today': start = this.getTodayDate(); name = 'اليوم'; break;
      case 'yesterday': start = end = this.getYesterdayDate(); name = 'أمس'; break;
      case 'week': start = this.getStartOfWeek(); name = 'هذا الأسبوع'; break;
      default: start = this.getStartOfMonth(); name = 'هذا الشهر';
    }
    const exp = this.cachedData.transactions.filter(t => t.type === 'expense' && t.date >= start && t.date <= end);
    const total = exp.reduce((s, t) => s + Number(t.amount), 0);
    if (!exp.length) return `💸 لا يوجد مصاريف ${name}`;
    const byCat: Record<string, number> = {}; exp.forEach(t => { const c = t.categories?.name || 'أخرى'; byCat[c] = (byCat[c] || 0) + Number(t.amount); });
    return `💸 **مصاريف ${name}:**\n\n${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([n, a]) => `• ${n}: ${a.toLocaleString()} ₪`).join('\n')}\n\n**المجموع: ${total.toLocaleString()} ₪**`;
  }

  private getSpendingByPlaceResponse(place: string): string {
    const norm = this.normalizeText(place);
    const sub = this.cachedData.subcategories.find(s => this.normalizeText(s.name).includes(norm) || norm.includes(this.normalizeText(s.name)));
    if (!sub) {
      const available = this.cachedData.subcategories.slice(0, 10).map(s => s.name).join(', ');
      return `❌ لم أجد مكان "${place}"\n\nالأماكن المتوفرة: ${available}`;
    }
    const start = this.getStartOfMonth();
    const exp = this.cachedData.transactions.filter(t => t.subcategory_id === sub.id && t.type === 'expense' && t.date >= start);
    const total = exp.reduce((s, t) => s + Number(t.amount), 0);
    if (!exp.length) return `📍 لم تصرف شيء على **${sub.name}** هذا الشهر`;
    const details = exp.slice(0, 5).map(t => `• ${t.date}: ${Number(t.amount).toLocaleString()} ₪`).join('\n');
    return `📍 **صرفياتك على ${sub.name} هذا الشهر:**\n\n${details}${exp.length > 5 ? `\n... و ${exp.length - 5} معاملات أخرى` : ''}\n\n**المجموع: ${total.toLocaleString()} ₪**`;
  }

  // === BUDGET & ACCOUNTS RESPONSES ===
  private getBudgetStatusResponse(): string {
    const m = new Date().getMonth() + 1, y = new Date().getFullYear();
    const budgets = this.cachedData.budgets.filter(b => b.month === m && b.year === y);
    if (!budgets.length) return '📊 لا يوجد ميزانية محددة لهذا الشهر';
    const start = this.getStartOfMonth();
    return `📊 **حالة الميزانية:**\n\n${budgets.map(b => {
      const cat = this.cachedData.categories.find(c => c.id === b.category_id);
      const spent = this.cachedData.transactions.filter(t => t.category_id === b.category_id && t.type === 'expense' && t.date >= start).reduce((s, t) => s + Number(t.amount), 0);
      const pct = Math.round((spent / Number(b.amount)) * 100);
      const remaining = Number(b.amount) - spent;
      return `${pct > 90 ? '🔴' : pct > 70 ? '🟡' : '🟢'} **${cat?.name || '?'}**: ${spent.toLocaleString()}/${Number(b.amount).toLocaleString()} (${pct}%)\n   باقي: ${remaining.toLocaleString()} ₪`;
    }).join('\n\n')}`;
  }

  private getIncomeResponse(): string {
    const start = this.getStartOfMonth();
    const inc = this.cachedData.transactions.filter(t => t.type === 'income' && t.date >= start);
    const total = inc.reduce((s, t) => s + Number(t.amount), 0);
    if (!inc.length) return '💰 لا يوجد دخل مسجل هذا الشهر';
    return `💰 **دخلك هذا الشهر:**\n\n${inc.map(t => `• ${t.date}: ${Number(t.amount).toLocaleString()} ₪ ${t.description ? `(${t.description})` : ''}`).join('\n')}\n\n**المجموع: ${total.toLocaleString()} ₪**`;
  }

  private getAccountsSummaryResponse(): string {
    if (!this.cachedData.accounts.length) return '💳 لا يوجد حسابات مسجلة';
    const total = this.cachedData.accounts.reduce((s, a) => s + Number(a.amount), 0);
    return `💳 **حساباتك:**\n\n${this.cachedData.accounts.map(a => `• **${a.name}**: ${Number(a.amount).toLocaleString()} ${a.currency}`).join('\n')}\n\n**المجموع: ${total.toLocaleString()} ₪**`;
  }

  private getAccountBalanceResponse(accountName: string): string {
    const norm = this.normalizeText(accountName);
    const acc = this.cachedData.accounts.find(a => this.normalizeText(a.name).includes(norm) || norm.includes(this.normalizeText(a.name)));
    if (!acc) return `❌ لم أجد حساب "${accountName}"\n\nالحسابات المتوفرة: ${this.cachedData.accounts.map(a => a.name).join(', ')}`;
    return `💳 رصيد **${acc.name}**: **${Number(acc.amount).toLocaleString()} ${acc.currency}**`;
  }

  private getRecentTransactionsResponse(): string {
    const recent = this.cachedData.transactions.slice(0, 10);
    if (!recent.length) return '📝 لا يوجد معاملات حديثة';
    return `📝 **آخر المعاملات:**\n\n${recent.map(t => `${t.type === 'expense' ? '🔴' : t.type === 'income' ? '🟢' : '🔄'} ${t.date} - ${Number(t.amount).toLocaleString()} ₪ ${t.categories?.name || ''}`).join('\n')}`;
  }

  // === DREAMS RESPONSES ===
  private getDreamsStatusResponse(): string {
    const active = this.cachedData.dreams.filter(d => d.status === 'in_progress');
    const completed = this.cachedData.dreams.filter(d => d.status === 'completed');
    if (!this.cachedData.dreams.length) return '🌟 لا يوجد أحلام مسجلة. أضف حلماً جديداً!';
    let result = '🌟 **أحلامك:**\n\n';
    if (active.length) { result += '**نشطة:**\n' + active.map(d => `🎯 ${d.title} - ${d.progress_percentage || 0}%`).join('\n') + '\n\n'; }
    if (completed.length) { result += `✅ **مكتملة:** ${completed.length} أحلام`; }
    return result;
  }

  private getDreamsProgressResponse(): string {
    const active = this.cachedData.dreams.filter(d => d.status === 'in_progress');
    if (!active.length) return '🌟 لا يوجد أحلام نشطة';
    return `📈 **تقدم الأحلام:**\n\n${active.map(d => {
      const steps = this.cachedData.dreamSteps.filter(s => s.dream_id === d.id);
      const done = steps.filter(s => s.is_completed).length;
      return `🎯 **${d.title}**\nالتقدم: ${d.progress_percentage || 0}% | الخطوات: ${done}/${steps.length}`;
    }).join('\n\n')}`;
  }

  // === GYM RESPONSES ===
  private getGymStatsResponse(): string {
    const month = this.cachedData.workoutSessions.filter(s => s.scheduled_date >= this.getStartOfMonth() && s.completed_at).length;
    const week = this.cachedData.workoutSessions.filter(s => s.scheduled_date >= this.getStartOfWeek() && s.completed_at).length;
    const total = this.cachedData.workoutSessions.filter(s => s.completed_at).length;
    const totalDuration = this.cachedData.workoutSessions.filter(s => s.completed_at).reduce((s, w) => s + (w.total_duration_minutes || 0), 0);
    return `💪 **إحصائيات الجيم:**\n\n📅 هذا الأسبوع: **${week}** تمارين\n📆 هذا الشهر: **${month}** تمارين\n🏆 المجموع الكلي: **${total}** تمارين\n⏱️ إجمالي الوقت: **${Math.round(totalDuration / 60)}** ساعات`;
  }

  private getLastWorkoutResponse(): string {
    const last = this.cachedData.workoutSessions.find(s => s.completed_at);
    if (!last) return '💪 لم تكمل أي تمرين بعد';
    const date = new Date(last.scheduled_date);
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    return `💪 **آخر تمرين:**\n\n📅 ${last.scheduled_date} (قبل ${days} أيام)\n🎯 العضلات: ${last.muscle_groups?.join(', ') || 'غير محدد'}\n⏱️ المدة: ${last.total_duration_minutes || 0} دقيقة`;
  }

  private getTodayWorkoutResponse(): string {
    const today = this.getTodayDate(), dow = new Date().getDay() || 7;
    const session = this.cachedData.workoutSessions.find(s => s.scheduled_date === today);
    if (session) {
      const status = session.completed_at ? '✅ مكتمل' : session.started_at ? '🔄 جاري' : '⏳ لم يبدأ';
      return `💪 **تمرين اليوم:**\n\n🎯 العضلات: ${session.muscle_groups?.join(', ') || 'غير محدد'}\n📊 الحالة: ${status}`;
    }
    const plan = this.cachedData.workoutPlans.find(p => p.is_active);
    if (plan) {
      const day = this.cachedData.workoutPlanDays.find(d => d.plan_id === plan.id && d.day_of_week === dow);
      if (day) return `💪 **تمرين مخطط لليوم:**\n\n🎯 العضلات: ${day.muscle_groups?.join(', ') || ''}\n📝 ${day.name || day.description || ''}`;
    }
    return '💪 لا يوجد تمرين مجدول لليوم - يوم راحة! 😌';
  }

  private checkTodayWorkoutResponse(): string {
    const today = this.getTodayDate();
    const todaySession = this.cachedData.workoutSessions.find(s => s.scheduled_date === today && s.completed_at);
    if (todaySession) return '✅ نعم! لقد تمرنت اليوم. أحسنت! 🎉';
    return '❌ لم تتمرن اليوم بعد. هيا انطلق! 💪';
  }

  private getWeightProgressResponse(): string {
    if (!this.cachedData.bodyStats.length) return '⚖️ لا يوجد قياسات وزن مسجلة';
    const latest = this.cachedData.bodyStats[0];
    const oldest = this.cachedData.bodyStats[this.cachedData.bodyStats.length - 1];
    const change = Number(latest.weight) - Number(oldest.weight);
    const icon = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
    return `⚖️ **تقدم الوزن:**\n\n📊 الوزن الحالي: **${Number(latest.weight).toFixed(1)} كغ**\n${icon} التغيير: **${change > 0 ? '+' : ''}${change.toFixed(1)} كغ**\n📅 آخر قياس: ${new Date(latest.recorded_at).toLocaleDateString('ar-EG')}`;
  }

  // === SUPPLEMENTS RESPONSES ===
  private getSupplementsStatusResponse(): string {
    if (!this.cachedData.supplements.length) return '💊 لا يوجد مكملات مسجلة';
    return `💊 **المكملات:**\n\n${this.cachedData.supplements.map(s => {
      const remaining = Number(s.remaining_doses);
      const icon = remaining <= s.warning_threshold ? '⚠️' : '✅';
      return `${icon} **${s.name}**: ${remaining}/${s.total_doses} ${s.dose_unit}`;
    }).join('\n')}`;
  }

  private getSupplementsDueResponse(): string {
    const today = this.getTodayDate();
    const taken = this.cachedData.supplementLogs.filter(l => l.logged_date === today).map(l => l.supplement_id);
    const notTaken = this.cachedData.supplements.filter(s => !taken.includes(s.id));
    if (!notTaken.length) return '✅ أخذت جميع المكملات لليوم!';
    return `💊 **مكملات اليوم:**\n\n${notTaken.map(s => `• ${s.name}`).join('\n')}`;
  }

  // === FOOD RESPONSES ===
  private getFoodTodayResponse(): string {
    const dow = new Date().getDay() || 7, today = this.getTodayDate();
    const plan = this.cachedData.mealPlans.find(p => p.is_active && (!p.end_date || p.end_date >= today) && p.start_date <= today);
    if (!plan) return '🍽️ لا يوجد خطة طعام نشطة لليوم';
    const meals = this.cachedData.mealPlanMeals.filter(pm => pm.meal_plan_id === plan.id && (pm.day_of_week === dow || pm.day_of_week === null));
    if (!meals.length) return '🍽️ لا يوجد وجبات مجدولة لليوم';
    return `🍽️ **وجبات اليوم:**\n\n${meals.sort((a, b) => (a.meal_order || 0) - (b.meal_order || 0)).map(pm => {
      const meal = this.cachedData.meals.find(m => m.id === pm.meal_id);
      return `• ${pm.meal_time ? this.formatTime(pm.meal_time) : ''} **${meal?.name || 'وجبة'}** ${meal?.total_calories ? `(${meal.total_calories} سعرة)` : ''}`;
    }).join('\n')}`;
  }

  private getCaloriesTodayResponse(): string {
    const dow = new Date().getDay() || 7, today = this.getTodayDate();
    const plan = this.cachedData.mealPlans.find(p => p.is_active && (!p.end_date || p.end_date >= today) && p.start_date <= today);
    if (!plan) return '🔥 لا يوجد خطة طعام نشطة';
    const meals = this.cachedData.mealPlanMeals.filter(pm => pm.meal_plan_id === plan.id && (pm.day_of_week === dow || pm.day_of_week === null));
    let total = 0;
    meals.forEach(pm => { const m = this.cachedData.meals.find(x => x.id === pm.meal_id); total += Number(m?.total_calories) || 0; });
    return `🔥 **السعرات المخططة لليوم:** ${total.toLocaleString()} سعرة`;
  }

  // === BODY STATS ===
  private getBodyStatsResponse(): string {
    if (!this.cachedData.bodyStats.length) return '📊 لا يوجد إحصائيات جسم مسجلة';
    const latest = this.cachedData.bodyStats[0];
    let result = `📊 **إحصائيات جسمك:**\n\n⚖️ الوزن: **${Number(latest.weight).toFixed(1)} كغ**`;
    if (latest.height) {
      result += `\n📏 الطول: **${Number(latest.height).toFixed(0)} سم**`;
      const bmi = Number(latest.weight) / Math.pow(Number(latest.height) / 100, 2);
      result += `\n📈 BMI: **${bmi.toFixed(1)}**`;
    }
    return result;
  }

  // === HELP ===
  private getCapabilitiesResponse(): string {
    return `🤖 **شو أقدر أسويلك:**\n
📿 **الصلاة:** مواقيت الصلاة، الصلاة القادمة، متى الفجر/الظهر/العصر/المغرب/العشاء

💰 **المالية:** 
• كم صرفت اليوم/امبارح/هالشهر
• كم صرفت على [مكان]
• الميزانية، دخلي، كم بالبنك

📅 **الجدول:** جدول اليوم، نشاطات اليوم

💪 **الجيم:** احصائيات الجيم، وزني، آخر تمرين، تمرين اليوم

🌟 **الأحلام:** أحلامي، تقدم الأحلام

💊 **المكملات:** مكملاتي، شو أخذ اليوم

🍽️ **الطعام:** وجبات اليوم، السعرات

📚 **تعليم أوامر جديدة:**
قل: "تعلم: لما أقول [كلمة] قول [الرد]"`;
  }

  private getSavedCommandsResponse(): string {
    const learned = this.commands.filter(c => c.category === 'learned');
    if (!learned.length) return '📚 لم تحفظ أي أوامر بعد.\n\nلحفظ أمر جديد قل:\n"تعلم: لما أقول [كلمة] قول [الرد]"';
    return `📚 **الأوامر المحفوظة:**\n\n${learned.map(c => `• "${c.trigger_patterns[0]}" → "${c.response_template}"`).join('\n')}`;
  }

  // === SIMPLE QUERIES ===
  private handleMath(message: string): string | null {
    const mathPattern = /(\d+(?:\.\d+)?)\s*([+\-*/×÷])\s*(\d+(?:\.\d+)?)/;
    const match = message.match(mathPattern);
    if (match) {
      const num1 = parseFloat(match[1]), operator = match[2], num2 = parseFloat(match[3]);
      let result: number;
      switch (operator) {
        case '+': result = num1 + num2; break;
        case '-': result = num1 - num2; break;
        case '*': case '×': result = num1 * num2; break;
        case '/': case '÷': result = num2 !== 0 ? num1 / num2 : NaN; break;
        default: return null;
      }
      if (isNaN(result)) return 'لا يمكن القسمة على صفر! 🙈';
      return `🔢 **النتيجة:** ${num1} ${operator} ${num2} = ${result}`;
    }
    return null;
  }

  async process(message: string): Promise<ProcessResult> {
    await this.initialize();
    const normalized = this.normalizeText(message);

    // Check for learning command
    const learningResult = await this.handleLearningCommand(message);
    if (learningResult) return learningResult;

    // Try to match a predefined command
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

    // Try dynamic pattern matching
    const dynamic = this.matchDynamicCommand(normalized);
    if (dynamic) {
      const response = await this.runAction(dynamic.config, dynamic.params);
      return { handled: true, response, source: 'cached' };
    }

    // Handle simple math
    const mathResult = this.handleMath(message);
    if (mathResult) return { handled: true, response: mathResult, source: 'local' };

    // No local match - needs AI
    return { handled: false, source: 'ai' };
  }

  // === UTILITY FUNCTIONS ===
  private getTodayDate = () => new Date().toISOString().split('T')[0];
  private getYesterdayDate = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; };
  private getStartOfWeek = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0]; };
  private getStartOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
  private formatTime = (t: string) => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'م' : 'ص'}`; };

  // Reload commands
  async reloadCommands(): Promise<void> { this.initialized = false; this.initPromise = null; await this.initialize(); }
  async forceRefreshCache(): Promise<void> { this.cachedData.lastFetch = 0; await this.initialize(); }
  getCachedAccounts() { return this.cachedData.accounts; }
}

export const assistantProcessor = new AssistantCommandProcessor();
