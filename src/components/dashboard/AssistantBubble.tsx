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
  clarification_type?: "time" | "account" | "confirm_expense";
  reply_chips?: string[];
}

interface TimePeriod {
  from: string | null;
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

interface PendingExpense {
  amount: number;
  category_id?: string;
  category_name?: string;
  subcategory_id?: string;
  subcategory_name?: string;
  account_id?: string;
  account_name?: string;
  description?: string;
}

// ─── Suggestion groups ──────────────────────────────────────────────────────
const SUGGESTION_GROUPS = [
  {
    label: "💰 مصاريف",
    items: [
      "كم صرفت هاد الشهر؟",
      "كم صرفت اليوم؟",
      "أديش صرفت هالأسبوع؟",
      "شو آخر اشي صرفتو؟",
      "شو صرفت اليوم؟",
      "شو آخر 5 معاملات؟",
      "شو أغلى معاملة هالشهر؟",
      "كم معاملة عملت هالشهر؟",
      "صرفت 50 على أكل",
      "أضف صرف",
      "مجموع مصاريفي هالشهر",
      "قديش صرفت هالسنة؟",
      "صرفت خمسين على حشاش",
      "سجلي وزني 67 كيلو",
      "من وين دخلي هالشهر؟",
    ],
  },
  {
    label: "📊 تحليل",
    items: [
      "شو أغلى شهر عندي؟",
      "كم معدل صرفي اليومي؟",
      "معدل صرفي الأسبوعي؟",
      "نسبة كل فئة من المصاريف هالشهر",
      "شو أكثر يوم صرفت فيه هالشهر؟",
      "كم مكان صرفت فيه هالشهر؟",
      "شو الحساب اللي أكثر صرفت منه؟",
      "شو الفئة اللي ما صرفت عليها هالشهر؟",
      "كم صرفت بالويكند هالشهر؟",
      "وين أكثر صرفت هالشهر؟",
      "توزيع مصاريفي هالشهر",
      "قارن المعدل اليومي مع الشهر الفائت",
      "قارن المعدل الأسبوعي مع الفائت",
      "كم المعدل حسب الفئات هالشهر؟",
      "شو أغلى يوم بالأسبوع؟",
      "مصاريفي رايحة لفوق ولا لتحت؟",
      "كم يوم ما صرفت هالشهر؟",
      "مصاريف يناير",
      "مصاريف أكتوبر",
    ],
  },
  {
    label: "🔄 مقارنات",
    items: [
      "قارن الأكل مع الطلعات هالشهر",
      "قارن مصاريف هالشهر مع الشهر الفائت",
      "قارن وزني الشهر الفائت مع هالشهر",
      "قارن تمارين هالشهر مع الفائت",
      "قارن صلواتي هالأسبوع مع الفائت",
      "قارن الأفلام مع المسلسلات",
    ],
  },
  {
    label: "💪 صحة",
    items: [
      "شو وزني هلق؟",
      "كم وزني الحالي؟",
      "سجلي وزني 67 كيلو",
      "كم مرة تمرنت هالشهر؟",
      "كم مرة رحت الجيم هالشهر؟",
      "شو آخر تدريب عملتو؟",
      "تفاصيل تمريني الأخير",
      "شو أكثر تمارين عملتها؟",
      "أثقل اشي رفعتو؟",
      "كم مجموع رفعاتي هالشهر؟",
      "كم تمرين عملت مع مدرب؟",
      "كم ساعة تمرين هالشهر؟",
      "شو أكثر عضلة اشتغلت عليها؟",
      "أقل وزن وصلتلو؟",
      "أعلى وزن وصلتلو؟",
      "شو آخر 3 أوزان سجلتها؟",
      "معدل مدة التمرين؟",
      "كم يوم متتالي تمرنت؟",
      "متى آخر مرة تمرنت؟",
    ],
  },
  {
    label: "💊 مكملات",
    items: [
      "شو كمالاتي اليومية؟",
      "شو أخذت اليوم؟",
      "شو المكمل اللي أكثر استخدمتو؟",
      "شو آخر مكمل أخذتو؟",
      "كم سكوب بروتين أخذت هالشهر؟",
      "كم يوم أخذت كمالات هالشهر؟",
      "متى آخر مرة أخذت مكمل؟",
    ],
  },
  {
    label: "🎬 ترفيه",
    items: [
      "شو بتشاهد هلق؟",
      "شو عم بشاهد؟",
      "كم فيلم شفت؟",
      "كم حلقة شفت؟",
      "شو آخر فيلم شفته؟",
      "شو أفلام بدي أشوفها؟",
      "شو المسلسل اللي أعلى تقييم؟",
      "اقترح فيلم أشوفه",
      "قارن الأفلام مع المسلسلات",
      "متى آخر مرة شفت فيلم؟",
    ],
  },
  {
    label: "🎮 ألعاب",
    items: [
      "كم لعبة عندي؟",
      "شو ألعابي؟",
      "كم صرفت على الألعاب؟",
      "كم لعبة PS5 عندي؟",
      "شو اللعبة اللي أكثر صرفت عليها؟",
    ],
  },
  {
    label: "🕌 صلاة",
    items: [
      "كم صلاة صليت هاد الشهر؟",
      "كم مرة صليت الفجر هالأسبوع؟",
      "كم مرة صليت الظهر هالشهر؟",
      "شو أكثر صلاة صليتها هالشهر؟",
      "كم يوم صليت فيه كل الصلوات هالشهر؟",
      "كم يوم متتالي صليت الفجر؟",
      "متى آخر مرة صليت الفجر؟",
    ],
  },
  {
    label: "🌟 أحلام",
    items: [
      "شو أحلامي؟",
      "شو أهدافي؟",
      "كم حلم حققت؟",
      "شو الحلم اللي أقرب للإكمال؟",
      "شو تقدم أحلامي؟",
      "كم خطوة باقي لأحقق أحلامي؟",
      "شو آخر حلم أضفتو؟",
    ],
  },
  {
    label: "📋 جدول",
    items: [
      "شو عندي اليوم بالجدول؟",
      "شو عندي بكرا بالجدول؟",
      "كم مهمة خلصت هالأسبوع؟",
      "ايش عندي اليوم؟",
    ],
  },
  {
    label: "📈 ملخصات",
    items: [
      "لخصلي الشهر",
      "عطيني ملخص هالشهر",
      "كم رصيدي بالحسابات؟",
      "كم فلوسي؟",
      "كم دخلي هاد الشهر؟",
      "شو الصافي هالشهر؟",
      "كم صرفت هالسنة؟",
    ],
  },
  {
    label: "⏰ متى آخر مرة",
    items: [
      "متى آخر مرة صرفت؟",
      "متى آخر مرة تمرنت؟",
      "متى آخر مرة صليت الفجر؟",
      "متى آخر مرة أخذت مكمل؟",
      "متى آخر مرة سجلت وزني؟",
      "متى آخر مرة شفت فيلم؟",
    ],
  },
];
const TIME_CHIPS = ["هالشهر", "هالأسبوع", "الشهر الفائت", "هالسنة", "من البداية", "اليوم", "مبارح"];
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

function iconToEmoji(icon: string): string {
  if (!icon) return "💰";
  if (icon.startsWith("http")) return `[img:${icon}]`;
  const map: Record<string, string> = {
    Wallet: "👛", PiggyBank: "🐷", CreditCard: "💳",
    Banknote: "💵", Building2: "🏢", Landmark: "🏛️",
    Car: "🚗", Home: "🏠", ShoppingCart: "🛒",
    Coffee: "☕", Gamepad2: "🎮", Gift: "🎁",
    Plane: "✈️", Music: "🎵", BookOpen: "📖", Camera: "📷",
  };
  return map[icon] || "💰";
}

// ─── Arabic number words → numeric ──────────────────────────────────────────
function arabicWordsToNumber(text: string): number | null {
  const t = text.trim();
  const hundreds: [RegExp, number][] = [
    [/خمسمي[هة]|خمسمئة/, 500], [/أربعمي[هة]|اربعمي[هة]|أربعمئة/, 400],
    [/ثلاثمي[هة]|ثلاثمئة/, 300], [/مئتين|ميتين/, 200],
    [/مي[هة]|مائة/, 100],
  ];
  const tens: [RegExp, number][] = [
    [/تسعين/, 90], [/ثمانين/, 80], [/سبعين/, 70], [/ستين/, 60],
    [/خمسين/, 50], [/أربعين|اربعين/, 40], [/ثلاثين/, 30], [/عشرين/, 20],
  ];
  const ones: [RegExp, number][] = [
    [/تسعة عشر/, 19], [/ثمانية عشر/, 18], [/سبعة عشر/, 17], [/ستة عشر/, 16],
    [/خمسة عشر/, 15], [/أربعة عشر|اربعة عشر/, 14], [/ثلاثة عشر/, 13],
    [/اثني عشر|اثنا عشر/, 12], [/أحد عشر/, 11], [/عشرة\b/, 10],
    [/تسعة/, 9], [/ثمانية/, 8], [/سبعة/, 7], [/ستة/, 6], [/خمسة/, 5],
    [/أربعة|اربعة/, 4], [/ثلاثة/, 3], [/اثنين|اثنان/, 2], [/واحد/, 1],
  ];
  let total = 0, found = false;
  for (const [re, v] of hundreds) { if (re.test(t)) { total += v; found = true; break; } }
  for (const [re, v] of tens)     { if (re.test(t)) { total += v; found = true; break; } }
  for (const [re, v] of ones)     { if (re.test(t)) { total += v; found = true; break; } }
  return found ? total : null;
}

// ─── Detect specific Arabic month name → TimePeriod ──────────────────────────
function detectMonthName(text: string): TimePeriod | null {
  const today = new Date();
  const months = [
    { re: /يناير|كانون الثاني/, m: 0, label: "يناير" },
    { re: /فبراير|شباط/, m: 1, label: "فبراير" },
    { re: /مارس|آذار|اذار/, m: 2, label: "مارس" },
    { re: /أبريل|ابريل|نيسان/, m: 3, label: "أبريل" },
    { re: /مايو|أيار|ايار/, m: 4, label: "مايو" },
    { re: /يونيو|حزيران/, m: 5, label: "يونيو" },
    { re: /يوليو|تموز/, m: 6, label: "يوليو" },
    { re: /أغسطس|اغسطس|آب/, m: 7, label: "أغسطس" },
    { re: /سبتمبر|أيلول/, m: 8, label: "سبتمبر" },
    { re: /أكتوبر|اكتوبر|تشرين الأول/, m: 9, label: "أكتوبر" },
    { re: /نوفمبر|تشرين الثاني/, m: 10, label: "نوفمبر" },
    { re: /ديسمبر|كانون الأول/, m: 11, label: "ديسمبر" },
  ];
  const yearMatch = text.match(/\b(202\d|203\d)\b/);
  for (const { re, m, label } of months) {
    if (re.test(text)) {
      let year = yearMatch ? parseInt(yearMatch[1]) : today.getFullYear();
      if (!yearMatch && m > today.getMonth()) year--;
      const from = format(new Date(year, m, 1), "yyyy-MM-dd");
      const lastDay = new Date(year, m + 1, 0);
      const isCurrent = m === today.getMonth() && year === today.getFullYear();
      const to = isCurrent ? format(today, "yyyy-MM-dd") : format(lastDay, "yyyy-MM-dd");
      return { from, to, label: `${label} ${year}` };
    }
  }
  return null;
}

// ─── Intent matching engine ─────────────────────────────────────────────────
type IntentHandler = (period: TimePeriod | null, matchedName?: string, originalText?: string) => Promise<string>;

interface IntentDef {
  id: string;
  keywords: string[];
  needsTime: boolean;
  handler: IntentHandler;
  priority: number; // higher = checked first
}

function buildIntents(categories: CategoryRef[], subcategories: SubcategoryRef[]): IntentDef[] {
  const catMap = new Map(categories.map(c => [c.id, c.name]));
  const allNames = [
    ...categories.map(c => ({ name: c.name.toLowerCase(), type: "cat" as const, id: c.id })),
    ...subcategories.map(s => ({ name: s.name.toLowerCase(), type: "sub" as const, id: s.id })),
  ];

  // Helper: build date filter for supabase query
  const dateFilter = (query: any, period: TimePeriod | null, col = "date") => {
    if (!period) return query;
    if (period.from) query = query.gte(col, period.from);
    if (period.to) query = query.lte(col, period.to);
    return query;
  };

  // Helper: find a category/subcategory name in text
  const findNamesInText = (text: string): { name: string; type: "cat" | "sub"; id: string }[] => {
    const lower = text.toLowerCase();
    // Sort by name length descending to match longest first
    const sorted = [...allNames].sort((a, b) => b.name.length - a.name.length);
    const found: { name: string; type: "cat" | "sub"; id: string; idx: number }[] = [];
    for (const item of sorted) {
      const idx = lower.indexOf(item.name);
      if (idx !== -1) {
        // Avoid overlapping matches
        const overlaps = found.some(f => Math.abs(f.idx - idx) < Math.max(f.name.length, item.name.length));
        if (!overlaps) {
          found.push({ ...item, idx });
        }
      }
    }
    return found.sort((a, b) => a.idx - b.idx);
  };

  const intents: IntentDef[] = [];

  // ── TOP SPENDING PLACES ───────────────────────────────────────────────────
  intents.push({
    id: "top_spending_places",
    keywords: ["أكثر مكان", "وين صرفت", "وين أكثر", "أكثر مكان صرفت", "اكثر مكان", "حسب الأماكن", "حسب الاماكن", "أكثر أماكن", "اكثر اماكن", "وين رحت صرفت", "أكثر الأماكن", "اكثر الاماكن"],
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
    keywords: ["أكثر فئة", "أكثر فئات", "اكثر فئة", "فئات المصاريف", "حسب الفئات", "حسب الفئة", "توزيع حسب الفئات", "أكثر الفئات", "اكثر الفئات"],
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
    keywords: ["كم صرفت", "مجموع مصاريف", "مجموع صرف", "كيف مصاريفي", "مصاريف", "مصاريفي", "اجمالي مصاريف", "قديش صرفت", "أديش صرفت", "كم مصاريفي", "مجموع الصرف"],
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
    keywords: ["معدل يومي", "معدل صرف", "المعدل اليومي", "معدل صرفي اليومي", "متوسط صرفي", "متوسط يومي", "كم المعدل اليومي", "المعدل باليوم", "بالمعدل كل يوم", "كم بصرف باليوم"],
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
    keywords: ["قارن", "مقارنة", "مقارن", "قارن المصاريف", "قارن الشهور", "قارن مع الشهر الفائت", "مقارنة شهرية"],
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

  // ── COMPARE TWO CATEGORIES/SUBCATEGORIES ────────────────────────────────
  intents.push({
    id: "compare_categories",
    keywords: ["قارن", "مقارنة", "مقابل", "مقارنة بين", "مقارنة ب"],
    needsTime: true,
    priority: 95,
    handler: async (period, _matchedName) => {
      // This handler gets the original cleaned text via a special flow
      return ""; // placeholder, real logic is in processQuestion
    },
  });

  // ── MOST EXPENSIVE MONTH ──────────────────────────────────────────────────
  intents.push({
    id: "most_expensive_month",
    keywords: ["أغلى شهر", "اغلى شهر", "أكثر شهر صرفت", "اكثر شهر صرفت"],
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
    keywords: ["وزني", "وزن", "كيلو", "الوزن", "كم وزني", "شو وزني", "وزني هلق", "وزني الحالي", "كم وزني هلق"],
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
    keywords: ["كم مرة اشتغلت", "تمرين", "تمارين", "جيم", "كم تمرين", "كم مرة تمرنت", "كم تمرين عملت", "كم مرة رحت الجيم", "كم يوم تمرنت"],
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
    keywords: ["آخر تمرين", "اخر تمرين"],
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
    keywords: ["كمالات", "مكملات", "كمالاتي", "مكمل", "كمالاتي اليوم", "شو أخذت اليوم", "مكملاتي اليومية", "شو اخذت اليوم"],
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
    keywords: ["بتشاهد", "بشاهد", "مسلسل", "مسلسلات", "شو عم بشاهد", "شو بشوف", "ايش بتابع", "شو بتابع"],
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
    keywords: ["أحلام", "احلام", "أحلامي", "احلامي", "أهدافي", "اهدافي", "طموحاتي"],
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
    keywords: ["كم صلاة", "كم صليت", "صلوات", "نسبة إتمام", "نسبة اتمام", "نسبة الصلوات", "كم صلاة صليت", "كم مرة صليت", "نسبة صلواتي"],
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
    keywords: ["فجر", "صلاة الفجر", "كم فجر صليت"],
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
    keywords: ["كم دخلي", "دخل", "إيرادات", "ايرادات", "راتب", "مصروف", "كم دخلت", "مجموع الدخل"],
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
    keywords: ["صافي", "الصافي", "دخل مقابل مصاريف", "ربح", "خسارة", "صافي الحساب", "كم باقي صافي"],
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
    keywords: ["رصيدي", "رصيد", "حساباتي", "حسابات", "كم معي", "كم عندي فلوس", "كم ضايل", "ضايل معي", "كم باقي معي", "كم فاضل", "باقي بالحساب", "كم فلوسي", "كم بالحساب"],
    needsTime: false,
    priority: 68,
    handler: async (_p: TimePeriod | undefined, _ctx: any, originalText?: string) => {
      const { data } = await supabase.from("accounts").select("name, amount, currency, icon");
      if (!data || data.length === 0) return "ما في حسابات مسجلة بعد 🏦";

      // Smart account matching with Arabic aliases
      const txt = (originalText || "").toLowerCase();
      
      // Arabic keyword → account name fragments mapping
      const aliases: [string[], string[]][] = [
        [["كاش", "نقد", "cash"], ["cash"]],
        [["شيكل", "شيقل", "ils"], ["ils"]],
        [["دولار", "dollar", "usd"], ["usd", "dollar"]],
        [["بنك عربي", "العربي", "arab"], ["arab"]],
        [["بنك وطني", "الوطني", "tnb"], ["tnb"]],
        [["بنك", "bank"], ["bank"]],
        [["درج", "drawer"], ["drawer"]],
        [["سلفة", "سلف", "lend"], ["lend"]],
        [["عملة قديمة", "old"], ["old"]],
      ];

      // Find which alias groups the user mentioned (order matters - check specific first)
      const matchedFragments: string[] = [];
      for (const [arabicKeys, engFragments] of aliases) {
        if (arabicKeys.some(k => txt.includes(k))) {
          matchedFragments.push(...engFragments);
        }
      }

      if (matchedFragments.length > 0) {
        const matched = data.filter(a => {
          const nameLow = a.name.toLowerCase();
          return matchedFragments.every(f => nameLow.includes(f));
        });
        // If no exact match on all fragments, try any fragment
        const results = matched.length > 0 ? matched : data.filter(a => {
          const nameLow = a.name.toLowerCase();
          return matchedFragments.some(f => nameLow.includes(f));
        });
        if (results.length === 1) {
          const acc = results[0];
          return `${iconToEmoji(acc.icon)} ${acc.name}: ${fmtNum(Number(acc.amount))} ${acc.currency}`;
        }
        if (results.length > 1) {
          const total = results.reduce((s, a) => s + Number(a.amount), 0);
          const lines = results.map(a => `${iconToEmoji(a.icon)} ${a.name}: ${fmtNum(Number(a.amount))} ${a.currency}`);
          return `🏦 الحسابات المطابقة:\n${lines.join("\n")}${results.length > 1 ? `\n\n💰 المجموع: ${fmtNum(total)} ₪` : ""}`;
        }
      }

      // Also try direct name match
      const directMatch = data.find(a => txt.includes(a.name.toLowerCase()));
      if (directMatch) {
        return `${iconToEmoji(directMatch.icon)} ${directMatch.name}: ${fmtNum(Number(directMatch.amount))} ${directMatch.currency}`;
      }

      const total = data.reduce((s, a) => s + Number(a.amount), 0);
      const lines = data.map(a => `${iconToEmoji(a.icon)} ${a.name}: ${fmtNum(Number(a.amount))} ${a.currency}`);
      return `🏦 حساباتك:\n${lines.join("\n")}\n\n💰 المجموع: ${fmtNum(total)} ₪`;
    },
  });

  // ── GAMES COUNT ───────────────────────────────────────────────────────────
  intents.push({
    id: "games_count",
    keywords: ["كم لعبة", "عدد ألعاب", "عدد العاب", "ألعابي", "العابي", "شو ألعابي", "ألعاب عندي"],
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
    keywords: ["كم فيلم", "كم مسلسل", "عدد أفلام", "عدد مسلسلات", "أفلامي", "افلامي", "مسلسلاتي", "كم شي شفت", "مكتبتي"],
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
    keywords: ["جدولي", "برنامجي", "مواعيد", "جدول اليوم", "شو عندي اليوم", "ايش عندي اليوم", "برنامج اليوم", "شو عندي"],
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

  // ── LAST TRANSACTION (general) ────────────────────────────────────────────
  intents.push({
    id: "last_transaction",
    keywords: ["آخر اشي صرفتو", "اخر اشي صرفتو", "آخر معاملة", "اخر معاملة", "آخر صرفة", "اخر صرفة", "آخر مصروف", "اخر مصروف", "آخر صرفة عملتها", "شو آخر مصروف", "آخر اشي دفعتو"],
    needsTime: false,
    priority: 88,
    handler: async () => {
      const { data } = await supabase.from("transactions").select("amount, date, time, description, type, account_id, category_id, subcategory_id, accounts(name), categories(name), subcategories(name)").eq("type", "expense").order("date", { ascending: false }).order("time", { ascending: false }).limit(1);
      if (!data || data.length === 0) return "ما في مصاريف مسجلة بعد 📭";
      const t = data[0] as any;
      const place = t.subcategories?.name || t.categories?.name || "غير محدد";
      const acc = t.accounts?.name || "";
      const desc = t.description || "";
      return `💳 آخر مصروف:\n💰 ${fmtNum(Number(t.amount))} ₪\n📍 ${place}${desc ? `\n📝 ${desc}` : ""}\n🏦 من: ${acc}\n📅 ${t.date}${t.time ? " " + t.time.substring(0, 5) : ""}`;
    },
  });

  // ── LAST TRANSACTION BY ACCOUNT ───────────────────────────────────────────
  intents.push({
    id: "last_transaction_by_account",
    keywords: ["آخر اشي صرفتو بال", "اخر اشي صرفتو بال", "آخر صرفة بال", "اخر صرفة بال", "آخر اشي من ال", "اخر اشي من ال"],
    needsTime: false,
    priority: 92,
    handler: async (_period, matchedName) => {
      // This gets handled in processQuestion with account matching
      return "";
    },
  });

  // ── TODAY'S TRANSACTIONS DETAIL ───────────────────────────────────────────
  intents.push({
    id: "today_transactions",
    keywords: ["شو صرفت اليوم", "مصاريف اليوم", "صرفيات اليوم", "تفاصيل مصاريف اليوم", "ايش صرفت اليوم"],
    needsTime: false,
    priority: 86,
    handler: async () => {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase.from("transactions").select("amount, time, description, type, subcategory_id, category_id, subcategories(name), categories(name)").eq("type", "expense").eq("date", todayStr).order("time", { ascending: false }).limit(50);
      if (!data || data.length === 0) return "ما صرفت شي اليوم 🎉";
      const total = data.reduce((s, t) => s + Number(t.amount), 0);
      const lines = data.map((t: any) => {
        const place = t.subcategories?.name || t.categories?.name || "";
        const time = t.time ? t.time.substring(0, 5) : "";
        return `💳 ${fmtNum(Number(t.amount))} ₪${place ? ` — ${place}` : ""}${t.description ? ` (${t.description})` : ""}${time ? ` 🕐${time}` : ""}`;
      });
      return `📋 مصاريفك اليوم:\n${lines.join("\n")}\n\n💰 المجموع: ${fmtNum(total)} ₪`;
    },
  });

  // ── WANT TO WATCH (movies) ────────────────────────────────────────────────
  intents.push({
    id: "want_to_watch_movies",
    keywords: ["أفلام بدي", "افلام بدي", "بدي اشوف", "بدي أشوف", "أفلام ما شفتها", "افلام ما شفتها", "أفلام محفوظة", "أفلام بدي أشوفها"],
    needsTime: false,
    priority: 72,
    handler: async () => {
      const { data } = await supabase.from("media").select("title, rating, genres").eq("type", "movie").eq("status", "want_to_watch").order("created_at", { ascending: false }).limit(10);
      if (!data || data.length === 0) return "ما عندك أفلام بقائمة المشاهدة 🎬";
      const lines = data.map((m, i) => `${i + 1}. ${m.title}${m.rating ? ` ⭐${m.rating}` : ""}${m.genres?.length ? ` (${m.genres.slice(0, 2).join(", ")})` : ""}`);
      return `🎬 أفلام بدك تشوفها:\n${lines.join("\n")}`;
    },
  });

  // ── WANT TO WATCH (series) ────────────────────────────────────────────────
  intents.push({
    id: "want_to_watch_series",
    keywords: ["مسلسلات بدي", "بدي ابلش", "بدي أبلش", "مسلسلات محفوظة", "مسلسلات ما بلشت", "مسلسل بدي ابلشو"],
    needsTime: false,
    priority: 72,
    handler: async () => {
      const { data } = await supabase.from("media").select("title, rating, genres").eq("type", "tv").eq("status", "want_to_watch").order("created_at", { ascending: false }).limit(10);
      if (!data || data.length === 0) return "ما عندك مسلسلات بقائمة المشاهدة 📺";
      const lines = data.map((m, i) => `${i + 1}. ${m.title}${m.rating ? ` ⭐${m.rating}` : ""}${m.genres?.length ? ` (${m.genres.slice(0, 2).join(", ")})` : ""}`);
      return `📺 مسلسلات بدك تبلش فيها:\n${lines.join("\n")}`;
    },
  });

  // ── ALL DREAMS (not just active) ──────────────────────────────────────────
  intents.push({
    id: "all_dreams",
    keywords: ["شو أحلامي", "شو احلامي", "كل أحلامي", "كل احلامي", "قائمة أحلام", "قائمة احلام", "شو أهدافي", "شو اهدافي"],
    needsTime: false,
    priority: 71,
    handler: async () => {
      const { data } = await supabase.from("dreams").select("title, status, progress_percentage, target_date").order("created_at", { ascending: false });
      if (!data || data.length === 0) return "ما في أحلام مسجلة بعد 🌟";
      const statusMap: Record<string, string> = { in_progress: "🔄", completed: "✅", paused: "⏸️", cancelled: "❌" };
      const lines = data.map(d => `${statusMap[d.status] || "🌟"} ${d.title} — ${d.progress_percentage || 0}%${d.target_date ? ` (${d.target_date})` : ""}`);
      const active = data.filter(d => d.status === "in_progress").length;
      const done = data.filter(d => d.status === "completed").length;
      return `🌟 أحلامك (${data.length}):\n${lines.join("\n")}\n\n🔄 نشطة: ${active} | ✅ محققة: ${done}`;
    },
  });

  // ── LAST WORKOUT DETAIL ───────────────────────────────────────────────────
  intents.push({
    id: "last_workout_detail",
    keywords: ["آخر تدريب", "اخر تدريب", "آخر تدريب عملتو", "اخر تدريب عملتو", "تفاصيل آخر تمرين", "تفاصيل اخر تمرين"],
    needsTime: false,
    priority: 77,
    handler: async () => {
      const { data } = await supabase.from("workout_sessions").select("id, scheduled_date, muscle_groups, total_duration_minutes, notes, exercise_ids").not("completed_at", "is", null).order("scheduled_date", { ascending: false }).limit(1);
      if (!data || data.length === 0) return "ما في تمارين مسجلة بعد 🏋️";
      const s = data[0];
      const muscles = s.muscle_groups?.join("، ") || "غير محدد";
      const dur = s.total_duration_minutes ? `${s.total_duration_minutes} دقيقة` : "غير محدد";
      const exerciseCount = s.exercise_ids?.length || 0;
      let result = `🏋️ آخر تدريب:\n📅 ${s.scheduled_date}\n💪 عضلات: ${muscles}\n⏱️ مدة: ${dur}`;
      if (exerciseCount > 0) result += `\n🔢 تمارين: ${exerciseCount}`;
      if (s.notes) result += `\n📝 ملاحظات: ${s.notes}`;
      return result;
    },
  });

  // ── ADD EXPENSE (now just a trigger for the smart flow - handled in processQuestion) ──
  intents.push({
    id: "add_expense",
    keywords: ["أضف صرف", "اضف صرف", "سجلي مصروف", "سجلي صرفة", "بدي أسجل صرفة", "بدي اسجل صرفة", "أضف معاملة", "اضف معاملة", "بدي أضيف صرف", "سجل صرفة"],
    needsTime: false,
    priority: 96,
    handler: async () => "🧾 بدك تضيف صرفة؟\nاكتبلي بهالشكل:\n\"صرفت 50 على أكل\"\n\"صرفت 120 شيكل بنزين\"\n\"30 شيكل قهوة\"\n\nوأنا بسجلها مباشرة! 💰",
  });

  // ── MOST EXPENSIVE DAY ────────────────────────────────────────────────────
  intents.push({
    id: "most_expensive_day",
    keywords: ["أكثر يوم صرفت", "اكثر يوم صرفت", "أغلى يوم", "اغلى يوم", "أكثر يوم مصاريف"],
    needsTime: true,
    priority: 84,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount, date").eq("type", "expense");
      q = dateFilter(q, period);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في مصاريف بهالفترة 📭";
      const byDay = new Map<string, number>();
      for (const t of data) byDay.set(t.date, (byDay.get(t.date) || 0) + Number(t.amount));
      const sorted = [...byDay.entries()].sort((a, b) => b[1] - a[1]);
      const periodLabel = period?.label || "من البداية";
      return `📅 أكثر يوم صرفت فيه ${periodLabel}:\n${sorted[0][0]} — ${fmtNum(sorted[0][1])} ₪`;
    },
  });

  // ── CHEAPEST DAY ──────────────────────────────────────────────────────────
  intents.push({
    id: "cheapest_day",
    keywords: ["أقل يوم صرفت", "اقل يوم صرفت", "أرخص يوم", "ارخص يوم"],
    needsTime: true,
    priority: 84,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount, date").eq("type", "expense");
      q = dateFilter(q, period);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في مصاريف بهالفترة 📭";
      const byDay = new Map<string, number>();
      for (const t of data) byDay.set(t.date, (byDay.get(t.date) || 0) + Number(t.amount));
      const sorted = [...byDay.entries()].sort((a, b) => a[1] - b[1]);
      const periodLabel = period?.label || "من البداية";
      return `📅 أقل يوم صرفت فيه ${periodLabel}:\n${sorted[0][0]} — ${fmtNum(sorted[0][1])} ₪`;
    },
  });

  // ── WEEKLY AVERAGE ────────────────────────────────────────────────────────
  intents.push({
    id: "weekly_average",
    keywords: ["معدل أسبوعي", "معدل اسبوعي", "معدل صرفي الأسبوعي", "معدل صرفي الاسبوعي", "متوسط أسبوعي", "كم المعدل الأسبوعي", "المعدل بالأسبوع", "بالمعدل كل أسبوع", "كم بصرف بالأسبوع", "المعدل بالاسبوع", "بالمعدل كل اسبوع", "كم بصرف بالاسبوع"],
    needsTime: true,
    priority: 81,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount, date").eq("type", "expense");
      q = dateFilter(q, period);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في مصاريف بهالفترة 📭";
      const total = data.reduce((s, t) => s + Number(t.amount), 0);
      const dates = data.map(t => new Date(t.date).getTime());
      const daySpan = Math.max(1, Math.ceil((Math.max(...dates) - Math.min(...dates)) / 86400000));
      const weeks = Math.max(1, daySpan / 7);
      const periodLabel = period?.label || "من البداية";
      return `📊 معدل صرفك الأسبوعي ${periodLabel}: ${fmtNum(total / weeks)} ₪`;
    },
  });

  // ── CATEGORY PERCENTAGES ──────────────────────────────────────────────────
  intents.push({
    id: "category_percentages",
    keywords: ["نسبة كل فئة", "نسب الفئات", "نسب المصاريف", "توزيع المصاريف", "توزيع الفئات", "توزيع مصاريفي"],
    needsTime: true,
    priority: 86,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount, category_id, categories(name)").eq("type", "expense").not("category_id", "is", null);
      q = dateFilter(q, period);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في مصاريف بهالفترة 📭";
      const byCat = new Map<string, number>();
      const total = data.reduce((s, t) => s + Number(t.amount), 0);
      for (const t of data) {
        const name = (t as any).categories?.name || "غير محدد";
        byCat.set(name, (byCat.get(name) || 0) + Number(t.amount));
      }
      const sorted = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
      const periodLabel = period?.label || "من البداية";
      const lines = sorted.map(([name, amt]) => `📊 ${name}: ${fmtNum(amt)} ₪ (${((amt / total) * 100).toFixed(1)}%)`);
      return `📊 توزيع المصاريف ${periodLabel}:\n${lines.join("\n")}\n\n💰 المجموع: ${fmtNum(total)} ₪`;
    },
  });

  // ── TRANSACTIONS COUNT ────────────────────────────────────────────────────
  intents.push({
    id: "transactions_count",
    keywords: ["كم معاملة", "عدد المعاملات", "عدد معاملات", "كم عملية"],
    needsTime: true,
    priority: 79,
    handler: async (period) => {
      let q = supabase.from("transactions").select("id").eq("type", "expense");
      q = dateFilter(q, period);
      const { data } = await q.limit(1000);
      const periodLabel = period?.label || "من البداية";
      return `🧾 عملت ${data?.length || 0} معاملة صرف ${periodLabel}`;
    },
  });

  // ── BIGGEST TRANSACTION ───────────────────────────────────────────────────
  intents.push({
    id: "biggest_transaction",
    keywords: ["أغلى معاملة", "اغلى معاملة", "أكبر معاملة", "اكبر معاملة", "أكثر معاملة", "أغلى صرفة"],
    needsTime: true,
    priority: 87,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount, date, description, subcategories(name), categories(name)").eq("type", "expense");
      q = dateFilter(q, period);
      const { data } = await q.order("amount", { ascending: false }).limit(1);
      if (!data || data.length === 0) return "ما في مصاريف بهالفترة 📭";
      const t = data[0] as any;
      const place = t.subcategories?.name || t.categories?.name || "";
      const periodLabel = period?.label || "من البداية";
      return `💸 أغلى معاملة ${periodLabel}:\n💰 ${fmtNum(Number(t.amount))} ₪${place ? `\n📍 ${place}` : ""}${t.description ? `\n📝 ${t.description}` : ""}\n📅 ${t.date}`;
    },
  });

  // ── SMALLEST TRANSACTION ──────────────────────────────────────────────────
  intents.push({
    id: "smallest_transaction",
    keywords: ["أرخص معاملة", "ارخص معاملة", "أصغر معاملة", "اصغر معاملة", "أقل معاملة"],
    needsTime: true,
    priority: 87,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount, date, description, subcategories(name), categories(name)").eq("type", "expense");
      q = dateFilter(q, period);
      const { data } = await q.order("amount", { ascending: true }).limit(1);
      if (!data || data.length === 0) return "ما في مصاريف بهالفترة 📭";
      const t = data[0] as any;
      const place = t.subcategories?.name || t.categories?.name || "";
      const periodLabel = period?.label || "من البداية";
      return `🪙 أصغر معاملة ${periodLabel}:\n💰 ${fmtNum(Number(t.amount))} ₪${place ? `\n📍 ${place}` : ""}${t.description ? `\n📝 ${t.description}` : ""}\n📅 ${t.date}`;
    },
  });

  // ── LAST 5 TRANSACTIONS ───────────────────────────────────────────────────
  intents.push({
    id: "last_5_transactions",
    keywords: ["آخر 5 معاملات", "اخر 5 معاملات", "آخر خمس معاملات", "اخر خمس", "آخر ٥", "آخر خمس صرفات"],
    needsTime: false,
    priority: 89,
    handler: async () => {
      const { data } = await supabase.from("transactions").select("amount, date, description, subcategories(name), categories(name)").eq("type", "expense").order("date", { ascending: false }).order("time", { ascending: false }).limit(5);
      if (!data || data.length === 0) return "ما في مصاريف مسجلة بعد 📭";
      const lines = data.map((t: any, i: number) => {
        const place = t.subcategories?.name || t.categories?.name || "";
        return `${i + 1}. ${fmtNum(Number(t.amount))} ₪${place ? ` — ${place}` : ""}${t.description ? ` (${t.description})` : ""} 📅${t.date}`;
      });
      return `📋 آخر 5 معاملات:\n${lines.join("\n")}`;
    },
  });

  // ── EVENING SPENDING ──────────────────────────────────────────────────────
  intents.push({
    id: "evening_spending",
    keywords: ["بعد الساعة 6", "بعد الساعه 6", "بالمسا", "بالليل", "صرفت بالمسا"],
    needsTime: true,
    priority: 79,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount, time").eq("type", "expense").gte("time", "18:00:00");
      q = dateFilter(q, period);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في مصاريف مسائية بهالفترة 🌙";
      const total = data.reduce((s, t) => s + Number(t.amount), 0);
      const periodLabel = period?.label || "من البداية";
      return `🌙 مصاريفك المسائية ${periodLabel}: ${fmtNum(total)} ₪ (${data.length} معاملة)`;
    },
  });

  // ── MORNING SPENDING ──────────────────────────────────────────────────────
  intents.push({
    id: "morning_spending",
    keywords: ["صرفت الصبح", "بالصبح", "صباحية", "قبل الظهر"],
    needsTime: true,
    priority: 79,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount, time").eq("type", "expense").lt("time", "12:00:00");
      q = dateFilter(q, period);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في مصاريف صباحية بهالفترة ☀️";
      const total = data.reduce((s, t) => s + Number(t.amount), 0);
      const periodLabel = period?.label || "من البداية";
      return `☀️ مصاريفك الصباحية ${periodLabel}: ${fmtNum(total)} ₪ (${data.length} معاملة)`;
    },
  });

  // ── WEEKEND SPENDING ──────────────────────────────────────────────────────
  intents.push({
    id: "weekend_spending",
    keywords: ["بالويكند", "ويكند", "نهاية الأسبوع", "نهاية الاسبوع", "الجمعة والسبت", "صرفت بالويكند"],
    needsTime: true,
    priority: 79,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount, date").eq("type", "expense");
      q = dateFilter(q, period);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في مصاريف بهالفترة 📭";
      const weekendData = data.filter(t => { const d = new Date(t.date).getDay(); return d === 5 || d === 6; });
      if (weekendData.length === 0) return "ما في مصاريف بالويكند بهالفترة 🎉";
      const total = weekendData.reduce((s, t) => s + Number(t.amount), 0);
      const periodLabel = period?.label || "من البداية";
      return `🎉 مصاريفك بالويكند ${periodLabel}: ${fmtNum(total)} ₪ (${weekendData.length} معاملة)`;
    },
  });

  // ── UNIQUE PLACES COUNT ───────────────────────────────────────────────────
  intents.push({
    id: "unique_places_count",
    keywords: ["كم مكان صرفت", "عدد الأماكن", "عدد اماكن", "كم محل رحت"],
    needsTime: true,
    priority: 79,
    handler: async (period) => {
      let q = supabase.from("transactions").select("subcategory_id").eq("type", "expense").not("subcategory_id", "is", null);
      q = dateFilter(q, period);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في أماكن صرف بهالفترة 📭";
      const unique = new Set(data.map(t => t.subcategory_id)).size;
      const periodLabel = period?.label || "من البداية";
      return `📍 صرفت ب ${unique} مكان مختلف ${periodLabel}`;
    },
  });

  // ── MOST USED ACCOUNT ─────────────────────────────────────────────────────
  intents.push({
    id: "most_used_account",
    keywords: ["أكثر حساب صرفت", "اكثر حساب", "الحساب اللي أكثر", "الحساب اللي اكثر", "من وين أكثر صرفت"],
    needsTime: true,
    priority: 80,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount, account_id, accounts(name)").eq("type", "expense");
      q = dateFilter(q, period);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في مصاريف بهالفترة 📭";
      const byAcc = new Map<string, { total: number; count: number }>();
      for (const t of data) {
        const name = (t as any).accounts?.name || "غير محدد";
        const prev = byAcc.get(name) || { total: 0, count: 0 };
        byAcc.set(name, { total: prev.total + Number(t.amount), count: prev.count + 1 });
      }
      const sorted = [...byAcc.entries()].sort((a, b) => b[1].total - a[1].total);
      const periodLabel = period?.label || "من البداية";
      const lines = sorted.map(([name, v]) => `🏦 ${name}: ${fmtNum(v.total)} ₪ (${v.count} معاملة)`);
      return `🏦 الحسابات الأكثر استخداماً ${periodLabel}:\n${lines.join("\n")}`;
    },
  });

  // ── UNUSED CATEGORIES ─────────────────────────────────────────────────────
  intents.push({
    id: "unused_categories",
    keywords: ["فئة ما صرفت", "فئات ما صرفت", "الفئة اللي ما"],
    needsTime: true,
    priority: 79,
    handler: async (period) => {
      const [catRes, txRes] = await Promise.all([
        supabase.from("categories").select("id, name").eq("type", "expense"),
        (() => { let q = supabase.from("transactions").select("category_id").eq("type", "expense"); q = dateFilter(q, period); return q.limit(1000); })(),
      ]);
      const unused = (catRes.data || []).filter(c => !(new Set((txRes.data || []).map(t => t.category_id))).has(c.id));
      const periodLabel = period?.label || "من البداية";
      if (unused.length === 0) return `✅ صرفت على كل الفئات ${periodLabel}!`;
      return `📭 فئات ما صرفت عليها ${periodLabel}:\n${unused.map(c => `⬜ ${c.name}`).join("\n")}`;
    },
  });

  // ── TRANSFERS COUNT ───────────────────────────────────────────────────────
  intents.push({
    id: "transfers_count",
    keywords: ["كم حولت", "تحويلات", "حوالات"],
    needsTime: true,
    priority: 67,
    handler: async (period) => {
      let q = supabase.from("transactions").select("id").eq("type", "transfer");
      q = dateFilter(q, period);
      const { data } = await q.limit(1000);
      const count = Math.floor((data?.length || 0) / 2);
      const periodLabel = period?.label || "من البداية";
      return `🔄 عملت ${count} تحويل بين الحسابات ${periodLabel}`;
    },
  });

  // ── MONTHLY AVERAGE SPENDING ──────────────────────────────────────────────
  intents.push({
    id: "monthly_average",
    keywords: ["معدل شهري", "معدل صرفي الشهري", "متوسط شهري", "كم المعدل الشهري", "المعدل بالشهر", "بالمعدل كل شهر", "كم بصرف بالشهر"],
    needsTime: false,
    priority: 79,
    handler: async () => {
      const { data } = await supabase.from("transactions").select("amount, date").eq("type", "expense").limit(1000);
      if (!data || data.length === 0) return "ما في مصاريف بعد 📭";
      const total = data.reduce((s, t) => s + Number(t.amount), 0);
      const months = new Set(data.map(t => t.date.substring(0, 7))).size;
      return `📊 معدل صرفك الشهري: ${fmtNum(total / months)} ₪ (${months} شهر)`;
    },
  });

  // ── COMPARE DAILY AVERAGE BETWEEN MONTHS ──────────────────────────────────
  intents.push({
    id: "compare_daily_average",
    keywords: ["قارن المعدل اليومي", "معدل يومي هالشهر مع", "فرق المعدل اليومي", "قارن المعدل لليوم", "المعدل اليومي مقارنة", "معدل يوم هالشهر والفائت"],
    needsTime: false,
    priority: 84,
    handler: async () => {
      const today = new Date();
      const thisMonthFrom = format(startOfMonth(today), "yyyy-MM-dd");
      const todayStr = format(today, "yyyy-MM-dd");
      const prevMonthStart = format(startOfMonth(subMonths(today, 1)), "yyyy-MM-dd");

      const [curr, prev] = await Promise.all([
        supabase.from("transactions").select("amount, date").eq("type", "expense").gte("date", thisMonthFrom).lte("date", todayStr).limit(1000),
        supabase.from("transactions").select("amount, date").eq("type", "expense").gte("date", prevMonthStart).lt("date", thisMonthFrom).limit(1000),
      ]);

      const currTotal = (curr.data || []).reduce((s, t) => s + Number(t.amount), 0);
      const prevTotal = (prev.data || []).reduce((s, t) => s + Number(t.amount), 0);
      const currDays = new Set((curr.data || []).map(t => t.date)).size || 1;
      const prevDays = new Set((prev.data || []).map(t => t.date)).size || 1;
      const currAvg = currTotal / currDays;
      const prevAvg = prevTotal / prevDays;
      const diff = currAvg - prevAvg;
      const pct = prevAvg > 0 ? ((diff / prevAvg) * 100).toFixed(1) : "∞";
      const arrow = diff > 0 ? "📈 زيادة" : diff < 0 ? "📉 نقصان" : "↔️ نفس الشي";

      return `📊 مقارنة المعدل اليومي:\n\nهالشهر: ${fmtNum(currAvg)} ₪/يوم (${currDays} يوم)\nالشهر الفائت: ${fmtNum(prevAvg)} ₪/يوم (${prevDays} يوم)\n\n${arrow} بنسبة ${pct}% (${fmtNum(Math.abs(diff))} ₪)`;
    },
  });

  // ── COMPARE WEEKLY AVERAGE BETWEEN MONTHS ─────────────────────────────────
  intents.push({
    id: "compare_weekly_average",
    keywords: ["قارن المعدل الأسبوعي", "قارن المعدل الاسبوعي", "معدل أسبوعي هالشهر مع", "معدل اسبوعي هالشهر مع", "فرق المعدل الاسبوعي", "فرق المعدل الأسبوعي", "قارن المعدل للأسبوع", "قارن المعدل للاسبوع", "المعدل الاسبوعي مقارنة", "المعدل الأسبوعي مقارنة"],
    needsTime: false,
    priority: 84,
    handler: async () => {
      const today = new Date();
      const thisMonthFrom = format(startOfMonth(today), "yyyy-MM-dd");
      const todayStr = format(today, "yyyy-MM-dd");
      const prevMonthStart = format(startOfMonth(subMonths(today, 1)), "yyyy-MM-dd");

      const [curr, prev] = await Promise.all([
        supabase.from("transactions").select("amount, date").eq("type", "expense").gte("date", thisMonthFrom).lte("date", todayStr).limit(1000),
        supabase.from("transactions").select("amount, date").eq("type", "expense").gte("date", prevMonthStart).lt("date", thisMonthFrom).limit(1000),
      ]);

      const currTotal = (curr.data || []).reduce((s, t) => s + Number(t.amount), 0);
      const prevTotal = (prev.data || []).reduce((s, t) => s + Number(t.amount), 0);
      const currDates = (curr.data || []).map(t => new Date(t.date).getTime());
      const prevDates = (prev.data || []).map(t => new Date(t.date).getTime());
      const currWeeks = currDates.length > 0 ? Math.max(1, Math.ceil((Math.max(...currDates) - Math.min(...currDates)) / 86400000) / 7) : 1;
      const prevWeeks = prevDates.length > 0 ? Math.max(1, Math.ceil((Math.max(...prevDates) - Math.min(...prevDates)) / 86400000) / 7) : 1;
      const currAvg = currTotal / currWeeks;
      const prevAvg = prevTotal / prevWeeks;
      const diff = currAvg - prevAvg;
      const pct = prevAvg > 0 ? ((diff / prevAvg) * 100).toFixed(1) : "∞";
      const arrow = diff > 0 ? "📈 زيادة" : diff < 0 ? "📉 نقصان" : "↔️ نفس الشي";

      return `📊 مقارنة المعدل الأسبوعي:\n\nهالشهر: ${fmtNum(currAvg)} ₪/أسبوع (${currWeeks.toFixed(1)} أسبوع)\nالشهر الفائت: ${fmtNum(prevAvg)} ₪/أسبوع (${prevWeeks.toFixed(1)} أسبوع)\n\n${arrow} بنسبة ${pct}% (${fmtNum(Math.abs(diff))} ₪)`;
    },
  });

  // ── COMPARE MONTHLY AVERAGE (COMBINED VIEW) ───────────────────────────────
  intents.push({
    id: "compare_monthly_average",
    keywords: ["قارن المعدل الشهري", "قارن المعدل للشهور", "معدلات الشهور", "قارن المعدل لليومين والاسبوعين للاشهر", "قارن المعدلات", "مقارنة المعدلات", "قارن معدلات الشهور"],
    needsTime: false,
    priority: 85,
    handler: async () => {
      const today = new Date();
      const thisMonthFrom = format(startOfMonth(today), "yyyy-MM-dd");
      const todayStr = format(today, "yyyy-MM-dd");
      const prevMonthStart = format(startOfMonth(subMonths(today, 1)), "yyyy-MM-dd");

      const [curr, prev] = await Promise.all([
        supabase.from("transactions").select("amount, date").eq("type", "expense").gte("date", thisMonthFrom).lte("date", todayStr).limit(1000),
        supabase.from("transactions").select("amount, date").eq("type", "expense").gte("date", prevMonthStart).lt("date", thisMonthFrom).limit(1000),
      ]);

      const currTotal = (curr.data || []).reduce((s, t) => s + Number(t.amount), 0);
      const prevTotal = (prev.data || []).reduce((s, t) => s + Number(t.amount), 0);
      const currDays = new Set((curr.data || []).map(t => t.date)).size || 1;
      const prevDays = new Set((prev.data || []).map(t => t.date)).size || 1;
      const currDates = (curr.data || []).map(t => new Date(t.date).getTime());
      const prevDates = (prev.data || []).map(t => new Date(t.date).getTime());
      const currWeeks = currDates.length > 0 ? Math.max(1, Math.ceil((Math.max(...currDates) - Math.min(...currDates)) / 86400000) / 7) : 1;
      const prevWeeks = prevDates.length > 0 ? Math.max(1, Math.ceil((Math.max(...prevDates) - Math.min(...prevDates)) / 86400000) / 7) : 1;

      const dailyCurr = currTotal / currDays;
      const dailyPrev = prevTotal / prevDays;
      const weeklyCurr = currTotal / currWeeks;
      const weeklyPrev = prevTotal / prevWeeks;

      const dailyDiff = dailyCurr - dailyPrev;
      const weeklyDiff = weeklyCurr - weeklyPrev;
      const totalDiff = currTotal - prevTotal;

      const pctD = dailyPrev > 0 ? ((dailyDiff / dailyPrev) * 100).toFixed(1) : "∞";
      const pctW = weeklyPrev > 0 ? ((weeklyDiff / weeklyPrev) * 100).toFixed(1) : "∞";
      const pctT = prevTotal > 0 ? ((totalDiff / prevTotal) * 100).toFixed(1) : "∞";

      const arrowD = dailyDiff > 0 ? "📈" : dailyDiff < 0 ? "📉" : "↔️";
      const arrowW = weeklyDiff > 0 ? "📈" : weeklyDiff < 0 ? "📉" : "↔️";
      const arrowT = totalDiff > 0 ? "📈" : totalDiff < 0 ? "📉" : "↔️";

      return `📊 مقارنة شاملة — هالشهر vs الفائت:\n\n📅 المعدل اليومي:\n  هالشهر: ${fmtNum(dailyCurr)} ₪ | الفائت: ${fmtNum(dailyPrev)} ₪\n  ${arrowD} ${pctD}%\n\n📆 المعدل الأسبوعي:\n  هالشهر: ${fmtNum(weeklyCurr)} ₪ | الفائت: ${fmtNum(weeklyPrev)} ₪\n  ${arrowW} ${pctW}%\n\n💰 المجموع:\n  هالشهر: ${fmtNum(currTotal)} ₪ | الفائت: ${fmtNum(prevTotal)} ₪\n  ${arrowT} ${pctT}%`;
    },
  });

  // ── AVERAGE SPENDING PER CATEGORY ─────────────────────────────────────────
  intents.push({
    id: "avg_spending_by_category",
    keywords: ["معدل الصرف حسب الفئات", "المعدل حسب الفئات", "متوسط كل فئة", "معدل كل فئة", "كم المعدل حسب الفئات", "معدل صرفي بكل فئة", "المعدل لكل فئة", "معدل الفئات", "معدل حسب الزيارات", "معدل الزيارة", "معدل كل زيارة", "المعدل لكل زيارة", "كم بصرف بالزيارة", "معدل الصرف بالزيارة", "average per visit", "معدل بكل مرة"],
    needsTime: true,
    priority: 86,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount, date, category_id, categories(name)").eq("type", "expense").not("category_id", "is", null);
      q = dateFilter(q, period);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في مصاريف بهالفترة 📭";
      const byCat = new Map<string, { total: number; count: number }>();
      for (const t of data) {
        const name = (t as any).categories?.name || "غير محدد";
        const prev = byCat.get(name) || { total: 0, count: 0 };
        byCat.set(name, { total: prev.total + Number(t.amount), count: prev.count + 1 });
      }
      const sorted = [...byCat.entries()].sort((a, b) => b[1].total - a[1].total);
      const periodLabel = period?.label || "من البداية";
      const lines = sorted.map(([name, { total, count }]) => `📊 ${name}: ${fmtNum(total / count)} ₪/زيارة (${count} زيارة، مجموع ${fmtNum(total)} ₪)`);
      return `📊 معدل الصرف حسب الزيارات ${periodLabel}:\n${lines.join("\n")}`;
    },
  });

  // ── MOST TRAINED MUSCLE ───────────────────────────────────────────────────
  intents.push({
    id: "most_trained_muscle",
    keywords: ["أكثر عضلة", "اكثر عضلة", "أكثر عضلة اشتغلت", "أكثر عضلة اشتغلت عليها"],
    needsTime: true,
    priority: 79,
    handler: async (period) => {
      let q = supabase.from("workout_sessions").select("muscle_groups").not("completed_at", "is", null);
      if (period?.from) q = q.gte("scheduled_date", period.from);
      if (period?.to) q = q.lte("scheduled_date", period.to);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في تمارين بهالفترة 🏋️";
      const byMuscle = new Map<string, number>();
      for (const s of data) for (const m of (s.muscle_groups || [])) byMuscle.set(m, (byMuscle.get(m) || 0) + 1);
      const sorted = [...byMuscle.entries()].sort((a, b) => b[1] - a[1]);
      const periodLabel = period?.label || "من البداية";
      const lines = sorted.slice(0, 5).map(([m, c]) => `💪 ${m}: ${c} مرة`);
      return `💪 العضلات الأكثر تدريباً ${periodLabel}:\n${lines.join("\n")}`;
    },
  });

  // ── TOTAL WORKOUT HOURS ───────────────────────────────────────────────────
  intents.push({
    id: "total_workout_hours",
    keywords: ["ساعة تمرين", "ساعات تمرين", "كم ساعة تمرين", "كم ساعة اشتغلت"],
    needsTime: true,
    priority: 78,
    handler: async (period) => {
      let q = supabase.from("workout_sessions").select("total_duration_minutes").not("completed_at", "is", null);
      if (period?.from) q = q.gte("scheduled_date", period.from);
      if (period?.to) q = q.lte("scheduled_date", period.to);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في تمارين بهالفترة 🏋️";
      const totalMin = data.reduce((s, t) => s + (t.total_duration_minutes || 0), 0);
      const periodLabel = period?.label || "من البداية";
      return `⏱️ مجموع تمارينك ${periodLabel}: ${Math.floor(totalMin / 60)} ساعة و ${totalMin % 60} دقيقة`;
    },
  });

  // ── AVG WORKOUT DURATION ──────────────────────────────────────────────────
  intents.push({
    id: "avg_workout_duration",
    keywords: ["معدل مدة التمرين", "معدل مدة تمرين", "متوسط مدة", "متوسط مدة التمرين"],
    needsTime: false,
    priority: 78,
    handler: async () => {
      const { data } = await supabase.from("workout_sessions").select("total_duration_minutes").not("completed_at", "is", null).not("total_duration_minutes", "is", null).limit(1000);
      if (!data || data.length === 0) return "ما في تمارين بمدة محددة 🏋️";
      const avg = data.reduce((s, t) => s + (t.total_duration_minutes || 0), 0) / data.length;
      return `⏱️ معدل مدة تمرينك: ${Math.round(avg)} دقيقة`;
    },
  });

  // ── WEIGHT CHANGE ─────────────────────────────────────────────────────────
  intents.push({
    id: "weight_change",
    keywords: ["فرق وزني", "فرق الوزن", "تغير وزني", "تغيّر وزني", "كم نقصت", "كم زدت"],
    needsTime: false,
    priority: 76,
    handler: async () => {
      const monthAgo = format(subMonths(new Date(), 1), "yyyy-MM-dd'T'HH:mm:ss");
      const [curr, prev] = await Promise.all([
        supabase.from("user_body_stats").select("weight").order("recorded_at", { ascending: false }).limit(1),
        supabase.from("user_body_stats").select("weight").lte("recorded_at", monthAgo).order("recorded_at", { ascending: false }).limit(1),
      ]);
      if (!curr.data?.[0]) return "ما في بيانات وزن بعد ⚖️";
      const currW = Number(curr.data[0].weight);
      if (!prev.data?.[0]) return `⚖️ وزنك الحالي: ${fmtNum(currW)} كغ\nما في قراءة من شهر قبل`;
      const prevW = Number(prev.data[0].weight);
      const diff = currW - prevW;
      return `⚖️ تغير وزنك:\nالحالي: ${fmtNum(currW)} كغ\nقبل شهر: ${fmtNum(prevW)} كغ\n${diff > 0 ? "📈 زيادة" : diff < 0 ? "📉 نقصان" : "↔️ ثابت"} ${fmtNum(Math.abs(diff))} كغ`;
    },
  });

  // ── LOWEST / HIGHEST WEIGHT ───────────────────────────────────────────────
  intents.push({ id: "lowest_weight", keywords: ["أقل وزن", "اقل وزن", "أخف وزن", "أقل وزن وصلتلو"], needsTime: false, priority: 76,
    handler: async () => {
      const { data } = await supabase.from("user_body_stats").select("weight, recorded_at").order("weight", { ascending: true }).limit(1);
      if (!data?.[0]) return "ما في بيانات وزن ⚖️";
      return `⚖️ أقل وزن: ${fmtNum(Number(data[0].weight))} كغ (${format(new Date(data[0].recorded_at), "yyyy-MM-dd")})`;
    },
  });
  intents.push({ id: "highest_weight", keywords: ["أعلى وزن", "اعلى وزن", "أثقل وزن", "أعلى وزن وصلتلو"], needsTime: false, priority: 76,
    handler: async () => {
      const { data } = await supabase.from("user_body_stats").select("weight, recorded_at").order("weight", { ascending: false }).limit(1);
      if (!data?.[0]) return "ما في بيانات وزن ⚖️";
      return `⚖️ أعلى وزن: ${fmtNum(Number(data[0].weight))} كغ (${format(new Date(data[0].recorded_at), "yyyy-MM-dd")})`;
    },
  });

  // ── LAST 3 WEIGHTS ────────────────────────────────────────────────────────
  intents.push({ id: "last_3_weights", keywords: ["آخر 3 أوزان", "اخر 3 اوزان", "آخر ثلاث أوزان", "آخر ٣", "آخر ثلاث قياسات"], needsTime: false, priority: 77,
    handler: async () => {
      const { data } = await supabase.from("user_body_stats").select("weight, recorded_at").order("recorded_at", { ascending: false }).limit(3);
      if (!data || data.length === 0) return "ما في بيانات وزن ⚖️";
      const lines = data.map((d, i) => `${i + 1}. ${fmtNum(Number(d.weight))} كغ — ${format(new Date(d.recorded_at), "yyyy-MM-dd")}`);
      return `⚖️ آخر قياسات:\n${lines.join("\n")}`;
    },
  });

  // ── SUPPLEMENT DOSES COUNT ────────────────────────────────────────────────
  intents.push({ id: "supplement_doses_count", keywords: ["كم سكوب", "سكوب بروتين", "جرعات بروتين", "كم جرعة أخذت"], needsTime: true, priority: 77,
    handler: async (period) => {
      let q = supabase.from("supplement_logs").select("doses_taken");
      if (period?.from) q = q.gte("logged_date", period.from);
      if (period?.to) q = q.lte("logged_date", period.to);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في جرعات مسجلة بهالفترة 💊";
      const total = data.reduce((s, t) => s + Number(t.doses_taken), 0);
      return `💊 أخذت ${fmtNum(total)} جرعة مكملات ${period?.label || "من البداية"}`;
    },
  });

  // ── MOST USED SUPPLEMENT ──────────────────────────────────────────────────
  intents.push({ id: "most_used_supplement", keywords: ["أكثر مكمل", "اكثر مكمل", "المكمل اللي أكثر", "المكمل اللي اكثر", "أكثر مكمل استخدمتو"], needsTime: true, priority: 77,
    handler: async (period) => {
      let q = supabase.from("supplement_logs").select("doses_taken, supplements(name)");
      if (period?.from) q = q.gte("logged_date", period.from);
      if (period?.to) q = q.lte("logged_date", period.to);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في جرعات مسجلة بهالفترة 💊";
      const bySupp = new Map<string, number>();
      for (const t of data) { const name = (t as any).supplements?.name || "?"; bySupp.set(name, (bySupp.get(name) || 0) + Number(t.doses_taken)); }
      const sorted = [...bySupp.entries()].sort((a, b) => b[1] - a[1]);
      return `💊 المكملات الأكثر استخداماً ${period?.label || "من البداية"}:\n${sorted.map(([n, d]) => `💊 ${n}: ${fmtNum(d)} جرعة`).join("\n")}`;
    },
  });

  // ── LAST SUPPLEMENT ───────────────────────────────────────────────────────
  intents.push({ id: "last_supplement", keywords: ["آخر مكمل", "اخر مكمل", "آخر كمال", "آخر مكمل أخذتو"], needsTime: false, priority: 77,
    handler: async () => {
      const { data } = await supabase.from("supplement_logs").select("logged_date, logged_time, doses_taken, supplements(name)").order("logged_date", { ascending: false }).order("logged_time", { ascending: false }).limit(1);
      if (!data?.[0]) return "ما في مكملات مسجلة بعد 💊";
      const t = data[0] as any;
      return `💊 آخر مكمل: ${t.supplements?.name || "?"} — ${t.doses_taken} جرعة\n📅 ${t.logged_date}`;
    },
  });

  // ── SUPPLEMENT DAYS COUNT ─────────────────────────────────────────────────
  intents.push({ id: "supplement_days_count", keywords: ["كم يوم أخذت كمالات", "كم يوم اخذت كمالات", "أيام المكملات", "كم يوم أخذت مكملات"], needsTime: true, priority: 77,
    handler: async (period) => {
      let q = supabase.from("supplement_logs").select("logged_date");
      if (period?.from) q = q.gte("logged_date", period.from);
      if (period?.to) q = q.lte("logged_date", period.to);
      const { data } = await q.limit(1000);
      return `💊 أخذت مكملات ب ${new Set((data || []).map(t => t.logged_date)).size} يوم ${period?.label || "من البداية"}`;
    },
  });

  // ── MOVIES WATCHED / EPISODES WATCHED ─────────────────────────────────────
  intents.push({ id: "movies_watched", keywords: ["كم فيلم شفت", "عدد أفلام شفت", "كم فلم شفت", "كم فيلم خلصت"], needsTime: false, priority: 73,
    handler: async () => { const { data } = await supabase.from("media").select("id").eq("type", "movie").eq("status", "completed"); return `🎬 شفت ${data?.length || 0} فيلم`; },
  });
  intents.push({ id: "episodes_watched", keywords: ["كم حلقة شفت", "عدد حلقات", "كم حلقة", "كم حلقة خلصت"], needsTime: false, priority: 73,
    handler: async () => { const { data } = await supabase.from("episodes").select("id").eq("watched", true); return `📺 شفت ${data?.length || 0} حلقة`; },
  });

  // ── LAST MOVIE / LAST SERIES ──────────────────────────────────────────────
  intents.push({ id: "last_movie", keywords: ["آخر فيلم شفته", "اخر فيلم شفته", "آخر فيلم", "اخر فلم", "آخر فلم شفتو"], needsTime: false, priority: 74,
    handler: async () => {
      const { data } = await supabase.from("media").select("title, rating, user_rating").eq("type", "movie").eq("status", "completed").order("created_at", { ascending: false }).limit(1);
      if (!data?.[0]) return "ما شفت أي فيلم بعد 🎬";
      return `🎬 آخر فيلم: ${data[0].title}${data[0].user_rating ? ` ⭐${data[0].user_rating}/10` : ""}${data[0].rating ? ` (TMDB: ${data[0].rating})` : ""}`;
    },
  });
  intents.push({ id: "last_series", keywords: ["آخر مسلسل", "اخر مسلسل", "آخر مسلسل بلشته", "اخر مسلسل بلشتو"], needsTime: false, priority: 74,
    handler: async () => {
      const { data } = await supabase.from("media").select("title, rating, status").eq("type", "tv").order("created_at", { ascending: false }).limit(1);
      if (!data?.[0]) return "ما في مسلسلات بعد 📺";
      const st: Record<string, string> = { watching: "بتشاهده", completed: "خلصته", want_to_watch: "بدك تبلشه" };
      return `📺 آخر مسلسل: ${data[0].title} — ${st[data[0].status || ""] || data[0].status}`;
    },
  });

  // ── GAMES BY PLATFORM / TOTAL SPENT / MOST EXPENSIVE ──────────────────────
  intents.push({ id: "games_by_platform", keywords: ["لعبة PS5", "لعبة PS4", "لعبة PC", "ألعاب PS5", "العاب PS5", "ألعاب PC", "العاب PC", "كم لعبة PS", "كم لعبة بي سي", "ألعاب بلايستيشن"], needsTime: false, priority: 73,
    handler: async () => {
      const { data } = await supabase.from("games").select("platform");
      if (!data || data.length === 0) return "ما في ألعاب 🎮";
      const byPlat = new Map<string, number>();
      for (const g of data) byPlat.set(g.platform, (byPlat.get(g.platform) || 0) + 1);
      return `🎮 ألعابك:\n${[...byPlat.entries()].map(([p, c]) => `${p}: ${c} لعبة`).join("\n")}`;
    },
  });
  intents.push({ id: "games_total_spent", keywords: ["صرفت على الألعاب", "صرفت على العاب", "تكلفة الألعاب", "مصاريف ألعاب", "كم صرفت على الألعاب"], needsTime: false, priority: 73,
    handler: async () => {
      const { data } = await supabase.from("games").select("user_price_ils, name").order("user_price_ils", { ascending: false });
      if (!data || data.length === 0) return "ما في ألعاب 🎮";
      const total = data.reduce((s, g) => s + Number(g.user_price_ils || 0), 0);
      return `🎮 مصاريف الألعاب: ${fmtNum(total)} ₪\n💸 أغلى: ${data[0].name} (${fmtNum(Number(data[0].user_price_ils))} ₪)`;
    },
  });
  intents.push({ id: "most_expensive_game", keywords: ["اللعبة اللي أكثر صرفت", "اللعبة اللي اكثر", "أغلى لعبة", "اغلى لعبة", "أغلى لعبة عندي"], needsTime: false, priority: 73,
    handler: async () => {
      const { data } = await supabase.from("games").select("name, user_price_ils, platform").order("user_price_ils", { ascending: false }).limit(3);
      if (!data || data.length === 0) return "ما في ألعاب 🎮";
      return `💸 أغلى ألعابك:\n${data.map((g, i) => `${i + 1}. ${g.name} (${g.platform}) — ${fmtNum(Number(g.user_price_ils))} ₪`).join("\n")}`;
    },
  });

  // ── HIGHEST RATED MOVIE / SERIES ──────────────────────────────────────────
  intents.push({ id: "highest_rated_movie", keywords: ["أعلى تقييم IMDB", "اعلى تقييم", "أعلى تقييم فيلم", "فيلم أعلى"], needsTime: false, priority: 73,
    handler: async () => {
      const { data } = await supabase.from("media").select("title, rating, user_rating").eq("type", "movie").not("rating", "is", null).order("rating", { ascending: false }).limit(3);
      if (!data || data.length === 0) return "ما في أفلام بتقييم 🎬";
      return `🎬 أعلى تقييماً:\n${data.map((m, i) => `${i + 1}. ${m.title} ⭐${m.rating}`).join("\n")}`;
    },
  });
  intents.push({ id: "highest_rated_series", keywords: ["المسلسل اللي أعلى", "المسلسل اللي اعلى", "مسلسل أعلى تقييم", "أعلى مسلسل"], needsTime: false, priority: 73,
    handler: async () => {
      const { data } = await supabase.from("media").select("title, rating").eq("type", "tv").not("rating", "is", null).order("rating", { ascending: false }).limit(3);
      if (!data || data.length === 0) return "ما في مسلسلات بتقييم 📺";
      return `📺 أعلى المسلسلات:\n${data.map((m, i) => `${i + 1}. ${m.title} ⭐${m.rating}`).join("\n")}`;
    },
  });

  // ── SUGGEST MOVIE ─────────────────────────────────────────────────────────
  intents.push({ id: "suggest_movie", keywords: ["اقترح فيلم", "اقترحلي فيلم", "نصحني فيلم", "شو أشوف", "اقتراح فيلم"], needsTime: false, priority: 73,
    handler: async () => {
      const { data } = await supabase.from("media").select("title, rating, genres").eq("status", "want_to_watch").not("rating", "is", null).order("rating", { ascending: false }).limit(5);
      if (!data || data.length === 0) return "ما عندك أفلام بقائمة المشاهدة 🎬";
      const pick = data[Math.floor(Math.random() * data.length)];
      return `🎬 اقتراحي: ${pick.title} ⭐${pick.rating}${pick.genres?.length ? `\n🎭 ${pick.genres.slice(0, 3).join(", ")}` : ""}`;
    },
  });

  // ── COMPARE MEDIA TYPES ───────────────────────────────────────────────────
  intents.push({ id: "compare_media_types", keywords: ["قارن الأفلام مع المسلسلات", "الأفلام مقابل المسلسلات", "أفلام ولا مسلسلات"], needsTime: false, priority: 83,
    handler: async () => {
      const { data } = await supabase.from("media").select("type, status");
      if (!data || data.length === 0) return "ما في أفلام أو مسلسلات 📺";
      const movies = data.filter(m => m.type === "movie");
      const series = data.filter(m => m.type === "tv");
      return `🔄 مقارنة:\n🎬 أفلام: ${movies.length} (خلصت ${movies.filter(m => m.status === "completed").length})\n📺 مسلسلات: ${series.length} (خلصت ${series.filter(m => m.status === "completed").length})`;
    },
  });

  // ── COMPLETED DREAMS ──────────────────────────────────────────────────────
  intents.push({ id: "completed_dreams", keywords: ["كم حلم حققت", "أحلام محققة", "احلام محققة", "كم هدف حققت"], needsTime: false, priority: 72,
    handler: async () => {
      const { data } = await supabase.from("dreams").select("title, completed_at, rating").eq("status", "completed").order("completed_at", { ascending: false });
      if (!data || data.length === 0) return "ما حققت أي حلم بعد 🌟";
      return `🌟 أحلام حققتها (${data.length}):\n${data.map((d, i) => `${i + 1}. ✅ ${d.title}${d.rating ? ` ⭐${d.rating}` : ""}`).join("\n")}`;
    },
  });

  // ── CLOSEST TO COMPLETE DREAM ─────────────────────────────────────────────
  intents.push({ id: "closest_to_complete", keywords: ["أقرب للإكمال", "اقرب للاكمال", "أقرب حلم", "الحلم اللي أقرب", "أقرب هدف"], needsTime: false, priority: 72,
    handler: async () => {
      const { data } = await supabase.from("dreams").select("title, progress_percentage").eq("status", "in_progress").order("progress_percentage", { ascending: false }).limit(3);
      if (!data || data.length === 0) return "ما في أحلام نشطة 🌟";
      return `🌟 أقرب للإكمال:\n${data.map((d, i) => `${i + 1}. ${d.title} — ${d.progress_percentage || 0}%`).join("\n")}`;
    },
  });

  // ── REMAINING DREAM STEPS ─────────────────────────────────────────────────
  intents.push({ id: "remaining_steps", keywords: ["كم خطوة باقي", "خطوات باقية", "خطوات أحلام"], needsTime: false, priority: 72,
    handler: async () => {
      const { data } = await supabase.from("dream_steps").select("dream_id, dreams(title, status)").eq("is_completed", false);
      if (!data || data.length === 0) return "ما في خطوات باقية ✨";
      const byDream = new Map<string, { title: string; count: number }>();
      for (const s of data) {
        const d = (s as any).dreams;
        if (d?.status !== "in_progress") continue;
        const prev = byDream.get(d.title) || { title: d.title, count: 0 };
        byDream.set(d.title, { ...prev, count: prev.count + 1 });
      }
      const total = [...byDream.values()].reduce((s, d) => s + d.count, 0);
      return `📋 خطوات باقية:\n${[...byDream.values()].map(d => `🌟 ${d.title}: ${d.count} خطوة`).join("\n")}\n🔢 المجموع: ${total}`;
    },
  });

  // ── DREAMS OVERALL PROGRESS ───────────────────────────────────────────────
  intents.push({ id: "dreams_overall_progress", keywords: ["تقدم أحلامي", "تقدم احلامي", "إنجاز أحلامي", "معدل إنجاز", "معدل انجاز", "تقدم أهدافي"], needsTime: false, priority: 72,
    handler: async () => {
      const { data } = await supabase.from("dreams").select("progress_percentage, status");
      if (!data || data.length === 0) return "ما في أحلام 🌟";
      const active = data.filter(d => d.status === "in_progress");
      const avg = active.length > 0 ? active.reduce((s, d) => s + (d.progress_percentage || 0), 0) / active.length : 0;
      return `🌟 تقدم أحلامك:\n📊 معدل: ${avg.toFixed(0)}%\n✅ محققة: ${data.filter(d => d.status === "completed").length}\n🔄 نشطة: ${active.length}`;
    },
  });

  // ── LAST ADDED DREAM ──────────────────────────────────────────────────────
  intents.push({ id: "last_added_dream", keywords: ["آخر حلم أضفتو", "اخر حلم اضفتو", "آخر حلم", "آخر هدف أضفتو"], needsTime: false, priority: 72,
    handler: async () => {
      const { data } = await supabase.from("dreams").select("title, status, progress_percentage, created_at").order("created_at", { ascending: false }).limit(1);
      if (!data?.[0]) return "ما في أحلام 🌟";
      const st: Record<string, string> = { in_progress: "🔄 نشط", completed: "✅ محقق", paused: "⏸️ موقوف", cancelled: "❌ ملغي" };
      return `🌟 آخر حلم: ${data[0].title}\n${st[data[0].status] || data[0].status} — ${data[0].progress_percentage || 0}%`;
    },
  });

  // ── PRAYER BY NAME ────────────────────────────────────────────────────────
  intents.push({ id: "prayer_dhuhr", keywords: ["صليت الظهر", "كم مرة صليت الظهر"], needsTime: true, priority: 79,
    handler: async (period) => {
      let q = supabase.from("prayer_completions").select("id").eq("prayer_name", "dhuhr");
      if (period?.from) q = q.gte("completion_date", period.from);
      if (period?.to) q = q.lte("completion_date", period.to);
      const { data } = await q.limit(1000);
      return `🕌 صليت الظهر ${data?.length || 0} مرة ${period?.label || "من البداية"}`;
    },
  });
  intents.push({ id: "prayer_asr", keywords: ["صليت العصر", "كم مرة صليت العصر"], needsTime: true, priority: 79,
    handler: async (period) => {
      let q = supabase.from("prayer_completions").select("id").eq("prayer_name", "asr");
      if (period?.from) q = q.gte("completion_date", period.from);
      if (period?.to) q = q.lte("completion_date", period.to);
      const { data } = await q.limit(1000);
      return `🕌 صليت العصر ${data?.length || 0} مرة ${period?.label || "من البداية"}`;
    },
  });
  intents.push({ id: "prayer_maghrib", keywords: ["صليت المغرب", "كم مرة صليت المغرب"], needsTime: true, priority: 79,
    handler: async (period) => {
      let q = supabase.from("prayer_completions").select("id").eq("prayer_name", "maghrib");
      if (period?.from) q = q.gte("completion_date", period.from);
      if (period?.to) q = q.lte("completion_date", period.to);
      const { data } = await q.limit(1000);
      return `🕌 صليت المغرب ${data?.length || 0} مرة ${period?.label || "من البداية"}`;
    },
  });
  intents.push({ id: "prayer_isha", keywords: ["صليت العشاء", "صليت العشا", "كم مرة صليت العشاء"], needsTime: true, priority: 79,
    handler: async (period) => {
      let q = supabase.from("prayer_completions").select("id").eq("prayer_name", "isha");
      if (period?.from) q = q.gte("completion_date", period.from);
      if (period?.to) q = q.lte("completion_date", period.to);
      const { data } = await q.limit(1000);
      return `🕌 صليت العشاء ${data?.length || 0} مرة ${period?.label || "من البداية"}`;
    },
  });

  // ── MOST PRAYED ───────────────────────────────────────────────────────────
  intents.push({ id: "most_prayed", keywords: ["أكثر صلاة صليتها", "اكثر صلاة", "أكثر صلاة", "شو أكثر صلاة"], needsTime: true, priority: 79,
    handler: async (period) => {
      let q = supabase.from("prayer_completions").select("prayer_name");
      if (period?.from) q = q.gte("completion_date", period.from);
      if (period?.to) q = q.lte("completion_date", period.to);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في صلوات بهالفترة 🕌";
      const byP = new Map<string, number>();
      for (const p of data) byP.set(p.prayer_name, (byP.get(p.prayer_name) || 0) + 1);
      const nameMap: Record<string, string> = { fajr: "الفجر", dhuhr: "الظهر", asr: "العصر", maghrib: "المغرب", isha: "العشاء" };
      const sorted = [...byP.entries()].sort((a, b) => b[1] - a[1]);
      return `🕌 صلواتك ${period?.label || "من البداية"}:\n${sorted.map(([p, c]) => `${nameMap[p] || p}: ${c} مرة`).join("\n")}`;
    },
  });

  // ── FULL PRAYER DAYS ──────────────────────────────────────────────────────
  intents.push({ id: "full_prayer_days", keywords: ["كل الصلوات", "صليت كل الصلوات", "كم يوم صليت فيه كل", "5 صلوات", "خمس صلوات", "كم يوم كل الصلوات"], needsTime: true, priority: 80,
    handler: async (period) => {
      let q = supabase.from("prayer_completions").select("completion_date, prayer_name");
      if (period?.from) q = q.gte("completion_date", period.from);
      if (period?.to) q = q.lte("completion_date", period.to);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في صلوات بهالفترة 🕌";
      const byDay = new Map<string, Set<string>>();
      for (const p of data) { if (!byDay.has(p.completion_date)) byDay.set(p.completion_date, new Set()); byDay.get(p.completion_date)!.add(p.prayer_name); }
      const fullDays = [...byDay.entries()].filter(([_, s]) => s.size >= 5).length;
      return `🕌 صليت كل الصلوات ب ${fullDays} يوم من ${byDay.size} ${period?.label || "من البداية"}`;
    },
  });

  // ── TOMORROW SCHEDULE ─────────────────────────────────────────────────────
  intents.push({ id: "tomorrow_schedule", keywords: ["بكرا بالجدول", "بكره بالجدول", "جدول بكرا", "شو عندي بكرا", "ايش عندي بكرا", "برنامج بكرا"], needsTime: false, priority: 70,
    handler: async () => {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const tStr = format(tomorrow, "yyyy-MM-dd");
      const dow = tomorrow.getDay() || 7;
      const { data } = await supabase.from("daily_activities").select("title, start_time, is_recurring, days_of_week").or(`date.eq.${tStr},and(is_recurring.eq.true)`);
      const items = (data || []).filter(a => !a.is_recurring || a.days_of_week?.includes(dow));
      if (items.length === 0) return "ما عندك شي بكرا 📋";
      return `📋 جدولك بكرا:\n${items.map(a => `${a.start_time ? a.start_time.substring(0, 5) + " " : ""}${a.title}`).join("\n")}`;
    },
  });

  // ── COMPLETED TASKS ───────────────────────────────────────────────────────
  intents.push({ id: "completed_tasks", keywords: ["مهمة خلصت", "مهام خلصت", "كم مهمة خلصت", "كم مهمه خلصت"], needsTime: true, priority: 70,
    handler: async (period) => {
      let q = supabase.from("activity_completions").select("id");
      if (period?.from) q = q.gte("completion_date", period.from);
      if (period?.to) q = q.lte("completion_date", period.to);
      const { data } = await q.limit(1000);
      return `✅ خلصت ${data?.length || 0} مهمة ${period?.label || "من البداية"}`;
    },
  });

  // ── WORKOUT STREAK ────────────────────────────────────────────────────────
  intents.push({ id: "workout_streak", keywords: ["يوم متتالي تمرنت", "أيام متتالية تمرين", "ستريك تمارين", "streak", "كم يوم متتالي تمرنت"], needsTime: false, priority: 77,
    handler: async () => {
      const { data } = await supabase.from("workout_sessions").select("scheduled_date").not("completed_at", "is", null).order("scheduled_date", { ascending: false }).limit(100);
      if (!data || data.length === 0) return "ما في تمارين 🏋️";
      const dates = [...new Set(data.map(d => d.scheduled_date))].sort().reverse();
      let streak = 1;
      for (let i = 1; i < dates.length; i++) {
        if ((new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / 86400000 <= 1) streak++; else break;
      }
      return `🔥 ${streak} يوم متتالي تمرنت!`;
    },
  });

  // ── FAJR STREAK ───────────────────────────────────────────────────────────
  intents.push({ id: "fajr_streak", keywords: ["يوم متتالي صليت الفجر", "ستريك فجر", "أيام متتالية فجر", "كم يوم متتالي صليت الفجر"], needsTime: false, priority: 79,
    handler: async () => {
      const { data } = await supabase.from("prayer_completions").select("completion_date").eq("prayer_name", "fajr").order("completion_date", { ascending: false }).limit(100);
      if (!data || data.length === 0) return "ما في فجر مسجل 🌅";
      const dates = [...new Set(data.map(d => d.completion_date))].sort().reverse();
      let streak = 1;
      for (let i = 1; i < dates.length; i++) {
        if ((new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / 86400000 <= 1) streak++; else break;
      }
      return `🌅 ${streak} يوم متتالي صليت الفجر!`;
    },
  });

  // ── MONTHLY SUMMARY ───────────────────────────────────────────────────────
  intents.push({ id: "monthly_summary", keywords: ["لخصلي الشهر", "ملخص الشهر", "تقرير الشهر", "لخصلي", "ملخص", "عطيني ملخص", "شو صار هالشهر"], needsTime: false, priority: 91,
    handler: async () => {
      const today = new Date();
      const ms = format(startOfMonth(today), "yyyy-MM-dd");
      const ts = format(today, "yyyy-MM-dd");
      const [exp, inc, wo, pr, su] = await Promise.all([
        supabase.from("transactions").select("amount").eq("type", "expense").gte("date", ms).lte("date", ts).limit(1000),
        supabase.from("transactions").select("amount").eq("type", "income").gte("date", ms).lte("date", ts).limit(1000),
        supabase.from("workout_sessions").select("id").not("completed_at", "is", null).gte("scheduled_date", ms).lte("scheduled_date", ts).limit(100),
        supabase.from("prayer_completions").select("id").gte("completion_date", ms).lte("completion_date", ts).limit(1000),
        supabase.from("supplement_logs").select("id").gte("logged_date", ms).lte("logged_date", ts).limit(1000),
      ]);
      const tExp = (exp.data || []).reduce((s, t) => s + Number(t.amount), 0);
      const tInc = (inc.data || []).reduce((s, t) => s + Number(t.amount), 0);
      return `📊 ملخص الشهر:\n\n💰 دخل: ${fmtNum(tInc)} ₪\n💳 مصاريف: ${fmtNum(tExp)} ₪\n${tInc - tExp >= 0 ? "✅" : "⚠️"} صافي: ${fmtNum(tInc - tExp)} ₪\n\n💪 تمارين: ${wo.data?.length || 0}\n💊 جرعات: ${su.data?.length || 0}\n🕌 صلوات: ${pr.data?.length || 0}`;
    },
  });

  // ── WEIGHT/WORKOUT/PRAYER COMPARISONS ─────────────────────────────────────
  intents.push({ id: "weight_comparison", keywords: ["قارن وزني", "مقارنة وزن", "وزن الشهر الفائت", "قارن وزني الشهر"], needsTime: false, priority: 83,
    handler: async () => {
      const monthAgo = format(subMonths(new Date(), 1), "yyyy-MM-dd'T'HH:mm:ss");
      const [curr, prev] = await Promise.all([
        supabase.from("user_body_stats").select("weight").order("recorded_at", { ascending: false }).limit(1),
        supabase.from("user_body_stats").select("weight").lte("recorded_at", monthAgo).order("recorded_at", { ascending: false }).limit(1),
      ]);
      if (!curr.data?.[0]) return "ما في بيانات وزن ⚖️";
      const c = Number(curr.data[0].weight), p = prev.data?.[0] ? Number(prev.data[0].weight) : null;
      if (!p) return `⚖️ وزنك: ${fmtNum(c)} كغ (ما في قراءة سابقة)`;
      const d = c - p;
      return `⚖️ مقارنة:\nالحالي: ${fmtNum(c)} كغ\nقبل شهر: ${fmtNum(p)} كغ\n${d > 0 ? "📈" : d < 0 ? "📉" : "↔️"} فرق: ${fmtNum(Math.abs(d))} كغ`;
    },
  });
  intents.push({ id: "workout_comparison", keywords: ["قارن تمارين", "مقارنة تمارين", "تمارين الشهر الفائت مع", "قارن تماريني"], needsTime: false, priority: 83,
    handler: async () => {
      const today = new Date();
      const ms = format(startOfMonth(today), "yyyy-MM-dd"), ts = format(today, "yyyy-MM-dd"), ps = format(startOfMonth(subMonths(today, 1)), "yyyy-MM-dd");
      const [c, p] = await Promise.all([
        supabase.from("workout_sessions").select("id").not("completed_at", "is", null).gte("scheduled_date", ms).lte("scheduled_date", ts).limit(100),
        supabase.from("workout_sessions").select("id").not("completed_at", "is", null).gte("scheduled_date", ps).lt("scheduled_date", ms).limit(100),
      ]);
      return `🏋️ مقارنة:\nهالشهر: ${c.data?.length || 0}\nالفائت: ${p.data?.length || 0}\n${(c.data?.length || 0) > (p.data?.length || 0) ? "📈" : "📉"} فرق: ${Math.abs((c.data?.length || 0) - (p.data?.length || 0))}`;
    },
  });
  intents.push({ id: "prayer_comparison", keywords: ["قارن صلواتي", "مقارنة صلوات", "صلوات هالأسبوع مع", "قارن صلاتي"], needsTime: false, priority: 83,
    handler: async () => {
      const today = new Date();
      const ws = format(startOfWeek(today, { weekStartsOn: 6 }), "yyyy-MM-dd"), ts = format(today, "yyyy-MM-dd");
      const lws = format(subDays(new Date(ws), 7), "yyyy-MM-dd");
      const [c, p] = await Promise.all([
        supabase.from("prayer_completions").select("id").gte("completion_date", ws).lte("completion_date", ts).limit(100),
        supabase.from("prayer_completions").select("id").gte("completion_date", lws).lt("completion_date", ws).limit(100),
      ]);
      return `🕌 مقارنة:\nهالأسبوع: ${c.data?.length || 0}\nالفائت: ${p.data?.length || 0}`;
    },
  });

  // ── "متى آخر مرة" INTENTS ──────────────────────────────────────────────
  intents.push({ id: "last_time_expense", keywords: ["متى آخر مرة صرفت", "امتى آخر مرة صرفت", "متى اخر مرة صرفت"], needsTime: false, priority: 93,
    handler: async () => {
      const { data } = await supabase.from("transactions").select("date, time, amount, subcategories(name), categories(name)").eq("type", "expense").order("date", { ascending: false }).order("time", { ascending: false }).limit(1);
      if (!data?.[0]) return "ما في مصاريف مسجلة بعد 📭";
      const t = data[0] as any;
      const place = t.subcategories?.name || t.categories?.name || "";
      return `💳 آخر مرة صرفت: ${t.date}${t.time ? " " + t.time.substring(0,5) : ""}\n💰 ${fmtNum(Number(t.amount))} ₪${place ? ` على ${place}` : ""}`;
    },
  });
  intents.push({ id: "last_time_workout", keywords: ["متى آخر مرة تمرنت", "امتى آخر مرة تمرنت", "متى اخر مرة تمرنت", "متى آخر مرة رحت الجيم"], needsTime: false, priority: 93,
    handler: async () => {
      const { data } = await supabase.from("workout_sessions").select("scheduled_date, muscle_groups").not("completed_at", "is", null).order("scheduled_date", { ascending: false }).limit(1);
      if (!data?.[0]) return "ما في تمارين مسجلة بعد 🏋️";
      const muscles = data[0].muscle_groups?.join("، ") || "";
      return `🏋️ آخر مرة تمرنت: ${data[0].scheduled_date}${muscles ? `\n💪 ${muscles}` : ""}`;
    },
  });
  intents.push({ id: "last_time_fajr", keywords: ["متى آخر مرة صليت الفجر", "امتى آخر مرة صليت الفجر", "متى اخر مرة صليت الفجر"], needsTime: false, priority: 93,
    handler: async () => {
      const { data } = await supabase.from("prayer_completions").select("completion_date").eq("prayer_name", "fajr").order("completion_date", { ascending: false }).limit(1);
      if (!data?.[0]) return "ما سجلت أي فجر بعد 🌅";
      return `🌅 آخر مرة صليت الفجر: ${data[0].completion_date}`;
    },
  });
  intents.push({ id: "last_time_supplement", keywords: ["متى آخر مرة أخذت مكمل", "امتى آخر مرة اخذت مكمل", "متى اخر مرة اخذت كمال"], needsTime: false, priority: 93,
    handler: async () => {
      const { data } = await supabase.from("supplement_logs").select("logged_date, supplements(name)").order("logged_date", { ascending: false }).limit(1);
      if (!data?.[0]) return "ما في مكملات مسجلة بعد 💊";
      const t = data[0] as any;
      return `💊 آخر مرة أخذت مكمل: ${t.logged_date}${t.supplements?.name ? ` (${t.supplements.name})` : ""}`;
    },
  });
  intents.push({ id: "last_time_weight", keywords: ["متى آخر مرة سجلت وزني", "امتى آخر مرة سجلت وزني", "متى اخر مرة وزنت حالي"], needsTime: false, priority: 93,
    handler: async () => {
      const { data } = await supabase.from("user_body_stats").select("weight, recorded_at").order("recorded_at", { ascending: false }).limit(1);
      if (!data?.[0]) return "ما في بيانات وزن بعد ⚖️";
      return `⚖️ آخر مرة سجلت وزنك: ${format(new Date(data[0].recorded_at), "yyyy-MM-dd")}\n💪 ${fmtNum(Number(data[0].weight))} كغ`;
    },
  });
  intents.push({ id: "last_time_movie", keywords: ["متى آخر مرة شفت فيلم", "امتى آخر مرة شفت فيلم", "متى اخر مرة شفت فلم"], needsTime: false, priority: 93,
    handler: async () => {
      const { data } = await supabase.from("media").select("title, created_at").eq("type", "movie").eq("status", "completed").order("created_at", { ascending: false }).limit(1);
      if (!data?.[0]) return "ما شفت أي فيلم بعد 🎬";
      return `🎬 آخر مرة شفت فيلم: ${format(new Date(data[0].created_at!), "yyyy-MM-dd")}\n🎬 ${data[0].title}`;
    },
  });


  // ══════════════════════════════════════════════════════════════════════════
  // NEW INTENTS v4 — Exercise PRs, Month spending, Record weight, etc.
  // ══════════════════════════════════════════════════════════════════════════

  // ── MOST USED EXERCISES ───────────────────────────────────────────────────
  intents.push({ id: "most_used_exercises", keywords: ["أكثر تمرين عملت", "أكثر تمارين عملتها", "اكثر تمرين عملت", "التمارين اللي أكثر", "تمرين أعمله أكثر", "أكثر تمارين", "شو تمريناتي الأكثر"], needsTime: false, priority: 78,
    handler: async () => {
      const { data } = await (supabase as any).from("exercise_sets").select("exercises(name, muscle_group)").limit(1000);
      if (!data || data.length === 0) return "ما في تمارين مسجلة بعد 🏋️";
      const byEx = new Map<string, { count: number; muscle: string }>();
      for (const row of data) {
        const name = (row as any).exercises?.name || "؟";
        const muscle = (row as any).exercises?.muscle_group || "";
        const prev = byEx.get(name) || { count: 0, muscle };
        byEx.set(name, { count: prev.count + 1, muscle });
      }
      const sorted = [...byEx.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 8);
      const lines = sorted.map((s, i) => `${i + 1}. ${s[0]} (${s[1].muscle}): ${s[1].count} سيت`);
      return `🏋️ أكثر تمارينك:\n${lines.join("\n")}`;
    },
  });

  // ── LAST SESSION FULL DETAILS ─────────────────────────────────────────────
  intents.push({ id: "last_session_full", keywords: ["تفاصيل تمريني الأخير", "تفاصيل اخر تمرين", "شو عملت بآخر تمرين", "شو عملت باخر تمرين", "تفاصيل التمرين الأخير", "تفاصيل آخر تمريني", "سيتات آخر تمرين", "سيتات اخر تمرين"], needsTime: false, priority: 79,
    handler: async () => {
      const { data: sessions } = await supabase.from("workout_sessions").select("id, scheduled_date, total_duration_minutes, muscle_groups, with_trainer").not("completed_at", "is", null).order("scheduled_date", { ascending: false }).limit(1);
      if (!sessions?.[0]) return "ما في تمارين مسجلة بعد 🏋️";
      const s = sessions[0];
      const { data: sets } = await (supabase as any).from("exercise_sets").select("set_number, weight, reps, exercises(name)").eq("session_id", s.id).order("set_number");
      if (!sets || sets.length === 0) return `🏋️ آخر تمرين: ${s.scheduled_date}\n💪 ${s.muscle_groups?.join("، ") || ""}\nما في سيتات مسجلة`;
      
      // Group by exercise
      const byEx = new Map<string, { sets: { w: number; r: number }[] }>();
      for (const set of sets) {
        const name = (set as any).exercises?.name || "؟";
        if (!byEx.has(name)) byEx.set(name, { sets: [] });
        byEx.get(name)!.sets.push({ w: Number(set.weight), r: Number(set.reps) });
      }
      const trainer = s.with_trainer ? " 👨‍💼 مع مدرب" : "";
      const dur = s.total_duration_minutes ? ` ⏱️ ${s.total_duration_minutes} دق` : "";
      let result = `🏋️ تمرين ${s.scheduled_date}${dur}${trainer}\n💪 ${s.muscle_groups?.join("، ") || ""}\n\n`;
      for (const [name, { sets: exSets }] of byEx) {
        const maxW = Math.max(...exSets.map(e => e.w));
        const setsStr = exSets.map((e, i) => `  سيت ${i+1}: ${e.w}كغ × ${e.r}`).join("\n");
        result += `📌 ${name} (أقوى: ${maxW}كغ)\n${setsStr}\n`;
      }
      return result.trim();
    },
  });

  // ── SUPPLEMENT REMAINING STOCK ────────────────────────────────────────────
  intents.push({ id: "supplement_stock", keywords: ["كم باقي من", "باقي من البروتين", "باقي مكملات", "مخزون مكملات", "كم باقي بروتين", "كم باقي مكمل", "كم جرعة باقية", "مخزون كمالات", "كم باقي عندي من"], needsTime: false, priority: 78,
    handler: async () => {
      const { data } = await supabase.from("supplements").select("name, remaining_doses, total_doses, dose_unit").order("name");
      if (!data || data.length === 0) return "ما في مكملات مسجلة بعد 💊";
      const lines = data.map(s => {
        const pct = s.total_doses ? ((Number(s.remaining_doses) / Number(s.total_doses)) * 100).toFixed(0) : "?";
        const warn = Number(s.remaining_doses) <= 10 ? " ⚠️" : Number(s.remaining_doses) <= 5 ? " 🚨" : "";
        return `💊 ${s.name}: ${fmtNum(Number(s.remaining_doses))} ${s.dose_unit || "جرعة"} (${pct}%)${warn}`;
      });
      return `📦 مخزون مكملاتك:\n${lines.join("\n")}`;
    },
  });

  // ── HEAVIEST LIFT EVER ────────────────────────────────────────────────────
  intents.push({ id: "heaviest_lift", keywords: ["أثقل اشي رفعتو", "اثقل اشي رفعتو", "أثقل وزن رفعتو", "اثقل وزن", "أقوى وزن رفعتو على الإطلاق", "أقوى رفعة", "أثقل سيت", "أقصى وزن"], needsTime: false, priority: 78,
    handler: async () => {
      const { data } = await (supabase as any).from("exercise_sets").select("weight, reps, exercises(name, muscle_group)").order("weight", { ascending: false }).limit(5);
      if (!data || data.length === 0) return "ما في سيتات مسجلة بعد 🏋️";
      const lines = data.map((s: any, i: number) => `${i+1}. ${s.exercises?.name || "؟"} (${s.exercises?.muscle_group || ""}): ${s.weight}كغ × ${s.reps}`);
      return `🏆 أثقل سيتاتك على الإطلاق:\n${lines.join("\n")}`;
    },
  });

  // ── TOTAL VOLUME LIFTED ───────────────────────────────────────────────────
  intents.push({ id: "total_volume", keywords: ["مجموع رفعاتي", "كم رفعت", "مجموع الأوزان", "إجمالي الرفع", "كم مجموع رفعاتي", "كم كيلو رفعت", "مجموع الكيلوات"], needsTime: true, priority: 77,
    handler: async (period) => {
      let q = (supabase as any).from("exercise_sets").select("weight, reps, workout_sessions!inner(scheduled_date, completed_at)");
      if (period?.from) q = q.gte("workout_sessions.scheduled_date", period.from);
      if (period?.to) q = q.lte("workout_sessions.scheduled_date", period.to);
      const { data } = await q.not("workout_sessions.completed_at", "is", null).limit(2000);
      if (!data || data.length === 0) return "ما في بيانات تمارين بهالفترة 🏋️";
      const total = data.reduce((s: number, row: any) => s + (Number(row.weight) * Number(row.reps)), 0);
      const sets = data.length;
      const periodLabel = period?.label || "من البداية";
      return `💪 مجموع رفعاتك ${periodLabel}:\n🏋️ ${fmtNum(total)} كغ (${sets} سيت)\n📊 معدل الحمل: ${fmtNum(total / sets)} كغ/سيت`;
    },
  });

  // ── TRAINER SESSIONS ──────────────────────────────────────────────────────
  intents.push({ id: "trainer_sessions", keywords: ["مع مدرب", "تمرين مدرب", "كم تمرين مع مدرب", "تمارين مدرب", "جلسات مدرب"], needsTime: true, priority: 77,
    handler: async (period) => {
      let q = supabase.from("workout_sessions").select("id, scheduled_date").eq("with_trainer", true).not("completed_at", "is", null);
      if (period?.from) q = q.gte("scheduled_date", period.from);
      if (period?.to) q = q.lte("scheduled_date", period.to);
      const { data } = await q.limit(100);
      const count = data?.length || 0;
      const periodLabel = period?.label || "من البداية";
      return count > 0
        ? `👨‍💼 تمرنت مع مدرب ${count} مرة ${periodLabel}`
        : `ما تمرنت مع مدرب ${periodLabel} 👨‍💼`;
    },
  });

  // ── SPENDING BY DAY OF WEEK ───────────────────────────────────────────────
  intents.push({ id: "day_of_week_spending", keywords: ["أغلى يوم بالأسبوع", "اغلى يوم بالاسبوع", "مصاريف حسب اليوم", "يوم الأسبوع", "مصاريف أيام الأسبوع", "توزيع حسب الأيام", "شو أغلى يوم", "كم صرفت كل يوم بالأسبوع"], needsTime: true, priority: 83,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount, date").eq("type", "expense");
      if (period?.from) q = q.gte("date", period.from);
      if (period?.to) q = q.lte("date", period.to);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في مصاريف بهالفترة 📭";
      const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const byDay = new Map<number, { total: number; count: number }>();
      for (const t of data) {
        const d = new Date(t.date).getDay();
        const prev = byDay.get(d) || { total: 0, count: 0 };
        byDay.set(d, { total: prev.total + Number(t.amount), count: prev.count + 1 });
      }
      const sorted = [0,1,2,3,4,5,6].map(d => ({ day: d, name: dayNames[d], ...(byDay.get(d) || { total: 0, count: 0 }) })).sort((a, b) => b.total - a.total);
      const periodLabel = period?.label || "من البداية";
      const lines = sorted.filter(d => d.total > 0).map((d, i) => `${i===0?"🏆":i===1?"🥈":i===2?"🥉":"  "} ${d.name}: ${fmtNum(d.total)} ₪ (${d.count} معاملة)`);
      return `📅 مصاريف حسب اليوم ${periodLabel}:\n${lines.join("\n")}`;
    },
  });

  // ── SPENDING TREND (month by month) ──────────────────────────────────────
  intents.push({ id: "spending_trend", keywords: ["مصاريفي رايحة لفوق", "اتجاه المصاريف", "ترند المصاريف", "هل مصاريفي زايدة", "مصاريفي بتزيد", "مصاريفي بتقل", "تطور مصاريفي", "اتجاه الصرف", "ترند الصرف"], needsTime: false, priority: 81,
    handler: async () => {
      const { data } = await supabase.from("transactions").select("amount, date").eq("type", "expense").limit(1000);
      if (!data || data.length === 0) return "ما في مصاريف بعد 📭";
      const byMonth = new Map<string, number>();
      for (const t of data) {
        const key = t.date.substring(0, 7);
        byMonth.set(key, (byMonth.get(key) || 0) + Number(t.amount));
      }
      const sorted = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      const last4 = sorted.slice(-4);
      if (last4.length < 2) return "ما في بيانات كافية للتحليل 📊";
      const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
      const lines = last4.map(([key, total]) => {
        const [y, m] = key.split("-");
        return `📅 ${monthNames[parseInt(m)-1]} ${y}: ${fmtNum(total)} ₪`;
      });
      const trend = last4[last4.length-1][1] > last4[0][1] ? "📈 صرفك عم يزيد" : "📉 صرفك عم يقل";
      const diff = last4[last4.length-1][1] - last4[last4.length-2][1];
      return `📊 اتجاه مصاريفك (آخر 4 شهور):\n${lines.join("\n")}\n\n${trend}\n${diff > 0 ? "📈" : "📉"} فرق آخر شهرين: ${fmtNum(Math.abs(diff))} ₪`;
    },
  });

  // ── INCOME BREAKDOWN ──────────────────────────────────────────────────────
  intents.push({ id: "income_breakdown", keywords: ["من وين دخلي", "مصادر الدخل", "مصادر دخلي", "دخلي من وين", "حسب مصدر الدخل", "توزيع الدخل"], needsTime: true, priority: 76,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount, description, categories(name), subcategories(name)").eq("type", "income");
      if (period?.from) q = q.gte("date", period.from);
      if (period?.to) q = q.lte("date", period.to);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في دخل مسجل بهالفترة 📭";
      const bySource = new Map<string, number>();
      for (const t of data as any[]) {
        const name = t.subcategories?.name || t.categories?.name || t.description || "غير محدد";
        bySource.set(name, (bySource.get(name) || 0) + Number(t.amount));
      }
      const total = [...bySource.values()].reduce((s, v) => s + v, 0);
      const sorted = [...bySource.entries()].sort((a, b) => b[1] - a[1]);
      const periodLabel = period?.label || "من البداية";
      const lines = sorted.map(([name, amt]) => `💵 ${name}: ${fmtNum(amt)} ₪ (${((amt/total)*100).toFixed(1)}%)`);
      return `💵 مصادر دخلك ${periodLabel}:\n${lines.join("\n")}\n\n💰 المجموع: ${fmtNum(total)} ₪`;
    },
  });

  // ── YEARS OVERVIEW ────────────────────────────────────────────────────────
  intents.push({ id: "yearly_overview", keywords: ["مصاريف السنة الفائتة", "مصاريف كل سنة", "ملخص سنوي", "كم صرفت السنة الفائتة", "سنة 2025", "سنة 2026", "مصاريف 2025", "مصاريف 2026"], needsTime: false, priority: 79,
    handler: async () => {
      const { data } = await supabase.from("transactions").select("amount, date").eq("type", "expense").limit(2000);
      if (!data || data.length === 0) return "ما في مصاريف بعد 📭";
      const byYear = new Map<string, number>();
      for (const t of data) {
        const y = t.date.substring(0, 4);
        byYear.set(y, (byYear.get(y) || 0) + Number(t.amount));
      }
      const sorted = [...byYear.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      const lines = sorted.map(([y, total]) => `📅 ${y}: ${fmtNum(total)} ₪`);
      return `📊 مصاريفك حسب السنة:\n${lines.join("\n")}`;
    },
  });

  // ── SPECIFIC MONTH SPENDING (now handled by detectMonthName, but add explicit intent) ──
  intents.push({ id: "month_spending_explicit", keywords: ["مصاريف شهر", "صرفت شهر", "كم صرفت ب", "مصاريف يناير", "مصاريف فبراير", "مصاريف مارس", "مصاريف أبريل", "مصاريف مايو", "مصاريف يونيو", "مصاريف يوليو", "مصاريف أغسطس", "مصاريف سبتمبر", "مصاريف أكتوبر", "مصاريف نوفمبر", "مصاريف ديسمبر"], needsTime: true, priority: 86,
    handler: async (period) => {
      if (!period?.from) return "حدد الشهر اللي بدك تعرف عنه 📅";
      let q = supabase.from("transactions").select("amount, category_id, categories(name)").eq("type", "expense").gte("date", period.from).lte("date", period.to!);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return `ما في مصاريف ${period.label} 📭`;
      const total = data.reduce((s, t) => s + Number(t.amount), 0);
      const byCat = new Map<string, number>();
      for (const t of data as any[]) {
        const name = t.categories?.name || "غير محدد";
        byCat.set(name, (byCat.get(name) || 0) + Number(t.amount));
      }
      const topCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
      const lines = topCats.map(([name, amt]) => `  📁 ${name}: ${fmtNum(amt)} ₪ (${((amt/total)*100).toFixed(0)}%)`);
      return `💰 مصاريف ${period.label}:\n💳 المجموع: ${fmtNum(total)} ₪\n\nأكثر فئات:\n${lines.join("\n")}`;
    },
  });

  // ── AVERAGE SPENDING PER VISIT (specific subcategory) - smarter version ──
  intents.push({ id: "avg_per_visit_place", keywords: ["معدل زيارة", "كم أصرف بالزيارة", "متوسط الزيارة", "كم أصرف كل مرة", "معدل الزيارة الواحدة"], needsTime: true, priority: 80,
    handler: async (period) => {
      let q = supabase.from("transactions").select("amount, subcategory_id, subcategories(name)").eq("type", "expense").not("subcategory_id", "is", null);
      if (period?.from) q = q.gte("date", period.from);
      if (period?.to) q = q.lte("date", period.to);
      const { data } = await q.limit(1000);
      if (!data || data.length === 0) return "ما في مصاريف بهالفترة 📭";
      const byPlace = new Map<string, { total: number; count: number }>();
      for (const t of data as any[]) {
        const name = t.subcategories?.name || "؟";
        const prev = byPlace.get(name) || { total: 0, count: 0 };
        byPlace.set(name, { total: prev.total + Number(t.amount), count: prev.count + 1 });
      }
      const sorted = [...byPlace.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 8);
      const periodLabel = period?.label || "من البداية";
      const lines = sorted.map(([name, { total, count }]) => `📍 ${name}: ${fmtNum(total/count)} ₪/زيارة (${count} مرة)`);
      return `📍 معدل الصرف بالزيارة ${periodLabel}:\n${lines.join("\n")}`;
    },
  });

  // ── NUMBER OF DAYS WITHOUT SPENDING ───────────────────────────────────────
  intents.push({ id: "zero_spending_days", keywords: ["كم يوم ما صرفت", "أيام بدون صرف", "كم يوم فاضي", "يوم ما صرفت فيه", "أيام ما صرفت"], needsTime: true, priority: 78,
    handler: async (period) => {
      let q = supabase.from("transactions").select("date").eq("type", "expense");
      if (period?.from) q = q.gte("date", period.from);
      if (period?.to) q = q.lte("date", period.to);
      const { data } = await q.limit(1000);
      if (!data) return "ما في بيانات 📭";
      const spendingDays = new Set(data.map(t => t.date)).size;
      const from = period?.from ? new Date(period.from) : new Date("2025-08-01");
      const to = period?.to ? new Date(period.to) : new Date();
      const totalDays = Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1;
      const zeroDays = totalDays - spendingDays;
      const periodLabel = period?.label || "من البداية";
      return `🎉 أيام بدون صرف ${periodLabel}: ${zeroDays} يوم من ${totalDays}\n💚 نسبة: ${((zeroDays/totalDays)*100).toFixed(1)}%`;
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

// ─── Learned aliases (localStorage) ─────────────────────────────────────────
const LEARNED_KEY = "assistant_learned_aliases";
function getLearnedAliases(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LEARNED_KEY) || "{}"); } catch { return {}; }
}
function saveLearnedAlias(userText: string, intentId: string) {
  const aliases = getLearnedAliases();
  aliases[userText.toLowerCase().trim()] = intentId;
  localStorage.setItem(LEARNED_KEY, JSON.stringify(aliases));
}
function matchLearnedAlias(text: string, intents: IntentDef[]): IntentDef | null {
  const aliases = getLearnedAliases();
  const intentId = aliases[text.toLowerCase().trim()];
  if (intentId) return intents.find(i => i.id === intentId) || null;
  return null;
}

// ─── Fuzzy similarity ───────────────────────────────────────────────────────
function wordSimilarity(a: string, b: string): number {
  const wordsA = a.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  const wordsB = b.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  
  let matches = 0;
  for (const wa of wordsA) {
    for (const wb of wordsB) {
      if (wa === wb) { matches += 1; break; }
      // Partial match: one contains the other
      if (wa.length > 2 && wb.length > 2 && (wa.includes(wb) || wb.includes(wa))) { matches += 0.7; break; }
    }
  }
  return matches / Math.max(wordsA.length, wordsB.length);
}

interface FuzzyMatch { intent: IntentDef; keyword: string; score: number; }
function findClosestIntent(text: string, intents: IntentDef[]): FuzzyMatch | null {
  if (text.trim().length < 3) return null;
  let best: FuzzyMatch | null = null;
  for (const intent of intents) {
    for (const kw of intent.keywords) {
      const score = wordSimilarity(text, kw);
      if (score > 0.5 && (!best || score > best.score)) {
        best = { intent, keyword: kw, score };
      }
    }
  }
  return best;
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
          <p key={i} className={i > 0 ? "mt-1" : ""}>
            {line.split(/(\[img:[^\]]+\])/).map((part, j) => {
              const imgMatch = part.match(/^\[img:(.+)\]$/);
              if (imgMatch) {
                return <img key={j} src={imgMatch[1]} alt="" className="inline-block h-5 w-5 rounded-sm align-middle mr-0.5" />;
              }
              return <span key={j}>{part}</span>;
            })}
          </p>
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
          {msg.reply_chips.map((chip) => {
            const isConfirm = chip.startsWith("✅");
            const isCancel = chip.startsWith("❌");
            const chipStyle = isConfirm
              ? { background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", color: "#22c55e" }
              : isCancel
              ? { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444" }
              : msg.clarification_type === "account"
              ? { background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.35)", color: "#60a5fa" }
              : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.65)" };
            return (
              <button key={chip} onClick={() => onChipClick(chip)} className="text-[11px] px-3 py-1.5 rounded-full font-medium transition-all active:scale-95 hover:brightness-110" style={chipStyle}>
                {chip}
              </button>
            );
          })}
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
  const [catSubData, setCatSubData] = useState<{ cats: CategoryRef[]; subs: SubcategoryRef[] }>({ cats: [], subs: [] });
  const [pendingExpense, setPendingExpense] = useState<PendingExpense | null>(null);
  const [accountsList, setAccountsList] = useState<{ id: string; name: string }[]>([]);
  const [pendingSuggestion, setPendingSuggestion] = useState<{ userText: string; intentId: string; keyword: string } | null>(null);
  const [exercisesList, setExercisesList] = useState<{ id: string; name: string; muscle_group: string }[]>([]);
  const [pendingWeight, setPendingWeight] = useState<number | null>(null);
  const lastPeriodRef = useRef<TimePeriod | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load categories + subcategories + accounts on mount
  useEffect(() => {
    (async () => {
      const [catRes, subRes, accRes] = await Promise.all([
        supabase.from("categories").select("id, name"),
        supabase.from("subcategories").select("id, name, category_id"),
        supabase.from("accounts").select("id, name"),
      ]);
      const cats: CategoryRef[] = catRes.data || [];
      const subs: SubcategoryRef[] = subRes.data || [];
      setCatSubData({ cats, subs });
      setAccountsList(accRes.data || []);
      setIntents(buildIntents(cats, subs));
      // Load exercises for PR/history queries
      const exRes = await (supabase as any).from("exercises").select("id, name, muscle_group");
      setExercisesList(exRes.data || []);
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
    // Convert Arabic/Eastern numerals to Western and strip emoji prefixes from chips
    const arabicToWestern = (s: string) => s.replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
    const stripEmoji = (s: string) => s.replace(/^[\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}]+\s*/u, "");
    // Also try to convert Arabic word numbers before normalization
    const wordNum = arabicWordsToNumber(text);
    const normalizedText = arabicToWestern(stripEmoji(wordNum !== null ? text.replace(/(?:واحد|اثنين|اثنان|ثلاثة|أربعة|اربعة|خمسة|ستة|سبعة|ثمانية|تسعة|عشرة|أحد عشر|اثني عشر|ثلاثة عشر|أربعة عشر|خمسة عشر|ستة عشر|سبعة عشر|ثمانية عشر|تسعة عشر|عشرين|ثلاثين|أربعين|اربعين|خمسين|ستين|سبعين|ثمانين|تسعين|مي[هة]|مائة|مئتين|ميتين|ثلاثمي[هة]|أربعمي[هة]|اربعمي[هة]|خمسمي[هة])(?:\s*و\s*(?:واحد|اثنين|ثلاثة|أربعة|خمسة|ستة|سبعة|ثمانية|تسعة|عشرة|عشرين|ثلاثين|أربعين|خمسين))?/, String(wordNum)) : text));

    const { period: detectedPeriod, cleaned } = detectTimePeriod(normalizedText);
    const period = forcedPeriod || detectedPeriod || lastPeriodRef.current;
    const textForMatch = cleaned || normalizedText;
    
    // Store last used period for follow-up questions
    if (forcedPeriod || detectedPeriod) {
      lastPeriodRef.current = forcedPeriod || detectedPeriod;
    }

    // ── Record weight flow: "سجلي وزني 67.5 كيلو" ──
    const weightRecordPatterns = [
      /(?:سجل(?:ي|لي)?|حط(?:لي)?|دوّن(?:لي)?)\s*(?:وزني|الوزن)\s*(\d+(?:[.,]\d+)?)/i,
      /وزني\s*(?:هلق|هلأ|الحين)?\s*(\d+(?:[.,]\d+)?)\s*(?:كيلو|كغ|kg)/i,
      /(\d+(?:[.,]\d+)?)\s*(?:كيلو|كغ|kg)\s*(?:وزني|وزن)/i,
    ];
    for (const pat of weightRecordPatterns) {
      const match = normalizedText.match(pat);
      if (match) {
        const weightVal = parseFloat((match[1] || match[2]).replace(",", "."));
        if (weightVal > 30 && weightVal < 250) {
          setPendingWeight(weightVal);
          return {
            content: `⚖️ تسجيل وزن جديد:\n💪 ${weightVal} كغ\n📅 ${format(new Date(), "yyyy-MM-dd")}\n\nمتأكد؟`,
            needs_clarification: true,
            clarification_type: "confirm_expense" as const,
            reply_chips: ["✅ سجله", "❌ إلغاء"],
          };
        }
      }
    }

    // ── Exercise PR query: "شو أقوى وزن بالـ X؟" ──
    const prPatterns = [
      /(?:PR|بي آر|أقوى وزن|اقوى وزن|أقصى وزن|ماكس|max)\s*(?:ب|بالـ|بال|بتمرين)?\s*(.+)/i,
      /(?:رفعتو|رفعت)\s*(?:بالـ|بال|بتمرين)?\s*(.+)/i,
      /(?:تطورت|كيف تطورت|كيف رحت|تقدمت)\s*(?:بالـ|بال|بتمرين)?\s*(.+)/i,
    ];
    for (const pat of prPatterns) {
      const match = (cleaned || normalizedText).match(pat);
      if (match) {
        const exerciseQuery = match[1].trim().replace(/[؟?!]/g, "").trim().toLowerCase();
        const found = exercisesList.find(ex =>
          ex.name.toLowerCase().includes(exerciseQuery) ||
          exerciseQuery.includes(ex.name.toLowerCase().split(" ")[0])
        );
        if (found) {
          const { data } = await (supabase as any)
            .from("exercise_sets")
            .select("weight, reps, set_number, workout_sessions!inner(scheduled_date)")
            .eq("exercise_id", found.id)
            .order("weight", { ascending: false })
            .limit(20);
          if (!data || data.length === 0) return { content: `ما في سيتات مسجلة لتمرين ${found.name} بعد 🏋️` };
          const maxWeight = data[0];
          const allSessions = [...new Map(data.map((d: any) => [d.workout_sessions?.scheduled_date, d])).values()].slice(0, 5);
          let result = `🏆 ${found.name} (${found.muscle_group})\n\n💪 PR: ${maxWeight.weight} كغ × ${maxWeight.reps} رeps (${(maxWeight as any).workout_sessions?.scheduled_date || ""})\n\nآخر 5 سيتات:\n`;
          result += data.slice(0, 5).map((d: any) => `  ${d.workout_sessions?.scheduled_date}: ${d.weight}كغ × ${d.reps}`).join("\n");
          return { content: result };
        }
        // Exercise not found, show partial matches
        const partials = exercisesList.filter(ex =>
          exerciseQuery.split(" ").some(w => w.length > 2 && ex.name.toLowerCase().includes(w))
        ).slice(0, 4);
        if (partials.length > 0) {
          return {
            content: `ما لقيت تمرين بالاسم الدقيق 🤔\nقصدك أحد هذول؟`,
            reply_chips: partials.map(ex => ex.name),
          };
        }
      }
    }

    // ── Smart expense detection: "صرفت 50 على أكل" or "30 شيكل قهوة" ──
    const expensePatterns = [
      /صرفت\s+(\d+(?:\.\d+)?)\s*(?:شيكل|شيقل|₪)?\s*(?:على|ع|ب|في|فـ)?\s*(.+)/i,
      /(\d+(?:\.\d+)?)\s*(?:شيكل|شيقل|₪)\s*(?:على|ع|ب|في|فـ)?\s*(.+)/i,
      /سجل(?:ي|لي)?\s+(\d+(?:\.\d+)?)\s*(?:شيكل|شيقل|₪)?\s*(?:على|ع|ب|في|فـ)?\s*(.+)/i,
      /حط(?:لي)?\s+(\d+(?:\.\d+)?)\s*(?:شيكل|شيقل|₪)?\s*(?:على|ع|ب|في|فـ)?\s*(.+)/i,
    ];

    for (const pat of expensePatterns) {
      const match = normalizedText.match(pat);
      if (match) {
        const amount = parseFloat(match[1]);
        const target = match[2].trim().replace(/[؟?!\.]/g, "").trim();
        if (amount > 0 && target.length > 0) {
          // Try to match target to subcategory first, then category
          const allNames = [
            ...catSubData.subs.map(s => ({ name: s.name.toLowerCase(), type: "sub" as const, id: s.id, displayName: s.name, category_id: s.category_id })),
            ...catSubData.cats.map(c => ({ name: c.name.toLowerCase(), type: "cat" as const, id: c.id, displayName: c.name, category_id: c.id })),
          ].sort((a, b) => b.name.length - a.name.length);

          const lower = target.toLowerCase();
          let matched = allNames.find(n => lower.includes(n.name) || n.name.includes(lower));

          const expense: PendingExpense = { amount, description: target };
          if (matched) {
            if (matched.type === "sub") {
              expense.subcategory_id = matched.id;
              expense.subcategory_name = matched.displayName;
              expense.category_id = matched.category_id;
              const parentCat = catSubData.cats.find(c => c.id === matched!.category_id);
              expense.category_name = parentCat?.name;
            } else {
              expense.category_id = matched.id;
              expense.category_name = matched.displayName;
            }
          }

          // If only one account, auto-select it
          if (accountsList.length === 1) {
            expense.account_id = accountsList[0].id;
            expense.account_name = accountsList[0].name;
            setPendingExpense(expense);
            const catLabel = expense.subcategory_name || expense.category_name || target;
            return {
              content: `🧾 تأكيد الصرفة:\n💰 ${fmtNum(amount)} ₪\n📍 ${catLabel}\n🏦 ${accountsList[0].name}\n📅 ${format(new Date(), "yyyy-MM-dd")}\n\nمتأكد؟`,
              needs_clarification: true,
              clarification_type: "confirm_expense" as const,
              reply_chips: ["✅ أكيد سجلها", "❌ لا إلغاء"],
            };
          }

          // Multiple accounts → ask which one
          setPendingExpense(expense);
          const catLabel = expense.subcategory_name || expense.category_name || target;
          return {
            content: `🧾 صرفة ${fmtNum(amount)} ₪ على ${catLabel}\nمن أي حساب بدك تسجلها؟ 🏦`,
            needs_clarification: true,
            clarification_type: "account" as const,
            reply_chips: accountsList.map(a => a.name),
          };
        }
      }
    }

    // Try learned aliases first, then exact match
    const intent = matchLearnedAlias(textForMatch, intents) || matchIntent(textForMatch, intents);

    if (intent) {
      // ── Special handling for comparison intent ──
      if (intent.id === "compare_categories") {
        // Find two names in the text
        const allNames = [
          ...catSubData.cats.map(c => ({ name: c.name.toLowerCase(), type: "cat" as const, id: c.id, displayName: c.name })),
          ...catSubData.subs.map(s => ({ name: s.name.toLowerCase(), type: "sub" as const, id: s.id, displayName: s.name })),
        ].sort((a, b) => b.name.length - a.name.length);

        const lower = textForMatch.toLowerCase();
        const found: { name: string; type: "cat" | "sub"; id: string; displayName: string; idx: number }[] = [];
        for (const item of allNames) {
          const idx = lower.indexOf(item.name);
          if (idx !== -1) {
            const overlaps = found.some(f => Math.abs(f.idx - idx) < Math.max(f.name.length, item.name.length));
            if (!overlaps) found.push({ ...item, idx });
          }
        }
        found.sort((a, b) => a.idx - b.idx);

        if (found.length < 2) {
          // Fall through to monthly_comparison or other intents
          const fallbackIntent = intents.find(i => i.id !== "compare_categories" && i.keywords.some(kw => textForMatch.toLowerCase().includes(kw.toLowerCase())));
          if (fallbackIntent) {
            if (fallbackIntent.needsTime && !period) {
              setPendingQuestion(text);
              return { content: "لأي فترة بدك تعرف؟ 📅", needs_clarification: true, clarification_type: "time" as const };
            }
            const reply = await fallbackIntent.handler(period, undefined);
            return { content: reply };
          }
          return { content: "عشان أقارن، لازم تذكر فئتين أو مكانين 🔄\nمثال: قارن الأكل مع الطلعات هالشهر" };
        }

        if (intent.needsTime && !period) {
          setPendingQuestion(text);
          return { content: "لأي فترة بدك تقارن؟ 📅", needs_clarification: true, clarification_type: "time" as const };
        }

        const [a, b] = [found[0], found[1]];
        const colA = a.type === "cat" ? "category_id" : "subcategory_id";
        const colB = b.type === "cat" ? "category_id" : "subcategory_id";

        let qA = supabase.from("transactions").select("amount").eq("type", "expense").eq(colA, a.id);
        let qB = supabase.from("transactions").select("amount").eq("type", "expense").eq(colB, b.id);
        if (period?.from) { qA = qA.gte("date", period.from); qB = qB.gte("date", period.from); }
        if (period?.to) { qA = qA.lte("date", period.to); qB = qB.lte("date", period.to); }

        const [resA, resB] = await Promise.all([qA.limit(1000), qB.limit(1000)]);
        const totalA = (resA.data || []).reduce((s, t) => s + Number(t.amount), 0);
        const totalB = (resB.data || []).reduce((s, t) => s + Number(t.amount), 0);
        const countA = resA.data?.length || 0;
        const countB = resB.data?.length || 0;
        const periodLabel = period?.label || "من البداية";
        const diff = totalA - totalB;
        const winner = diff > 0 ? a.displayName : diff < 0 ? b.displayName : null;
        const pct = Math.min(totalA, totalB) > 0 ? ((Math.abs(diff) / Math.min(totalA, totalB)) * 100).toFixed(0) : "—";

        let result = `🔄 مقارنة ${periodLabel}:\n\n`;
        result += `📁 ${a.displayName}: ${fmtNum(totalA)} ₪ (${countA} معاملة)\n`;
        result += `📁 ${b.displayName}: ${fmtNum(totalB)} ₪ (${countB} معاملة)\n\n`;
        if (winner) {
          result += `${diff > 0 ? "⬆️" : "⬇️"} ${winner} أكثر بـ ${fmtNum(Math.abs(diff))} ₪ (${pct}%)`;
        } else {
          result += "↔️ نفس المبلغ بالظبط!";
        }
        return { content: result };
      }

      // ── Special handling for last transaction by account ──
      if (intent.id === "last_transaction_by_account") {
        // Try to find account name in text
        const { data: accounts } = await supabase.from("accounts").select("id, name");
        if (accounts && accounts.length > 0) {
          const lower = textForMatch.toLowerCase();
          const matched = accounts.find(a => lower.includes(a.name.toLowerCase()));
          if (matched) {
            const { data } = await supabase.from("transactions").select("amount, date, time, description, type, category_id, subcategory_id, categories(name), subcategories(name)").eq("type", "expense").eq("account_id", matched.id).order("date", { ascending: false }).order("time", { ascending: false }).limit(1);
            if (!data || data.length === 0) return { content: `ما في مصاريف من حساب ${matched.name} بعد 📭` };
            const t = data[0] as any;
            const place = t.subcategories?.name || t.categories?.name || "غير محدد";
            return { content: `💳 آخر مصروف من ${matched.name}:\n💰 ${fmtNum(Number(t.amount))} ₪\n📍 ${place}${t.description ? `\n📝 ${t.description}` : ""}\n📅 ${t.date}${t.time ? " " + t.time.substring(0, 5) : ""}` };
          }
          // Account not found, list available accounts
          const names = accounts.map(a => a.name).join("، ");
          return { content: `ما لقيت الحساب 🤔\nحساباتك: ${names}\nجرب: شو آخر اشي صرفتو بال[اسم الحساب]` };
        }
        return { content: "ما في حسابات مسجلة بعد 🏦" };
      }

      // If intent needs time and none provided, ask for clarification
      if (intent.needsTime && !period) {
        setPendingQuestion(text);
        return {
          content: "لأي فترة بدك تعرف؟ 📅",
          needs_clarification: true,
          clarification_type: "time" as const,
        };
      }
      const reply = await intent.handler(period, undefined, normalizedText);
      
      // ── Universal follow-up chips system ──
      const followUpMap: Record<string, string[]> = {
        // Finance
        total_spending: ["📊 حسب الفئات", "📍 حسب الأماكن", "💳 آخر 5 معاملات", "🔄 قارن مصاريف هالشهر مع الشهر الفائت", "⏰ متى آخر مرة صرفت؟"],
        daily_average: ["📊 حسب الفئات", "📍 حسب الأماكن", "📊 معدل أسبوعي", "🔄 قارن المعدل اليومي"],
        weekly_average: ["📊 معدل يومي", "📊 حسب الفئات", "🔄 قارن المعدل الأسبوعي"],
        monthly_average: ["📊 معدل يومي", "📈 لخصلي الشهر", "🔄 قارن المعدلات"],
        monthly_comparison: ["📊 حسب الفئات", "📍 حسب الأماكن", "💳 آخر 5 معاملات"],
        compare_daily_average: ["📊 قارن المعدل الأسبوعي", "📊 المعدل حسب الفئات", "💰 كم صرفت هالشهر؟"],
        compare_weekly_average: ["📊 قارن المعدل اليومي", "📊 المعدل حسب الفئات", "💰 كم صرفت هالشهر؟"],
        compare_monthly_average: ["📊 المعدل حسب الفئات", "📍 حسب الأماكن", "📊 معدل الصرف حسب الفئات"],
        avg_spending_by_category: ["📊 حسب الفئات", "📍 حسب الأماكن", "📊 معدل يومي", "🔄 قارن المعدل اليومي"],
        top_spending_categories: ["📍 حسب الأماكن", "💰 كم صرفت هالشهر؟", "🔄 قارن مصاريف هالشهر مع الشهر الفائت"],
        top_spending_places: ["📊 حسب الفئات", "💰 كم صرفت هالشهر؟", "🔄 قارن مصاريف هالشهر مع الشهر الفائت"],
        category_percentages: ["📍 حسب الأماكن", "💳 آخر 5 معاملات", "💰 كم صرفت هالشهر؟"],
        total_income: ["💳 كم صرفت هالشهر؟", "📈 الصافي هالشهر", "📊 لخصلي الشهر"],
        net_balance: ["📊 حسب الفئات", "📍 حسب الأماكن", "📈 لخصلي الشهر"],
        last_transaction: ["💳 آخر 5 معاملات", "💰 كم صرفت اليوم؟", "📊 كم صرفت هالشهر؟"],
        last_5_transactions: ["💰 كم صرفت هالشهر؟", "📊 حسب الفئات", "📍 أكثر مكان صرفت فيه"],
        today_transactions: ["💰 كم صرفت هالشهر؟", "📊 حسب الفئات", "📊 معدل يومي"],
        biggest_transaction: ["💳 آخر 5 معاملات", "📊 حسب الفئات"],
        smallest_transaction: ["💳 آخر 5 معاملات", "💸 أغلى معاملة هالشهر"],
        most_expensive_month: ["📊 لخصلي الشهر", "💰 كم صرفت هالسنة؟"],
        most_expensive_day: ["💳 آخر 5 معاملات", "📊 معدل يومي"],
        account_balances: ["💰 كم صرفت هالشهر؟", "📈 كم دخلي هالشهر؟", "📊 لخصلي الشهر"],
        transactions_count: ["📊 حسب الفئات", "💳 آخر 5 معاملات"],
        most_used_account: ["💳 كم رصيدي بالحسابات؟", "💰 كم صرفت هالشهر؟"],
        unused_categories: ["📊 حسب الفئات", "💰 كم صرفت هالشهر؟"],
        evening_spending: ["☀️ كم صرفت بالصبح؟", "💰 كم صرفت هالشهر؟"],
        morning_spending: ["🌙 كم صرفت بالمسا؟", "💰 كم صرفت هالشهر؟"],
        weekend_spending: ["📊 معدل يومي", "💰 كم صرفت هالشهر؟"],
        transfers_count: ["💳 كم رصيدي بالحسابات؟"],
        unique_places_count: ["📍 أكثر مكان صرفت فيه", "📊 حسب الفئات"],
        last_time_expense: ["💳 آخر 5 معاملات", "💰 كم صرفت هالشهر؟", "📊 شو صرفت اليوم؟"],
        // Health - Weight
        current_weight: ["📉 أقل وزن وصلتلو", "📈 أعلى وزن وصلتلو", "⚖️ فرق وزني", "📋 آخر 3 أوزان", "⏰ متى آخر مرة سجلت وزني؟"],
        weight_change: ["📉 أقل وزن وصلتلو", "📈 أعلى وزن وصلتلو", "📋 آخر 3 أوزان"],
        weight_comparison: ["📉 أقل وزن وصلتلو", "📈 أعلى وزن وصلتلو", "⚖️ فرق وزني"],
        lowest_weight: ["📈 أعلى وزن وصلتلو", "⚖️ شو وزني هلق؟", "📋 آخر 3 أوزان"],
        highest_weight: ["📉 أقل وزن وصلتلو", "⚖️ شو وزني هلق؟", "📋 آخر 3 أوزان"],
        last_3_weights: ["⚖️ شو وزني هلق؟", "⚖️ فرق وزني"],
        last_time_weight: ["⚖️ شو وزني هلق؟", "📋 آخر 3 أوزان", "⚖️ فرق وزني"],
        // Health - Workout
        workouts_count: ["💪 أكثر عضلة اشتغلت عليها", "⏱️ كم ساعة تمرين", "📋 تفاصيل آخر تمرين", "🔥 كم يوم متتالي تمرنت؟", "⏰ متى آخر مرة تمرنت؟"],
        last_workout: ["💪 أكثر عضلة اشتغلت عليها", "⏱️ كم ساعة تمرين", "📋 تفاصيل آخر تمرين"],
        last_workout_detail: ["💪 أكثر عضلة اشتغلت عليها", "🔥 كم يوم متتالي تمرنت؟", "💪 كم مرة تمرنت هالشهر؟"],
        most_trained_muscle: ["💪 كم مرة تمرنت هالشهر؟", "⏱️ كم ساعة تمرين", "📋 تفاصيل آخر تمرين"],
        total_workout_hours: ["💪 كم مرة تمرنت هالشهر؟", "⏱️ معدل مدة التمرين"],
        avg_workout_duration: ["💪 كم مرة تمرنت هالشهر؟", "⏱️ كم ساعة تمرين هالشهر؟"],
        workout_streak: ["💪 كم مرة تمرنت هالشهر؟", "📋 تفاصيل آخر تمرين"],
        workout_comparison: ["💪 كم مرة تمرنت هالشهر؟", "⏱️ كم ساعة تمرين"],
        last_time_workout: ["📋 تفاصيل آخر تمرين", "💪 كم مرة تمرنت هالشهر؟", "🔥 كم يوم متتالي تمرنت؟"],
        // Prayer
        prayer_count: ["🌅 كم فجر صليت؟", "🕌 أكثر صلاة صليتها", "✅ كم يوم صليت كل الصلوات؟", "🔥 ستريك فجر"],
        fajr_count: ["🕌 كم صلاة صليت هالشهر؟", "🔥 كم يوم متتالي صليت الفجر؟", "✅ كم يوم صليت كل الصلوات؟"],
        prayer_dhuhr: ["🕌 كم صلاة صليت هالشهر؟", "🌅 كم فجر صليت؟"],
        prayer_asr: ["🕌 كم صلاة صليت هالشهر؟", "🌅 كم فجر صليت؟"],
        prayer_maghrib: ["🕌 كم صلاة صليت هالشهر؟", "🌅 كم فجر صليت؟"],
        prayer_isha: ["🕌 كم صلاة صليت هالشهر؟", "🌅 كم فجر صليت؟"],
        most_prayed: ["🌅 كم فجر صليت؟", "✅ كم يوم صليت كل الصلوات؟"],
        full_prayer_days: ["🕌 كم صلاة صليت هالشهر؟", "🔥 ستريك فجر"],
        fajr_streak: ["🌅 كم فجر صليت هالشهر؟", "✅ كم يوم صليت كل الصلوات؟"],
        prayer_comparison: ["🌅 كم فجر صليت؟", "✅ كم يوم صليت كل الصلوات؟"],
        last_time_fajr: ["🌅 كم فجر صليت هالشهر؟", "🔥 كم يوم متتالي صليت الفجر؟", "🕌 كم صلاة صليت هالشهر؟"],
        // Supplements
        supplements_today: ["💊 أكثر مكمل استخدمتو", "📅 كم يوم أخذت كمالات هالشهر؟", "💊 آخر مكمل أخذتو", "⏰ متى آخر مرة أخذت مكمل؟"],
        most_used_supplement: ["💊 كم يوم أخذت كمالات هالشهر؟", "💊 آخر مكمل أخذتو"],
        last_supplement: ["💊 أكثر مكمل استخدمتو", "📅 كم يوم أخذت كمالات هالشهر؟"],
        supplement_doses_count: ["💊 أكثر مكمل استخدمتو", "💊 آخر مكمل أخذتو"],
        supplement_days_count: ["💊 أكثر مكمل استخدمتو", "💊 كمالاتي اليوم"],
        last_time_supplement: ["💊 كمالاتي اليوم", "💊 أكثر مكمل استخدمتو", "📅 كم يوم أخذت كمالات هالشهر؟"],
        // Entertainment - Movies/Series
        watching_now: ["🎬 آخر فيلم شفته", "📺 كم حلقة شفت؟", "⭐ أعلى تقييم فيلم"],
        media_count: ["🎬 آخر فيلم شفته", "📺 شو بتشاهد هلق؟", "🎬 أفلام بدي أشوفها"],
        movies_watched: ["🎬 آخر فيلم شفته", "⭐ أحسن فيلم", "🎬 اقترح فيلم أشوفه"],
        episodes_watched: ["📺 شو بتشاهد هلق؟", "📺 آخر مسلسل بلشته"],
        last_movie: ["⭐ أحسن فيلم", "🎬 اقترح فيلم أشوفه", "📺 كم فيلم شفت؟"],
        last_series: ["📺 شو بتشاهد هلق؟", "📺 كم حلقة شفت؟"],
        best_movie: ["🎬 آخر فيلم شفته", "🎬 اقترح فيلم أشوفه"],
        highest_rated_movie: ["🎬 آخر فيلم شفته", "🎬 أحسن فيلم"],
        highest_rated_series: ["📺 شو بتشاهد هلق؟", "📺 آخر مسلسل بلشته"],
        suggest_movie: ["🎬 آخر فيلم شفته", "📺 شو بتشاهد هلق؟", "🎬 أفلام بدي أشوفها"],
        want_to_watch_movies: ["🎬 اقترح فيلم أشوفه", "📺 شو بتشاهد هلق؟"],
        want_to_watch_series: ["📺 شو بتشاهد هلق؟", "📺 كم حلقة شفت؟"],
        compare_media_types: ["🎬 كم فيلم شفت؟", "📺 كم حلقة شفت؟"],
        last_time_movie: ["🎬 آخر فيلم شفته", "🎬 اقترح فيلم أشوفه", "📺 شو بتشاهد هلق؟"],
        // Games
        games_count: ["🎮 كم صرفت على الألعاب؟", "🎮 أغلى لعبة عندي", "⭐ أعلى لعبة تقييم"],
        games_by_platform: ["🎮 كم لعبة عندي؟", "🎮 كم صرفت على الألعاب؟"],
        games_total_spent: ["🎮 أغلى لعبة عندي", "🎮 كم لعبة عندي؟"],
        most_expensive_game: ["🎮 كم صرفت على الألعاب؟", "🎮 كم لعبة عندي؟"],
        top_game: ["🎮 كم لعبة عندي؟", "🎮 كم صرفت على الألعاب؟"],
        // Dreams
        active_dreams: ["🌟 أقرب للإكمال", "📋 كم خطوة باقي؟", "✅ كم حلم حققت؟", "📊 تقدم أحلامي"],
        all_dreams: ["🌟 أقرب للإكمال", "✅ كم حلم حققت؟", "📊 تقدم أحلامي"],
        completed_dreams: ["🌟 أقرب للإكمال", "📊 تقدم أحلامي", "🌟 شو أحلامي؟"],
        closest_to_complete: ["📋 كم خطوة باقي؟", "📊 تقدم أحلامي", "🌟 شو أحلامي؟"],
        remaining_steps: ["🌟 أقرب للإكمال", "📊 تقدم أحلامي"],
        dreams_overall_progress: ["🌟 أقرب للإكمال", "📋 كم خطوة باقي؟", "✅ كم حلم حققت؟"],
        last_added_dream: ["📊 تقدم أحلامي", "🌟 شو أحلامي؟"],
        // Schedule
        schedule_today: ["📋 شو عندي بكرا؟", "✅ كم مهمة خلصت هالأسبوع؟"],
        tomorrow_schedule: ["📋 شو عندي اليوم؟", "✅ كم مهمة خلصت هالأسبوع؟"],
        completed_tasks: ["📋 شو عندي اليوم؟", "📋 شو عندي بكرا؟"],
        // Summary
        monthly_summary: ["📊 حسب الفئات", "📍 حسب الأماكن", "💪 كم مرة تمرنت هالشهر؟", "🕌 كم صلاة صليت هالشهر؟"],
        // New v4 intents
        most_used_exercises: ["🏆 أثقل اشي رفعتو؟", "💪 تفاصيل تمريني الأخير", "⏱️ كم ساعة تمرين هالشهر؟", "💪 كم مجموع رفعاتي؟"],
        last_session_full: ["💪 أكثر تمارين عملتها؟", "🏆 أثقل اشي رفعتو؟", "💪 كم مرة تمرنت هالشهر؟"],
        supplement_stock: ["💊 كمالاتي اليوم", "💊 أكثر مكمل استخدمتو", "💊 متى آخر مرة أخذت مكمل؟"],
        heaviest_lift: ["💪 أكثر تمارين عملتها؟", "💪 تفاصيل تمريني الأخير", "💪 كم مجموع رفعاتي؟"],
        total_volume: ["🏆 أثقل اشي رفعتو؟", "💪 أكثر تمارين عملتها؟", "⏱️ كم ساعة تمرين هالشهر؟"],
        trainer_sessions: ["💪 كم مرة تمرنت هالشهر؟", "🏋️ تفاصيل تمريني الأخير"],
        day_of_week_spending: ["📊 معدل يومي", "📍 أكثر مكان صرفت فيه", "💰 كم صرفت هالشهر؟"],
        spending_trend: ["📊 حسب الفئات", "📍 حسب الأماكن", "🔄 قارن مصاريف هالشهر مع الشهر الفائت"],
        income_breakdown: ["💳 كم صرفت هالشهر؟", "📈 الصافي هالشهر", "📊 لخصلي الشهر"],
        yearly_overview: ["📊 لخصلي الشهر", "📊 أغلى شهر عندي؟", "📊 مصاريف يناير"],
        month_spending_explicit: ["📊 حسب الفئات", "📍 أكثر مكان صرفت فيه", "🔄 قارن مع الشهر الفائت"],
        avg_per_visit_place: ["📊 معدل يومي", "📍 أكثر الأماكن هالشهر", "💰 كم صرفت هالشهر؟"],
        zero_spending_days: ["💰 كم صرفت هالشهر؟", "📊 معدل يومي", "📅 أكثر يوم صرفت فيه"],
      };

      const chips = followUpMap[intent.id];
      if (chips && chips.length > 0) {
        return { content: reply, reply_chips: chips };
      }
      
      // For dynamic subcategory/category spending intents, add generic follow-ups
      if ((intent.id.startsWith("spending_at_") || intent.id.startsWith("spending_cat_"))) {
        const pl = period?.label || "هالشهر";
        return { content: reply, reply_chips: [`💰 كم صرفت ${pl}؟`, `📍 أكثر الأماكن ${pl}`, `📊 أكثر الفئات ${pl}`, "⏰ متى آخر مرة صرفت؟"] };
      }
      
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

    // ── Fuzzy matching: suggest closest intent ──
    const fuzzy = findClosestIntent(textForMatch, intents);
    if (fuzzy) {
      setPendingSuggestion({ userText: textForMatch, intentId: fuzzy.intent.id, keyword: fuzzy.keyword });
      return {
        content: `هل تقصد: "${fuzzy.keyword}"؟ 🤔`,
        reply_chips: ["✅ أيوا", "❌ لا"],
      };
    }

    return { content: "ما عندي جواب لهالسؤال بعد 🤔\nجرب تسأل بطريقة ثانية أو اختار من الأسئلة المقترحة!" };
  }, [intents, catSubData, accountsList, exercisesList]);

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
        reply_chips: result.reply_chips,
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
    // ── Handle fuzzy suggestion confirmation ──
    if (pendingSuggestion && (chip === "✅ أيوا" || chip === "❌ لا")) {
      addMsg({ role: "user", content: chip });
      if (chip === "❌ لا") {
        setPendingSuggestion(null);
        addMsg({ role: "assistant", content: "ما فهمت سؤالك، جرب بطريقة ثانية 🤔" });
        return;
      }
      // Save the alias and execute
      saveLearnedAlias(pendingSuggestion.userText, pendingSuggestion.intentId);
      setLoading(true);
      try {
        const result = await processQuestion(pendingSuggestion.keyword);
        addMsg({
          role: "assistant",
          content: result.content,
          needs_clarification: result.needs_clarification,
          clarification_type: result.clarification_type,
          reply_chips: result.reply_chips,
        });
      } catch {
        addMsg({ role: "assistant", content: "صار خطأ، جرب مرة ثانية 😕" });
      } finally {
        setLoading(false);
        setPendingSuggestion(null);
      }
      return;
    }

    // ── Handle weight recording ──
    if (pendingWeight !== null && (chip === "✅ سجله" || chip === "❌ إلغاء")) {
      addMsg({ role: "user", content: chip });
      if (chip === "❌ إلغاء") {
        setPendingWeight(null);
        addMsg({ role: "assistant", content: "تم الإلغاء ❌" });
        return;
      }
      setLoading(true);
      try {
        const { error } = await supabase.from("user_body_stats").insert({
          weight: pendingWeight,
          recorded_at: new Date().toISOString(),
        });
        if (error) throw error;
        addMsg({ role: "assistant", content: `✅ تم تسجيل وزنك: ${pendingWeight} كغ\n📅 ${format(new Date(), "yyyy-MM-dd")}` });
        setPendingWeight(null);
      } catch (err) {
        console.error("Weight insert error:", err);
        addMsg({ role: "assistant", content: "صار خطأ بالتسجيل 😕 جرب مرة ثانية" });
        setPendingWeight(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Handle expense confirmation ──
    if (pendingExpense && (chip === "✅ أكيد سجلها" || chip === "❌ لا إلغاء")) {
      addMsg({ role: "user", content: chip });
      if (chip === "❌ لا إلغاء") {
        setPendingExpense(null);
        addMsg({ role: "assistant", content: "تم الإلغاء ❌" });
        return;
      }
      // Insert the transaction
      setLoading(true);
      try {
        const now = new Date();
        const { error } = await supabase.from("transactions").insert({
          amount: pendingExpense.amount,
          type: "expense",
          date: format(now, "yyyy-MM-dd"),
          time: format(now, "HH:mm:ss"),
          account_id: pendingExpense.account_id!,
          category_id: pendingExpense.category_id || null,
          subcategory_id: pendingExpense.subcategory_id || null,
          description: pendingExpense.description || null,
        });
        if (error) throw error;

        // Update account balance
        const { data: acc } = await supabase.from("accounts").select("amount").eq("id", pendingExpense.account_id!).single();
        if (acc) {
          await supabase.from("accounts").update({ amount: Number(acc.amount) - pendingExpense.amount }).eq("id", pendingExpense.account_id!);
        }

        const catLabel = pendingExpense.subcategory_name || pendingExpense.category_name || pendingExpense.description || "";
        addMsg({ role: "assistant", content: `✅ تم تسجيل ${fmtNum(pendingExpense.amount)} ₪ على ${catLabel} من ${pendingExpense.account_name}!\n📅 ${format(now, "yyyy-MM-dd")} ${format(now, "HH:mm")}` });
        setPendingExpense(null);
      } catch (err) {
        console.error("Insert error:", err);
        addMsg({ role: "assistant", content: "صار خطأ بالتسجيل 😕 جرب مرة ثانية" });
        setPendingExpense(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Handle account selection for pending expense ──
    if (pendingExpense && !pendingExpense.account_id) {
      const selectedAcc = accountsList.find(a => a.name === chip);
      if (selectedAcc) {
        addMsg({ role: "user", content: chip });
        const updated = { ...pendingExpense, account_id: selectedAcc.id, account_name: selectedAcc.name };
        setPendingExpense(updated);
        const catLabel = updated.subcategory_name || updated.category_name || updated.description || "";
        addMsg({
          role: "assistant",
          content: `🧾 تأكيد الصرفة:\n💰 ${fmtNum(updated.amount)} ₪\n📍 ${catLabel}\n🏦 ${selectedAcc.name}\n📅 ${format(new Date(), "yyyy-MM-dd")}\n\nمتأكد؟`,
          needs_clarification: true,
          clarification_type: "confirm_expense",
          reply_chips: ["✅ أكيد سجلها", "❌ لا إلغاء"],
        });
        return;
      }
    }

    // ── Time chip for pending question ──
    if (pendingQuestion && TIME_CHIPS.includes(chip)) {
      addMsg({ role: "user", content: chip });
      setLoading(true);
      setPendingQuestion(null);

      try {
        const { period } = detectTimePeriod(chip);
        const result = await processQuestion(pendingQuestion, period || undefined);
        addMsg({
          role: "assistant",
          content: result.content,
          needs_clarification: result.needs_clarification,
          clarification_type: result.clarification_type,
          reply_chips: result.reply_chips,
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
  }, [pendingQuestion, pendingExpense, pendingSuggestion, accountsList, processQuestion, callAssistant]);

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
