import { useState } from "react";
import { Link, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { ShieldCheck, Timer, MapPin, ArrowLeft } from "lucide-react";
import API from "../api";
import { useAuth } from "../components/AuthContext";
import { Button, Field } from "../components/ui";
import { AmbulanceMark } from "../components/Logo";
import { toast } from "../lib/toast";

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-12 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full bg-white/5" />

      <Link to="/" className="relative inline-flex items-center gap-2.5">
        <span className="grid size-10 place-items-center rounded-xl bg-white text-brand-600 shadow-lg">
          <AmbulanceMark className="size-6" />
        </span>
        <span className="text-xl font-extrabold tracking-tight">RakshaRoute</span>
      </Link>

      <div className="relative">
        <h2 className="max-w-md text-4xl font-black leading-tight tracking-tight">
          Emergency care, one tap away.
        </h2>
        <p className="mt-4 max-w-sm text-brand-100/90">
          Login to find the nearest ambulance, book instantly, and track your
          trip to the hospital — live.
        </p>

        <div className="mt-9 space-y-4">
          {[
            { icon: MapPin, text: "Nearest ambulances on a live map" },
            { icon: Timer, text: "Confirmed trips with live status" },
            { icon: ShieldCheck, text: "GPS tracking from pickup to hospital" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-white/15">
                <item.icon className="size-4.5" />
              </span>
              <p className="text-sm font-medium text-brand-50">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="relative text-sm text-brand-200">
        108 — National Emergency Helpline · Available 24/7
      </p>
    </div>
  );
}

export default function AuthPage({ mode }) {
  const isLogin = mode === "login";
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "find";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const body = isLogin
        ? { email, password }
        : { name, email, password, phone };

      const { data } = await API.post(endpoint, body);

      if (!data.token) throw new Error("Backend did not return a token");

      localStorage.setItem("raksharoute_token", data.token);
      login(data.user);

      toast(
        isLogin
          ? `Welcome back, ${data.user.name.split(" ")[0]}!`
          : "Account created — welcome to RakshaRoute!",
        "success"
      );
      navigate(`/dashboard?focus=${next}`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Cannot connect to backend. Ensure the server runs on port 5001."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <BrandPanel />

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-12">
        <div className="w-full max-w-md anim-fade-in">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-brand-600"
          >
            <ArrowLeft className="size-4" /> Back to home
          </Link>

          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/30">
              <AmbulanceMark className="size-6" />
            </span>
            <div>
              <p className="text-lg font-extrabold tracking-tight text-slate-900">
                RakshaRoute
              </p>
              <p className="text-xs font-medium text-slate-500">
                Emergency ambulance booking
              </p>
            </div>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-slate-500">
            {isLogin
              ? "Login to book the nearest ambulance in seconds."
              : "It takes less than a minute — be ready for any emergency."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {!isLogin && (
              <Field
                label="Full name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            )}

            <Field
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Field
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
              hint={
                isLogin ? undefined : "At least 6 characters, anything else goes."
              }
            />

            {!isLogin && (
              <Field
                label="Phone number"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
              />
            )}

            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading
                ? isLogin
                  ? "Logging in…"
                  : "Creating account…"
                : isLogin
                  ? "Login to RakshaRoute"
                  : "Create account"}
            </Button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            {isLogin ? "New to RakshaRoute?" : "Already have an account?"}{" "}
            <Link
              to={isLogin ? "/register" : "/login"}
              className="font-bold text-brand-600 transition hover:text-brand-700"
            >
              {isLogin ? "Create an account" : "Login instead"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}