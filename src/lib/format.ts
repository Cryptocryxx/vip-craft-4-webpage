const TZ = "Europe/Berlin";

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: TZ,
});

const shortDateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: TZ,
});

const timeFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});

const numberFormatter = new Intl.NumberFormat("de-DE");

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(value: Date | string): string {
  return dateFormatter.format(toDate(value));
}

export function formatShortDate(value: Date | string): string {
  return shortDateFormatter.format(toDate(value));
}

export function formatTime(value: Date | string): string {
  return `${timeFormatter.format(toDate(value))} Uhr`;
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("de-DE", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 100) return `${hours.toFixed(1).replace(".", ",")} h`;
  return `${formatNumber(Math.round(hours))} h`;
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

/** "Heute", "Morgen", "in 5 Tagen", "vor 2 Tagen" */
export function relativeDays(target: Date | string, now: Date = new Date()): string {
  const day = 24 * 60 * 60 * 1000;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOfDay(toDate(target)) - startOfDay(now)) / day);
  if (diff === 0) return "Heute";
  if (diff === 1) return "Morgen";
  if (diff === -1) return "Gestern";
  if (diff > 1) return `in ${diff} Tagen`;
  return `vor ${Math.abs(diff)} Tagen`;
}

/** "gerade eben", "vor 5 Min.", "vor 3 Std.", "vor 2 Tagen" */
export function timeAgo(value: Date | string, now: Date = new Date()): string {
  const seconds = Math.round((now.getTime() - toDate(value).getTime()) / 1000);
  if (seconds < 60) return "gerade eben";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  if (days < 30) return `vor ${days} ${days === 1 ? "Tag" : "Tagen"}`;
  return formatShortDate(value);
}
