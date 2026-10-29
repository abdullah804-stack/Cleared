// constants/region.ts
/** Two-letter country code from the phone's locale (e.g. "en-PK" -> "PK"), if available. */
export function getRegion(): string | undefined {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale.match(/[-_]([A-Za-z]{2})\b/)?.[1]?.toUpperCase();
  } catch {
    return undefined;
  }
}