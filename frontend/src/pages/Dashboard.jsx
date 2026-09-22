import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Ambulance as AmbulanceIcon,
  MapPin,
  LocateFixed,
  Phone,
  UserRound,
  Hospital,
  RefreshCw,
  X,
  Radio,
  Timer,
  Navigation,
  Search,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import API from "../api";
import { onLive, disconnectSocket } from "../socket";
import { useAuth } from "../components/AuthContext";
import Logo from "../components/Logo";
import { Button, Card, CardHeader, Field, StatCard, StatusPill } from "../components/ui";
import { formatDistance, STATUS_META, TYPE_META, initials } from "../lib/format";
import { toast } from "../lib/toast";
import AmbulanceMap from "../AmbulanceMap";
import TripMap from "../TripMap";

const FALLBACK_COORDS = { lat: 30.7333, lng: 76.7794 }; // Chandigarh

const TRIP_STEPS = ["confirmed", "ongoing", "completed"];
const BOOK_STEPS = ["Find", "Details", "Confirmed"];

function TopBar({ user, onLogout }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/">
          <Logo />
        </Link>

        <div className="flex items-center gap-2.5">
          <Button
            variant={location.pathname?.startsWith("/fleet") ? "primary" : "secondary"}
            size="sm"
            onClick={() => navigate("/fleet")}
            className="hidden sm:inline-flex"
          >
            <Radio className="size-4" /> Fleet view
          </Button>

          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            <LogOut className="size-4" /> Logout
          </button>

          <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-sm font-extrabold text-brand-700">
            {initials(user.name)}
          </span>
        </div>
      </nav>
    </header>
  );
}

function StatusStepper({ status }) {
  const current = STATUS_META[status]?.step ?? 0;
  const cancelled = status === "cancelled";

  return (
    <ol className="flex items-center gap-2">
      {TRIP_STEPS.map((s, i) => {
        const step = i + 1;
        const done = !cancelled && current >= step;
        const active = !cancelled && current === step;
        return (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                done
                  ? "bg-emerald-500 text-white"
                  : active
                    ? "bg-sky-500 text-white anim-ring"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={`hidden text-xs font-semibold sm:block ${
                active ? "text-slate-900" : "text-slate-400"
              }`}
            >
              {STATUS_META[s].label}
            </span>
            {i < TRIP_STEPS.length - 1 && (
              <span
                className={`h-0.5 flex-1 rounded ${done ? "bg-emerald-300" : "bg-slate-200"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [params] = useSearchParams();
  const focus = params.get("focus");

  // ---- Find nearby ----
  const [coords, setCoords] = useState(FALLBACK_COORDS);
  const [distance, setDistance] = useState(10000);
  const [ambulances, setAmbulances] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // ---- Book ----
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    destination: "",
    patientName: user?.name || "",
    patientPhone: "",
  });
  const [justBooked, setJustBooked] = useState(null);
  const [bookingError, setBookingError] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  // ---- History / live ----
  const [bookings, setBookings] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [activeTripId, setActiveTripId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [live, setLive] = useState(false);

  const loadBookings = useCallback(async () => {
    setHistoryError("");
    try {
      const { data } = await API.get("/bookings/my");
      setBookings(data.bookings || []);
    } catch (err) {
      setHistoryError(err.response?.data?.message || "Failed to load bookings.");
    }
  }, []);

  const locate = useCallback((silent = false) => {
    if (!navigator.geolocation) {
      if (!silent) setLocationNote("Geolocation is not supported by this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (!silent) {
          setLocationNote("Using your live location.");
          toast("Location updated", "info");
        }
        setLocating(false);
      },
      () => {
        if (!silent)
          setLocationNote("Location denied — using fallback coordinates (Chandigarh). Edit them below.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // keep the location hint auto-hiding
  useEffect(() => {
    if (!locationNote) return;
    const t = setTimeout(() => setLocationNote(""), 6000);
    return () => clearTimeout(t);
  }, [locationNote]);

  useEffect(() => {
    loadBookings();
    locate(true);
  }, [loadBookings, locate]);

  // scroll to the section the landing page asked for
  useEffect(() => {
    if (!focus) return;
    const map = { find: "find-section", book: "book-section", track: "trips-section" };
    const id = map[focus];
    if (id) {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focus]);

  // ---- Live socket updates ----
  useEffect(() => {
    const offStatus = onLive("booking:status", (payload) => {
      const bk = payload?.booking || payload;
      if (!bk?._id) return;
      setBookings((prev) =>
        prev.map((b) => (b._id === bk._id ? bk : b))
      );
      const lbl = STATUS_META[bk.status]?.label || bk.status;
      toast(`Booking ${lbl.toLowerCase()}`, "info");
    });

    const offLoc = onLive("ambulance:location", (amb) => {
      if (!amb?._id || !amb.location) return;
      setAmbulances((prev) =>
        prev.map((a) =>
          a._id === amb._id ? { ...a, location: amb.location } : a
        )
      );
      setBookings((prev) =>
        prev.map((b) =>
          b.ambulance?._id === amb._id
            ? { ...b, ambulance: { ...b.ambulance, location: amb.location } }
            : b
        )
      );
    });

    setLive(true);
    return () => {
      offStatus();
      offLoc();
    };
  }, []);

  useEffect(() => () => disconnectSocket(), []);

  const findNearby = async (e) => {
    e.preventDefault();
    setSearchError("");
    setSearching(true);
    setHasSearched(true);
    try {
      const { data } = await API.get("/ambulances/nearby", {
        params: { latitude: coords.lat, longitude: coords.lng, distance },
      });
      setAmbulances(data.ambulances || []);
      if (!data.ambulances?.length) {
        toast("No available ambulances in range", "info");
      }
    } catch (err) {
      setSearchError(err.response?.data?.message || "Unable to find nearby ambulances.");
    } finally {
      setSearching(false);
    }
  };

  const selectAmbulance = (amb) => {
    setSelectedAmbulance(amb);
    setJustBooked(null);
    setBookingError("");
    document.getElementById("book-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleBookingForm = (e) => {
    const { name, value } = e.target;
    setBookingForm((prev) => ({ ...prev, [name]: value }));
  };

  const bookAmbulance = async (e) => {
    e.preventDefault();
    if (!selectedAmbulance) return;
    setBookingError("");
    setBookingLoading(true);
    try {
      const { data } = await API.post("/bookings", {
        ambulanceId: selectedAmbulance._id,
        latitude: coords.lat,
        longitude: coords.lng,
        destination: bookingForm.destination,
        patientName: bookingForm.patientName,
        patientPhone: bookingForm.patientPhone,
      });
      setJustBooked(data.booking);
      setSelectedAmbulance(null);
      setBookingForm({ destination: "", patientName: user?.name || "", patientPhone: "" });
      setActiveTripId(data.booking._id);
      await loadBookings();
      toast("Ambulance booked — it’s on the way! 🚑", "success");
    } catch (err) {
      setBookingError(err.response?.data?.message || "Booking failed, please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  const cancelBooking = async (id) => {
    if (!window.confirm("Cancel this booking?")) return;
    try {
      await API.patch(`/bookings/${id}/status`, { status: "cancelled" });
      await loadBookings();
      toast("Booking cancelled", "error");
    } catch (err) {
      toast(err.response?.data?.message || "Could not cancel booking", "error");
    }
  };

  const activeTrip = useMemo(
    () => bookings.find((b) => b._id === activeTripId) || null,
    [bookings, activeTripId]
  );

  const filteredBookings =
    statusFilter === "all"
      ? bookings
      : bookings.filter((b) => b.status === statusFilter);

  const nearbyCount =
    hasSearched && !searching ? ambulances.length : null;

  // booking step for the stepper
  let bookStep = 1;
  if (selectedAmbulance) bookStep = 2;
  if (justBooked) bookStep = 3;

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar user={user} onLogout={logout} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ---------- header ---------- */}
        <div className="anim-fade-in flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-600">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full rounded-full bg-emerald-500 opacity-75 anim-pulse-dot" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              Live network {live ? "connected" : "connecting…"}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              Welcome back, {user.name.split(" ")[0]} 👋
            </h1>
            <p className="mt-1 text-slate-500">
              Find an ambulance, book it, and track every minute of the trip.
            </p>
          </div>

          <Button variant="secondary" size="sm" onClick={() => locate()}>
            <LocateFixed className="size-4" /> Use my location
          </Button>
        </div>

        {/* ---------- stats ---------- */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={LocateFixed}
            label="Location"
            value={coords ? "Live" : "Fallback"}
            hint={`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}
            accentBg="bg-sky-50"
            accentText="text-sky-600"
          />
          <StatCard
            icon={AmbulanceIcon}
            label="Nearby available"
            value={nearbyCount === null ? "—" : nearbyCount}
            hint={hasSearched ? "from last search" : "run a search"}
            accentBg="bg-brand-50"
            accentText="text-brand-600"
          />
          <StatCard
            icon={Navigation}
            label="Active trip"
            value={activeTrip ? "Live" : "None"}
            hint={activeTrip?.ambulance?.vehicleNumber || "no trip running"}
            accentBg="bg-emerald-50"
            accentText="text-emerald-600"
          />
          <StatCard
            icon={ShieldCheck}
            label="Total trips"
            value={bookings.length}
            hint={`${bookings.filter((b) => b.status === "completed").length} completed`}
            accentBg="bg-amber-50"
            accentText="text-amber-600"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* ============ FIND ============ */}
          <section id="find-section" className="lg:col-span-2">
            <Card className="scroll-mt-20">
              <CardHeader
                title="Find nearby ambulances"
                subtitle="We show only available vehicles around your pickup point."
              />
              <div className="p-5 sm:p-6">
                <form onSubmit={findNearby} className="grid gap-3 sm:grid-cols-4">
                  <Field
                    label="Latitude"
                    type="number"
                    step="any"
                    value={coords.lat}
                    onChange={(e) => setCoords({ ...coords, lat: Number(e.target.value) })}
                    required
                  />
                  <Field
                    label="Longitude"
                    type="number"
                    step="any"
                    value={coords.lng}
                    onChange={(e) => setCoords({ ...coords, lng: Number(e.target.value) })}
                    required
                  />
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                      Max distance
                    </span>
                    <select
                      value={distance}
                      onChange={(e) => setDistance(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
                    >
                      <option value={5000}>5 km</option>
                      <option value={10000}>10 km</option>
                      <option value={25000}>25 km</option>
                      <option value={50000}>50 km</option>
                    </select>
                  </label>
                  <div className="flex items-end">
                    <Button type="submit" size="lg" className="w-full" disabled={searching}>
                      <Search className="size-4" />
                      {searching ? "Searching…" : "Search"}
                    </Button>
                  </div>
                </form>

                {locationNote && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                    <MapPin className="size-4 text-brand-500" /> {locationNote}
                  </p>
                )}
                {searchError && (
                  <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
                    {searchError}
                  </p>
                )}

                {/* map */}
                {!searching && ambulances.length > 0 && (
                  <div className="anim-slide-in mt-5">
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <MapPin className="size-3.5 text-sky-600" /> You are here —
                      tap a 🚑 pin to book it right away.
                    </p>
                    <div className="h-[380px] overflow-hidden rounded-2xl border border-slate-200">
                      <AmbulanceMap
                        ambulances={ambulances}
                        center={coords}
                        onSelect={selectAmbulance}
                      />
                    </div>
                  </div>
                )}

                {/* results or empty state */}
                {!searching && hasSearched && ambulances.length === 0 && (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
                    <AmbulanceIcon className="mx-auto size-10 text-slate-300" />
                    <p className="mt-3 font-bold text-slate-600">
                      No available ambulances in range
                    </p>
                    <p className="text-sm text-slate-400">
                      Increase the distance or try “Use my location”.
                    </p>
                  </div>
                )}

                {ambulances.length > 0 && (
                  <div className="rk-scroll mt-5 grid max-h-72 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                    {ambulances.map((amb) => (
                      <div
                        key={amb._id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-200 hover:shadow-md"
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-bold text-slate-900">
                            🚑 {amb.vehicleNumber}
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${TYPE_META[amb.type]?.badge}`}>
                              {amb.type}
                            </span>
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {amb.driverName} · 📞 {amb.driverPhone}
                          </p>
                          <p className="mt-1 text-xs font-bold text-brand-600">
                            {formatDistance(amb.distance)} away
                          </p>
                        </div>
                        <Button size="sm" onClick={() => selectAmbulance(amb)}>
                          Book
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </section>

          {/* ============ BOOK + LIVE ============ */}
          <aside className="space-y-6">
            <Card id="book-section" className="scroll-mt-20">
              <CardHeader
                title="Book ambulance"
                subtitle="Select a vehicle, confirm details, done."
              />
              <div className="p-5 sm:p-6">
                {/* step indicator */}
                <div className="mb-5 flex items-center gap-1.5">
                  {BOOK_STEPS.map((label, i) => {
                    const n = i + 1;
                    const active = bookStep === n;
                    const done = bookStep > n;
                    return (
                      <div key={label} className="flex flex-1 flex-col items-center gap-1">
                        <span
                          className={`grid size-8 place-items-center rounded-full text-xs font-bold ${
                            done
                              ? "bg-emerald-500 text-white"
                              : active
                                ? "bg-brand-600 text-white"
                                : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {done ? "✓" : n}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${active ? "text-brand-700" : "text-slate-400"}`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {!selectedAmbulance && !justBooked && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5 text-center">
                    <MapPin className="mx-auto size-8 text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      No ambulance selected yet
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Search nearby and pick a vehicle — or tap a pin on the map.
                    </p>
                  </div>
                )}

                {selectedAmbulance && (
                  <form onSubmit={bookAmbulance} className="space-y-3.5">
                    <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
                      <div>
                        <p className="font-bold text-slate-900">
                          🚑 {selectedAmbulance.vehicleNumber}
                        </p>
                        <p className="text-xs text-slate-500">
                          {selectedAmbulance.type} · {formatDistance(selectedAmbulance.distance) || "0 km"} away
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedAmbulance(null)}
                        className="rounded-lg p-1 text-slate-400 transition hover:bg-white hover:text-slate-600"
                        aria-label="Deselect"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <Field
                      label="Patient name"
                      type="text"
                      placeholder="Patient name"
                      name="patientName"
                      value={bookingForm.patientName}
                      onChange={handleBookingForm}
                      required
                    />
                    <Field
                      label="Patient phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      name="patientPhone"
                      value={bookingForm.patientPhone}
                      onChange={handleBookingForm}
                      required
                    />
                    <Field
                      label="Destination"
                      type="text"
                      placeholder="Hospital or address"
                      name="destination"
                      value={bookingForm.destination}
                      onChange={handleBookingForm}
                      required
                    />

                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="size-3.5 text-sky-600" />
                      Pickup: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                    </p>

                    {bookingError && (
                      <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
                        {bookingError}
                      </p>
                    )}

                    <Button type="submit" size="lg" className="w-full" disabled={bookingLoading}>
                      {bookingLoading ? "Booking…" : "Confirm booking"}
                    </Button>
                  </form>
                )}

                {justBooked && (
                  <div className="anim-slide-in rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="flex items-center gap-2 font-bold text-emerald-800">
                      <ShieldCheck className="size-5" /> Ambulance booked!
                    </p>
                    <p className="mt-2 text-sm text-emerald-700">
                      🚑 {justBooked.ambulance?.vehicleNumber} →
                      {justBooked.destination}
                    </p>
                    <p className="mt-1 text-sm text-emerald-700">
                      Status:{" "}
                      <span className="font-bold">
                        {STATUS_META[justBooked.status]?.label || justBooked.status}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* live trip */}
            <Card id="live-section" className="scroll-mt-20">
              <CardHeader
                title="Live trip"
                subtitle={activeTrip ? "Real-time position & status" : "Tracking appears here"}
                action={
                  activeTrip ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      <span className="size-1.5 rounded-full bg-emerald-500 anim-pulse-dot" /> LIVE
                    </span>
                  ) : null
                }
              />
              <div className="p-5 sm:p-6">
                {activeTrip ? (
                  <div className="space-y-4">
                    <div className="h-56 overflow-hidden rounded-2xl border border-slate-200">
                      <TripMap booking={activeTrip} />
                    </div>

                    <StatusStepper status={activeTrip.status} />

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                          <UserRound className="size-3.5" /> Patient
                        </p>
                        <p className="mt-1 font-bold text-slate-900">
                          {activeTrip.patientName}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                          <Hospital className="size-3.5" /> Destination
                        </p>
                        <p className="mt-1 font-bold text-slate-900">
                          {activeTrip.destination}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        📞 Driver: {activeTrip.ambulance?.driverPhone || "—"}
                      </p>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTripId(null)}>
                        Close
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5 text-center">
                    <Timer className="mx-auto size-8 text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      No trip running
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Once you book, the ambulance position and status appear here in real time.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </aside>
        </div>

        {/* ============ MY BOOKINGS ============ */}
        <Card id="trips-section" className="mt-6 scroll-mt-20">
          <CardHeader
            title="My bookings"
            subtitle="Every trip, in one place."
            action={
              <Button variant="secondary" size="sm" onClick={loadBookings}>
                <RefreshCw className="size-3.5" /> Refresh
              </Button>
            }
          />
          <div className="p-5 sm:p-6">
            {historyError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
                {historyError}
              </p>
            )}

            {bookings.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                {[
                  ["all", "All"],
                  ["confirmed", "Confirmed"],
                  ["ongoing", "Ongoing"],
                  ["completed", "Completed"],
                  ["cancelled", "Cancelled"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setStatusFilter(value)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                      statusFilter === value
                        ? "bg-brand-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <span className="ml-auto text-xs font-medium text-slate-400">
                  {filteredBookings.length} of {bookings.length}
                </span>
              </div>
            )}

            {!historyError && bookings.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
                <AmbulanceIcon className="mx-auto size-10 text-slate-300" />
                <p className="mt-3 font-bold text-slate-600">No bookings yet</p>
                <p className="text-sm text-slate-400">
                  Book an ambulance from the map above and it will show up here.
                </p>
              </div>
            )}

            {filteredBookings.length > 0 && (
              <ul className="space-y-3">
                {filteredBookings.map((bk) => (
                  <li
                    key={bk._id}
                    className={`rounded-2xl border p-4 transition ${
                      bk._id === activeTripId
                        ? "border-brand-300 bg-brand-50/50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-bold text-slate-900">
                          🚑 {bk.ambulance?.vehicleNumber || "Ambulance"}
                          <StatusPill status={bk.status} />
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          <Hospital className="mr-1 inline size-3.5" />
                          {bk.destination}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          🧑 {bk.patientName} · 📞 {bk.patientPhone} ·{" "}
                          {new Date(bk.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setActiveTripId((cur) => (cur === bk._id ? null : bk._id));
                            if (bk._id !== activeTripId) {
                              document.getElementById("live-section")?.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                            }
                          }}
                        >
                          <Navigation className="size-3.5" />
                          Track
                        </Button>
                        {(bk.status === "confirmed" || bk.status === "ongoing") && (
                          <Button variant="danger" size="sm" onClick={() => cancelBooking(bk._id)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}