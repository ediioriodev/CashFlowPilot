// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// ---------------------------------------------------------------------------
// Environment variables (set via Supabase Dashboard → Edge Functions → Secrets)
// VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected by Supabase runtime)
// ---------------------------------------------------------------------------

const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@cashflowpilot.it";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Window ±7 minutes around current time
const WINDOW_MINUTES = 7;

// ---------------------------------------------------------------------------
// Timezone helper — converts a UTC Date to a "fake UTC" Date whose
// UTC components (.getUTCHours(), .getUTCFullYear(), …) reflect the
// wall-clock time in the given IANA timezone (e.g. "Europe/Rome").
// This lets us compare user-entered local times against `now` correctly.
// ---------------------------------------------------------------------------
const ITALY_TZ = "Europe/Rome";

function toLocalDate(utcDate: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(utcDate);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)!.value);
  return new Date(
    Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
    ),
  );
}

Deno.serve(async (req: Request) => {
  // Security: only allow requests with correct Bearer secret
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const now = new Date();
  // Convert UTC `now` to Italian local time for all comparisons.
  // Users enter times in Italian time (CET/CEST); the cron fires at the
  // Italian hour in UTC, so without this the ±7-min window never matches.
  const localNow = toLocalDate(now, ITALY_TZ);
  const windowStart = new Date(localNow.getTime() - WINDOW_MINUTES * 60 * 1000);
  const windowEnd = new Date(localNow.getTime() + WINDOW_MINUTES * 60 * 1000);

  // Fetch all active reminders — we'll compute trigger times in JS
  // (Supabase free tier doesn't support pg_cron / complex generated column expressions)
  const { data: reminders, error: remErr } = await supabase
    .from("reminders")
    .select("id, user_id, group_id, is_personal, title, note, amount, reminder_date, reminder_time, alerts, completed")
    .is("deleted_at", null)
    .eq("completed", false)
    .gte("reminder_date", windowStart.toISOString().split("T")[0])
    .lte("reminder_date", windowEnd.toISOString().split("T")[0]);

  if (remErr) {
    console.error("Error fetching reminders:", remErr);
    return new Response(JSON.stringify({ error: remErr.message }), { status: 500 });
  }

  let sent = 0;
  let errors = 0;

  // ── Block 1: Standard reminders ─────────────────────────────────────────────
  for (const reminder of (reminders ?? [])) {
    const alerts: number[] = Array.isArray(reminder.alerts) ? reminder.alerts : [0];

    for (const offsetMinutes of alerts) {
      // Compute when this alert should fire
      const [year, month, day] = reminder.reminder_date.split("-").map(Number);
      const [hour, minute] = reminder.reminder_time.split(":").map(Number);
      // Use Date.UTC so the timestamp is constructed in the same "fake UTC" space
      // as localNow/windowStart/windowEnd, which were built via toLocalDate().
      // Using `new Date(year, month-1, ...)` would use the Deno runtime's local
      // timezone and produce a wrong offset against the ±7-min window.
      const reminderTs = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
      const triggerTs = new Date(reminderTs.getTime() - offsetMinutes * 60 * 1000);

      // Check if triggerTs is within our window
      if (triggerTs < windowStart || triggerTs > windowEnd) continue;

      // Check for deduplication: already sent this (reminder_id, alert_offset)?
      const { data: existing } = await supabase
        .from("notification_logs")
        .select("id")
        .eq("reminder_id", reminder.id)
        .eq("alert_offset", offsetMinutes)
        .eq("status", "sent")
        .maybeSingle();

      if (existing) continue; // Already sent, skip

      // Fetch the push_token for this user
      const { data: userRow } = await supabase
        .from("users_group")
        .select("push_token, notifications_enabled")
        .eq("user_id", reminder.user_id)
        .maybeSingle();

      if (!userRow?.push_token || !userRow.notifications_enabled) continue;

      let subscription: PushSubscription;
      try {
        subscription = JSON.parse(userRow.push_token);
      } catch {
        continue; // Malformed token
      }

      // Build notification payload
      const offsetLabel = offsetMinutes === 0
        ? "Ora"
        : offsetMinutes < 60
          ? `${offsetMinutes} min fa`
          : offsetMinutes === 60
            ? "1 ora fa"
            : "1 giorno fa";

      const bodyParts = [];
      if (reminder.amount != null) {
        bodyParts.push(`€ ${Number(reminder.amount).toLocaleString("it-IT", { minimumFractionDigits: 2 })}`);
      }
      if (reminder.note) bodyParts.push(reminder.note);

      const pushPayload = JSON.stringify({
        title: `🔔 ${reminder.title}`,
        body: bodyParts.length > 0 ? bodyParts.join(" · ") : `Promemoria: ${offsetLabel}`,
        tag: `reminder-${reminder.id}-${offsetMinutes}`,
        url: "/promemoria",
      });

      // Send push
      let status = "sent";
      let errorMessage: string | null = null;

      try {
        await webpush.sendNotification(subscription as any, pushPayload);
        sent++;
      } catch (err: any) {
        status = "error";
        errorMessage = err?.message ?? "Unknown error";
        errors++;
        console.error(`Push error for reminder ${reminder.id} offset ${offsetMinutes}:`, err);
      }

      // Log the attempt
      await supabase.from("notification_logs").insert({
        user_id: reminder.user_id,
        notification_type: "reminder",
        group_id: reminder.group_id ?? null,
        reminder_id: reminder.id,
        alert_offset: offsetMinutes,
        push_token: userRow.push_token,
        status,
        error_message: errorMessage,
        sent_at: new Date().toISOString(),
      });
    }
  }

  // ── Block 2: Recurring expense confirmation notifications ────────────────────
  // Today's date string in Italian local time (YYYY-MM-DD)
  const todayStr = localNow.toISOString().split("T")[0];
  const todayStartUtc = `${todayStr}T00:00:00.000Z`;

  // Fetch all users that have recurring notifications enabled
  const { data: recurringUsers } = await supabase
    .from("users_group")
    .select("user_id, group_id, push_token, notification_time, notifications_enabled, recurring_notifications_enabled")
    .eq("notifications_enabled", true)
    .eq("recurring_notifications_enabled", true)
    .not("push_token", "is", null)
    .not("notification_time", "is", null);

  for (const u of (recurringUsers ?? [])) {
    if (!u.push_token) continue;

    // notification_time is returned as "HH:MM:SS+TZ" — extract hours & minutes
    const timeParts = (u.notification_time as string).split(":").map(Number);
    const notifHour = timeParts[0];
    const notifMinute = timeParts[1];

    // Build notification timestamp for today in "fake UTC" space
    // (same space as localNow, so the ±7-min window comparison is correct)
    const notifTs = new Date(Date.UTC(
      localNow.getUTCFullYear(),
      localNow.getUTCMonth(),
      localNow.getUTCDate(),
      notifHour,
      notifMinute,
      0,
    ));

    // Only fire if now is within the ±WINDOW_MINUTES window around notification time
    if (notifTs < windowStart || notifTs > windowEnd) continue;

    // Parse push subscription
    let subscription: PushSubscription;
    try {
      subscription = JSON.parse(u.push_token);
    } catch {
      continue;
    }

    // Check what notification types were already sent today for this user
    const { data: sentToday } = await supabase
      .from("notification_logs")
      .select("notification_type")
      .eq("user_id", u.user_id)
      .in("notification_type", ["recurring_expense_personal", "recurring_expense_shared"])
      .eq("status", "sent")
      .gte("sent_at", todayStartUtc);

    const alreadySentTypes = new Set((sentToday ?? []).map((r: any) => r.notification_type));

    // Fetch pending unconfirmed recurring expenses for today in parallel
    const [personalResult, sharedResult] = await Promise.all([
      supabase
        .from("spese_personali")
        .select("id", { count: "exact", head: true })
        .eq("user_id", u.user_id)
        .eq("ricorrente", true)
        .eq("confermata", false)
        .eq("data_spesa", todayStr)
        .is("deleted_at", null),
      u.group_id
        ? supabase
            .from("spese")
            .select("id", { count: "exact", head: true })
            .eq("group_id", u.group_id)
            .eq("ricorrente", true)
            .eq("confermata", false)
            .eq("data_spesa", todayStr)
            .is("deleted_at", null)
        : Promise.resolve({ count: 0, error: null }),
    ]);

    const personalCount = personalResult.count ?? 0;
    const sharedCount = sharedResult.count ?? 0;

    // Send personal notification
    if (personalCount > 0 && !alreadySentTypes.has("recurring_expense_personal")) {
      const noun = personalCount === 1 ? "spesa personale" : "spese personali";
      const payload = JSON.stringify({
        title: "💳 Spese personali da confermare",
        body: `Hai ${personalCount} ${noun} da confermare oggi`,
        tag: `recurring-personal-${u.user_id}-${todayStr}`,
        url: "/spese",
      });

      let pStatus = "sent";
      let pError: string | null = null;
      try {
        await webpush.sendNotification(subscription as any, payload);
        sent++;
      } catch (err: any) {
        pStatus = "error";
        pError = err?.message ?? "Unknown error";
        errors++;
        console.error(`Recurring personal push error for user ${u.user_id}:`, err);
      }

      await supabase.from("notification_logs").insert({
        user_id: u.user_id,
        notification_type: "recurring_expense_personal",
        push_token: u.push_token,
        status: pStatus,
        error_message: pError,
        sent_at: new Date().toISOString(),
      });
    }

    // Send shared notification
    if (sharedCount > 0 && !alreadySentTypes.has("recurring_expense_shared")) {
      const noun = sharedCount === 1 ? "spesa condivisa" : "spese condivise";
      const payload = JSON.stringify({
        title: "💳 Spese condivise da confermare",
        body: `Hai ${sharedCount} ${noun} da confermare oggi`,
        tag: `recurring-shared-${u.user_id}-${todayStr}`,
        url: "/spese",
      });

      let sStatus = "sent";
      let sError: string | null = null;
      try {
        await webpush.sendNotification(subscription as any, payload);
        sent++;
      } catch (err: any) {
        sStatus = "error";
        sError = err?.message ?? "Unknown error";
        errors++;
        console.error(`Recurring shared push error for user ${u.user_id}:`, err);
      }

      await supabase.from("notification_logs").insert({
        user_id: u.user_id,
        notification_type: "recurring_expense_shared",
        group_id: u.group_id ?? null,
        push_token: u.push_token,
        status: sStatus,
        error_message: sError,
        sent_at: new Date().toISOString(),
      });
    }
  }

  return new Response(
    JSON.stringify({ sent, errors, processedReminders: (reminders ?? []).length }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
