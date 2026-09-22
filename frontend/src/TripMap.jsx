import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pickupIcon = L.divIcon({
  className: "map-marker trip-marker",
  html: "<span class='marker-pin'>📍</span>",
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

const ambulanceIcon = L.divIcon({
  className: "map-marker ambulance-marker",
  html: "<span class='marker-pin'>🚑</span>",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const FALLBACK = [30.7333, 76.7794]; // Chandigarh

// Live map for a single trip (Track Your Booking).
// `booking.pickupLocation.coordinates` = [lng, lat] (GeoJSON);
// `booking.ambulance.location.coordinates` = [lng, lat] once populated.
function TripMap({ booking }) {
  const pick = booking?.pickupLocation?.coordinates;
  const pickup = Array.isArray(pick) && pick.length === 2 ? [pick[1], pick[0]] : FALLBACK;

  const amb = booking?.ambulance?.location?.coordinates;
  const ambulancePos =
    Array.isArray(amb) && amb.length === 2 ? [amb[1], amb[0]] : null;

  const line = ambulancePos ? [pickup, ambulancePos] : null;

  return (
    <MapContainer
      key={booking?._id || "trip"}
      center={pickup}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Pickup point */}
      <Marker position={pickup} icon={pickupIcon}>
        <Popup>
          <strong>📍 Pickup</strong>
          <br />
          {booking?.destination ? `→ ${booking.destination}` : "—"}
        </Popup>
      </Marker>

      {/* Ambulance position (moves as the driver updates) */}
      {ambulancePos && (
        <Marker position={ambulancePos} icon={ambulanceIcon}>
          <Popup>
            <strong>🚑 {booking?.ambulance?.vehicleNumber || "Ambulance"}</strong>
            <br />
            Status: {booking?.status || "—"}
          </Popup>
        </Marker>
      )}

      {/* Straight dashed line pickup → ambulance (heuristic, not turn-by-turn) */}
      {line && (
        <Polyline
          positions={line}
          pathOptions={{ color: "#d62828", dashArray: "6 6", weight: 3 }}
        />
      )}
    </MapContainer>
  );
}

export default TripMap;