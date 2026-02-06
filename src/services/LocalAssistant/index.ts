// Local Assistant - Main entry point

import { queryMatcher, QueryMatcher } from './QueryMatcher';
import { queryExecutor, QueryExecutor } from './QueryExecutor';
import { responseFormatter, ResponseFormatter } from './ResponseFormatter';
import { variableResolver, VariableResolver } from './VariableResolver';
import { synonymResolver, SynonymResolver } from './SynonymResolver';
import { queryLibrary, QueryLibrary } from './QueryLibrary';
import { teachingEngine, TeachingEngine } from './TeachingEngine';
import type { AssistantMessage, MatchResult, QueryResult, SavedQuery, TeachingContext } from '@/types/assistant';

export interface ProcessResult {
  message: string;
  data?: any;
  queryUsed?: string;
  needsTeaching?: boolean;
  teachingContext?: TeachingContext;
  suggestions?: string[];
  actionButtons?: ActionButton[];
  tableData?: { headers: string[]; rows: any[][] };
}

export interface ActionButton {
  id: string;
  label: string;
  action: string;
  data?: any;
}

export class LocalAssistant {
  private initialized = false;
  private teachingContext: TeachingContext | null = null;
  private pendingAction: { type: string; data: any } | null = null;

  // Initialize the assistant
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load queries and synonyms in parallel
    await Promise.all([
      queryLibrary.loadQueries(),
      synonymResolver.loadSynonyms(),
    ]);

    // Set queries for matcher
    queryMatcher.setQueries(queryLibrary.getQueries());
    this.initialized = true;
  }

  // Process a user message
  public async process(userInput: string): Promise<ProcessResult> {
    await this.initialize();

    const normalized = userInput.trim();

    // Check for special commands
    if (this.isTeachingCommand(normalized)) {
      return await this.handleTeachingCommand(normalized);
    }

    // Check for synonym teaching
    if (this.isSynonymCommand(normalized)) {
      return this.handleSynonymCommand(normalized);
    }

    // Check for confirmation responses
    if (this.pendingAction) {
      return await this.handlePendingAction(normalized);
    }

    // Check if we're in teaching mode
    if (this.teachingContext) {
      return await this.handleTeachingFollowUp(normalized);
    }

    // Try to detect action commands (expenses, income, etc.)
    const parsedAction = teachingEngine.analyzeInput(normalized);
    if (parsedAction.confidence >= 0.7) {
      return await this.handleActionCommand(parsedAction, normalized);
    }

    // Try to match a query
    const match = queryMatcher.match(normalized);

    if (match && match.confidence >= 0.5) {
      return await this.executeQuery(match);
    }

    // No match - try AI analysis then offer teaching
    return await this.offerSmartTeaching(normalized);
  }

  // Handle action commands (expenses, income, gym, etc.)
  private async handleActionCommand(action: ReturnType<typeof teachingEngine.analyzeInput>, originalInput: string): Promise<ProcessResult> {
    switch (action.type) {
      case 'expense':
        return await this.handleExpenseAction(action.data, originalInput);
      
      case 'income':
        return await this.handleIncomeAction(action.data, originalInput);
      
      case 'weight':
        return await this.handleWeightAction(action.data);
      
      case 'gym_session':
        return await this.handleGymAction(action.data);
      
      default:
        return this.offerTeaching(originalInput);
    }
  }

  // Handle expense action
  private async handleExpenseAction(data: any, originalInput: string): Promise<ProcessResult> {
    const { amount, place, time, timePeriod, date: dateText } = data;
    
    if (!amount || !place) {
      return {
        message: '🌹 ما فهمت المبلغ أو المكان. جرب قول:\n"صرفت 20 شيكل في الحشاش"',
      };
    }
    
    // Check if place exists
    const placeCheck = await teachingEngine.checkPlaceExists(place);
    const parsedDate = teachingEngine.parseDate(dateText || 'اليوم');
    const parsedTime = time ? teachingEngine.parseTime(time, timePeriod) : undefined;
    
    if (!placeCheck.exists) {
      // Ask to create the place
      this.pendingAction = {
        type: 'create_place_and_expense',
        data: { amount, place, date: parsedDate, time: parsedTime },
      };
      
      return {
        message: `🌹 المكان "${place}" مش موجود عندي.\n\nبدك أضيفه؟`,
        actionButtons: [
          { id: 'yes', label: '✅ نعم، أضيفه', action: 'confirm' },
          { id: 'no', label: '❌ لا، إلغاء', action: 'cancel' },
        ],
      };
    }
    
    // Record the expense
    const result = await teachingEngine.recordExpense(
      amount,
      placeCheck.id!,
      parsedDate,
      parsedTime,
      originalInput
    );
    
    if (result.success) {
      const timeStr = parsedTime ? ` الساعة ${parsedTime}` : '';
      const dateStr = dateText === 'مبارح' || dateText === 'امس' ? ' مبارح' : '';
      return {
        message: `✅ تم تسجيل: ${amount} شيكل في ${place}${dateStr}${timeStr}`,
        data: { transactionId: result.id },
      };
    }
    
    return {
      message: '❌ حصل خطأ في تسجيل المصروف. تأكد من وجود حساب مالي.',
    };
  }

  // Handle income action
  private async handleIncomeAction(data: any, originalInput: string): Promise<ProcessResult> {
    const { amount, source } = data;
    const parsedDate = teachingEngine.parseDate('اليوم');
    
    if (!amount) {
      return {
        message: '🌹 ما فهمت المبلغ. جرب قول:\n"اخدت معاش 5000 شيكل"',
      };
    }
    
    const result = await teachingEngine.recordIncome(
      amount,
      source || 'معاش',
      parsedDate
    );
    
    if (result.success) {
      return {
        message: `✅ تم تسجيل دخل: ${amount} شيكل (${source || 'معاش'})`,
        data: { transactionId: result.id },
      };
    }
    
    return {
      message: '❌ حصل خطأ في تسجيل الدخل. تأكد من وجود حساب مالي.',
    };
  }

  // Handle weight action
  private async handleWeightAction(data: any): Promise<ProcessResult> {
    const { weight } = data;
    
    if (!weight) {
      return {
        message: '🌹 ما فهمت الوزن. جرب قول:\n"وزني 75 كيلو"',
      };
    }
    
    const result = await teachingEngine.recordWeight(weight);
    
    if (result.success) {
      return {
        message: `✅ تم تسجيل الوزن: ${weight} كغ`,
      };
    }
    
    return {
      message: '❌ حصل خطأ في تسجيل الوزن.',
    };
  }

  // Handle gym action
  private async handleGymAction(data: any): Promise<ProcessResult> {
    // For now, just acknowledge - can be extended
    return {
      message: `💪 تمام! بدك أسجلك تمرين؟\n\nاختر العضلات:\n• صدر\n• ظهر\n• أكتاف\n• رجل\n• ذراع`,
      needsTeaching: true,
    };
  }

  // Handle pending action confirmation
  private async handlePendingAction(input: string): Promise<ProcessResult> {
    const normalized = input.trim().toLowerCase();
    const action = this.pendingAction;
    this.pendingAction = null;
    
    if (!action) {
      return this.offerTeaching(input);
    }
    
    // Check for confirmation
    const isConfirm = normalized.includes('نعم') || normalized.includes('اي') || 
                      normalized.includes('اه') || normalized.includes('تمام') ||
                      normalized === '1' || normalized === 'yes';
    
    const isCancel = normalized.includes('لا') || normalized.includes('الغ') ||
                     normalized === '2' || normalized === 'no';
    
    if (action.type === 'create_place_and_expense') {
      if (isConfirm) {
        const { amount, place, date, time } = action.data;
        
        // Create the place
        const placeResult = await teachingEngine.createPlace(place);
        
        if (!placeResult.success) {
          return {
            message: '❌ ما قدرت أضيف المكان. تأكد من وجود تصنيف مصاريف.',
          };
        }
        
        // Record the expense
        const expenseResult = await teachingEngine.recordExpense(
          amount,
          placeResult.id!,
          date,
          time
        );
        
        if (expenseResult.success) {
          return {
            message: `✅ تم إضافة "${place}" وتسجيل ${amount} شيكل`,
          };
        }
        
        return {
          message: `✅ تم إضافة "${place}" لكن حصل خطأ في تسجيل المصروف`,
        };
      }
      
      if (isCancel) {
        return {
          message: '👌 تمام، ما سجلت شي.',
        };
      }
    }
    
    return this.offerTeaching(input);
  }

  // Smart teaching with AI analysis
  private async offerSmartTeaching(input: string): Promise<ProcessResult> {
    const similar = queryMatcher.findSimilar(input);
    const parsedAction = teachingEngine.analyzeInput(input);
    
    let message = `🌹 ما فهمت "${input}"\n\n`;
    
    // Suggest based on detected intent
    if (parsedAction.type !== 'unknown' && parsedAction.confidence > 0.3) {
      message += '**يمكن قصدت:**\n';
      
      switch (parsedAction.type) {
        case 'expense':
          message += '• تسجيل مصروف - جرب: "صرفت 20 شيكل في [المكان]"\n';
          break;
        case 'income':
          message += '• تسجيل دخل - جرب: "اخدت معاش 5000 شيكل"\n';
          break;
        case 'gym_session':
          message += '• تسجيل تمرين - جرب: "عملت تمرين صدر"\n';
          break;
      }
      message += '\n';
    }
    
    if (similar.length > 0) {
      message += '**أو قصدك واحدة من هدول؟**\n';
      message += similar.slice(0, 3).map(q => `• ${q.trigger_patterns[0]}`).join('\n');
      message += '\n\n';
    }
    
    message += '**علمني:**\n';
    message += `• قول: "علمني: ${input}"\n`;
    message += `• أو: "تعلم: ${input} = [سؤال موجود]"`;
    
    return {
      message,
      needsTeaching: true,
      suggestions: similar.slice(0, 3).map(q => q.trigger_patterns[0]),
    };
  }

  // Execute a matched query
  private async executeQuery(match: MatchResult): Promise<ProcessResult> {
    const result = await queryExecutor.execute(match.query, match.extractedVariables);
    
    // Resolve all variables for formatting
    const variables = await variableResolver.resolveAllVariables(match.extractedVariables);
    
    const formatted = responseFormatter.format(match.query, result, variables);

    return {
      message: formatted.text,
      data: result.data,
      queryUsed: match.query.query_name,
      tableData: formatted.tableData,
    };
  }

  // Check if message is a teaching command
  private isTeachingCommand(input: string): boolean {
    const teachPatterns = ['علمني', 'علميني', 'عرفيني', 'تعلم:', 'تعلمي:'];
    return teachPatterns.some(p => input.includes(p));
  }

  // Handle teaching command
  private async handleTeachingCommand(input: string): Promise<ProcessResult> {
    // Extract the question to teach
    const match = input.match(/(?:علمني|علميني|عرفيني|تعلم:|تعلمي:)\s*[:؛]?\s*(.+)/);
    
    if (match) {
      const question = match[1].trim();
      
      // Check if it's a direct mapping (تعلم: X = Y)
      const directMatch = question.match(/(.+?)\s*[=＝]\s*(.+)/);
      if (directMatch) {
        return await this.handleDirectTeaching(directMatch[1].trim(), directMatch[2].trim());
      }

      // Start teaching mode
      this.teachingContext = {
        mode: 'awaiting_action',
        originalQuestion: question,
        options: this.getSuggestedActions(question),
      };

      const optionsList = this.teachingContext.options
        .map((opt, i) => `${i + 1}. ${opt}`)
        .join('\n');

      return {
        message: `🌹 تمام! خليني أفهم...\n\nشو لازم أعمل لما تسألني "${question}"?\n\n${optionsList}\n\nأو اكتبلي شو بدك!`,
        needsTeaching: true,
        teachingContext: this.teachingContext,
      };
    }

    // Start fresh teaching mode
    this.teachingContext = {
      mode: 'awaiting_question',
    };

    return {
      message: '🌹 تمام! شو السؤال اللي بدك إياني أفهمه؟',
      needsTeaching: true,
      teachingContext: this.teachingContext,
    };
  }

  // Handle direct teaching (X = Y)
  private async handleDirectTeaching(trigger: string, existingQuery: string): Promise<ProcessResult> {
    // Find the existing query
    const existingMatch = queryMatcher.match(existingQuery);
    
    if (existingMatch && existingMatch.confidence >= 0.5) {
      // Add trigger to existing query
      await queryLibrary.addTriggerPattern(existingMatch.query.id, trigger);
      queryMatcher.setQueries(queryLibrary.getQueries());

      return {
        message: `🌹 تعلمت! ✅\n\n"${trigger}" = "${existingQuery}"\n\nمن هلأ رح أفهمهم نفس الإشي!`,
        queryUsed: existingMatch.query.query_name,
      };
    }

    return {
      message: `🌹 ما لقيت "${existingQuery}" في الأسئلة المحفوظة.\n\nجرب تحكيلي اسم السؤال بطريقة تانية.`,
      needsTeaching: true,
    };
  }

  // Check if message is a synonym command
  private isSynonymCommand(input: string): boolean {
    return input.includes('هاي نفس') || input.includes('نفس:') || input.includes('يعني:');
  }

  // Handle synonym command
  private handleSynonymCommand(input: string): ProcessResult {
    const match = input.match(/(?:هاي نفس|نفس:|يعني:)\s*[:؛]?\s*(.+)/);
    
    if (!match) {
      return {
        message: '🌹 مش فاهمة. استخدم: "هاي نفس: [السؤال الموجود]"',
      };
    }

    const existingQuery = match[1].trim();
    const existingMatch = queryMatcher.match(existingQuery);

    if (existingMatch && existingMatch.confidence >= 0.5) {
      return {
        message: `🌹 لقيت "${existingQuery}"!\n\nاستخدم: "تعلم: [سؤالك الجديد] = ${existingQuery}"`,
        queryUsed: existingMatch.query.query_name,
      };
    }

    return {
      message: `🌹 ما لقيت "${existingQuery}" في الأسئلة المحفوظة.`,
    };
  }

  // Handle teaching follow-up
  private async handleTeachingFollowUp(input: string): Promise<ProcessResult> {
    if (!this.teachingContext) {
      return this.offerTeaching(input);
    }

    const context = this.teachingContext;

    if (context.mode === 'awaiting_question') {
      // User is providing the question
      this.teachingContext = {
        mode: 'awaiting_action',
        originalQuestion: input,
        options: this.getSuggestedActions(input),
      };

      const optionsList = this.teachingContext.options
        .map((opt, i) => `${i + 1}. ${opt}`)
        .join('\n');

      return {
        message: `🌹 شو لازم أعمل لما تسألني "${input}"?\n\n${optionsList}\n\nأو اكتبلي شو بدك!`,
        needsTeaching: true,
        teachingContext: this.teachingContext,
      };
    }

    if (context.mode === 'awaiting_action') {
      // User is providing the action
      const selectedAction = this.parseActionSelection(input, context.options || []);
      
      if (selectedAction) {
        // Try to find matching query
        const match = queryMatcher.match(selectedAction);
        
        if (match && match.confidence >= 0.5) {
          // Add as trigger to existing query
          await queryLibrary.addTriggerPattern(match.query.id, context.originalQuestion!);
          queryMatcher.setQueries(queryLibrary.getQueries());
          this.teachingContext = null;

          return {
            message: `🌹 تعلمت! ✅\n\n"${context.originalQuestion}" = "${selectedAction}"\n\nجربي هلأ!`,
            queryUsed: match.query.query_name,
          };
        }
      }

      this.teachingContext = null;
      return {
        message: `🌹 ما قدرت أفهم "${input}".\n\nحاول تختار من الخيارات أو اكتب اسم سؤال موجود.`,
      };
    }

    this.teachingContext = null;
    return this.offerTeaching(input);
  }

  // Get suggested actions based on question
  private getSuggestedActions(question: string): string[] {
    const similar = queryMatcher.findSimilar(question);
    
    if (similar.length > 0) {
      return similar.slice(0, 4).map(q => q.trigger_patterns[0]);
    }

    // Return default suggestions based on detected category
    const normalized = question.toLowerCase();
    
    if (normalized.includes('صرف') || normalized.includes('فلوس') || normalized.includes('مصاري')) {
      return ['كم صرفت اليوم', 'مصاريف الشهر', 'كم معي فلوس'];
    }
    if (normalized.includes('تمرين') || normalized.includes('جيم') || normalized.includes('وزن')) {
      return ['شو تمريني اليوم', 'كم تمرين عملت هالشهر', 'وزني'];
    }
    if (normalized.includes('صلا') || normalized.includes('صلوات')) {
      return ['مواقيت الصلاة', 'الصلاة الجاية'];
    }
    
    return ['كم صرفت اليوم', 'مواقيت الصلاة', 'شو تمريني اليوم', 'المكملات'];
  }

  // Parse action selection (number or text)
  private parseActionSelection(input: string, options: string[]): string | null {
    // Check if it's a number
    const num = parseInt(input);
    if (!isNaN(num) && num >= 1 && num <= options.length) {
      return options[num - 1];
    }

    // Check if it matches an option
    const normalized = input.trim().toLowerCase();
    for (const option of options) {
      if (option.toLowerCase().includes(normalized) || normalized.includes(option.toLowerCase())) {
        return option;
      }
    }

    // Return input as-is
    return input;
  }

  // Offer teaching when no match found
  private offerTeaching(input: string): ProcessResult {
    const similar = queryMatcher.findSimilar(input);
    
    let message = `🌹 ما فهمت "${input}"\n\n`;
    
    if (similar.length > 0) {
      message += '**قصدك واحدة من هدول؟**\n';
      message += similar.slice(0, 3).map(q => `• ${q.trigger_patterns[0]}`).join('\n');
      message += '\n\n';
    }

    message += '**أو علمني:**\n';
    message += `• قول: "علمني: ${input}"\n`;
    message += `• أو: "تعلم: ${input} = [سؤال موجود]"`;

    return {
      message,
      needsTeaching: true,
      suggestions: similar.slice(0, 3).map(q => q.trigger_patterns[0]),
    };
  }

  // Clear teaching context
  public clearTeachingContext(): void {
    this.teachingContext = null;
  }

  // Get current teaching context
  public getTeachingContext(): TeachingContext | null {
    return this.teachingContext;
  }

  // Reload all data
  public async reload(): Promise<void> {
    this.initialized = false;
    await this.initialize();
  }

  // Get all queries for management
  public getQueries(): SavedQuery[] {
    return queryLibrary.getQueries();
  }

  // Get query library for direct access
  public getQueryLibrary(): QueryLibrary {
    return queryLibrary;
  }

  // Get teaching engine for direct access
  public getTeachingEngine(): TeachingEngine {
    return teachingEngine;
  }
}

export const localAssistant = new LocalAssistant();

// Re-export individual services
export {
  queryMatcher,
  queryExecutor,
  responseFormatter,
  variableResolver,
  synonymResolver,
  queryLibrary,
  teachingEngine,
};
