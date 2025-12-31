export const middleDot = "·";

export function formatEpoch(epochMs: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(epochMs));

  const get = (t: string) => parts.find(p => p.type === t)?.value;

  return `${get("month")} ${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}
