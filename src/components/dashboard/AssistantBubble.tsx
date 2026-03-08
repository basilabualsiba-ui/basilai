import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, Sparkles, ChevronDown, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, startOfWeek, subMonths, subDays } from "date-fns";

type Role = "user" | "assistant";

interface Msg {
  id: string;
  role: Role;
  content: string;
  needs_clarification?: boolean;
  clarification_type?: "time";
  reply_chips?: string[];
}

interface TimePeriod {
  from: string | null; // ISO date string yyyy-MM-dd
  to: string | null;
  label: string;
}

interface SubcategoryRef {
  id: string;
  name: string;
  category_id: string;
}

interface CategoryRef {
  id: string;
  name: string;
}

// ─── Suggestion groups ──────────────────────────────────────────────────────
const SUGGESTION_GROUPS = [
  {
    label: "💰 مصاريف",
    items: [
      "كم صرفت هاد الشهر؟",
      "وين أكثر مكان صرفت فيه هالشهر؟",
      "كم صرفت بالطلعات هالشهر؟",
      "كم صرفت اليوم؟",
      "كم صرفت مبارح؟",
      "قارن مصاريفي هالشهر مع الشهر الفائت",
    ],
  },
  {
    label: "📊 تحليل",
    items: [
      "شو أغلى شهر عندي؟",
      "كم معدل صرفي اليومي؟",
      "شو الصافي هالشهر؟",
      "كم رصيدي بالحسابات؟",
      "أكثر فئة صرفت عليها هالشهر؟",
      "كم دخلي هاد الشهر؟",
    ],
  },
  {
    label: "💪 صحة وجيم",
    items: [
      "شو وزني هلق؟",
      "كم مرة اشتغلت هاد الشهر؟",
      "كم مرة اشتغلت هالأسبوع؟",
      "متى آخر تمرين؟",
      "شو كمالاتي اليومية؟",
    ],
  },
  {
    label: "🎮 ترفيه",
    items: [
      "شو بتشاهد هلق؟",
      "شو أحسن فيلم شفته؟",
      "كم لعبة عندي؟",
      "كم فيلم ومسلسل عندي؟",
    ],
  },
  {
    label: "🕌 صلاة وأحلام",
    items: [
      "كم صلاة صليت هاد الشهر؟",
      "كم مرة صليت الفجر هالأسبوع؟",
      "شو عندي اليوم بالجدول؟",
      "شو أحلامي النشطة؟",
    ],
  },
];

const TIME_CHIPS = ["هالشهر", "هالأسبوع", "الشهر الفائت", "هالسنة", "من البداية", "اليوم", "مبارح"];

// ─── Time period detection ──────────────────────────────────────────────────
function detectTimePeriod(text: string): { period: TimePeriod | null; cleaned: string } {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const patterns: { re: RegExp; build: () => TimePeriod }[] = [
    {
      re: /هال(شهر|شهري)|هاد الشهر|هاذ الشهر/,
      build: () => ({ from: format(startOfMonth(today), "yyyy-MM-dd"), to: todayStr, label: "هالشهر" }),
    },
    {
      re: /هال(أسبوع|اسبوع)|هاد الأسبوع|هاد الاسبوع|هاذ الأسبوع/,
      build: () => ({ from: format(startOfWeek(today, { weekStartsOn: 6 }), "yyyy-MM-dd"), to: todayStr, label: "هالأسبوع" }),
    },
    {
      re: /(الشهر الفائت|الشهر الماضي|الشهر اللي قبل|الشهر اللي فات)/,
      build: () => {
        const prev = subMonths(today, 1);
        return { from: format(startOfMonth(prev), "yyyy-MM-dd"), to: format(startOfMonth(today), "yyyy-MM-dd"), label: "الشهر الفائت" };
      },
    },
    {
      re: /من البداي[ةه]|من أول|من اول/,
      build: () => ({ from: null, to: null, label: "من البداية" }),
    },
    {
      re: /\bاليوم\b|هاد اليوم|هاذ اليوم/,
      build: () => ({ from: todayStr, to: todayStr, label: "اليوم" }),
    },
    {
      re: /مبارح|أمس|امس|إمبارح|امبارح/,
      build: () => {
        const y = format(subDays(today, 1), "yyyy-MM-dd");
        return { from: y, to: y, label: "مبارح" };
      },
    },
    {
      re: /هالسنة|هاد السنة|هاذ السنة|السنة هاي/,
      build: () => ({ from: format(new Date(today.getFullYear(), 0, 1), "yyyy-MM-dd"), to: todayStr, label: "هالسنة" }),
    },
  ];

  for (const p of patterns) {
    if (p.re.test(text)) {
      const cleaned = text.replace(p.re, "").replace(/[؟?!\.]/g, "").trim();
      return { period: p.build(), cleaned };
    }
  }
  return { period: null, cleaned: text.replace(/[؟?!\.]/g, "").trim() };
}

// ─── Number formatting ──────────────────────────────────────────────────────
function fmtNum(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// ─── Intent matching engine ─────────────────────────────────────────────────
type IntentHandler = (period: TimePeriod | null, matchedName?: string) => Promise<string>;

interface IntentDef {
  id: string;
  keywords: string[];
  needsTime: boolean;
  handler: IntentHandler;
  priority: number; // higher = checked first
}

function buildIntents(categories: CategoryRef[], subcategories: SubcategoryRef[]): IntentDef[] {
  const catMap = new Map(categories.map(c => [c.id, c.name]));

  // Helper: build date filter for supabase query
  const dateFilter = (query: any, period: TimePeriod | null, col = "date") => {
    if (!period) return query;
    if (period.from) query = query.gte(col, period.from);
    if (period.to) query = query.lte(col, period.to);
    return query;
  };

  const intents: IntentDef[] = [];

  // ── TOP SPENDING PLACES ───────────────────────────────────────────────────
  intents.push({
    id: "top_spending_places",
    keywords: ["أكثر مكان", "وين صرفت", "وين أكثر", "أكثر مكان صرفت", "اكثر مكان"],
    needsTime: true,
    priority: 90,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount, subcategory_id, subcategories(name)").eq("type", "expense").not("subcategory_id", "is", null);
      q = dateFilter(q, period);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في مصاريف بهالفترة 📭";

      const byPlace = new Map<string, number>();
      for (const t of data) {
        const name = (t as any).subcategories?.name || "غير محدد";
        byPlace.set(name, (byPlace.get(name) || 0) + Number(t.amount));
      }
      const sorted = [...byPlace.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
      const periodLabel = period?.label || "من البداية";
      const lines = sorted.map((s, i) => `${i + 1}. ${s[0]}: ${fmtNum(s[1])} ₪`);
      return `📍 أكثر الأماكن صرف ${periodLabel}:\n${lines.join("\n")}`;
    },
  });

  // ── TOP SPENDING CATEGORIES ───────────────────────────────────────────────
  intents.push({
    id: "top_spending_categories",
    keywords: ["أكثر فئة", "أكثر فئات", "اكثر فئة", "فئات المصاريف"],
    needsTime: true,
    priority: 85,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount, category_id, categories(name)").eq("type", "expense").not("category_id", "is", null);
      q = dateFilter(q, period);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في مصاريف بهالفترة 📭";

      const byCat = new Map<string, number>();
      for (const t of data) {
        const name = (t as any).categories?.name || "غير محدد";
        byCat.set(name, (byCat.get(name) || 0) + Number(t.amount));
      }
      const sorted = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
      const periodLabel = period?.label || "من البداية";
      const lines = sorted.map((s, i) => `${i + 1}. ${s[0]}: ${fmtNum(s[1])} ₪`);
      return `📊 أكثر الفئات صرف ${periodLabel}:\n${lines.join("\n")}`;
    },
  });

  // ── TOTAL SPENDING ────────────────────────────────────────────────────────
  intents.push({
    id: "total_spending",
    keywords: ["كم صرفت", "مجموع مصاريف", "مجموع صرف", "كيف مصاريفي", "مصاريف"],
    needsTime: true,
    priority: 50,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount").eq("type", "expense");
      q = dateFilter(q, period);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في مصاريف بهالفترة 📭";
      const total = data.reduce((s, t) => s + Number(t.amount), 0);
      const periodLabel = period?.label || "من البداية";
      return `💰 مجموع مصاريفك ${periodLabel}: ${fmtNum(total)} ₪`;
    },
  });

  // ── DAILY AVERAGE ─────────────────────────────────────────────────────────
  intents.push({
    id: "daily_average",
    keywords: ["معدل يومي", "معدل صرف", "المعدل اليومي"],
    needsTime: true,
    priority: 80,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount, date").eq("type", "expense");
      q = dateFilter(q, period);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في مصاريف بهالفترة 📭";
      const total = data.reduce((s, t) => s + Number(t.amount), 0);
      const days = new Set(data.map(t => t.date)).size;
      return `📊 معدل صرفك اليومي: ${fmtNum(total / days)} ₪ (${days} يوم، مجموع ${fmtNum(total)} ₪)`;
    },
  });

  // ── MONTHLY COMPARISON ────────────────────────────────────────────────────
  intents.push({
    id: "monthly_comparison",
    keywords: ["قارن", "مقارنة", "مقارن"],
    needsTime: false,
    priority: 82,
    handler: async () => {
      const today = new Date();
      const thisMonthFrom = format(startOfMonth(today), "yyyy-MM-dd");
      const todayStr = format(today, "yyyy-MM-dd");
      const prevMonthStart = format(startOfMonth(subMonths(today, 1)), "yyyy-MM-dd");

      const [curr, prev] = await Promise.all([
        supabase.from("transactions").select("amount").eq("type", "expense").gte("date", thisMonthFrom).lte("date", todayStr).limit(1000),
        supabase.from("transactions").select("amount").eq("type", "expense").gte("date", prevMonthStart).lt("date", thisMonthFrom).limit(1000),
      ]);

      const currTotal = (curr.data || []).reduce((s, t) => s + Number(t.amount), 0);
      const prevTotal = (prev.data || []).reduce((s, t) => s + Number(t.amount), 0);
      const diff = currTotal - prevTotal;
      const pct = prevTotal > 0 ? ((diff / prevTotal) * 100).toFixed(1) : "∞";
      const arrow = diff > 0 ? "📈 زيادة" : diff < 0 ? "📉 نقصان" : "↔️ نفس الشي";

      return `📊 مقارنة الشهور:\nالشهر الحالي: ${fmtNum(currTotal)} ₪\nالشهر الفائت: ${fmtNum(prevTotal)} ₪\n${arrow} بنسبة ${pct}% (${fmtNum(Math.abs(diff))} ₪)`;
    },
  });

  // ── MOST EXPENSIVE MONTH ──────────────────────────────────────────────────
  intents.push({
    id: "most_expensive_month",
    keywords: ["أغلى شهر", "اغلى شهر"],
    needsTime: false,
    priority: 83,
    handler: async () => {
      const { data } = await supabase.from("transactions").select("amount, date").eq("type", "expense").limit(1000);
      if (!data || data.length === 0) return "ما في بيانات مصاريف بعد 📭";
      const byMonth = new Map<string, number>();
      for (const t of data) {
        const key = t.date.substring(0, 7); // yyyy-MM
        byMonth.set(key, (byMonth.get(key) || 0) + Number(t.amount));
      }
      const sorted = [...byMonth.entries()].sort((a, b) => b[1] - a[1]);
      const top = sorted[0];
      const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
      const [y, m] = top[0].split("-");
      return `📅 أغلى شهر: ${monthNames[parseInt(m) - 1]} ${y} بمبلغ ${fmtNum(top[1])} ₪`;
    },
  });

  // ── SPENDING AT SPECIFIC PLACE (dynamic subcategories) ────────────────────
  for (const sub of subcategories) {
    intents.push({
      id: `spending_at_${sub.id}`,
      keywords: [sub.name.toLowerCase()],
      needsTime: true,
      priority: 70,
      handler: async (period) => {
        let q = supabase.from("transactions").select("amount, date").eq("type", "expense").eq("subcategory_id", sub.id);
        q = dateFilter(q, period);
        const { data } = await q.limit(1000);
        if (!data || data.length === 0) return `ما في مصاريف ع ${sub.name} بهالفترة 📭`;
        const total = data.reduce((s, t) => s + Number(t.amount), 0);
        const count = data.length;
        const periodLabel = period?.label || "من البداية";
        return `💳 صرفت ع ${sub.name} ${periodLabel}: ${fmtNum(total)} ₪ (${count} مرة)`;
      },
    });
  }

  // ── SPENDING BY SPECIFIC CATEGORY (dynamic categories) ────────────────────
  for (const cat of categories) {
    intents.push({
      id: `spending_cat_${cat.id}`,
      keywords: [cat.name.toLowerCase()],
      needsTime: true,
      priority: 60,
      handler: async (period) => {
        let q = supabase.from("transactions").select("amount, date").eq("type", "expense").eq("category_id", cat.id);
        q = dateFilter(q, period);
        const { data } = await q.limit(1000);
        if (!data || data.length === 0) return `ما في مصاريف بفئة ${cat.name} بهالفترة 📭`;
        const total = data.reduce((s, t) => s + Number(t.amount), 0);
        const count = data.length;
        const periodLabel = period?.label || "من البداية";
        return `📁 مصاريف ${cat.name} ${periodLabel}: ${fmtNum(total)} ₪ (${count} معاملة)`;
      },
    });
  }

  // ── CURRENT WEIGHT ────────────────────────────────────────────────────────
  intents.push({
    id: "current_weight",
    keywords: ["وزني", "وزن", "كيلو", "الوزن"],
    needsTime: false,
    priority: 75,
    handler: async () => {
      const { data } = await supabase.from("user_body_stats").select("weight, recorded_at").order("recorded_at", { ascending: false }).limit(5);
      if (!data || data.length === 0) return "ما في بيانات وزن بعد ⚖️";
      const latest = data[0];
      let trend = "";
      if (data.length >= 2) {
        const diff = Number(latest.weight) - Number(data[1].weight);
        trend = diff > 0 ? `\n📈 زيادة ${fmtNum(Math.abs(diff))} كغ عن القراءة السابقة` :
                diff < 0 ? `\n📉 نقصان ${fmtNum(Math.abs(diff))} كغ عن القراءة السابقة` :
                "\n↔️ ثابت مقارنة بالقراءة السابقة";
      }
      return `⚖️ وزنك الحالي: ${fmtNum(Number(latest.weight))} كغ\n📅 آخر قياس: ${format(new Date(latest.recorded_at), "yyyy-MM-dd")}${trend}`;
    },
  });

  // ── WORKOUTS COUNT ────────────────────────────────────────────────────────
  intents.push({
    id: "workouts_count",
    keywords: ["كم مرة اشتغلت", "تمرين", "تمارين", "جيم", "كم تمرين"],
    needsTime: true,
    priority: 74,
    handler: async (period) => {
      let q = supabase.from("workout_sessions").select("id, scheduled_date").not("completed_at", "is", null);
      if (period?.from) q = q.gte("scheduled_date", period.from);
      if (period?.to) q = q.lte("scheduled_date", period.to);
      const { data } = await q.limit(1000);
      const count = data?.length || 0;
      const periodLabel = period?.label || "من البداية";
      return count > 0
        ? `💪 اشتغلت ${count} تمرين ${periodLabel}`
        : `ما اشتغلت ولا تمرين ${periodLabel} 😅`;
    },
  });

  // ── LAST WORKOUT ──────────────────────────────────────────────────────────
  intents.push({
    id: "last_workout",
    keywords: ["آخر تمرين", "اخر تمرين", "متى آخر", "متى اخر"],
    needsTime: false,
    priority: 76,
    handler: async () => {
      const { data } = await supabase.from("workout_sessions").select("scheduled_date, muscle_groups, total_duration_minutes").not("completed_at", "is", null).order("scheduled_date", { ascending: false }).limit(1);
      if (!data || data.length === 0) return "ما في تمارين مسجلة بعد 🏋️";
      const s = data[0];
      const muscles = s.muscle_groups?.join("، ") || "غير محدد";
      const dur = s.total_duration_minutes ? `${s.total_duration_minutes} دقيقة` : "";
      return `🏋️ آخر تمرين: ${s.scheduled_date}\nعضلات: ${muscles}${dur ? `\nمدة: ${dur}` : ""}`;
    },
  });

  // ── SUPPLEMENTS TODAY ─────────────────────────────────────────────────────
  intents.push({
    id: "supplements_today",
    keywords: ["كمالات", "مكملات", "كمالاتي", "مكمل"],
    needsTime: false,
    priority: 73,
    handler: async () => {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const { data: logs } = await supabase.from("supplement_logs").select("supplement_id, doses_taken, supplements(name)").eq("logged_date", todayStr);
      const { data: allSupps } = await supabase.from("supplements").select("id, name");
      if (!allSupps || allSupps.length === 0) return "ما في مكملات مسجلة بعد 💊";

      const takenIds = new Set((logs || []).map(l => l.supplement_id));
      const lines: string[] = [];
      for (const s of allSupps) {
        const log = (logs || []).find(l => l.supplement_id === s.id);
        if (log) {
          lines.push(`✅ ${s.name}: ${log.doses_taken} جرعة`);
        } else {
          lines.push(`⬜ ${s.name}: لسا ما أخذت`);
        }
      }
      return `💊 كمالاتك اليوم:\n${lines.join("\n")}`;
    },
  });

  // ── WATCHING NOW ──────────────────────────────────────────────────────────
  intents.push({
    id: "watching_now",
    keywords: ["بتشاهد", "بشاهد", "مسلسل", "مسلسلات"],
    needsTime: false,
    priority: 72,
    handler: async () => {
      const { data } = await supabase.from("media").select("title, type, rating").eq("status", "watching");
      if (!data || data.length === 0) return "ما في شي بتشاهده حاليًا 📺";
      const lines = data.map(m => `📺 ${m.title} (${m.type === "movie" ? "فيلم" : "مسلسل"})${m.rating ? ` ⭐ ${m.rating}` : ""}`);
      return `بتشاهد حاليًا:\n${lines.join("\n")}`;
    },
  });

  // ── BEST MOVIE ────────────────────────────────────────────────────────────
  intents.push({
    id: "best_movie",
    keywords: ["أحسن فيلم", "احسن فيلم", "أعلى فيلم"],
    needsTime: false,
    priority: 71,
    handler: async () => {
      const { data } = await supabase.from("media").select("title, user_rating, rating").eq("type", "movie").not("user_rating", "is", null).order("user_rating", { ascending: false }).limit(3);
      if (!data || data.length === 0) return "ما قيّمت أي فيلم بعد 🎬";
      const lines = data.map((m, i) => `${i + 1}. ${m.title} — ⭐ ${m.user_rating}/10`);
      return `🎬 أحسن أفلامك:\n${lines.join("\n")}`;
    },
  });

  // ── TOP GAME ──────────────────────────────────────────────────────────────
  intents.push({
    id: "top_game",
    keywords: ["أعلى لعبة", "اعلى لعبة", "أحسن لعبة", "احسن لعبة"],
    needsTime: false,
    priority: 71,
    handler: async () => {
      const { data } = await supabase.from("games").select("name, rating, platform").not("rating", "is", null).order("rating", { ascending: false }).limit(3);
      if (!data || data.length === 0) return "ما قيّمت أي لعبة بعد 🎮";
      const lines = data.map((g, i) => `${i + 1}. ${g.name} (${g.platform}) — ⭐ ${g.rating}`);
      return `🎮 أعلى ألعابك:\n${lines.join("\n")}`;
    },
  });

  // ── ACTIVE DREAMS ─────────────────────────────────────────────────────────
  intents.push({
    id: "active_dreams",
    keywords: ["أحلام", "احلام", "أحلامي", "احلامي"],
    needsTime: false,
    priority: 70,
    handler: async () => {
      const { data } = await supabase.from("dreams").select("title, progress_percentage, target_date").eq("status", "in_progress");
      if (!data || data.length === 0) return "ما في أحلام نشطة حاليًا 🌟";
      const lines = data.map(d => `🌟 ${d.title} — ${d.progress_percentage || 0}%${d.target_date ? ` (هدف: ${d.target_date})` : ""}`);
      return `أحلامك النشطة:\n${lines.join("\n")}`;
    },
  });

  // ── PRAYER COUNT ──────────────────────────────────────────────────────────
  intents.push({
    id: "prayer_count",
    keywords: ["كم صلاة", "كم صليت", "صلوات", "نسبة إتمام", "نسبة اتمام", "نسبة الصلوات"],
    needsTime: true,
    priority: 74,
    handler: async (period) => {
      let q = supabase.from("prayer_completions").select("id, prayer_name, completion_date");
      if (period?.from) q = q.gte("completion_date", period.from);
      if (period?.to) q = q.lte("completion_date", period.to);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في صلوات مسجلة بهالفترة 🕌";
      const total = data.length;
      const days = new Set(data.map(d => d.completion_date)).size;
      const periodLabel = period?.label || "من البداية";
      return `🕌 صليت ${total} صلاة ${periodLabel} (${days} يوم)\nمعدل: ${fmtNum(total / days)} صلاة/يوم`;
    },
  });

  // ── FAJR COUNT ────────────────────────────────────────────────────────────
  intents.push({
    id: "fajr_count",
    keywords: ["فجر", "صلاة الفجر"],
    needsTime: true,
    priority: 78,
    handler: async (period) => {
      let q = supabase.from("prayer_completions").select("id, completion_date").eq("prayer_name", "fajr");
      if (period?.from) q = q.gte("completion_date", period.from);
      if (period?.to) q = q.lte("completion_date", period.to);
      const { data } = await q.limit(1000);
      const count = data?.length || 0;
      const periodLabel = period?.label || "من البداية";
      return count > 0
        ? `🌅 صليت الفجر ${count} مرة ${periodLabel}`
        : `ما سجلت أي فجر ${periodLabel} 🌅`;
    },
  });

  // ── TOTAL INCOME ───────────────────────────────────────────────────────────
  intents.push({
    id: "total_income",
    keywords: ["كم دخلي", "دخل", "إيرادات", "ايرادات", "راتب", "مصروف"],
    needsTime: true,
    priority: 65,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount").eq("type", "income");
      q = dateFilter(q, period);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في دخل مسجل بهالفترة 📭";
      const total = data.reduce((s, t) => s + Number(t.amount), 0);
      const periodLabel = period?.label || "من البداية";
      return `💵 مجموع دخلك ${periodLabel}: ${fmtNum(total)} ₪`;
    },
  });

  // ── NET BALANCE (Income - Expenses) ───────────────────────────────────────
  intents.push({
    id: "net_balance",
    keywords: ["صافي", "الصافي", "دخل مقابل مصاريف", "ربح", "خسارة"],
    needsTime: true,
    priority: 66,
    handler: async (period) => {
      let qInc = supabase.from("transactions").select("amount").eq("type", "income");
      let qExp = supabase.from("transactions").select("amount").eq("type", "expense");
      qInc = dateFilter(qInc, period);
      qExp = dateFilter(qExp, period);
      const [inc, exp] = await Promise.all([qInc.limit(1000), qExp.limit(1000)]);
      const totalInc = (inc.data || []).reduce((s, t) => s + Number(t.amount), 0);
      const totalExp = (exp.data || []).reduce((s, t) => s + Number(t.amount), 0);
      const net = totalInc - totalExp;
      const periodLabel = period?.label || "من البداية";
      const emoji = net >= 0 ? "📈" : "📉";
      return `${emoji} الصافي ${periodLabel}:\n💵 دخل: ${fmtNum(totalInc)} ₪\n💳 مصاريف: ${fmtNum(totalExp)} ₪\n${net >= 0 ? "✅" : "⚠️"} صافي: ${fmtNum(net)} ₪`;
    },
  });

  // ── ACCOUNT BALANCES ──────────────────────────────────────────────────────
  intents.push({
    id: "account_balances",
    keywords: ["رصيدي", "رصيد", "حساباتي", "حسابات", "كم معي", "كم عندي فلوس"],
    needsTime: false,
    priority: 68,
    handler: async () => {
      const { data } = await supabase.from("accounts").select("name, amount, currency, icon");
      if (!data || data.length === 0) return "ما في حسابات مسجلة بعد 🏦";
      const total = data.reduce((s, a) => s + Number(a.amount), 0);
      const lines = data.map(a => `${a.icon || "💰"} ${a.name}: ${fmtNum(Number(a.amount))} ${a.currency}`);
      return `🏦 حساباتك:\n${lines.join("\n")}\n\n💰 المجموع: ${fmtNum(total)} ₪`;
    },
  });

  // ── GAMES COUNT ───────────────────────────────────────────────────────────
  intents.push({
    id: "games_count",
    keywords: ["كم لعبة", "عدد ألعاب", "عدد العاب", "ألعابي", "العابي"],
    needsTime: false,
    priority: 67,
    handler: async () => {
      const { data } = await supabase.from("games").select("name, platform, rating").order("rating", { ascending: false });
      if (!data || data.length === 0) return "ما في ألعاب مسجلة بعد 🎮";
      const totalSpent = data.reduce((s, g) => s + (Number((g as any).user_price_ils) || 0), 0);
      return `🎮 عندك ${data.length} لعبة\n📊 أعلى: ${data[0].name}${data[0].rating ? ` (⭐ ${data[0].rating})` : ""}`;
    },
  });

  // ── MEDIA COUNT (movies + series) ─────────────────────────────────────────
  intents.push({
    id: "media_count",
    keywords: ["كم فيلم", "كم مسلسل", "عدد أفلام", "عدد مسلسلات", "أفلامي", "افلامي", "مسلسلاتي"],
    needsTime: false,
    priority: 67,
    handler: async () => {
      const { data } = await supabase.from("media").select("type, status");
      if (!data || data.length === 0) return "ما في أفلام أو مسلسلات مسجلة بعد 📺";
      const movies = data.filter(m => m.type === "movie");
      const series = data.filter(m => m.type === "tv");
      const watching = data.filter(m => m.status === "watching").length;
      const completed = data.filter(m => m.status === "completed").length;
      return `📺 مكتبتك:\n🎬 ${movies.length} فيلم\n📺 ${series.length} مسلسل\n▶️ بتشاهد: ${watching}\n✅ خلصت: ${completed}`;
    },
  });

  // ── SCHEDULE TODAY ────────────────────────────────────────────────────────
  intents.push({
    id: "schedule_today",
    keywords: ["جدولي", "برنامجي", "مواعيد", "جدول اليوم", "شو عندي اليوم"],
    needsTime: false,
    priority: 69,
    handler: async () => {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const dayOfWeek = new Date().getDay() || 7; // 1-7
      const { data } = await supabase.from("daily_activities").select("title, start_time, end_time, is_completed, is_recurring, days_of_week").or(`date.eq.${todayStr},and(is_recurring.eq.true)`);
      if (!data || data.length === 0) return "ما عندك شي بالجدول اليوم 📋";
      const todayItems = data.filter(a => {
        if (!a.is_recurring) return true;
        return a.days_of_week?.includes(dayOfWeek);
      });
      if (todayItems.length === 0) return "ما عندك شي بالجدول اليوم 📋";
      const lines = todayItems.map(a => {
        const time = a.start_time ? a.start_time.substring(0, 5) : "";
        const status = a.is_completed ? "✅" : "⬜";
        return `${status} ${time ? time + " " : ""}${a.title}`;
      });
      return `📋 جدولك اليوم:\n${lines.join("\n")}`;
    },
  });

  // Sort by priority descending
  intents.sort((a, b) => b.priority - a.priority);
  return intents;
}

// ─── Match intent from text ─────────────────────────────────────────────────
function matchIntent(text: string, intents: IntentDef[]): IntentDef | null {
  const lower = text.toLowerCase().trim();
  for (const intent of intents) {
    for (const kw of intent.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return intent;
      }
    }
  }
  return null;
}

// ─── Typing dots ────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="w-2 h-2 rounded-full bg-yellow-400/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

// ─── Message bubble ─────────────────────────────────────────────────────────
function MsgBubble({ msg, onChipClick }: { msg: Msg; onChipClick: (text: string) => void }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[78%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm text-white font-medium" style={{ background: "linear-gradient(135deg,#c8a84b,#a07830)" }}>
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start mb-3 gap-2 max-w-[88%]">
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-white/90 leading-relaxed w-full" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
        {msg.content.split("\n").map((line, i) => (
          <p key={i} className={i > 0 ? "mt-1" : ""}>{line}</p>
        ))}
      </div>

      {msg.needs_clarification && msg.clarification_type === "time" && (
        <div className="flex flex-wrap gap-1.5">
          {TIME_CHIPS.map((chip) => (
            <button key={chip} onClick={() => onChipClick(chip)} className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full font-medium transition-all active:scale-95 hover:brightness-110" style={{ background: "rgba(200,168,75,0.12)", border: "1px solid rgba(200,168,75,0.35)", color: "#c8a84b" }}>
              <Clock className="h-2.5 w-2.5" />
              {chip}
            </button>
          ))}
        </div>
      )}

      {msg.reply_chips && msg.reply_chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {msg.reply_chips.map((chip) => (
            <button key={chip} onClick={() => onChipClick(chip)} className="text-[11px] px-3 py-1.5 rounded-full font-medium transition-all active:scale-95 hover:brightness-110" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.65)" }}>
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export function AssistantBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "مرحبا! أنا Basilix 🧠\nاسألني عن مصاريفك، وزنك، تمارينك، أحلامك، ألعابك، مسلسلاتك!",
      reply_chips: ["كم صرفت هالشهر؟", "شو وزني هلق؟", "شو بتشاهد هلق؟"],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [pulse, setPulse] = useState(true);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [intents, setIntents] = useState<IntentDef[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load categories + subcategories on mount to build dynamic intents
  useEffect(() => {
    (async () => {
      const [catRes, subRes] = await Promise.all([
        supabase.from("categories").select("id, name"),
        supabase.from("subcategories").select("id, name, category_id"),
      ]);
      const cats: CategoryRef[] = catRes.data || [];
      const subs: SubcategoryRef[] = subRes.data || [];
      setIntents(buildIntents(cats, subs));
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setPulse(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const newId = () => Date.now().toString() + Math.random().toString(36).slice(2);
  const addMsg = (msg: Omit<Msg, "id">) => setMessages((prev) => [...prev, { ...msg, id: newId() }]);

  // ── Core: process question locally ──────────────────────────────────────
  const processQuestion = useCallback(async (text: string, forcedPeriod?: TimePeriod) => {
    const { period: detectedPeriod, cleaned } = detectTimePeriod(text);
    const period = forcedPeriod || detectedPeriod;
    const textForMatch = cleaned || text;

    // Try to match an intent
    const intent = matchIntent(textForMatch, intents);

    if (intent) {
      // If intent needs time and none provided, ask for clarification
      if (intent.needsTime && !period) {
        setPendingQuestion(text);
        return {
          content: "لأي فترة بدك تعرف؟ 📅",
          needs_clarification: true,
          clarification_type: "time" as const,
        };
      }
      const reply = await intent.handler(period, undefined);
      return { content: reply };
    }

    // Fallback: search assistant_memory
    const { data: memories } = await supabase.from("assistant_memory").select("teaching, question").limit(50);
    if (memories && memories.length > 0) {
      const words = textForMatch.split(/\s+/).filter(w => w.length > 2);
      let bestMatch: { teaching: string; score: number } | null = null;
      for (const mem of memories) {
        const memWords = `${mem.question} ${mem.teaching}`.toLowerCase();
        const score = words.filter(w => memWords.includes(w.toLowerCase())).length;
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { teaching: mem.teaching, score };
        }
      }
      if (bestMatch && bestMatch.score >= 2) {
        return { content: bestMatch.teaching };
      }
    }

    return { content: "ما عندي جواب لهالسؤال بعد 🤔\nجرب تسأل بطريقة ثانية أو اختار من الأسئلة المقترحة!" };
  }, [intents]);

  const callAssistant = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const trimmed = text.trim();
    setInput("");
    setShowSuggestions(false);
    addMsg({ role: "user", content: trimmed });
    setLoading(true);

    try {
      const result = await processQuestion(trimmed);
      addMsg({
        role: "assistant",
        content: result.content,
        needs_clarification: result.needs_clarification,
        clarification_type: result.clarification_type,
      });
    } catch (err) {
      console.error("Assistant error:", err);
      addMsg({ role: "assistant", content: "صار خطأ، جرب مرة ثانية 😕" });
    } finally {
      setLoading(false);
    }
  }, [loading, processQuestion]);

  // ── Chip click: for time clarification, re-run with original question + time period ──
  const handleChipClick = useCallback(async (chip: string) => {
    // Check if this is a time chip for a pending question
    if (pendingQuestion && TIME_CHIPS.includes(chip)) {
      addMsg({ role: "user", content: chip });
      setLoading(true);
      setPendingQuestion(null);

      try {
        // Parse the time period from the chip
        const { period } = detectTimePeriod(chip);
        // Re-run the original question with the forced time period
        const result = await processQuestion(pendingQuestion, period || undefined);
        addMsg({
          role: "assistant",
          content: result.content,
          needs_clarification: result.needs_clarification,
          clarification_type: result.clarification_type,
        });
      } catch {
        addMsg({ role: "assistant", content: "صار خطأ، جرب مرة ثانية 😕" });
      } finally {
        setLoading(false);
      }
    } else {
      // Generic chip → send as new question
      callAssistant(chip);
    }
  }, [pendingQuestion, processQuestion, callAssistant]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      callAssistant(input);
    }
  };

  return (
    <>
      <style>{`
        @keyframes bubblePulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(200,168,75,0.55), 0 8px 32px rgba(200,168,75,0.3); }
          50%      { box-shadow: 0 0 0 16px rgba(200,168,75,0), 0 8px 32px rgba(200,168,75,0.25); }
        }
        .chat-scroll::-webkit-scrollbar { display: none; }
        .chat-scroll { scrollbar-width: none; }
      `}</style>

      {!open && (
        <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95" style={{ background: "linear-gradient(135deg,#c8a84b 0%,#8a5e1a 100%)", animation: pulse ? "bubblePulse 2.2s ease-in-out infinite" : "none", boxShadow: "0 8px 32px rgba(200,168,75,0.4)" }}>
          <Sparkles className="h-6 w-6 text-white" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col rounded-3xl overflow-hidden" style={{ width: "min(400px, calc(100vw - 24px))", height: "min(580px, calc(100vh - 80px))", background: "linear-gradient(160deg,#0d1f35 0%,#0a1628 100%)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 25px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(200,168,75,0.13)" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0" style={{ background: "linear-gradient(90deg,rgba(200,168,75,0.15) 0%,rgba(200,168,75,0.04) 100%)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#c8a84b,#8a5e1a)" }}>
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">Basilix</p>
                <p className="text-[10px] text-white/35">مساعدك الشخصي</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-1 chat-scroll">
            {messages.map((msg) => (
              <MsgBubble key={msg.id} msg={msg} onChipClick={handleChipClick} />
            ))}

            {showSuggestions && messages.length <= 1 && !loading && (
              <div className="mt-2">
                <div className="flex gap-1.5 mb-2.5 pb-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  {SUGGESTION_GROUPS.map((g, i) => (
                    <button key={g.label} onClick={() => setActiveGroup(i)} className="text-[10px] px-2.5 py-1 rounded-full flex-shrink-0 transition-all font-medium" style={{ background: activeGroup === i ? "rgba(200,168,75,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${activeGroup === i ? "rgba(200,168,75,0.4)" : "rgba(255,255,255,0.08)"}`, color: activeGroup === i ? "#c8a84b" : "rgba(255,255,255,0.4)" }}>
                      {g.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTION_GROUPS[activeGroup].items.map((s) => (
                    <button key={s} onClick={() => callAssistant(s)} className="text-[12px] px-3.5 py-2.5 rounded-xl text-right text-white/65 hover:text-white transition-all w-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="inline-block rounded-2xl rounded-tl-sm mb-2" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <TypingDots />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} placeholder="اسألني أي سؤال..." dir="auto" disabled={loading} className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none min-w-0" />
            <button onClick={() => callAssistant(input)} disabled={!input.trim() || loading} className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-30" style={{ background: "linear-gradient(135deg,#c8a84b,#8a5e1a)" }}>
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
