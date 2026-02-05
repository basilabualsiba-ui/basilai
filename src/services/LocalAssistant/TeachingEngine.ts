 // Teaching Engine - AI-assisted command creation and learning
 
 import { supabase } from '@/integrations/supabase/client';
 import type { QueryConfig, SavedQuery } from '@/types/assistant';
 
 export interface TeachingResult {
   success: boolean;
   message: string;
   query?: SavedQuery;
   needsConfirmation?: boolean;
   confirmationType?: 'add_place' | 'add_exercise' | 'create_query';
   confirmationData?: any;
 }
 
 export interface ParsedAction {
   type: 'expense' | 'income' | 'query' | 'gym_session' | 'weight' | 'supplement' | 'unknown';
   data: Record<string, any>;
   confidence: number;
 }
 
 export class TeachingEngine {
   // Analyze user input and detect action type
   public analyzeInput(input: string): ParsedAction {
     const normalized = this.normalize(input);
     
     // Check for expense patterns
     const expensePatterns = [
       /صرفت?\s+(?:ب|في|على)?\s*(.+?)\s+(\d+(?:\.\d+)?)\s*(?:شيكل|شاقل)?/i,
       /صرفت?\s+(\d+(?:\.\d+)?)\s*(?:شيكل|شاقل)?\s+(?:ب|في|على)?\s*(.+)/i,
       /دفعت?\s+(?:ب|في|على)?\s*(.+?)\s+(\d+(?:\.\d+)?)/i,
       /حطيت?\s+(\d+(?:\.\d+)?)\s+(?:ب|في|على)?\s*(.+)/i,
     ];
     
     for (const pattern of expensePatterns) {
       const match = normalized.match(pattern);
       if (match) {
         // Determine which group is place and which is amount
         const amount = parseFloat(match[1]) || parseFloat(match[2]);
         const place = isNaN(parseFloat(match[1])) ? match[1] : match[2];
         
         // Extract time if present
         const timeMatch = normalized.match(/الساعه?\s+(\d+(?::\d+)?)\s*(الصبح|الظهر|العصر|المسا|بالليل)?/);
         const dateMatch = normalized.match(/(اليوم|مبارح|امس|البارحه)/);
         
         return {
           type: 'expense',
           data: {
             amount,
             place: place?.trim(),
             time: timeMatch ? timeMatch[1] : null,
             timePeriod: timeMatch ? timeMatch[2] : null,
             date: dateMatch ? dateMatch[1] : 'اليوم',
           },
           confidence: 0.9,
         };
       }
     }
     
     // Check for income patterns
     const incomePatterns = [
       /(?:اخذت|استلمت|جاني|وصلني)\s+(?:معاش|راتب|فلوس)?\s*(\d+(?:\.\d+)?)\s*(?:شيكل|شاقل)?/i,
       /(?:معاش|راتب)\s+(\d+(?:\.\d+)?)/i,
       /(?:دخل|ايراد)\s+(\d+(?:\.\d+)?)\s*(?:من)?\s*(.+)?/i,
     ];
     
     for (const pattern of incomePatterns) {
       const match = normalized.match(pattern);
       if (match) {
         return {
           type: 'income',
           data: {
             amount: parseFloat(match[1]),
             source: match[2]?.trim() || 'معاش',
             date: 'اليوم',
           },
           confidence: 0.85,
         };
       }
     }
     
     // Check for gym patterns
     const gymPatterns = [
       /(?:عملت|خلصت|انهيت)\s+(?:تمرين|جيم)\s*(.+)?/i,
       /(?:رحت|روحت)\s+(?:الجيم|النادي|للجيم)/i,
       /(?:تمرين)\s+(.+)/i,
     ];
     
     for (const pattern of gymPatterns) {
       const match = normalized.match(pattern);
       if (match) {
         return {
           type: 'gym_session',
           data: {
             muscleGroups: match[1]?.split(/\s*و\s*/) || [],
             date: 'اليوم',
           },
           confidence: 0.8,
         };
       }
     }
     
     // Check for weight patterns
     const weightPatterns = [
       /وزني\s+(?:اليوم|هلا)?\s*(\d+(?:\.\d+)?)\s*(?:كيلو|كغ)?/i,
       /سجل\s+وزني?\s+(\d+(?:\.\d+)?)/i,
     ];
     
     for (const pattern of weightPatterns) {
       const match = normalized.match(pattern);
       if (match) {
         return {
           type: 'weight',
           data: {
             weight: parseFloat(match[1]),
           },
           confidence: 0.9,
         };
       }
     }
     
     return {
       type: 'unknown',
       data: {},
       confidence: 0,
     };
   }
 
   // Check if a place/subcategory exists
   public async checkPlaceExists(placeName: string): Promise<{ exists: boolean; id?: string; categoryId?: string }> {
     const normalized = this.normalize(placeName);
     
    // Try exact match first
     const { data } = await supabase
       .from('subcategories')
       .select('id, name, category_id')
       .ilike('name', `%${normalized}%`);
     
     if (data && data.length > 0) {
       return { exists: true, id: data[0].id, categoryId: data[0].category_id };
     }
     
    // Try with original name
    const { data: data2 } = await supabase
      .from('subcategories')
      .select('id, name, category_id')
      .ilike('name', `%${placeName}%`);
    
    if (data2 && data2.length > 0) {
      return { exists: true, id: data2[0].id, categoryId: data2[0].category_id };
    }
    
    // Try fuzzy match - remove common prefixes
    const cleanedName = placeName.replace(/^(ال|ب|في|على)/, '').trim();
    const { data: data3 } = await supabase
      .from('subcategories')
      .select('id, name, category_id')
      .ilike('name', `%${cleanedName}%`);
    
    if (data3 && data3.length > 0) {
      return { exists: true, id: data3[0].id, categoryId: data3[0].category_id };
    }
    
     return { exists: false };
   }
 
   // Check if an exercise exists
   public async checkExerciseExists(exerciseName: string): Promise<{ exists: boolean; id?: string }> {
     const normalized = this.normalize(exerciseName);
     
     const { data } = await supabase
       .from('exercises')
       .select('id, name')
       .ilike('name', `%${normalized}%`);
     
     if (data && data.length > 0) {
       return { exists: true, id: data[0].id };
     }
     
     return { exists: false };
   }
 
   // Create a new subcategory (place)
   public async createPlace(name: string, categoryId?: string): Promise<{ success: boolean; id?: string }> {
     // Find default expense category if not provided
     let catId = categoryId;
     
     if (!catId) {
       const { data: categories } = await supabase
         .from('categories')
         .select('id')
         .eq('type', 'expense')
         .limit(1);
       
       catId = categories?.[0]?.id;
     }
     
     if (!catId) {
       return { success: false };
     }
     
     const { data, error } = await supabase
       .from('subcategories')
       .insert({ name, category_id: catId })
       .select('id')
       .single();
     
     if (error) {
       console.error('Error creating place:', error);
       return { success: false };
     }
     
     return { success: true, id: data.id };
   }
 
   // Record an expense transaction
   public async recordExpense(
     amount: number,
     subcategoryId: string,
     date: string,
     time?: string,
     description?: string
   ): Promise<{ success: boolean; id?: string }> {
     // Get default account
     const { data: accounts } = await supabase
       .from('accounts')
      .select('id, amount')
       .limit(1);
     
     if (!accounts || accounts.length === 0) {
      console.error('No accounts found');
       return { success: false };
     }
     
     // Get the category from subcategory
     const { data: subcategory } = await supabase
       .from('subcategories')
       .select('category_id')
       .eq('id', subcategoryId)
       .single();
     
     const { data, error } = await supabase
       .from('transactions')
       .insert({
         amount,
         type: 'expense',
         account_id: accounts[0].id,
         category_id: subcategory?.category_id,
         subcategory_id: subcategoryId,
         date,
         time: time || null,
         description,
       })
       .select('id')
       .single();
     
     if (error) {
       console.error('Error recording expense:', error);
       return { success: false };
     }
     
     // Update account balance
     try {
       const { data: acc } = await supabase
         .from('accounts')
         .select('amount')
         .eq('id', accounts[0].id)
         .single();
       
       if (acc) {
         await supabase
           .from('accounts')
           .update({ amount: acc.amount - amount })
           .eq('id', accounts[0].id);
       }
     } catch (e) {
       console.error('Error updating account balance:', e);
     }
     
     return { success: true, id: data.id };
   }
 
   // Record income transaction
   public async recordIncome(
     amount: number,
     description: string,
     date: string
   ): Promise<{ success: boolean; id?: string }> {
     // Get default account
     const { data: accounts } = await supabase
       .from('accounts')
       .select('id')
       .limit(1);
     
     if (!accounts || accounts.length === 0) {
       return { success: false };
     }
     
     // Get income category
     const { data: categories } = await supabase
       .from('categories')
       .select('id')
       .eq('type', 'income')
       .limit(1);
     
     const { data, error } = await supabase
       .from('transactions')
       .insert({
         amount,
         type: 'income',
         account_id: accounts[0].id,
         category_id: categories?.[0]?.id,
         date,
         description,
       })
       .select('id')
       .single();
     
     if (error) {
       console.error('Error recording income:', error);
       return { success: false };
     }
     
     // Update account balance
     await supabase
       .from('accounts')
       .select('amount')
       .eq('id', accounts[0].id)
       .single()
       .then(({ data: acc }) => {
         if (acc) {
           supabase
             .from('accounts')
             .update({ amount: acc.amount + amount })
             .eq('id', accounts[0].id);
         }
       });
     
     return { success: true, id: data.id };
   }
 
   // Record weight
   public async recordWeight(weight: number): Promise<{ success: boolean }> {
     const { error } = await supabase
       .from('user_body_stats')
       .insert({
         weight,
         recorded_at: new Date().toISOString(),
       });
     
     return { success: !error };
   }
 
   // Get database schema summary for AI
   public async getDatabaseSummary(): Promise<string> {
     const tables = [
       { name: 'transactions', purpose: 'مصاريف ودخل', columns: 'amount, type, date, category_id, subcategory_id' },
       { name: 'accounts', purpose: 'حسابات مالية', columns: 'name, amount, currency' },
       { name: 'categories', purpose: 'تصنيفات', columns: 'name, type (income/expense)' },
       { name: 'subcategories', purpose: 'أماكن/تجار', columns: 'name, category_id' },
       { name: 'workout_sessions', purpose: 'جلسات تمرين', columns: 'scheduled_date, completed_at, muscle_groups' },
       { name: 'exercises', purpose: 'تمارين', columns: 'name, muscle_group' },
       { name: 'exercise_sets', purpose: 'مجموعات التمرين', columns: 'exercise_id, weight, reps' },
       { name: 'user_body_stats', purpose: 'قياسات الجسم', columns: 'weight, height, recorded_at' },
       { name: 'supplements', purpose: 'مكملات', columns: 'name, remaining_doses' },
       { name: 'prayer_times', purpose: 'مواقيت الصلاة', columns: 'date, fajr, dhuhr, asr, maghrib, isha' },
       { name: 'dreams', purpose: 'أهداف', columns: 'title, progress_percentage, status' },
     ];
     
     return tables.map(t => `• ${t.name}: ${t.purpose} (${t.columns})`).join('\n');
   }
 
   // Suggest query based on user intent
   public suggestQueryConfig(intent: string, parsedAction: ParsedAction): QueryConfig | null {
     switch (parsedAction.type) {
       case 'expense':
         return {
           table: 'transactions',
           select: ['amount', 'date', 'subcategories.name'],
           joins: [{ table: 'subcategories', on: 'subcategory_id' }],
           filters: [
             { column: 'type', operator: 'eq', value: 'expense' },
             { column: 'date', operator: 'eq', value: '{today}' },
           ],
           aggregation: { type: 'sum', column: 'amount' },
         };
       
       case 'income':
         return {
           table: 'transactions',
           select: ['amount', 'date', 'description'],
           filters: [
             { column: 'type', operator: 'eq', value: 'income' },
             { column: 'date', operator: 'gte', value: '{month_start}' },
           ],
           aggregation: { type: 'sum', column: 'amount' },
         };
       
       default:
         return null;
     }
   }
 
   // Normalize Arabic text
   private normalize(text: string): string {
     return text
       .trim()
       .toLowerCase()
       .replace(/[أإآا]/g, 'ا')
       .replace(/[ىي]/g, 'ي')
       .replace(/ة/g, 'ه')
       .replace(/ؤ/g, 'و')
       .replace(/ئ/g, 'ي');
   }
 
   // Parse date from Arabic text
   public parseDate(dateText: string): string {
     const today = new Date();
     const normalized = this.normalize(dateText);
     
     if (normalized.includes('مبارح') || normalized.includes('امس') || normalized.includes('البارحه')) {
       const yesterday = new Date(today);
       yesterday.setDate(yesterday.getDate() - 1);
       return yesterday.toISOString().split('T')[0];
     }
     
     return today.toISOString().split('T')[0];
   }
 
   // Parse time from Arabic text
   public parseTime(timeText: string, period?: string): string {
     let hour = parseInt(timeText);
     
     if (period) {
       const normalizedPeriod = this.normalize(period);
       if ((normalizedPeriod.includes('الظهر') || normalizedPeriod.includes('العصر') || 
            normalizedPeriod.includes('المسا') || normalizedPeriod.includes('بالليل')) && hour < 12) {
         hour += 12;
       }
     }
     
     return `${hour.toString().padStart(2, '0')}:00`;
   }
 }
 
 export const teachingEngine = new TeachingEngine();