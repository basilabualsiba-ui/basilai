/**
 * PushService — Web Push via Supabase edge function.
 * Works on iOS 16.4+ PWA (home screen) and all modern browsers.
 * Notifications fire even when app is fully closed.
 */

const VAPID_PUBLIC = "BOI3s8tzm1ZiwM9MOzdvLX42C6aMjjMOEcJaLliaBPJELCQrzr2YjlxlCQ22lLFC5we7V-apvg68odRKCN0mE1w";
const PUSH_FN = "https://sfreodzibxmniiccqpcl.supabase.co/functions/v1/web-push";

function urlB64ToUint8Array(b64: string): Uint8Array {
  const pad = b64.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - b64.length % 4) % 4);
  return Uint8Array.from(atob(pad), c => c.charCodeAt(0));
}

async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

async function getPushSubscription(): Promise<PushSubscription | null> {
  const reg = await getSwRegistration();
  if (!reg) return null;
  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC) as any,
      });
    }
    return sub;
  } catch {
    return null;
  }
}

async function callFn(body: object) {
  try {
    const res = await fetch(PUSH_FN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  } catch {
    return null;
  }
}

/** Call on app load — registers push subscription and saves to DB */
export async function initPush(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "denied") return false;
  if (Notification.permission === "default") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return false;
  }
  const sub = await getPushSubscription();
  if (!sub) return false;
  await callFn({
    action: "save_subscription",
    subscription: sub.toJSON(),
    user_agent: navigator.userAgent,
  });
  return true;
}

/** Schedule a push notification at a future time via the server */
export async function schedulePush(opts: {
  tag: string;
  title: string;
  body: string;
  sendAt: Date;
  data?: object;
}) {
  return callFn({
    action: "schedule",
    tag: opts.tag,
    title: opts.title,
    body: opts.body,
    data: opts.data || {},
    send_at: opts.sendAt.toISOString(),
  });
}

/** Schedule all 5 prayer push notifications for today (15 min before each) */
export async function schedulePrayerPushes(
  prayerTimes: Record<string, string>,
  reminderMinutes = 15
) {
  const prayers = [
    { key: "fajr",    name: "Fajr",    emoji: "🌅" },
    { key: "dhuhr",   name: "Dhuhr",   emoji: "☀️" },
    { key: "asr",     name: "Asr",     emoji: "🌇" },
    { key: "maghrib", name: "Maghrib", emoji: "🌆" },
    { key: "isha",    name: "Isha",    emoji: "🌙" },
  ];
  const now   = new Date();
  const today = now.toDateString().replace(/ /g, "_");

  for (const p of prayers) {
    const timeStr = prayerTimes[p.key];
    if (!timeStr) continue;
    const [h, m] = timeStr.split(":").map(Number);
    const prayerDate = new Date();
    prayerDate.setHours(h, m, 0, 0);
    const sendAt = new Date(prayerDate.getTime() - reminderMinutes * 60 * 1000);
    if (sendAt <= now) continue;

    await schedulePush({
      tag:   `prayer_${p.key}_${today}`,
      title: `${p.emoji} ${p.name} Prayer`,
      body:  `${p.name} is in ${reminderMinutes} minutes — ${timeStr}`,
      sendAt,
      data:  { type: "prayer", prayer: p.key },
    });
  }
}

/** Schedule a push 30 min before a Real Madrid match */
export async function scheduleMatchPush(match: {
  id: string;
  date: string;
  competition: string;
  home: { name: string };
  away: { name: string };
}) {
  const kickOff = new Date(match.date);
  const sendAt  = new Date(kickOff.getTime() - 30 * 60 * 1000);
  if (sendAt <= new Date()) return;

  await schedulePush({
    tag:   `match_${match.id}`,
    title: "⚽ Real Madrid — Kick-off Soon!",
    body:  `${match.home.name} vs ${match.away.name} (${match.competition}) in 30 minutes`,
    sendAt,
    data:  { type: "match", matchId: match.id },
  });
}
