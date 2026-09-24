import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import { formatEta } from "../lib/format";
import {
  MapPin,
  Zap,
  ListChecks,
  Timer,
  Ambulance,
  Activity,
  ArrowRight,
  ShieldCheck,
  Navigation,
  Phone,
} from "lucide-react";
import Logo, { AmbulanceMark } from "../components/Logo";
import { Button } from "../components/ui";

const HERO_AMBLANCE = (
  <svg viewBox="0 0 220 120" className="w-full max-w-md" aria-hidden="true">
    {/* road */}
    <rect x="0" y="96" width="220" height="12" rx="6" fill="#e2e8f0" />
    <line x1="8" y1="102" x2="30" y2="102" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
    <line x1="58" y1="102" x2="80" y2="102" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
    <line x1="108" y1="102" x2="130" y2="102" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
    <line x1="158" y1="102" x2="180" y2="102" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />

    {/* body shadow */}
    <ellipse cx="120" cy="92" rx="60" ry="6" fill="#e2e8f0" />

    {/* cabin */}
    <path d="M46 44c0-6 5-10 11-10h44c10 0 20 6 28 18l14 22h8c6 0 11 5 11 11v12H26v-8c0-24 9-41.5 20-45z" fill="#fff" stroke="#cbd5e1" strokeWidth="2.5" />
    {/* siren bar */}
    <rect x="78" y="30" width="18" height="6" rx="3" fill="#f43f5e" />
    <circle cx="81" cy="33" r="2.2" fill="#fff" className="anim-pulse-dot" />
    <circle cx="88" cy="33" r="2.2" fill="#fff" className="anim-pulse-dot" style={{ animationDelay: ".5s" }} />
    <circle cx="95" cy="33" r="2.2" fill="#fff" className="anim-pulse-dot" style={{ animationDelay: "1s" }} />

    {/* windows */}
    <path d="M60 46h18v12H60z" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="1.5" rx="2" />
    <path d="M84 46h24v12H84z" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="1.5" rx="2" />

    {/* red cross on side */}
    <g stroke="#d62828" strokeWidth="4" strokeLinecap="round">
      <path d="M126 46v18M117 55h18" />
    </g>

    {/* wheels */}
    <circle cx="58" cy="92" r="12" fill="#0f172a" />
    <circle cx="58" cy="92" r="4.5" fill="#94a3b8" />
    <circle cx="158" cy="92" r="12" fill="#0f172a" />
    <circle cx="158" cy="92" r="4.5" fill="#94a3b8" />
  </svg>
);

const FEATURES = [
  {
    icon: MapPin,
    title: "Find nearby ambulances",
    desc: "Live availability near you on a map, with distance and driver details.",
    accent: "bg-brand-50 text-brand-600",
    to: "/login?next=find",
    cta: "Find now",
  },
  {
    icon: Zap,
    title: "Book in seconds",
    desc: "One-tap booking with patient details and an instant confirmation.",
    accent: "bg-sky-50 text-sky-600",
    to: "/register?next=book",
    cta: "Book now",
  },
  {
    icon: ListChecks,
    title: "Track every trip",
    desc: "Live status and trip map from confirmation to arrival at the hospital.",
    accent: "bg-emerald-50 text-emerald-600",
    to: "/register?next=track",
    cta: "Track now",
  },
];

const STEPS = [
  {
    n: "01",
    icon: Navigation,
    title: "Share your location",
    desc: "Allow location or pin the pickup point on the map.",
  },
  {
    n: "02",
    icon: Ambulance,
    title: "Pick an ambulance",
    desc: "Choose the nearest available ambulance by type and distance.",
  },
  {
    n: "03",
    icon: Activity,
    title: "Track to the hospital",
    desc: "Watch the ambulance reach you, then get live updates all the way.",
  },
];

const STATS = [
  {
    icon: Ambulance,
    label: "Ambulances online",
    value: "24/7",
    sub: "across the city",
  },
  {
    icon: Timer,
    label: "Average response",
    value: "6 min",
    sub: "door to doorstep",
  },
  {
    icon: ShieldCheck,
    label: "Patient safety",
    value: "100%",
    sub: "GPS-tracked trips",
  },
];

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="RakshaRoute home">
          <Logo />
        </Link>

        <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
          <a href="#features" className="transition hover:text-brand-600">
            Features
          </a>
          <a href="#how" className="transition hover:text-brand-600">
            How it works
          </a>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/login">
            <Button variant="secondary" size="sm">
              Login
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default function Landing() {
  const [hero, setHero] = useState(null); // { km, minutes } of nearest ambulance

  useEffect(() => {
    let alive = true;
    // Public endpoint — nearest available ambulance around the fallback city
    API.get("/ambulances/nearby", {
      params: { latitude: 30.7333, longitude: 76.7794, distance: 10000 },
    })
      .then(({ data }) => {
        if (!alive) return;
        const nearest = data.ambulances?.[0];
        if (nearest) {
          setHero({
            km: nearest.distance ? (nearest.distance / 1000).toFixed(1) : null,
            minutes: nearest.etaMinutes ?? null,
          });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-brand-50/40">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(214,40,40,.06), transparent 45%), radial-gradient(circle at 80% 0%, rgba(2,132,199,.07), transparent 45%)",
          }}
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div className="anim-fade-in max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-600 shadow-sm">
              <span className="size-2 rounded-full bg-brand-600 anim-pulse-dot" />
              Emergency response in minutes
            </span>

            <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
              When every minute matters,{" "}
              <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
                take RakshaRoute.
              </span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Find the nearest available ambulance, book it in seconds, and
              track it live to your doorstep — then follow the trip all the way
              to the hospital.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link to="/register?next=book">
                <Button size="lg" className="gap-2">
                  <Phone className="size-4.5" />
                  Book an ambulance
                </Button>
              </Link>
              <Link to="/login?next=find">
                <Button variant="secondary" size="lg" className="gap-2">
                  <MapPin className="size-4.5" />
                  Find nearby
                </Button>
              </Link>
            </div>

            <div className="mt-9 flex items-center gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="size-4.5" />
                </span>
                GPS-tracked trips
              </span>
              <span className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-full bg-sky-50 text-sky-600">
                  <Timer className="size-4.5" />
                </span>
                Live ETA updates
              </span>
            </div>
          </div>

          {/* animated ambulance */}
          <div className="anim-fade-in relative hidden lg:block">
            <div className="anim-float absolute -top-6 right-8 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-xl shadow-slate-900/10">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Nearest ambulance
              </p>
              <p className="mt-0.5 text-lg font-extrabold text-slate-900">
                {hero?.km ? `${hero.km} km` : "1.2 km"} <span className="text-xs font-semibold text-emerald-600">away</span>
              </p>
            </div>

            <div className="anim-float absolute bottom-10 left-4 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-xl shadow-slate-900/10" style={{ animationDelay: "1.2s" }}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Est. arrival
              </p>
              <p className="mt-0.5 text-lg font-extrabold text-slate-900">
                {hero?.minutes != null ? formatEta(hero.minutes) : "4 min"} <span className="text-xs font-semibold text-sky-600">on the way</span>
              </p>
            </div>

            <div className="anim-drive">{HERO_AMBLANCE}</div>
          </div>
        </div>

        {/* stats strip */}
        <div className="relative mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
          <div className="grid gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:grid-cols-3">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-4 rounded-xl bg-slate-50/70 p-4"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-white text-brand-600 shadow-sm">
                  <s.icon className="size-5.5" />
                </span>
                <div>
                  <p className="text-xl font-extrabold tabular-nums text-slate-900">
                    {s.value}
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    {s.label} · {s.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
            Why RakshaRoute
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            An ambulance, three seconds away from your thumb.
          </h2>
          <p className="mt-4 text-slate-600">
            Built for emergencies, designed for speed — everything you need
            during the most stressful minutes.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              to={f.to}
              className="group rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-600/5"
            >
              <span className={`inline-grid size-12 place-items-center rounded-xl ${f.accent}`}>
                <f.icon className="size-6" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-slate-900">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {f.desc}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 transition group-hover:gap-2.5">
                {f.cta} <ArrowRight className="size-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="border-y border-slate-200/60 bg-slate-50/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Three steps from emergency to arrival.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="relative rounded-2xl border border-slate-200/70 bg-white p-6"
              >
                <span className="text-sm font-black tracking-widest text-brand-600/70">
                  Step {s.n}
                </span>
                <div className="mt-4 flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <s.icon className="size-5.5" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {s.title}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 px-6 py-14 text-center shadow-xl shadow-brand-600/25 sm:px-12">
          <div className="pointer-events-none absolute -left-10 -top-10 size-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 -right-10 size-64 rounded-full bg-white/10" />
          <AmbulanceMark className="mx-auto size-12 text-white/90" />
          <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Ready when it matters most.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Create your account now — it takes less than a minute, and it’s
            there for you the moment you need it.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link to="/register">
              <Button
                variant="secondary"
                size="lg"
                className="gap-2 border-0"
              >
                <Zap className="size-4.5 text-brand-600" />
                Create free account
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" className="bg-white/15 text-white hover:bg-white/25 shadow-none">
                Already a user? Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-slate-200/70 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <Logo />
          <p>
            Made for emergencies ·{" "}
            <span className="font-semibold text-brand-600">RakshaRoute</span>{" "}
            {new Date().getFullYear()}
          </p>
          <p className="flex items-center gap-1.5">
            <Phone className="size-3.5" /> 108 — National Emergency Helpline
          </p>
        </div>
      </footer>
    </div>
  );
}