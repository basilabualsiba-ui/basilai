// Query Executor - Executes queries against Supabase with code support

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
  | 'food_items' | 'meals' | 'meal_plans' | 'meal_consumptions'
  | 'currency_ratios' | 'workout_exercises' | 'workouts' | 'plan_workouts';

export class QueryExecutor {
  public async execute(
    query: SavedQuery,
    extractedVariables: Record<string, string>
  ): Promise<QueryResult> {
    try {
      const variables = await variableResolver.resolveAllVariables(extractedVariables);
      const config = query.query_config;
      let result = await this.buildAndExecute(config, variables);
      
      // Apply custom filter code
      if (query.filter_code && result.data.length > 0) {
        try {
          const fn = new Function('data', 'variables', query.filter_code);
          result.data = fn(result.data, variables) || result.data;
        } catch (e) {
          console.error('Filter code error:', e);
        }
      }

      // Apply custom result code
      if (query.result_code && result.data.length > 0) {
        try {
          const fn = new Function('data', 'variables', query.result_code);
          const codeResult = fn(result.data, variables);
          if (typeof codeResult === 'string') {
            result = { ...result, _formattedResult: codeResult } as any;
          }
        } catch (e) {
          console.error('Result code error:', e);
        }
      }

      this.updateUsageCount(query.id);
      return result;
    } catch (error) {
      console.error('Query execution error:', error);
      return { data: [], error: error instanceof Error ? error.message : 'خطأ في تنفيذ الاستعلام' };
    }
  }

  private async buildAndExecute(config: QueryConfig, variables: Record<string, any>): Promise<QueryResult> {
    const table = config.table as SupabaseTable;
    
    let selectString = '*';
    if (config.select && config.select.length > 0) {
      const selectParts: string[] = [];
      const joinedTables = new Set<string>();
      
      for (const field of config.select) {
        if (field.includes('.')) {
          const [joinTable, joinField] = field.split('.');
          joinedTables.add(joinTable);
          selectParts.push(`${joinTable}(${joinField})`);
        } else if (field.startsWith('sum:') || field.startsWith('count:') || field.startsWith('max:')) {
          continue;
        } else {
          selectParts.push(field);
        }
      }
      
      if (config.joins) {
        for (const join of config.joins) {
          if (!joinedTables.has(join.table)) {
            selectParts.push(`${join.table}(*)`);
          }
        }
      }
      
      selectString = selectParts.join(', ') || '*';
    }
    
    let query: any = supabase.from(table).select(selectString);
    
    if (config.filters) {
      for (const filter of config.filters) {
        const value = this.resolveValue(filter.value, variables);
        switch (filter.operator) {
          case 'eq': query = query.eq(filter.column, value); break;
          case 'neq': query = query.neq(filter.column, value); break;
          case 'gt': query = query.gt(filter.column, value); break;
          case 'gte': query = query.gte(filter.column, value); break;
          case 'lt': query = query.lt(filter.column, value); break;
          case 'lte':
            if (filter.column_ref) {
              query = query.filter(filter.column, 'lte', filter.column_ref);
            } else {
              query = query.lte(filter.column, value);
            }
            break;
          case 'like': query = query.like(filter.column, value as string); break;
          case 'ilike': query = query.ilike(filter.column, value as string); break;
          case 'not_null': query = query.not(filter.column, 'is', null); break;
          case 'is_null': query = query.is(filter.column, null); break;
        }
      }
    }
    
    if (config.order_by) {
      query = query.order(config.order_by.column, { ascending: config.order_by.ascending });
    }
    if (config.limit) {
      query = query.limit(config.limit);
    }
    
    const { data, error } = await query;
    if (error) return { data: [], error: error.message };
    
    const aggregations: Record<string, number> = {};
    if (config.aggregation && data) {
      const column = config.aggregation.column;
      const values = data.map((row: any) => parseFloat(row[column]) || 0);
      switch (config.aggregation.type) {
        case 'sum': aggregations.total = values.reduce((a: number, b: number) => a + b, 0); break;
        case 'count': aggregations.count = data.length; break;
        case 'avg': aggregations.average = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0; break;
        case 'max': aggregations.max = Math.max(...values); break;
        case 'min': aggregations.min = Math.min(...values); break;
      }
    }
    
    if (config.group_by && data) {
      const grouped = this.groupData(data, config.group_by, config.aggregation);
      return { data: grouped, aggregations };
    }
    
    return { data: data || [], aggregations, total: aggregations.total || aggregations.count };
  }

  private resolveValue(value: string | number | boolean | undefined, variables: Record<string, any>): string | number | boolean | undefined {
    if (typeof value !== 'string') return value;
    const match = value.match(/^\{(\w+)\}$/);
    if (match) return variables[match[1]] ?? value;
    return value.replace(/\{(\w+)\}/g, (_, varName) => variables[varName] ?? '');
  }

  private groupData(data: any[], groupBy: string[], aggregation?: { type: string; column: string }): any[] {
    const groups = new Map<string, any[]>();
    for (const row of data) {
      const key = groupBy.map(col => row[col] || 'null').join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    return Array.from(groups.entries()).map(([key, rows]) => {
      const result: any = {};
      groupBy.forEach((col, i) => { result[col] = key.split('|')[i]; });
      if (aggregation) {
        const values = rows.map(r => parseFloat(r[aggregation.column]) || 0);
        switch (aggregation.type) {
          case 'sum': result.total = values.reduce((a, b) => a + b, 0); break;
          case 'count': result.count = rows.length; break;
          case 'avg': result.average = values.reduce((a, b) => a + b, 0) / values.length; break;
        }
      }
      result._rows = rows;
      return result;
    });
  }

  private async updateUsageCount(queryId: string): Promise<void> {
    try {
      await supabase.from('assistant_queries').update({ usage_count: supabase.rpc ? 1 : 1 }).eq('id', queryId);
    } catch {}
  }

  public async executeComputed(computed: string, data: any[], variables: Record<string, any>): Promise<any> {
    switch (computed) {
      case 'next_prayer_from_current_time': return this.computeNextPrayer(data, variables.current_time);
      case 'percentage_of_35': return data.length > 0 ? Math.round((data.length / 35) * 100) : 0;
      case 'not_logged_today': return this.filterNotLoggedToday(data, variables.today);
      default: return null;
    }
  }

  private computeNextPrayer(prayerData: any[], currentTime: string): any {
    if (!prayerData.length) return null;
    const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const prayerNames = ['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء'];
    const row = prayerData[0];
    for (let i = 0; i < prayers.length; i++) {
      if (row[prayers[i]] > currentTime) return { name: prayerNames[i], time: row[prayers[i]] };
    }
    return { name: 'الفجر (غداً)', time: row.fajr };
  }

  private async filterNotLoggedToday(supplements: any[], today: string): Promise<any[]> {
    const { data: logs } = await supabase.from('supplement_logs').select('supplement_id').eq('logged_date', today);
    const loggedIds = new Set(logs?.map(l => l.supplement_id) || []);
    return supplements.filter(s => !loggedIds.has(s.id));
  }
}

export const queryExecutor = new QueryExecutor();
