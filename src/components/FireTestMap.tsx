import { useEffect, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import type { MapMouseEvent } from "@vis.gl/react-google-maps";
import type { Schema } from "../../amplify/data/resource";

type FireTest = Schema["FireTest"]["type"];

interface FireTestMapProps {
  fireTests: FireTest[];
  isPlacingPoint: boolean;
  onPointPlaced: (lat: number, lng: number) => void;
  onCancelPlacing: () => void;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

const DEFAULT_CENTER = { lat: 35.7796, lng: -78.6382 };
const DEFAULT_ZOOM = 15;

// ── Outer wrapper ─────────────────────────────────────────────────────────────
export default function FireTestMap(props: FireTestMapProps) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <MapContent {...props} />
    </APIProvider>
  );
}

// ── Inner component (uses useMap hook) ────────────────────────────────────────
function MapContent({
  fireTests,
  isPlacingPoint,
  onPointPlaced,
  onCancelPlacing,
}: FireTestMapProps) {
  const map = useMap();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showUserBalloon, setShowUserBalloon] = useState(false);
  const [locating, setLocating] = useState(false);


  // Cancel placing mode with Escape key
  useEffect(() => {
    if (!isPlacingPoint) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancelPlacing();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPlacingPoint, onCancelPlacing]);

  const mappablePoints = fireTests.filter(
    (ft) => ft.lat != null && ft.lng != null
  );
  const selectedPoint = mappablePoints.find((ft) => ft.id === selectedId);

  // ── Map click ────────────────────────────────────────────────────────────────
  function handleMapClick(e: MapMouseEvent) {
    if (isPlacingPoint) {
      const latLng = e.detail.latLng;
      if (latLng) onPointPlaced(latLng.lat, latLng.lng);
    } else {
      setSelectedId(null);
    }
  }

  // ── Locate ───────────────────────────────────────────────────────────────────
  function handleLocate() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setShowUserBalloon(true);
        map?.panTo(loc);
        map?.setZoom(17);
        setLocating(false);
      },
      () => {
        alert("Unable to retrieve your location.");
        setLocating(false);
      }
    );
  }

  return (
    <div
      style={{ position: "relative", width: "100%", height: "100%" }}
      className={isPlacingPoint ? "map-placing" : ""}
    >
      {/* ── Locate button ── */}
      {!isPlacingPoint && (
        <button
          className="locate-btn"
          onClick={handleLocate}
          disabled={locating}
          title="Zoom to my location"
        >
          {locating ? "Locating…" : "📍 Locate"}
        </button>
      )}

      {/* ── Placing mode banner ── */}
      {isPlacingPoint && (
        <div className="placing-banner">
          📌 Click anywhere on the map to place a point
          <button className="placing-cancel" onClick={onCancelPlacing}>
            ✕ Cancel
          </button>
        </div>
      )}

      <Map
        style={{ width: "100%", height: "100%" }}
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        disableDefaultUI={false}
        onClick={handleMapClick}
        styles={[
          { featureType: "poi",          stylers: [{ visibility: "off" }] },
          { featureType: "poi.park",     stylers: [{ visibility: "off" }] },
          { featureType: "poi.school",   stylers: [{ visibility: "off" }] },
          { featureType: "poi.medical",  stylers: [{ visibility: "off" }] },
          { featureType: "poi.business", stylers: [{ visibility: "off" }] },
          { featureType: "transit",      stylers: [{ visibility: "off" }] },
        ]}
      >
        {/* ── FireTest markers ── */}
        {mappablePoints.map((ft) => (
          <AdvancedMarker
            key={ft.id}
            position={{ lat: ft.lat!, lng: ft.lng! }}
            onClick={() => !isPlacingPoint && setSelectedId(ft.id)}
          >
            <div style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#22c55e",
              border: "3px solid #15803d",
              boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
              cursor: "pointer",
            }} />
          </AdvancedMarker>
        ))}

        {/* ── FireTest info window ── */}
        {selectedPoint &&
          selectedPoint.lat != null &&
          selectedPoint.lng != null && (
            <InfoWindow
              position={{ lat: selectedPoint.lat, lng: selectedPoint.lng }}
              onCloseClick={() => setSelectedId(null)}
            >
              <div style={{ fontFamily: "sans-serif", minWidth: 160 }}>
                <h3 style={{ margin: "0 0 8px", color: "#b71c1c" }}>
                  🔥 {selectedPoint.name ?? selectedPoint.content ?? "FireTest"}
                </h3>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <tbody>
                    {selectedPoint.content && (
                      <InfoRow label="Note" value={selectedPoint.content} />
                    )}
                    <InfoRow label="Lat" value={selectedPoint.lat?.toFixed(6)} />
                    <InfoRow label="Lng" value={selectedPoint.lng?.toFixed(6)} />
                    <InfoRow
                      label="Pressure"
                      value={selectedPoint.pressure != null ? `${selectedPoint.pressure} psi` : "—"}
                    />
                    <InfoRow
                      label="Flow"
                      value={selectedPoint.flow != null ? `${selectedPoint.flow} gpm` : "—"}
                    />
                  </tbody>
                </table>
              </div>
            </InfoWindow>
          )}

        {/* ── User location marker ── */}
        {userLocation && (
          <AdvancedMarker
            position={userLocation}
            onClick={() => setShowUserBalloon(true)}
          >
            <Pin background="#1a73e8" borderColor="#0d47a1" glyphColor="#ffffff" />
          </AdvancedMarker>
        )}

        {/* ── User location balloon ── */}
        {userLocation && showUserBalloon && (
          <InfoWindow
            position={userLocation}
            onCloseClick={() => setShowUserBalloon(false)}
            headerContent={
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minWidth: 160 }}>
                <strong style={{ color: "#1a73e8" }}>📍 You are here</strong>
                <button
                  onClick={() => setShowUserBalloon(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 16,
                    color: "#666",
                    padding: "0 0 0 12px",
                    lineHeight: 1,
                  }}
                  title="Close"
                >
                  ✕
                </button>
              </div>
            }
          >
            <div style={{ fontFamily: "sans-serif", fontSize: 13 }}>
              <div>{userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}</div>
            </div>
          </InfoWindow>
        )}
      </Map>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <tr>
      <td style={{ fontWeight: 600, paddingRight: 8, paddingBottom: 4, color: "#555", fontSize: 13 }}>
        {label}
      </td>
      <td style={{ paddingBottom: 4, fontSize: 13 }}>{value ?? "—"}</td>
    </tr>
  );
}
