// supabase/functions/chat/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY")!;
const MODEL = Deno.env.get("OPENROUTER_MODEL") || "openrouter/free";

serve(async (req) => {
  let body: { messages?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const messages = body.messages;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Missing 'messages' array" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENROUTER_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are "Cleared", a highly professional, empathetic, and knowledgeable AI dental assistant. 
Your goal is to answer patient questions about their dental health, procedures, and care plans.
Rules:
1. ALWAYS state clearly that you are an AI and not a doctor.
2. Do NOT diagnose specific conditions. Instead, explain possibilities and recommend visiting a dentist.
3. Keep answers concise, friendly, and easy to understand.
4. Do not use markdown formatting (no asterisks, no bolding). Just plain text.
5. If the user reports severe swelling, fever, or trauma, tell them to seek immediate emergency care.`
        },
        ...messages,
      ],
      temperature: 0.5,
      max_tokens: 500,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return new Response(JSON.stringify({ error: "OpenRouter request failed", status: res.status, detail: data }), { status: 502, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
});