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
  column_ref?: string;
}

export interface SavedQuery {
  id: string;
  query_name: string;
  category: string;
  purpose: string;
  trigger_patterns: string[];
  query_config: QueryConfig;
  output_template: string | null;
  output_mode: 'text' | 'table';
  action_type: 'query' | 'input';
  filter_code: string | null;
  result_code: string | null;
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
  suggested_query: any;
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
  tableData?: { headers: string[]; rows: any[][] };
}

export interface TeachingContext {
  mode: 'awaiting_question' | 'awaiting_action' | 'awaiting_synonym' | 'awaiting_confirmation' | 'awaiting_place_category' | 'awaiting_ai_approval';
  originalQuestion?: string;
  options?: string[];
  aiSuggestion?: any;
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

export type ActionButton = {
  id: string;
  label: string;
  action: string;
  data?: any;
};

// Database schema info for explorer
export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
  category: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  isNullable: boolean;
  defaultValue: string | null;
}

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

export type TeachingMode = 
  | 'awaiting_question'
  | 'awaiting_action' 
  | 'awaiting_synonym'
  | 'awaiting_confirmation'
  | 'awaiting_place_category'
  | 'awaiting_ai_approval';

// Table category mappings
export const TABLE_CATEGORIES: Record<string, string> = {
  transactions: 'financial',
  accounts: 'financial',
  categories: 'financial',
  subcategories: 'financial',
  budgets: 'financial',
  currency_ratios: 'financial',
  exercises: 'gym',
  exercise_sets: 'gym',
  exercise_alternatives: 'gym',
  workout_sessions: 'gym',
  workout_plans: 'gym',
  workout_plan_days: 'gym',
  workout_exercises: 'gym',
  workouts: 'gym',
  plan_workouts: 'gym',
  muscle_groups: 'gym',
  user_body_stats: 'gym',
  food_items: 'food',
  meals: 'food',
  meal_foods: 'food',
  meal_plans: 'food',
  meal_plan_meals: 'food',
  meal_consumptions: 'food',
  prayer_times: 'prayer',
  prayer_completions: 'prayer',
  supplements: 'supplements',
  supplement_logs: 'supplements',
  dreams: 'dreams',
  dream_steps: 'dreams',
  dream_photos: 'dreams',
  daily_activities: 'schedule',
  activity_completions: 'schedule',
  assistant_queries: 'assistant',
  assistant_synonyms: 'assistant',
  assistant_pending_queries: 'assistant',
  workout_playlists: 'media',
  youtube_tracks: 'media',
  icons: 'system',
  user_preferences: 'system',
};
