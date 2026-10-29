// constants/pricing.ts
import { getRegion } from "./region";

export type CurrencyCode = "PKR" | "USD";
export type Currency = { code: CurrencyCode; symbol: string };

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  PKR: { code: "PKR", symbol: "Rs " },
  USD: { code: "USD", symbol: "$" },
};

/** Pakistan phones default to PKR; everything else to USD. Users can switch in the estimator. */
export function getDefaultCurrency(): Currency {
  return getRegion() === "PK" ? CURRENCIES.PKR : CURRENCIES.USD;
}

export function formatMoney(amount: number, currency: Currency = getDefaultCurrency()): string {
  const n = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${currency.symbol}${n}`;
}