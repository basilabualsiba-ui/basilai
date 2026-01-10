import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// Helper function to get Israel date/time
const getIsraelDate = () => {
  const now = new Date();
  const israelTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
  return israelTime.toISOString().split('T')[0];
};

const getIsraelDateTime = () => {
  return new Date().toLocaleString('en-US', { 
    timeZone: 'Asia/Jerusalem',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getIsraelTime = () => {
  return new Date().toLocaleString('en-US', { 
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

const getSystemPrompt = () => `You are BASIL's AI - Basil's personal AI assistant. You have access to his ENTIRE personal database and can help manage his life.

CURRENT DATE & TIME (Israel): ${getIsraelDateTime()}
CURRENT DATE: ${getIsraelDate()}
CURRENT TIME: ${getIsraelTime()}
TIMEZONE: Asia/Jerusalem (Israel)

IMPORTANT RULES:
1. You ONLY know information from the database - never make up data
2. Be concise and helpful
3. When performing actions, ALWAYS confirm with the user before executing
4. Use the tools provided to query and modify data
5. For financial amounts, the currency is typically ILS (Israeli Shekel)
6. Be friendly and personal - you know Basil
7. ALWAYS use Israel timezone for all date/time operations
8. When user says "today" or "now", use the Israel date/time above

LEARNING & MEMORY (CRITICAL):
- You have access to a user_preferences table where you store learned behaviors
- ALWAYS call get_preferences at the START of each conversation to check for shortcuts and defaults
- When the user teaches you something new (like "coffee means 25 ILS expense"), IMMEDIATELY save it using save_preference
- When corrected, ALWAYS ask: "Should I remember this for next time?" and save if yes
- After ANY correction, save the new behavior as a preference
- Shortcuts are things like: "coffee" = add 25 expense, "حشاش" = add expense under طلعات > حشاش

SUBCATEGORIES (VERY IMPORTANT):
- Categories have subcategories which represent specific places/vendors/items
- Structure: Category (e.g., "طلعات") → Subcategory (e.g., "حشاش", "جزرة", "بستاشيو")
- ALWAYS use get_full_financial_data first to see the COMPLETE structure
- When user mentions a place like "حشاش", it's a SUBCATEGORY under "طلعات" category
- Use the subcategory_id AND category_id when adding transactions
- If user asks "how much on حشاش", search in subcategories, not categories!

INTERACTIVE OPTIONS:
When there are multiple choices to present (accounts, categories, subcategories), format your response with:
[OPTIONS]
option1_label|option1_description
option2_label|option2_description
[/OPTIONS]

The UI will render these as clickable bubbles for the user to select.

FINANCIAL QUERIES:
- "How much did I spend on [subcategory] this month?" → use get_transactions_by_subcategory
- "What's my total spending for [time period]?" → use get_spending_analysis
- "Show me my transactions from [date]" → use query_database
- When asked about specific places (حشاش, جزرة, etc.), search by SUBCATEGORY not category

GYM DATA ACCESS:
- Use get_gym_overview for workout stats, recent sessions, exercise history
- workout_sessions: completed workouts with duration, muscle groups
- exercises: all available exercises with muscle groups and equipment
- exercise_sets: detailed sets with weights and reps
- workout_plans: scheduled workout plans

DREAMS & GOALS:
- Use get_dreams_overview for all dreams/goals with progress
- dreams: goals with status, progress_percentage, target_date
- dream_steps: steps to achieve each dream

SUPPLEMENTS:
- Use get_supplements_overview for supplement inventory and logs
- supplements: inventory with remaining doses
- supplement_logs: daily intake tracking

PRAYERS:
- prayer_times: daily prayer times
- prayer_completions: tracked completed prayers

BODY STATS:
- user_body_stats: weight/height tracking over time

Available data in the database:
- accounts: Financial accounts (name, amount, currency, type)
- transactions: Income and expenses (amount, date, description, type, category_id, subcategory_id, account_id)
- categories: Transaction categories (name, type, icon)
- subcategories: Sub-categories linked to categories (name, category_id, location) - like حشاش, جزرة, etc.
- supplements, supplement_logs, workout_sessions, exercises, exercise_sets, dreams, dream_steps, prayer_times, prayer_completions, daily_activities, user_body_stats, user_preferences

When asked about data, use the specialized tools first (get_full_financial_data, get_gym_overview, etc.) for complete context.`;

const tools = [
  {
    type: "function",
    function: {
      name: "query_database",
      description: "Query the database to get information. Use SELECT statements only.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name to query" },
          select: { type: "string", description: "Columns to select (comma separated, or * for all)" },
          filters: { 
            type: "array", 
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike"] },
                value: { type: "string" }
              }
            },
            description: "Optional filters to apply" 
          },
          order: { type: "string", description: "Column to order by" },
          ascending: { type: "boolean", description: "Order ascending (true) or descending (false)" },
          limit: { type: "number", description: "Max rows to return" }
        },
        required: ["table", "select"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_full_financial_data",
      description: "Get COMPLETE financial overview including accounts, categories with their subcategories, and recent transactions. ALWAYS use this first for any financial question.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_transactions_by_subcategory",
      description: "Get all transactions for a specific subcategory (like حشاش, جزرة, etc.). Use this when user asks about spending on specific places.",
      parameters: {
        type: "object",
        properties: {
          subcategory_name: { type: "string", description: "Subcategory name to search (e.g., 'حشاش', 'جزرة')" },
          date_from: { type: "string", description: "Start date YYYY-MM-DD" },
          date_to: { type: "string", description: "End date YYYY-MM-DD" }
        },
        required: ["subcategory_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_spending_analysis",
      description: "Analyze spending by category, date range, or overall. Use this for general spending questions, NOT for specific subcategories.",
      parameters: {
        type: "object",
        properties: {
          category_name: { type: "string", description: "Category name to filter (optional, e.g., 'food', 'طلعات')" },
          date_from: { type: "string", description: "Start date in YYYY-MM-DD format (optional)" },
          date_to: { type: "string", description: "End date in YYYY-MM-DD format (optional)" },
          analysis_type: { 
            type: "string", 
            enum: ["by_category", "by_subcategory", "by_date", "total", "compare"],
            description: "Type of analysis: by_category (group by category), by_subcategory (group by subcategory), by_date (group by date), total (sum), compare (comparison)"
          }
        },
        required: ["analysis_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_gym_overview",
      description: "Get complete gym data: recent workout sessions, exercise history, workout plans, and stats.",
      parameters: {
        type: "object",
        properties: {
          days_back: { type: "number", description: "How many days back to look (default 30)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_dreams_overview",
      description: "Get all dreams/goals with their progress, steps, and status.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_supplements_overview",
      description: "Get supplement inventory and recent logs.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_body_stats",
      description: "Get weight and body stats history.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Number of recent entries (default 30)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_transaction",
      description: "Add a new transaction (expense or income). ONLY call this after user confirms the details.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Transaction amount" },
          type: { type: "string", enum: ["expense", "income"], description: "Transaction type" },
          description: { type: "string", description: "Description of the transaction" },
          account_id: { type: "string", description: "Account UUID to use" },
          category_id: { type: "string", description: "Category UUID (optional)" },
          subcategory_id: { type: "string", description: "Subcategory UUID (optional) - use this for specific places like حشاش" },
          date: { type: "string", description: "Date in YYYY-MM-DD format (optional, defaults to today in Israel timezone)" }
        },
        required: ["amount", "type", "description", "account_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "log_supplement",
      description: "Log supplement intake for today or a specific date",
      parameters: {
        type: "object",
        properties: {
          supplement_id: { type: "string", description: "Supplement UUID" },
          doses_taken: { type: "number", description: "Number of doses taken" },
          logged_date: { type: "string", description: "Date in YYYY-MM-DD format (optional)" },
          notes: { type: "string", description: "Optional notes" }
        },
        required: ["supplement_id", "doses_taken"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_dream",
      description: "Add a new dream or goal",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Dream title" },
          description: { type: "string", description: "Dream description" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Priority level" },
          target_date: { type: "string", description: "Target date in YYYY-MM-DD format" },
          estimated_cost: { type: "number", description: "Estimated cost (optional)" }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_record",
      description: "Update an existing record in any table",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name" },
          id: { type: "string", description: "Record UUID to update" },
          data: { type: "object", description: "Fields to update with their new values" }
        },
        required: ["table", "id", "data"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_record",
      description: "Delete a record from any table",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name" },
          id: { type: "string", description: "Record UUID to delete" }
        },
        required: ["table", "id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_daily_summary",
      description: "Get a summary of today's data including finances, workouts, supplements, and prayers",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format (optional, defaults to today)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_preferences",
      description: "Get all saved user preferences, shortcuts, and defaults. ALWAYS call this at the start to check for any relevant shortcuts or defaults before taking actions.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Optional: specific preference key to look up (e.g., 'coffee', 'default_account')" },
          preference_type: { type: "string", enum: ["shortcut", "default", "learned_behavior", "correction"], description: "Optional: filter by type" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_preference",
      description: "Save a new preference, shortcut, default, or learned behavior. Use this when the user teaches you something new or after they correct you.",
      parameters: {
        type: "object",
        properties: {
          preference_type: { type: "string", enum: ["shortcut", "default", "learned_behavior", "correction"], description: "Type of preference" },
          key: { type: "string", description: "The key/trigger for this preference (e.g., 'coffee', 'default_food_account')" },
          value: { type: "object", description: "The value to store (e.g., {amount: 25, type: 'expense', account_name: 'Cash'})" },
          description: { type: "string", description: "Human readable description of what this preference does" }
        },
        required: ["preference_type", "key", "value", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_preference",
      description: "Delete a saved preference when the user wants to remove a shortcut or learned behavior",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "The key of the preference to delete" }
        },
        required: ["key"]
      }
    }
  }
];

async function executeToolCall(name: string, args: any): Promise<string> {
  console.log(`Executing tool: ${name}`, args);
  
  try {
    switch (name) {
      case "query_database": {
        let query = supabase.from(args.table).select(args.select);
        
        if (args.filters) {
          for (const filter of args.filters) {
            query = query[filter.operator](filter.column, filter.value);
          }
        }
        
        if (args.order) {
          query = query.order(args.order, { ascending: args.ascending ?? false });
        }
        
        if (args.limit) {
          query = query.limit(args.limit);
        }
        
        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify(data);
      }
      
      case "get_full_financial_data": {
        const [accounts, categories, subcategories, recentTransactions] = await Promise.all([
          supabase.from('accounts').select('*'),
          supabase.from('categories').select('*'),
          supabase.from('subcategories').select('*, categories(name)'),
          supabase.from('transactions')
            .select('*, categories(name), subcategories(name)')
            .order('date', { ascending: false })
            .limit(50)
        ]);
        
        // Build category->subcategory map
        const categoryMap = categories.data?.map(cat => ({
          ...cat,
          subcategories: subcategories.data?.filter(s => s.category_id === cat.id) || []
        }));
        
        return JSON.stringify({
          accounts: accounts.data || [],
          categories: categoryMap || [],
          all_subcategories: subcategories.data || [],
          recent_transactions: recentTransactions.data || [],
          summary: {
            total_accounts: accounts.data?.length || 0,
            total_categories: categories.data?.length || 0,
            total_subcategories: subcategories.data?.length || 0
          },
          instructions: "Use category_id AND subcategory_id when adding transactions. Subcategories are specific places - e.g., 'حشاش' is under 'طلعات' category."
        });
      }
      
      case "get_transactions_by_subcategory": {
        const today = getIsraelDate();
        const israelNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
        const monthStart = new Date(israelNow.getFullYear(), israelNow.getMonth(), 1).toISOString().split('T')[0];
        
        const dateFrom = args.date_from || monthStart;
        const dateTo = args.date_to || today;
        
        // First find the subcategory
        const { data: subcats } = await supabase
          .from('subcategories')
          .select('id, name, category_id, categories(name)')
          .ilike('name', `%${args.subcategory_name}%`);
        
        if (!subcats || subcats.length === 0) {
          return JSON.stringify({
            error: `No subcategory found matching "${args.subcategory_name}"`,
            suggestion: "Use get_full_financial_data to see all available subcategories"
          });
        }
        
        const subcatIds = subcats.map(s => s.id);
        
        // Get transactions for these subcategories
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('*, categories(name), subcategories(name)')
          .in('subcategory_id', subcatIds)
          .gte('date', dateFrom)
          .lte('date', dateTo)
          .order('date', { ascending: false });
        
        if (error) return JSON.stringify({ error: error.message });
        
        const total = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        
        return JSON.stringify({
          subcategory: args.subcategory_name,
          matching_subcategories: subcats.map(s => ({
            id: s.id,
            name: s.name,
            parent_category: s.categories?.name
          })),
          period: `${dateFrom} to ${dateTo}`,
          total_spent: total.toFixed(2),
          transaction_count: transactions?.length || 0,
          transactions: transactions?.map(t => ({
            amount: t.amount,
            date: t.date,
            description: t.description,
            category: t.categories?.name,
            subcategory: t.subcategories?.name
          })) || [],
          currency: 'ILS'
        });
      }
      
      case "get_spending_analysis": {
        const today = getIsraelDate();
        let dateFrom = args.date_from;
        let dateTo = args.date_to || today;
        
        // Default to current month if no date specified
        if (!dateFrom) {
          const israelNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
          dateFrom = new Date(israelNow.getFullYear(), israelNow.getMonth(), 1).toISOString().split('T')[0];
        }

        // Get all expense transactions with category and subcategory info
        let query = supabase
          .from('transactions')
          .select('*, categories(name, icon), subcategories(name)')
          .eq('type', 'expense')
          .gte('date', dateFrom)
          .lte('date', dateTo);
        
        if (args.category_name) {
          // First get category ID
          const { data: cat } = await supabase
            .from('categories')
            .select('id')
            .ilike('name', `%${args.category_name}%`)
            .single();
          
          if (cat) {
            query = query.eq('category_id', cat.id);
          }
        }
        
        const { data: transactions, error } = await query;
        if (error) return JSON.stringify({ error: error.message });
        
        if (args.analysis_type === 'by_subcategory') {
          // Group by subcategory
          const bySubcategory: { [key: string]: { amount: number, category: string } } = {};
          transactions?.forEach(t => {
            const subName = t.subcategories?.name || 'No Subcategory';
            const catName = t.categories?.name || 'Uncategorized';
            if (!bySubcategory[subName]) {
              bySubcategory[subName] = { amount: 0, category: catName };
            }
            bySubcategory[subName].amount += Number(t.amount);
          });
          
          const sorted = Object.entries(bySubcategory)
            .sort(([,a], [,b]) => b.amount - a.amount)
            .map(([subcategory, data]) => ({ 
              subcategory, 
              category: data.category,
              amount: data.amount.toFixed(2) 
            }));
          
          return JSON.stringify({
            period: `${dateFrom} to ${dateTo}`,
            total_spent: transactions?.reduce((sum, t) => sum + Number(t.amount), 0).toFixed(2),
            by_subcategory: sorted
          });
        } else if (args.analysis_type === 'by_category') {
          // Group by category with subcategory breakdown
          const byCategory: { [key: string]: { total: number, subcategories: { [key: string]: number } } } = {};
          transactions?.forEach(t => {
            const catName = t.categories?.name || 'Uncategorized';
            const subName = t.subcategories?.name || 'Other';
            if (!byCategory[catName]) {
              byCategory[catName] = { total: 0, subcategories: {} };
            }
            byCategory[catName].total += Number(t.amount);
            byCategory[catName].subcategories[subName] = (byCategory[catName].subcategories[subName] || 0) + Number(t.amount);
          });
          
          const sorted = Object.entries(byCategory)
            .sort(([,a], [,b]) => b.total - a.total)
            .map(([category, data]) => ({ 
              category, 
              amount: data.total.toFixed(2),
              subcategories: Object.entries(data.subcategories)
                .sort(([,a], [,b]) => b - a)
                .map(([name, amt]) => ({ name, amount: amt.toFixed(2) }))
            }));
          
          return JSON.stringify({
            period: `${dateFrom} to ${dateTo}`,
            total_spent: transactions?.reduce((sum, t) => sum + Number(t.amount), 0).toFixed(2),
            by_category: sorted,
            highest_category: sorted[0]?.category || 'None'
          });
        } else if (args.analysis_type === 'by_date') {
          // Group by date
          const byDate: { [key: string]: number } = {};
          transactions?.forEach(t => {
            const date = t.date;
            byDate[date] = (byDate[date] || 0) + Number(t.amount);
          });
          
          return JSON.stringify({
            period: `${dateFrom} to ${dateTo}`,
            total_spent: transactions?.reduce((sum, t) => sum + Number(t.amount), 0).toFixed(2),
            by_date: Object.entries(byDate).map(([date, amount]) => ({ date, amount: amount.toFixed(2) }))
          });
        } else if (args.analysis_type === 'compare') {
          // Compare all categories
          const byCategory: { [key: string]: number } = {};
          transactions?.forEach(t => {
            const catName = t.categories?.name || 'Uncategorized';
            byCategory[catName] = (byCategory[catName] || 0) + Number(t.amount);
          });
          
          const total = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          const comparison = Object.entries(byCategory)
            .sort(([,a], [,b]) => b - a)
            .map(([category, amount]) => ({
              category,
              amount: amount.toFixed(2),
              percentage: ((amount / total) * 100).toFixed(1) + '%'
            }));
          
          return JSON.stringify({
            period: `${dateFrom} to ${dateTo}`,
            total_spent: total.toFixed(2),
            comparison
          });
        } else {
          // Total
          const total = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          return JSON.stringify({
            period: `${dateFrom} to ${dateTo}`,
            total_spent: total.toFixed(2),
            transaction_count: transactions?.length || 0,
            currency: 'ILS'
          });
        }
      }
      
      case "get_gym_overview": {
        const daysBack = args.days_back || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        const startDateStr = startDate.toISOString().split('T')[0];
        
        const [sessions, exercises, exerciseSets, plans, muscleGroups] = await Promise.all([
          supabase.from('workout_sessions')
            .select('*')
            .gte('scheduled_date', startDateStr)
            .order('scheduled_date', { ascending: false }),
          supabase.from('exercises').select('*'),
          supabase.from('exercise_sets')
            .select('*, exercises(name, muscle_group)')
            .order('created_at', { ascending: false })
            .limit(100),
          supabase.from('workout_plans').select('*, workout_plan_days(*)'),
          supabase.from('muscle_groups').select('*')
        ]);
        
        const completedSessions = sessions.data?.filter(s => s.completed_at) || [];
        const totalDuration = completedSessions.reduce((sum, s) => sum + (s.total_duration_minutes || 0), 0);
        
        // Calculate muscle group frequency
        const muscleGroupCounts: { [key: string]: number } = {};
        completedSessions.forEach(s => {
          s.muscle_groups?.forEach((mg: string) => {
            muscleGroupCounts[mg] = (muscleGroupCounts[mg] || 0) + 1;
          });
        });
        
        return JSON.stringify({
          period: `Last ${daysBack} days`,
          stats: {
            total_sessions: sessions.data?.length || 0,
            completed_sessions: completedSessions.length,
            total_duration_minutes: totalDuration,
            average_duration: completedSessions.length > 0 ? Math.round(totalDuration / completedSessions.length) : 0,
            with_trainer_count: completedSessions.filter(s => s.with_trainer).length
          },
          muscle_group_frequency: muscleGroupCounts,
          recent_sessions: completedSessions.slice(0, 10).map(s => ({
            date: s.scheduled_date,
            duration: s.total_duration_minutes,
            muscle_groups: s.muscle_groups,
            with_trainer: s.with_trainer
          })),
          exercises_count: exercises.data?.length || 0,
          active_plans: plans.data?.filter(p => p.is_active) || [],
          muscle_groups: muscleGroups.data || []
        });
      }
      
      case "get_dreams_overview": {
        const [dreams, dreamSteps] = await Promise.all([
          supabase.from('dreams').select('*').order('created_at', { ascending: false }),
          supabase.from('dream_steps').select('*')
        ]);
        
        const dreamsWithSteps = dreams.data?.map(dream => ({
          ...dream,
          steps: dreamSteps.data?.filter(s => s.dream_id === dream.id) || []
        }));
        
        const byStatus: { [key: string]: number } = {};
        dreams.data?.forEach(d => {
          byStatus[d.status] = (byStatus[d.status] || 0) + 1;
        });
        
        return JSON.stringify({
          total_dreams: dreams.data?.length || 0,
          by_status: byStatus,
          dreams: dreamsWithSteps || [],
          total_estimated_cost: dreams.data?.reduce((sum, d) => sum + (d.estimated_cost || 0), 0) || 0
        });
      }
      
      case "get_supplements_overview": {
        const today = getIsraelDate();
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const [supplements, recentLogs] = await Promise.all([
          supabase.from('supplements').select('*'),
          supabase.from('supplement_logs')
            .select('*, supplements(name)')
            .gte('logged_date', weekAgo.toISOString().split('T')[0])
            .order('logged_date', { ascending: false })
        ]);
        
        const lowStock = supplements.data?.filter(s => s.remaining_doses <= s.warning_threshold) || [];
        
        return JSON.stringify({
          total_supplements: supplements.data?.length || 0,
          supplements: supplements.data || [],
          low_stock_alerts: lowStock.map(s => ({
            name: s.name,
            remaining: s.remaining_doses,
            threshold: s.warning_threshold
          })),
          recent_logs: recentLogs.data || [],
          today_date: today
        });
      }
      
      case "get_body_stats": {
        const limit = args.limit || 30;
        
        const { data, error } = await supabase
          .from('user_body_stats')
          .select('*')
          .order('recorded_at', { ascending: false })
          .limit(limit);
        
        if (error) return JSON.stringify({ error: error.message });
        
        const latest = data?.[0];
        const oldest = data?.[data.length - 1];
        const weightChange = latest && oldest ? (latest.weight - oldest.weight).toFixed(1) : 0;
        
        return JSON.stringify({
          entries: data || [],
          latest: latest || null,
          oldest_in_range: oldest || null,
          weight_change: weightChange,
          entry_count: data?.length || 0
        });
      }
      
      case "add_transaction": {
        const today = getIsraelDate();
        const { data, error } = await supabase.from('transactions').insert({
          amount: args.amount,
          type: args.type,
          description: args.description,
          account_id: args.account_id,
          category_id: args.category_id || null,
          subcategory_id: args.subcategory_id || null,
          date: args.date || today
        }).select();
        
        if (error) return JSON.stringify({ error: error.message });
        
        // Update account balance
        const adjustment = args.type === 'expense' ? -args.amount : args.amount;
        await supabase.from('accounts')
          .select('amount')
          .eq('id', args.account_id)
          .single()
          .then(({ data: acc }) => {
            if (acc) {
              return supabase.from('accounts')
                .update({ amount: acc.amount + adjustment })
                .eq('id', args.account_id);
            }
          });
        
        return JSON.stringify({ success: true, transaction: data, message: `Successfully added ${args.type} of ₪${args.amount}` });
      }
      
      case "log_supplement": {
        const today = getIsraelDate();
        const { data, error } = await supabase.from('supplement_logs').insert({
          supplement_id: args.supplement_id,
          doses_taken: args.doses_taken,
          logged_date: args.logged_date || today,
          notes: args.notes || null
        }).select();
        
        if (error) return JSON.stringify({ error: error.message });
        
        // Update remaining doses
        const { data: supplement } = await supabase.from('supplements')
          .select('remaining_doses')
          .eq('id', args.supplement_id)
          .single();
        
        if (supplement) {
          await supabase.from('supplements')
            .update({ remaining_doses: Math.max(0, supplement.remaining_doses - args.doses_taken) })
            .eq('id', args.supplement_id);
        }
        
        return JSON.stringify({ success: true, log: data });
      }
      
      case "add_dream": {
        const { data, error } = await supabase.from('dreams').insert({
          title: args.title,
          description: args.description || null,
          priority: args.priority || 'medium',
          target_date: args.target_date || null,
          estimated_cost: args.estimated_cost || null,
          status: 'in_progress'
        }).select();
        
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, dream: data });
      }
      
      case "update_record": {
        const { data, error } = await supabase.from(args.table)
          .update(args.data)
          .eq('id', args.id)
          .select();
        
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, updated: data });
      }
      
      case "delete_record": {
        const { error } = await supabase.from(args.table)
          .delete()
          .eq('id', args.id);
        
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, deleted: args.id });
      }
      
      case "get_daily_summary": {
        const date = args.date || getIsraelDate();
        
        const [transactions, supplements, workouts, prayers] = await Promise.all([
          supabase.from('transactions').select('*, categories(name), subcategories(name)').eq('date', date),
          supabase.from('supplement_logs').select('*, supplements(name)').eq('logged_date', date),
          supabase.from('workout_sessions').select('*').eq('scheduled_date', date),
          supabase.from('prayer_completions').select('*').eq('completion_date', date)
        ]);
        
        const totalExpenses = transactions.data?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;
        const totalIncome = transactions.data?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
        
        return JSON.stringify({
          date,
          current_time_israel: getIsraelTime(),
          finances: {
            expenses: totalExpenses,
            income: totalIncome,
            transactions: transactions.data?.length || 0,
            details: transactions.data?.map(t => ({
              amount: t.amount,
              type: t.type,
              category: t.categories?.name,
              subcategory: t.subcategories?.name,
              description: t.description
            }))
          },
          supplements: supplements.data || [],
          workouts: workouts.data || [],
          prayers_completed: prayers.data?.map(p => p.prayer_name) || []
        });
      }
      
      case "get_preferences": {
        let query = supabase.from('user_preferences').select('*');
        
        if (args.key) {
          query = query.ilike('key', `%${args.key}%`);
        }
        if (args.preference_type) {
          query = query.eq('preference_type', args.preference_type);
        }
        
        const { data, error } = await query.order('usage_count', { ascending: false });
        if (error) return JSON.stringify({ error: error.message });
        
        if (!data || data.length === 0) {
          return JSON.stringify({ 
            preferences: [], 
            message: "No preferences saved yet. The user can teach me shortcuts and defaults!" 
          });
        }
        
        return JSON.stringify({ 
          preferences: data,
          message: `Found ${data.length} saved preference(s). Use these to assist the user more efficiently.`
        });
      }
      
      case "save_preference": {
        // Check if preference already exists
        const { data: existing } = await supabase
          .from('user_preferences')
          .select('id, usage_count')
          .eq('key', args.key)
          .single();
        
        if (existing) {
          // Update existing preference
          const { data, error } = await supabase
            .from('user_preferences')
            .update({
              value: args.value,
              description: args.description,
              preference_type: args.preference_type,
              usage_count: existing.usage_count + 1,
              last_used_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select();
          
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ 
            success: true, 
            updated: true,
            preference: data,
            message: `Updated preference "${args.key}". I'll remember this!`
          });
        }
        
        // Create new preference
        const { data, error } = await supabase
          .from('user_preferences')
          .insert({
            preference_type: args.preference_type,
            key: args.key,
            value: args.value,
            description: args.description
          })
          .select();
        
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ 
          success: true, 
          created: true,
          preference: data,
          message: `Saved new ${args.preference_type}: "${args.key}". I'll remember this for next time!`
        });
      }
      
      case "delete_preference": {
        const { error } = await supabase
          .from('user_preferences')
          .delete()
          .eq('key', args.key);
        
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ 
          success: true, 
          deleted: args.key,
          message: `Deleted preference "${args.key}". I won't use this shortcut anymore.`
        });
      }
      
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (error) {
    console.error(`Tool execution error: ${name}`, error);
    return JSON.stringify({ error: error.message });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, timezone, currentTime } = await req.json();
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Starting assistant request with messages:", messages.length, "timezone:", timezone);

    // Get fresh system prompt with current time
    const currentSystemPrompt = getSystemPrompt();

    // Initial request with tools
    let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: currentSystemPrompt },
          ...messages
        ],
        tools,
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    let data = await response.json();
    let assistantMessage = data.choices[0].message;
    
    // Handle tool calls in a loop
    const conversationMessages = [
      { role: "system", content: currentSystemPrompt },
      ...messages,
      assistantMessage
    ];
    
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log("Processing tool calls:", assistantMessage.tool_calls.length);
      
      // Execute all tool calls
      const toolResults = await Promise.all(
        assistantMessage.tool_calls.map(async (toolCall: any) => {
          const result = await executeToolCall(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments)
          );
          return {
            role: "tool",
            tool_call_id: toolCall.id,
            content: result
          };
        })
      );
      
      // Add tool results to conversation
      conversationMessages.push(...toolResults);
      
      // Get next response
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: conversationMessages,
          tools,
          stream: false,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`AI gateway error: ${response.status}`);
      }
      
      data = await response.json();
      assistantMessage = data.choices[0].message;
      conversationMessages.push(assistantMessage);
    }

    // Return final response
    return new Response(JSON.stringify({ 
      message: assistantMessage.content 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Personal assistant error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
