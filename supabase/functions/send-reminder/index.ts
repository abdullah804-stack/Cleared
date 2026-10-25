// supabase/functions/send-reminder/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  try {
    const { email, clinic_name, time } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), { status: 400 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Cleared App <onboarding@resend.dev>", // Resend sandbox email
        to: email,
        subject: `Appointment Confirmed: ${clinic_name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your appointment is booked!</h2>
            <p>You have an appointment at <strong>${clinic_name}</strong> on <strong>${time}</strong>.</p>
            <p>We will send you a reminder 1 hour before.</p>
            <br/>
            <p style="color: #666; font-size: 12px;">Sent securely by Cleared AI.</p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});