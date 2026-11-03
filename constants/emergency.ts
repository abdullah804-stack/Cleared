// constants/emergency.ts
// One list of "get urgent help" words, shared by the planner and the chat. English + Urdu.
export const EMERGENCY_WORDS = [
  "swell", "fever", "breath", "swallow", "trauma", "accident", "blood", "unconscious", "chest pain", "knocked out",
  "سوجن", "بخار", "خون", "سانس", "نگل",
];

export const isEmergency = (text: string) => {
  const lower = (text || "").toLowerCase();
  return EMERGENCY_WORDS.some((w) => lower.includes(w));
};