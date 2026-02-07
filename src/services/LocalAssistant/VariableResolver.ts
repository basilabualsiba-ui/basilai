// Variable Resolver - Resolves dynamic variables like {today}, {place_id}, etc.

import { supabase } from '@/integrations/supabase/client';

export class VariableResolver {
  // Get system variables (dates, times, etc.)
  public getSystemVariables(): Record<string, any> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Calculate week start (Sunday)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    
    // Calculate month start
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Calculate last month start
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Calculate yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    
    return {
      today,
      yesterday: yesterday.toISOString().split('T')[0],
      week_start: weekStart.toISOString().split('T')[0],
      month_start: monthStart.toISOString().split('T')[0],
      first_of_month: monthStart.toISOString().split('T')[0],
      first_of_last_month: lastMonthStart.toISOString().split('T')[0],
      current_month: now.getMonth() + 1,
      current_year: now.getFullYear(),
      today_dow: now.getDay() || 7,
      current_time: now.toTimeString().split(' ')[0].substring(0, 5),
    };
  }

  // Resolve entity variables (e.g., place name to ID)
  public async resolveEntityVariables(
    variables: Record<string, string>
  ): Promise<Record<string, any>> {
    const resolved: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(variables)) {
      if (key === 'place' || key === 'place_id') {
        // Look up subcategory by name
        const placeId = await this.resolvePlace(value);
        resolved.place_id = placeId;
        resolved.place = value;
      } else if (key === 'exercise') {
        // Look up exercise by name
        const exerciseId = await this.resolveExercise(value);
        resolved.exercise_id = exerciseId;
        resolved.exercise = value;
      } else if (key === 'category') {
        // Look up category by name
        const categoryId = await this.resolveCategory(value);
        resolved.category_id = categoryId;
        resolved.category = value;
      } else if (key === 'dream') {
        // Look up dream by name
        const dreamId = await this.resolveDream(value);
        resolved.dream_id = dreamId;
        resolved.dream = value;
      } else if (key === 'period') {
        // Resolve period to start_date
        resolved.start_date = this.resolvePeriod(value);
        resolved.period = this.formatPeriod(value);
      } else {
        resolved[key] = value;
      }
    }
    
    return resolved;
  }

  // Resolve place name to subcategory ID
  private async resolvePlace(placeName: string): Promise<string | null> {
    const normalized = this.normalize(placeName);
    
    const { data } = await supabase
      .from('subcategories')
      .select('id, name')
      .ilike('name', `%${normalized}%`)
      .limit(1);
    
    return data?.[0]?.id || null;
  }

  // Resolve exercise name to ID
  private async resolveExercise(exerciseName: string): Promise<string | null> {
    const normalized = this.normalize(exerciseName);
    
    const { data } = await supabase
      .from('exercises')
      .select('id, name')
      .ilike('name', `%${normalized}%`)
      .limit(1);
    
    return data?.[0]?.id || null;
  }

  // Resolve category name to ID
  private async resolveCategory(categoryName: string): Promise<string | null> {
    const normalized = this.normalize(categoryName);
    
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .ilike('name', `%${normalized}%`)
      .limit(1);
    
    return data?.[0]?.id || null;
  }

  // Resolve dream title to ID
  private async resolveDream(dreamTitle: string): Promise<string | null> {
    const normalized = this.normalize(dreamTitle);
    
    const { data } = await supabase
      .from('dreams')
      .select('id, title')
      .ilike('title', `%${normalized}%`)
      .limit(1);
    
    return data?.[0]?.id || null;
  }

  // Resolve period text to start date
  private resolvePeriod(period: string): string {
    const now = new Date();
    const normalized = this.normalize(period);
    
    if (normalized.includes('اليوم') || normalized.includes('today')) {
      return now.toISOString().split('T')[0];
    }
    
    if (normalized.includes('اسبوع') || normalized.includes('week')) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      return weekStart.toISOString().split('T')[0];
    }
    
    if (normalized.includes('شهر') || normalized.includes('month')) {
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }
    
    if (normalized.includes('سنة') || normalized.includes('year')) {
      return new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    }
    
    // Default to this month
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }

  // Format period for display
  private formatPeriod(period: string): string {
    const normalized = this.normalize(period);
    
    if (normalized.includes('اليوم') || normalized.includes('today')) {
      return 'اليوم';
    }
    if (normalized.includes('اسبوع') || normalized.includes('week')) {
      return 'هالأسبوع';
    }
    if (normalized.includes('شهر') || normalized.includes('month')) {
      return 'هالشهر';
    }
    if (normalized.includes('سنة') || normalized.includes('year')) {
      return 'هالسنة';
    }
    
    return '';
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
      .replace(/ئ/g, 'ي')
      .replace(/[^\w\s\u0600-\u06FF]/g, '');
  }

  // Merge all variables
  public async resolveAllVariables(
    extractedVariables: Record<string, string>
  ): Promise<Record<string, any>> {
    const systemVars = this.getSystemVariables();
    const entityVars = await this.resolveEntityVariables(extractedVariables);
    
    return { ...systemVars, ...entityVars };
  }
}

export const variableResolver = new VariableResolver();
