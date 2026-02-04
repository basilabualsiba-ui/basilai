// Types for Local Assistant System

export interface QueryConfig {
  table: string;
  select: string[];
  joins?: { table: string; on: string }[];
  filters?: QueryFilter[];
  aggregation?: { type: 'sum' | 'count' | 'avg' | 'max' | 'min'; column: string };
  group_by?: string[];
  order_by?: { column: string; ascending: boolean };
  limit?: number;
  computed?: string[];
}

export interface QueryFilter {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'not_null' | 'is_null';
  value?: string | number | boolean;
  column_ref?: string; // For comparing with another column
}

export interface SavedQuery {
  id: string;
  query_name: string;
  category: string;
  purpose: string;
  trigger_patterns: string[];
  query_config: QueryConfig;
  output_template: string | null;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface Synonym {
  id: string;
  word: string;
  synonyms: string[];
  category: string | null;
  created_at: string;
}

export interface PendingQuery {
  id: string;
  suggested_query: QueryConfig & { query_name: string; purpose: string; trigger_patterns: string[] };
  suggestion_reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface MatchResult {
  query: SavedQuery;
  confidence: number;
  extractedVariables: Record<string, string>;
}

export interface QueryResult {
  data: any[];
  aggregations?: Record<string, number>;
  total?: number;
  error?: string;
}

export interface AssistantMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  queryUsed?: string;
  data?: any;
}

export interface TeachingContext {
  mode: 'awaiting_question' | 'awaiting_action' | 'awaiting_synonym';
  originalQuestion?: string;
  options?: string[];
}

export interface AssistantState {
  messages: AssistantMessage[];
  isLoading: boolean;
  teachingContext: TeachingContext | null;
  queries: SavedQuery[];
  synonyms: Synonym[];
}

export type QuickAction = {
  id: string;
  label: string;
  icon: string;
  query: string;
  category: string;
};

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'spending', label: 'مصاريف', icon: '💰', query: 'كم صرفت اليوم', category: 'financial' },
  { id: 'balance', label: 'رصيد', icon: '💵', query: 'كم معي فلوس', category: 'financial' },
  { id: 'prayer', label: 'صلاة', icon: '🕌', query: 'مواقيت الصلاة', category: 'prayer' },
  { id: 'workout', label: 'تمرين', icon: '💪', query: 'شو تمريني اليوم', category: 'gym' },
  { id: 'weight', label: 'وزن', icon: '⚖️', query: 'وزني', category: 'gym' },
  { id: 'supplements', label: 'مكملات', icon: '💊', query: 'المكملات', category: 'supplements' },
  { id: 'dreams', label: 'أهداف', icon: '🌟', query: 'احلامي', category: 'dreams' },
  { id: 'schedule', label: 'جدول', icon: '📅', query: 'جدول اليوم', category: 'schedule' },
];
