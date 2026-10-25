// supabase/functions/plan/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY")!;
const MODEL = Deno.env.get("OPENROUTER_MODEL") || "openrouter/free";

serve(async (req) => {
  let body: { input?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const input = body.input;
  if (!input) {
    return new Response(JSON.stringify({ error: "Missing 'input' field" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENROUTER_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are the planning engine for a mobile dental assistant app called Cleared.
User gives you a real-world dental errand. Produce a step-by-step plan using ONLY the tools below. Do not execute anything. Return JSON only.

Rules:
1. Maximum 5 steps. Minimum 3 steps.
2. Order steps by dependency:
   analyze_symptoms (if symptom mentioned) → search_dentists → check_availability → book_appointment → prepare_visit_checklist → schedule_reminder
3. Each step MUST include all fields: id, description, tool, args, estimatedImpact.
4. tool MUST be one of the exact names listed below. Never invent tool names.
5. If the request is ambiguous or impossible, return { "error": "reason" } instead of steps.
6. Respond with a JSON object only. No markdown. No prose.
7. Every step's args MUST contain the required fields. Use "current location" for location, "FIRST_AVAILABLE" for clinic_id/slot_id.
8. estimatedImpact MUST be a short, user-friendly sentence explaining WHY this step is happening (e.g., "To check if you need urgent care" or "To find the earliest slot under $100").

Available tools:
- analyze_symptoms(symptom_text: string)
- search_dentists(location: string, max_price: number, day: string, treatment_type?: string)
- check_availability(clinic_id: string, day: string)
- book_appointment(clinic_id: string, slot_id: string)
- prepare_visit_checklist(treatment_type: string)
- schedule_reminder(appointment_time: string, user_email: string)

Return shape (exactly this):
{
  "steps": [
    {
      "id": "step-1",
      "description": "Check symptom urgency",
      "tool": "analyze_symptoms",
      "args": { "symptom_text": "tooth hurts with cold water" },
      "estimatedImpact": "To determine if this is an emergency."
    }
  ]
}`,
        },
        { role: "user", content: input },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return new Response(JSON.stringify({ error: "OpenRouter request failed", status: res.status, detail: data }), { status: 502, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
});