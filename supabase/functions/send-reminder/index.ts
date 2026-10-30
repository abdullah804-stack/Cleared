// @ts-nocheck  (this file runs on Supabase's Deno, not in the app, so the editor's TypeScript can't check it)
// supabase/functions/send-reminder/index.ts
// Sends a booking confirmation email to the SIGNED-IN user only.
// (Before, anyone holding the public anon key could make this email any address with any text.)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
// NOTE: "onboarding@resend.dev" can only deliver to the email you signed up to Resend with.
// To email other users, verify your own domain in Resend and set RESEND_FROM.
const FROM = Deno.env.get("RESEND_FROM") || "Cleared App <onboarding@resend.dev>";

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

const esc = (s: unknown) =>
  String(s ?? "")
    .slice(0, 200)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

serve(async (req) => {
  try {
    if (!RESEND_API_KEY) return json({ error: "Server is missing RESEND_API_KEY" }, 500);

    // Who is calling? Needs a real user session, not just the anon key.
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user }, error: authError } = await supa.auth.getUser();
    if (authError || !user?.email) return json({ error: "Not signed in" }, 401);

    const { clinic_name, time, demo } = await req.json();
    if (!clinic_name || !time) return json({ error: "Missing clinic_name or time" }, 400);

    const demoNote = demo
      ? `<p style="background:#FFF4E5;padding:10px;border-radius:8px;"><strong>Demo booking.</strong> This was not sent to a real clinic.</p>`
      : "";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: FROM,
        to: user.email, // always the signed-in user; never an address from the request
        subject: `Your Cleared booking: ${String(clinic_name).slice(0, 80)}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your appointment is saved</h2>
            ${demoNote}
            <p>Clinic: <strong>${esc(clinic_name)}</strong><br/>When: <strong>${esc(time)}</strong></p>
            <p>The Cleared app on your phone will remind you the day before and an hour before.</p>
            <p style="color: #666; font-size: 12px;">Sent by Cleared.</p>
          </div>
        `,
      }),
    });

    const data = await res.json().catch(() => ({}));
    return json(data, res.ok ? 200 : 502);
  } catch (error: any) {
    return json({ error: error?.message || "Failed to send" }, 500);
  }
});