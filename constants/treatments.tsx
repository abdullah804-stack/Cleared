// constants/treatments.ts
// Rough PKR price ranges used for the cost forecast on the plan screen.
// These are TYPICAL ranges for private clinics, not quotes. Edit the numbers to match prices you trust
// (the Community Prices screen is the long-term source for real numbers).
import { getDefaultCurrency } from "./pricing";

type Range = { min: number; max: number };

export const CONSULTATION: Range = { min: 500, max: 2000 };

export const TREATMENTS: Record<string, { label: string } & Range> = {
  checkup: { label: "Check-up", min: 0, max: 0 },
  cleaning: { label: "Cleaning (scaling and polish)", min: 2500, max: 6000 },
  filling: { label: "Filling", min: 2500, max: 8000 },
  bonding: { label: "Repair of a chipped or broken tooth", min: 4000, max: 12000 },
  crown: { label: "Crown", min: 15000, max: 35000 },
  extraction: { label: "Extraction", min: 2000, max: 6000 },
  rootCanal: { label: "Root canal", min: 15000, max: 30000 },
  kids: { label: "Children's check-up", min: 500, max: 2500 },
};

export type CostEstimate = { label: string; min: number; max: number; currencyCode: "PKR" | "USD" };

const PKR_PER_USD = 280;
const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);

/** Guess the most likely treatment from what the person typed and how bad the pain is. */
export function estimateCost(request: string, pain: number): CostEstimate {
  const text = (request || "").toLowerCase();
  let key = "filling";

  if (/clean|scal|polish|صفائی/.test(text)) key = "cleaning";
  else if (/kid|child|baby|بچ/.test(text)) key = "kids";
  else if (/broken|chip|crack|snap|ٹوٹ/.test(text)) key = pain >= 7 ? "crown" : "bonding";
  else if (/wisdom|extract|pull|نکال/.test(text)) key = "extraction";
  else if (pain >= 8) key = "rootCanal";
  else if (pain <= 2 && /check|routine/.test(text)) key = "checkup";

  const t = TREATMENTS[key];
  // Cleaning and kids visits already include the exam, so don't add a separate consultation.
  const includesExam = key === "cleaning" || key === "kids";
  const min = t.min + (includesExam ? 0 : CONSULTATION.min);
  const max = t.max + (includesExam ? 0 : CONSULTATION.max);

  const currency = getDefaultCurrency();
  const label = includesExam ? t.label : `Consultation + ${t.label.toLowerCase()}`;

  if (currency.code === "USD") {
    return { label, min: roundTo(min / PKR_PER_USD, 5), max: roundTo(max / PKR_PER_USD, 5), currencyCode: "USD" };
  }
  return { label, min: roundTo(min, 500), max: roundTo(max, 500), currencyCode: "PKR" };
}