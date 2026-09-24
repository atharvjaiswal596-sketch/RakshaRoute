import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatEta } from "./lib/format";

// Simple emoji pins — avoids the broken default icon assets in Vite builds
const ambulanceIcon = L.divIcon({
  className: "map-marker ambulance-marker",
  html: "<span class='marker-pin'>🚑</span>",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -30],
});

const userIcon = L.divIcon({
  className: "map-marker user-marker",
  html: "<span class='marker-pin user-pin'>📍</span>",
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

// Keeps the map centred on the user's current coordinates
function FlyTo({ center }) {
  const map = useMap();

  useEffect(() => {
    if (Array.isArray(center) && center.length === 2) {
      map.flyTo(center, map.getZoom());
    }
  }, [center, map]);

  return null;
}

// Live map of nearby ambulances. `ambulances` are GeoJSON docs with
// `location.coordinates = [longitude, latitude]`.
function AmbulanceMap({
  ambulances,
  center,
  onSelect,
  showUser = true,
  zoom = 13,
}) {
  const mapCenter = [
    Number(center?.lat) || 30.7333,
    Number(center?.lng) || 76.7794,
  ];

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyTo center={mapCenter} />

      {/* Your location */}
      {showUser && (
        <Marker position={mapCenter} icon={userIcon}>
          <Popup>You are here</Popup>
        </Marker>
      )}

      {/* Nearby ambulances */}
      {ambulances.map((amb) => {
        const [lng, lat] = amb.location?.coordinates || [0, 0];

        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

        return (
          <Marker
            key={amb._id}
            position={[lat, lng]}
            icon={ambulanceIcon}
            eventHandlers={{ click: () => onSelect?.(amb) }}
          >
            <Popup>
              <strong>🚑 {amb.vehicleNumber}</strong>
              <br />
              {amb.type} • Driver: {amb.driverName}
              <br />
              {amb.distance != null ? (
                <span>{(amb.distance / 1000).toFixed(2)} km away</span>
              ) : (
                <span>Status: {amb.status}</span>
              )}
              {amb.etaMinutes != null && (
                <>
                  <br />
                  <span style={{ color: "#b51f1f", fontWeight: 700 }}>
                    ⏱ Arriving in {formatEta(amb.etaMinutes)}
                  </span>
                </>
              )}
              {onSelect ? (
                <>
                  <br />
                  <button
                    onClick={() => onSelect(amb)}
                    className="mt-2 w-full rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-700"
                  >
                    Book this ambulance
                  </button>
                </>
              ) : null}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export default AmbulanceMap;