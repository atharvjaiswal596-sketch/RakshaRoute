import { STATUS_META } from "../lib/format";

const buttonVariants = {
  primary:
    "bg-brand-600 text-white shadow-sm shadow-brand-600/30 hover:bg-brand-700 focus-visible:ring-brand-600/40",
  secondary:
    "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400/40",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400/30",
  danger:
    "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 focus-visible:ring-rose-500/30",
};

const buttonSizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...props}
    />
  );
}

export function Card({ className = "", children }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-900/5 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3 p-5 pb-0 sm:p-6 sm:pb-0">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, hint, accentBg, accentText }) {
  return (
    <Card className="flex items-center gap-4 p-4 sm:p-5">
      <span
        className={`grid size-12 shrink-0 place-items-center rounded-xl ${
          accentBg || "bg-brand-50"
        }`}
      >
        <Icon className={`size-6 ${accentText || "text-brand-600"}`} />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-900">
          {value}
        </p>
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        {hint && <p className="truncate text-[11px] text-slate-400">{hint}</p>}
      </div>
    </Card>
  );
}

export function StatusPill({ status }) {
  const meta = STATUS_META[status] || {
    label: status,
    pill: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.pill}`}
    >
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function Field({ label, hint, className = "", ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
          {label}
        </span>
      )}
      <input
        {...props}
        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
      />
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />
  );
}

export function LogoTagline() {
  return (
    <p className="text-sm font-semibold text-slate-500">
      Emergency ambulance,{" "}
      <span className="text-brand-600">reaching you in minutes.</span>
    </p>
  );
}