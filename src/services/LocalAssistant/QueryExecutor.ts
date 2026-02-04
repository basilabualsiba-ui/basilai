// Query Executor - Executes queries against Supabase

import { supabase } from '@/integrations/supabase/client';
import type { QueryConfig, QueryResult, SavedQuery } from '@/types/assistant';
import { variableResolver } from './VariableResolver';

type SupabaseTable = 
  | 'transactions' | 'accounts' | 'categories' | 'subcategories' | 'budgets'
  | 'exercises' | 'exercise_sets' | 'workout_sessions' | 'workout_plans' | 'workout_plan_days'
  | 'user_body_stats' | 'muscle_groups'
  | 'prayer_times' | 'prayer_completions'
  | 'supplements' | 'supplement_logs'
  | 'dreams' | 'dream_steps'
  | 'daily_activities' | 'activity_completions'
  | 'food_items' | 'meals' | 'meal_plans' | 'meal_consumptions';

export class QueryExecutor {
  // Execute a query with resolved variables
  public async execute(
    query: SavedQuery,
    extractedVariables: Record<string, string>
  ): Promise<QueryResult> {
    try {
      // Resolve all variables
      const variables = await variableResolver.resolveAllVariables(extractedVariables);
      const config = query.query_config;
      
      // Build and execute query
      const result = await this.buildAndExecute(config, variables);
      
      // Update usage count
      this.updateUsageCount(query.id);
      
      return result;
    } catch (error) {
      console.error('Query execution error:', error);
      return {
        data: [],
        error: error instanceof Error ? error.message : 'خطأ في تنفيذ الاستعلام',
      };
    }
  }

  // Build and execute Supabase query
  private async buildAndExecute(
    config: QueryConfig,
    variables: Record<string, any>
  ): Promise<QueryResult> {
    const table = config.table as SupabaseTable;
    
    // Build select string with joins
    let selectString = '*';
    if (config.select && config.select.length > 0) {
      const selectParts: string[] = [];
      const joinedTables = new Set<string>();
      
      for (const field of config.select) {
        if (field.includes('.')) {
          // Joined table field
          const [joinTable, joinField] = field.split('.');
          joinedTables.add(joinTable);
          selectParts.push(`${joinTable}(${joinField})`);
        } else if (field.startsWith('sum:') || field.startsWith('count:') || field.startsWith('max:')) {
          // Will be handled by aggregation
          continue;
        } else {
          selectParts.push(field);
        }
      }
      
      // Add remaining fields from joins
      if (config.joins) {
        for (const join of config.joins) {
          if (!joinedTables.has(join.table)) {
            selectParts.push(`${join.table}(*)`);
          }
        }
      }
      
      selectString = selectParts.join(', ') || '*';
    }
    
    // Create base query - use any to avoid complex type inference
    let query: any = supabase.from(table).select(selectString);
    
    // Apply filters
    if (config.filters) {
      for (const filter of config.filters) {
        const value = this.resolveValue(filter.value, variables);
        
        switch (filter.operator) {
          case 'eq':
            query = query.eq(filter.column, value) as any;
            break;
          case 'neq':
            query = query.neq(filter.column, value) as any;
            break;
          case 'gt':
            query = query.gt(filter.column, value) as any;
            break;
          case 'gte':
            query = query.gte(filter.column, value) as any;
            break;
          case 'lt':
            query = query.lt(filter.column, value) as any;
            break;
          case 'lte':
            if (filter.column_ref) {
              query = query.filter(filter.column, 'lte', filter.column_ref) as any;
            } else {
              query = query.lte(filter.column, value) as any;
            }
            break;
          case 'like':
            query = query.like(filter.column, value as string) as any;
            break;
          case 'ilike':
            query = query.ilike(filter.column, this.resolveValue(filter.value, variables) as string) as any;
            break;
          case 'not_null':
            query = query.not(filter.column, 'is', null) as any;
            break;
          case 'is_null':
            query = query.is(filter.column, null) as any;
            break;
        }
      }
    }
    
    // Apply ordering
    if (config.order_by) {
      query = query.order(config.order_by.column, { ascending: config.order_by.ascending }) as any;
    }
    
    // Apply limit
    if (config.limit) {
      query = query.limit(config.limit) as any;
    }
    
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      return { data: [], error: error.message };
    }
    
    // Calculate aggregations
    const aggregations: Record<string, number> = {};
    
    if (config.aggregation && data) {
      const column = config.aggregation.column;
      const values = data.map(row => parseFloat(row[column]) || 0);
      
      switch (config.aggregation.type) {
        case 'sum':
          aggregations.total = values.reduce((a, b) => a + b, 0);
          break;
        case 'count':
          aggregations.count = data.length;
          break;
        case 'avg':
          aggregations.average = values.length > 0 
            ? values.reduce((a, b) => a + b, 0) / values.length 
            : 0;
          break;
        case 'max':
          aggregations.max = Math.max(...values);
          break;
        case 'min':
          aggregations.min = Math.min(...values);
          break;
      }
    }
    
    // Handle group by
    if (config.group_by && data) {
      const grouped = this.groupData(data, config.group_by, config.aggregation);
      return { data: grouped, aggregations };
    }
    
    return { 
      data: data || [], 
      aggregations,
      total: aggregations.total || aggregations.count,
    };
  }

  // Resolve variable placeholders in values
  private resolveValue(
    value: string | number | boolean | undefined,
    variables: Record<string, any>
  ): string | number | boolean | undefined {
    if (typeof value !== 'string') return value;
    
    // Check for variable placeholder
    const match = value.match(/^\{(\w+)\}$/);
    if (match) {
      const varName = match[1];
      return variables[varName] ?? value;
    }
    
    // Replace inline variables
    return value.replace(/\{(\w+)\}/g, (_, varName) => {
      return variables[varName] ?? '';
    });
  }

  // Group data by columns
  private groupData(
    data: any[],
    groupBy: string[],
    aggregation?: { type: string; column: string }
  ): any[] {
    const groups = new Map<string, any[]>();
    
    for (const row of data) {
      const key = groupBy.map(col => row[col] || 'null').join('|');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(row);
    }
    
    return Array.from(groups.entries()).map(([key, rows]) => {
      const result: any = {};
      
      // Add group by values
      groupBy.forEach((col, i) => {
        result[col] = key.split('|')[i];
      });
      
      // Add aggregation
      if (aggregation) {
        const values = rows.map(r => parseFloat(r[aggregation.column]) || 0);
        switch (aggregation.type) {
          case 'sum':
            result.total = values.reduce((a, b) => a + b, 0);
            break;
          case 'count':
            result.count = rows.length;
            break;
          case 'avg':
            result.average = values.reduce((a, b) => a + b, 0) / values.length;
            break;
        }
      }
      
      result._rows = rows;
      return result;
    });
  }

  // Update query usage count
  private async updateUsageCount(queryId: string): Promise<void> {
    try {
      await supabase
        .from('assistant_queries')
        .update({ usage_count: supabase.rpc ? 1 : 1 }) // Placeholder - we'll just increment manually
        .eq('id', queryId);
    } catch {
      // Silently fail - not critical
    }
  }

  // Execute a raw query for computed fields
  public async executeComputed(
    computed: string,
    data: any[],
    variables: Record<string, any>
  ): Promise<any> {
    switch (computed) {
      case 'next_prayer_from_current_time':
        return this.computeNextPrayer(data, variables.current_time);
      case 'percentage_of_35':
        return data.length > 0 ? Math.round((data.length / 35) * 100) : 0;
      case 'not_logged_today':
        return this.filterNotLoggedToday(data, variables.today);
      default:
        return null;
    }
  }

  // Compute next prayer based on current time
  private computeNextPrayer(prayerData: any[], currentTime: string): any {
    if (!prayerData.length) return null;
    
    const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const prayerNames = ['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء'];
    const row = prayerData[0];
    
    for (let i = 0; i < prayers.length; i++) {
      if (row[prayers[i]] > currentTime) {
        return {
          name: prayerNames[i],
          time: row[prayers[i]],
        };
      }
    }
    
    // All prayers passed, next is Fajr tomorrow
    return {
      name: 'الفجر (غداً)',
      time: row.fajr,
    };
  }

  // Filter supplements not logged today
  private async filterNotLoggedToday(supplements: any[], today: string): Promise<any[]> {
    const { data: logs } = await supabase
      .from('supplement_logs')
      .select('supplement_id')
      .eq('logged_date', today);
    
    const loggedIds = new Set(logs?.map(l => l.supplement_id) || []);
    return supplements.filter(s => !loggedIds.has(s.id));
  }
}

export const queryExecutor = new QueryExecutor();
