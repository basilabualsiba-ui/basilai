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

    const systemPrompt = `You are a database query builder for a personal assistant app called "Roz".
The app has tables for: financial (transactions, accounts, categories, subcategories, budgets), 
gym (exercises, exercise_sets, workout_sessions, workout_plans, workout_plan_days, muscle_groups, user_body_stats),
food (food_items, meals, meal_plans, meal_consumptions),
prayer (prayer_times, prayer_completions),
supplements (supplements, supplement_logs),
dreams (dreams, dream_steps),
schedule (daily_activities, activity_completions).

All dates/times use Asia/Jerusalem timezone. The user speaks Arabic (Palestinian dialect).

Given a user question and the database schema, generate a query configuration that can answer the question.
Use the suggest_query tool to return your answer.`;

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
              content: `Question: "${question}"\n\nDatabase Schema:\n${JSON.stringify(schema, null, 2)}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_query",
                description:
                  "Generate a query configuration for the assistant to answer the user question",
                parameters: {
                  type: "object",
                  properties: {
                    query_name: {
                      type: "string",
                      description: "Unique snake_case name for the query",
                    },
                    category: {
                      type: "string",
                      enum: [
                        "financial",
                        "gym",
                        "prayer",
                        "supplements",
                        "dreams",
                        "schedule",
                        "food",
                        "general",
                      ],
                    },
                    purpose: {
                      type: "string",
                      description: "What this query does in Arabic",
                    },
                    trigger_patterns: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        "Arabic trigger phrases including the original question and 2-3 variations",
                    },
                    query_config: {
                      type: "object",
                      properties: {
                        table: { type: "string" },
                        select: {
                          type: "array",
                          items: { type: "string" },
                        },
                        joins: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              table: { type: "string" },
                              on: { type: "string" },
                            },
                            required: ["table", "on"],
                          },
                        },
                        filters: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              column: { type: "string" },
                              operator: {
                                type: "string",
                                enum: [
                                  "eq",
                                  "neq",
                                  "gt",
                                  "gte",
                                  "lt",
                                  "lte",
                                  "like",
                                  "ilike",
                                  "not_null",
                                  "is_null",
                                ],
                              },
                              value: {},
                            },
                            required: ["column", "operator"],
                          },
                        },
                        aggregation: {
                          type: "object",
                          properties: {
                            type: {
                              type: "string",
                              enum: ["sum", "count", "avg", "max", "min"],
                            },
                            column: { type: "string" },
                          },
                        },
                        group_by: {
                          type: "array",
                          items: { type: "string" },
                        },
                        order_by: {
                          type: "object",
                          properties: {
                            column: { type: "string" },
                            ascending: { type: "boolean" },
                          },
                        },
                        limit: { type: "number" },
                      },
                      required: ["table", "select"],
                    },
                    output_template: {
                      type: "string",
                      description:
                        "Arabic template with {variable} placeholders for the response",
                    },
                    output_mode: {
                      type: "string",
                      enum: ["text", "table"],
                      description: "Whether to show as one line or table",
                    },
                    action_type: {
                      type: "string",
                      enum: ["query", "input"],
                      description: "Whether this reads or writes data",
                    },
                    filter_code: {
                      type: "string",
                      description:
                        "Optional JS code for complex filtering: receives (data, variables) and returns filtered array",
                    },
                    result_code: {
                      type: "string",
                      description:
                        "Optional JS code for formatting: receives (data, variables) and returns string",
                    },
                    explanation: {
                      type: "string",
                      description:
                        "Explain in Arabic what this query does and why",
                    },
                  },
                  required: [
                    "query_name",
                    "category",
                    "purpose",
                    "trigger_patterns",
                    "query_config",
                    "explanation",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "suggest_query" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, try again later" }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: "AI did not return a suggestion" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const suggestion = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-query error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
