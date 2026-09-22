export function formatDistance(meters) {
  const m = Number(meters) || 0;
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

export const STATUS_META = {
  confirmed: {
    label: "Confirmed",
    pill: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
    step: 1,
  },
  ongoing: {
    label: "En route",
    pill: "bg-sky-100 text-sky-800",
    dot: "bg-sky-500",
    step: 2,
  },
  completed: {
    label: "Completed",
    pill: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
    step: 3,
  },
  cancelled: {
    label: "Cancelled",
    pill: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
    step: 0,
  },
};

export const TYPE_META = {
  Basic: { badge: "bg-slate-100 text-slate-700" },
  Advanced: { badge: "bg-sky-100 text-sky-700" },
  ICU: { badge: "bg-rose-100 text-rose-700" },
};

export function initials(name = "") {
  return (
    name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}