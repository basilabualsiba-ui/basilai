import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, schema } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build detailed schema description with actual columns
    const schemaDescription = (schema || []).map((t: any) => {
      const cols = t.columns?.length
        ? t.columns.map((c: any) => `${c.name} (${c.type})`).join(", ")
        : "columns not available";
      return `- ${t.name} [${t.category}]: ${cols}`;
    }).join("\n");

    const systemPrompt = `You are a database query builder for "Roz", a personal assistant app.
The user speaks Arabic (Palestinian dialect). All dates use Asia/Jerusalem timezone.

AVAILABLE TABLES AND THEIR EXACT COLUMNS:
${schemaDescription}

IMPORTANT RULES:
1. ONLY use column names that exist in the schema above. Double-check every column name.
2. The "transactions" table does NOT have a "currency" column. Currency is on the "accounts" table.
3. The "accounts" table uses "amount" not "balance" for the balance field.
4. For joins, use the foreign key column name (e.g., "category_id", "subcategory_id", "exercise_id").
5. Available filter variables: {today}, {yesterday}, {week_start}, {month_start}, {first_of_month}, {first_of_last_month}, {current_time}, {place}, {exercise}, {muscle}.
6. For complex logic, use result_code (JS function receiving data and variables, must return a string).
7. output_mode: "text" for single answers, "table" for lists.

EXAMPLE CORRECT QUERY:
{
  "query_name": "spending_today",
  "category": "financial",
  "purpose": "مجموع المصاريف اليوم",
  "trigger_patterns": ["كم صرفت اليوم", "مصاريف اليوم"],
  "query_config": {
    "table": "transactions",
    "select": ["amount", "date"],
    "joins": [{"on": "category_id", "table": "categories"}],
    "filters": [{"value": "expense", "column": "type", "operator": "eq"}, {"value": "{today}", "column": "date", "operator": "eq"}],
    "aggregation": {"type": "sum", "column": "amount"}
  },
  "output_template": "💰 صرفت اليوم {total} شيكل"
}

Before returning, VERIFY that every column in select, filters, aggregation, group_by, and order_by actually exists in the table schema above.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Question: "${question}"\n\nGenerate a query configuration to answer this question. Make sure all column names are valid.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_query",
                description:
                  "Generate a query configuration for the assistant",
                parameters: {
                  type: "object",
                  properties: {
                    query_name: { type: "string" },
                    category: {
                      type: "string",
                      enum: ["financial", "gym", "prayer", "supplements", "dreams", "schedule", "food", "general"],
                    },
                    purpose: { type: "string" },
                    trigger_patterns: { type: "array", items: { type: "string" } },
                    query_config: {
                      type: "object",
                      properties: {
                        table: { type: "string" },
                        select: { type: "array", items: { type: "string" } },
                        joins: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: { table: { type: "string" }, on: { type: "string" } },
                            required: ["table", "on"],
                          },
                        },
                        filters: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              column: { type: "string" },
                              operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "not_null", "is_null"] },
                              value: {},
                            },
                            required: ["column", "operator"],
                          },
                        },
                        aggregation: {
                          type: "object",
                          properties: {
                            type: { type: "string", enum: ["sum", "count", "avg", "max", "min"] },
                            column: { type: "string" },
                          },
                        },
                        group_by: { type: "array", items: { type: "string" } },
                        order_by: {
                          type: "object",
                          properties: { column: { type: "string" }, ascending: { type: "boolean" } },
                        },
                        limit: { type: "number" },
                      },
                      required: ["table", "select"],
                    },
                    output_template: { type: "string" },
                    output_mode: { type: "string", enum: ["text", "table"] },
                    action_type: { type: "string", enum: ["query", "input"] },
                    filter_code: { type: "string" },
                    result_code: { type: "string" },
                    explanation: { type: "string" },
                  },
                  required: ["query_name", "category", "purpose", "trigger_patterns", "query_config", "explanation"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "suggest_query" } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return a suggestion" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const suggestion = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-query error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
