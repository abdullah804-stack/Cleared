// constants/region.ts
// Timezones are a better clue than locale for people whose phone language is "English (US)"
// but who live elsewhere (very common in Pakistan).
const TZ_TO_REGION: Record<string, string> = {
  "Asia/Karachi": "PK",
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Asia/Dhaka": "BD",
  "Asia/Dubai": "AE",
  "Europe/London": "GB",
};

/** Two-letter country code: from the phone's timezone first, then its locale (e.g. "en-PK" -> "PK"). */
export function getRegion(): string | undefined {
  try {
    const opts = Intl.DateTimeFormat().resolvedOptions();
    const byZone = TZ_TO_REGION[opts.timeZone];
    if (byZone) return byZone;
    return opts.locale.match(/[-_]([A-Za-z]{2})\b/)?.[1]?.toUpperCase();
  } catch {
    return undefined;
  }
}