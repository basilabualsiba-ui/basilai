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

const systemPrompt = `You are Basil's personal AI assistant. You have access to his personal database and can help manage his life.

IMPORTANT RULES:
1. You ONLY know information from the database - never make up data
2. Be concise and helpful
3. When performing actions, ALWAYS confirm with the user before executing
4. Use the tools provided to query and modify data
5. For financial amounts, the currency is typically ILS (Israeli Shekel)
6. Be friendly and personal - you know Basil

LEARNING & ADAPTATION:
- If you don't know how to do something, ASK the user to teach you
- When the user corrects you or shows you a better way, acknowledge and remember their preference
- If a request is unclear, ask specific questions to clarify before acting

FINANCIAL QUERIES - You can help with:
- "How much did I spend on [category] this month/week/yesterday?"
- "What's my total spending for [time period]?"
- "Which category am I spending the most on?"
- "Where should I spend less?"
- "Compare my spending between categories"
- "Show me my transactions from [date]"

ADDING TRANSACTIONS WORKFLOW:
When the user asks to add an expense/income, follow this process:
1. Extract what you understand from their message (amount, type, category, account)
2. If ANYTHING is unclear or missing, ask the user to provide it
3. Before executing, ALWAYS confirm: "Let me confirm: You want to add [expense/income] of [amount] to [account] under [category]? Should I proceed?"
4. Only execute after user confirms with "yes" or similar
5. If user says no or corrects you, ask what to change

Available data in the database:
- accounts: Financial accounts (name, amount, currency, type)
- transactions: Income and expenses (amount, date, description, type, category_id, account_id)
- categories: Transaction categories (name, type, icon)
- subcategories: Sub-categories linked to categories
- supplements: Supplement inventory (name, remaining_doses, total_doses, dose_unit, warning_threshold)
- supplement_logs: Daily supplement intake logs (supplement_id, doses_taken, logged_date)
- workout_sessions: Gym sessions (scheduled_date, completed_at, with_trainer, muscle_groups)
- exercises: Exercise library (name, muscle_group, equipment)
- exercise_sets: Sets performed (session_id, exercise_id, weight, reps)
- dreams: Goals and dreams (title, description, status, progress_percentage, target_date)
- dream_steps: Steps to achieve dreams
- prayer_times: Daily prayer times (fajr, dhuhr, asr, maghrib, isha)
- prayer_completions: Completed prayers
- daily_activities: Scheduled activities
- user_body_stats: Weight tracking (weight, height, recorded_at)

WHEN YOU CAN'T DO SOMETHING:
- Be honest and say "I don't know how to do that yet"
- Ask the user: "Could you teach me how you'd like me to handle this?"
- Remember their instructions for future reference

When asked about data, use query_database tool. When asked to add/update/delete, use the appropriate tool after confirming.`;

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
      name: "get_spending_analysis",
      description: "Analyze spending by category, date range, or overall. Use this for questions like 'how much did I spend on food', 'where am I spending the most', 'spending yesterday'",
      parameters: {
        type: "object",
        properties: {
          category_name: { type: "string", description: "Category name to filter (optional, e.g., 'Food', 'Transport')" },
          date_from: { type: "string", description: "Start date in YYYY-MM-DD format (optional)" },
          date_to: { type: "string", description: "End date in YYYY-MM-DD format (optional)" },
          analysis_type: { 
            type: "string", 
            enum: ["by_category", "by_date", "total", "compare"],
            description: "Type of analysis: by_category (group by category), by_date (group by date), total (sum), compare (category comparison)"
          }
        },
        required: ["analysis_type"]
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
          date: { type: "string", description: "Date in YYYY-MM-DD format (optional, defaults to today)" }
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
      name: "get_accounts_and_categories",
      description: "Get list of available accounts and categories for adding transactions",
      parameters: {
        type: "object",
        properties: {}
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
      
      case "get_spending_analysis": {
        const today = new Date();
        let dateFrom = args.date_from;
        let dateTo = args.date_to || today.toISOString().split('T')[0];
        
        // Default to current month if no date specified
        if (!dateFrom) {
          dateFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        }

        // Get all expense transactions with category info
        let query = supabase
          .from('transactions')
          .select('*, categories(name, icon)')
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
        
        if (args.analysis_type === 'by_category') {
          // Group by category
          const byCategory: { [key: string]: number } = {};
          transactions?.forEach(t => {
            const catName = t.categories?.name || 'Uncategorized';
            byCategory[catName] = (byCategory[catName] || 0) + Number(t.amount);
          });
          
          const sorted = Object.entries(byCategory)
            .sort(([,a], [,b]) => b - a)
            .map(([category, amount]) => ({ category, amount: amount.toFixed(2) }));
          
          return JSON.stringify({
            period: `${dateFrom} to ${dateTo}`,
            total_spent: transactions?.reduce((sum, t) => sum + Number(t.amount), 0).toFixed(2),
            by_category: sorted,
            highest_category: sorted[0]?.category || 'None',
            suggestion: sorted.length > 0 ? `You're spending the most on ${sorted[0].category} (₪${sorted[0].amount}). Consider reviewing these expenses.` : 'No expenses in this period.'
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
            comparison,
            insight: comparison.length > 1 
              ? `Top spending: ${comparison[0].category} (${comparison[0].percentage}). Lowest: ${comparison[comparison.length-1].category} (${comparison[comparison.length-1].percentage})`
              : 'Not enough data to compare'
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
      
      case "get_accounts_and_categories": {
        const [accounts, categories] = await Promise.all([
          supabase.from('accounts').select('id, name, type, amount, currency'),
          supabase.from('categories').select('id, name, type, icon')
        ]);
        
        return JSON.stringify({
          accounts: accounts.data || [],
          categories: categories.data || [],
          instructions: "Use these IDs when adding transactions. Ask the user which account and category to use if not specified."
        });
      }
      
      case "add_transaction": {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase.from('transactions').insert({
          amount: args.amount,
          type: args.type,
          description: args.description,
          account_id: args.account_id,
          category_id: args.category_id || null,
          date: args.date || today
        }).select();
        
        if (error) return JSON.stringify({ error: error.message });
        
        // Update account balance
        const adjustment = args.type === 'expense' ? -args.amount : args.amount;
        await supabase.rpc('update_account_balance', { 
          account_uuid: args.account_id, 
          amount_change: adjustment 
        }).catch(() => {
          // If RPC doesn't exist, update directly
          return supabase.from('accounts')
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
        });
        
        return JSON.stringify({ success: true, transaction: data, message: `Successfully added ${args.type} of ₪${args.amount}` });
      }
      
      case "log_supplement": {
        const today = new Date().toISOString().split('T')[0];
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
        const date = args.date || new Date().toISOString().split('T')[0];
        
        const [transactions, supplements, workouts, prayers] = await Promise.all([
          supabase.from('transactions').select('*').eq('date', date),
          supabase.from('supplement_logs').select('*, supplements(name)').eq('logged_date', date),
          supabase.from('workout_sessions').select('*').eq('scheduled_date', date),
          supabase.from('prayer_completions').select('*').eq('completion_date', date)
        ]);
        
        const totalExpenses = transactions.data?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;
        const totalIncome = transactions.data?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
        
        return JSON.stringify({
          date,
          finances: {
            expenses: totalExpenses,
            income: totalIncome,
            transactions: transactions.data?.length || 0
          },
          supplements: supplements.data || [],
          workouts: workouts.data || [],
          prayers_completed: prayers.data?.map(p => p.prayer_name) || []
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
    const { messages } = await req.json();
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Starting assistant request with messages:", messages.length);

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
          { role: "system", content: systemPrompt },
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
      { role: "system", content: systemPrompt },
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
