import { ScheduleInterval } from "@prisma/client";

export function computeNextRunAt(
  schedule: ScheduleInterval,
  from: Date = new Date()
): Date | null {
  const next = new Date(from);
  switch (schedule) {
    case "EVERY_6H":
      next.setHours(next.getHours() + 6);
      return next;
    case "DAILY":
      next.setDate(next.getDate() + 1);
      return next;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      return next;
    case "NONE":
    default:
      return null;
  }
}

export function parseLocations(raw: string | string[]): string[] {
  const text = Array.isArray(raw) ? raw.join("\n") : raw;
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export const SCHEDULE_LABELS: Record<ScheduleInterval, string> = {
  NONE: "No auto-scrape",
  EVERY_6H: "Every 6 hours",
  DAILY: "Daily",
  WEEKLY: "Weekly",
};
