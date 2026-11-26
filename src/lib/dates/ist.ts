export const IST_TIMEZONE = "Asia/Kolkata" as const;
export const IST_LABEL = "IST (UTC+5:30)" as const;

const istDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST_TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const istDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST_TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const istInputPartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function parseIsoDate(iso: string): Date {
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid ISO timestamp: "${iso}"`);
  }
  return new Date(timestamp);
}

/**
 * Formats an ISO-8601 timestamp explicitly in `Asia/Kolkata` with the `IST (UTC+5:30)` suffix.
 */
export function formatIstDateTime(iso: string): string {
  const date = parseIsoDate(iso);
  return `${istDateTimeFormatter.format(date)} ${IST_LABEL}`;
}

/**
 * Formats an ISO-8601 timestamp as a calendar date in `Asia/Kolkata`.
 */
export function formatIstDate(iso: string): string {
  const date = parseIsoDate(iso);
  return istDateFormatter.format(date);
}

/**
 * Converts an ISO-8601 timestamp into `YYYY-MM-DDTHH:mm` in `Asia/Kolkata`
 * for HTML `<input type="datetime-local">` controls.
 */
export function toIstDateTimeLocalValue(iso: string): string {
  const date = parseIsoDate(iso);
  const parts = istInputPartsFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * Converts a `YYYY-MM-DDTHH:mm` (or `YYYY-MM-DDTHH:mm:ss`) local IST string
 * into an explicit `+05:30` ISO-8601 timestamp.
 */
export function fromIstDateTimeLocalValue(value: string): string {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00+05:30`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}+05:30`;
  }
  parseIsoDate(trimmed);
  return trimmed;
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
}

/**
 * Computes remaining countdown components in milliseconds relative to `nowMs`.
 * Returns `isLive: true` with zeroed fields once `nowMs >= targetIso`.
 */
export function getCountdownParts(
  targetIso: string,
  nowMs: number = Date.now()
): CountdownParts {
  const targetMs = parseIsoDate(targetIso).getTime();
  const diffMs = targetMs - nowMs;

  if (diffMs <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isLive: true,
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    isLive: false,
  };
}
