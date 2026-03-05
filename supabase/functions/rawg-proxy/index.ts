import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=900",
};

const cache = new Map<string, { expiresAt: number; payload: unknown }>();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAWG_API_KEY = Deno.env.get("RAWG_API_KEY");
    if (!RAWG_API_KEY) {
      return new Response(JSON.stringify({ error: "RAWG_API_KEY not configured" }), { status: 500, headers: corsHeaders });
    }

    const { action, query, id } = await req.json();
    const cacheKey = JSON.stringify({ action, query, id });
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return new Response(JSON.stringify(cached.payload), { headers: corsHeaders });
    }

    let endpoint = "";
    if (action === "search") endpoint = `/games?search=${encodeURIComponent(query || "")}&page_size=8&key=${RAWG_API_KEY}`;
    if (action === "details") endpoint = `/games/${id}?key=${RAWG_API_KEY}`;
    if (action === "suggested") endpoint = `/games/${id}/suggested?key=${RAWG_API_KEY}&page_size=5`;

    if (!endpoint) {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
    }

    const response = await fetch(`https://api.rawg.io/api${endpoint}`);
    const payload = await response.json();

    cache.set(cacheKey, { expiresAt: Date.now() + 1000 * 60 * 15, payload });
    return new Response(JSON.stringify(payload), { headers: corsHeaders, status: response.status });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: corsHeaders });
  }
});
