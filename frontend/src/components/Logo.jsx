export function AmbulanceMark({ className = "size-6" }) {
  return (
    <svg
      viewBox="0 0 32 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* body */}
      <path d="M3.5 8.5h17l5 4v5.5h-4" />
      <path d="M3.5 8.5v9.5h4.5" />
      {/* roof light */}
      <path d="M12 7V4.5M12 4.5h4v3" />
      {/* red cross */}
      <path d="M8.5 11v3.2M6.9 12.6H10" strokeWidth="1.7" />
      {/* wheels */}
      <circle cx="9.5" cy="18" r="2" fill="currentColor" stroke="none" />
      <circle cx="21" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Logo({ dark = false, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/30">
        <AmbulanceMark className="size-6" />
      </span>
      <span
        className={`text-lg font-extrabold tracking-tight ${
          dark ? "text-white" : "text-slate-900"
        }`}
      >
        Raksha<span className="text-brand-600">Route</span>
      </span>
    </span>
  );
}