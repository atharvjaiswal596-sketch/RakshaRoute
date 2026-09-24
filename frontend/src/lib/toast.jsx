import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

const listeners = new Set();
let seq = 0;

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
};

// `toast` is a module-level emitter tied to ToastContainer — intentionally
// exported from the same file (pub/sub pattern).
// eslint-disable-next-line react-refresh/only-export-components
export function toast(message, type = "info") {
  const id = ++seq;
  listeners.forEach((fn) => fn({ id, message, type }));
  window.setTimeout(() => {
    listeners.forEach((fn) => fn({ id, type: "dismiss" }));
  }, 4200);
}

export function ToastContainer() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const handle = (t) => {
      if (t.type === "dismiss") {
        setItems((arr) => arr.filter((i) => i.id !== t.id));
      } else {
        setItems((arr) => [...arr, { id: t.id, message: t.message, type: t.type }]);
      }
    };
    listeners.add(handle);
    return () => listeners.delete(handle);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[2000] flex w-full max-w-sm flex-col gap-2.5">
      {items.map((t) => {
        const Icon = ICONS[t.type] || Info;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg shadow-slate-900/5 anim-slide-in ${STYLES[t.type] || STYLES.info}`}
            role="status"
          >
            <Icon className="mt-0.5 size-5 shrink-0" />
            <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
            <button
              onClick={() =>
                setItems((arr) => arr.filter((i) => i.id !== t.id))
              }
              className="shrink-0 rounded-md p-0.5 opacity-60 transition hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}