import { useEffect, useMemo, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  Marker,
  InfoWindow,
  useMap,
  useApiIsLoaded,
} from "@vis.gl/react-google-maps";
import type { MapMouseEvent } from "@vis.gl/react-google-maps";
import type { Schema } from "../../amplify/data/resource";

type FireTest = Schema["FireTest"]["type"];

interface FireTestMapProps {
  fireTests: FireTest[];
  isPlacingPoint: boolean;
  onPointPlaced: (lat: number, lng: number) => void;
  onCancelPlacing: () => void;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

const DEFAULT_CENTER = { lat: 35.7796, lng: -78.6382 };
const DEFAULT_ZOOM = 15;

const GREEN_DOT_SVG = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">' +
  '<circle cx="10" cy="10" r="8" fill="#22c55e" stroke="#15803d" stroke-width="2.5"/>' +
  '</svg>'
);

const BLUE_DOT_SVG = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22">' +
  '<circle cx="11" cy="11" r="9" fill="#1a73e8" stroke="#0d47a1" stroke-width="2.5"/>' +
  '<circle cx="11" cy="11" r="3" fill="#fff"/>' +
  '</svg>'
);

const DIRECTION_DOT_SVG = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26">' +
  '<circle cx="13" cy="13" r="11" fill="#f59e0b" stroke="#b45309" stroke-width="2.5"/>' +
  '<circle cx="13" cy="13" r="4" fill="#fff"/>' +
  '</svg>'
);

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi",          stylers: [{ visibility: "off" }] },
  { featureType: "poi.park",     stylers: [{ visibility: "off" }] },
  { featureType: "poi.school",   stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical",  stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit",      stylers: [{ visibility: "off" }] },
];

// ── Outer wrapper ─────────────────────────────────────────────────────────────
export default function FireTestMap(props: FireTestMapProps) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <MapContent {...props} />
    </APIProvider>
  );
}

// ── Inner component ───────────────────────────────────────────────────────────
function MapContent({
  fireTests,
  isPlacingPoint,
  onPointPlaced,
  onCancelPlacing,
  selectedId,
  onSelectId,
}: FireTestMapProps) {
  const map = useMap();
  const apiLoaded = useApiIsLoaded();

  // ── Icons (built after API loads) ─────────────────────────────────────────
  const greenDotIcon = useMemo((): google.maps.Icon | undefined => {
    if (!apiLoaded) return undefined;
    return { url: `data:image/svg+xml,${GREEN_DOT_SVG}`, anchor: new google.maps.Point(10, 10), scaledSize: new google.maps.Size(20, 20) };
  }, [apiLoaded]);

  const selectedDotIcon = useMemo((): google.maps.Icon | undefined => {
    if (!apiLoaded) return undefined;
    return {
      url: `data:image/svg+xml,${encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28">' +
        '<circle cx="14" cy="14" r="12" fill="white" stroke="#15803d" stroke-width="2"/>' +
        '<circle cx="14" cy="14" r="8" fill="#22c55e" stroke="#15803d" stroke-width="2"/>' +
        '</svg>'
      )}`,
      anchor: new google.maps.Point(14, 14),
      scaledSize: new google.maps.Size(28, 28),
    };
  }, [apiLoaded]);

  const blueDotIcon = useMemo((): google.maps.Icon | undefined => {
    if (!apiLoaded) return undefined;
    return { url: `data:image/svg+xml,${BLUE_DOT_SVG}`, anchor: new google.maps.Point(11, 11), scaledSize: new google.maps.Size(22, 22) };
  }, [apiLoaded]);

  const directionDotIcon = useMemo((): google.maps.Icon | undefined => {
    if (!apiLoaded) return undefined;
    return { url: `data:image/svg+xml,${DIRECTION_DOT_SVG}`, anchor: new google.maps.Point(13, 13), scaledSize: new google.maps.Size(26, 26) };
  }, [apiLoaded]);

  // ── Label icon builder (needs API loaded) ────────────────────────────────
  function makeLabelIcon(
    text: string,
    fill = "#22c55e",
    stroke = "#15803d"
  ): google.maps.Icon {
    const w = Math.max(56, text.length * 7 + 16);
    const svg = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="40">` +
      `<circle cx="${w / 2}" cy="10" r="8" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>` +
      `<rect x="1" y="24" width="${w - 2}" height="15" rx="4" fill="#1e1e2e"/>` +
      `<text x="${w / 2}" y="34" text-anchor="middle" font-family="Arial,sans-serif" ` +
      `font-size="10" fill="#fff" font-weight="bold">${text}</text>` +
      `</svg>`
    );
    return {
      url: `data:image/svg+xml,${svg}`,
      anchor: new google.maps.Point(w / 2, 10),
      scaledSize: new google.maps.Size(w, 40),
    };
  }

  // ── State ─────────────────────────────────────────────────────────────────
  const [userLocation, setUserLocation]       = useState<{ lat: number; lng: number } | null>(null);
  const [showUserBalloon, setShowUserBalloon] = useState(false);
  const [locating, setLocating]               = useState(false);
  const [isDirectionMode, setIsDirectionMode] = useState(false);
  const [directionTargetId, setDirectionTargetId] = useState<string | null>(null);
  const [hasRoute, setHasRoute]               = useState(false);
  const [routeInfo, setRouteInfo]             = useState<string | null>(null);
  type LabelMode = null | "pressure" | "flow";
  const [labelMode, setLabelMode]             = useState<LabelMode>(null);
  const [showLabelMenu, setShowLabelMenu]     = useState(false);

  // Directions renderer lives outside React render cycle
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // ── Init DirectionsRenderer when map is ready ────────────────────────────
  useEffect(() => {
    if (!map || !apiLoaded) return;
    const renderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: "#1a73e8",
        strokeWeight: 5,
        strokeOpacity: 0.85,
      },
    });
    rendererRef.current = renderer;
    return () => {
      renderer.setMap(null);
      rendererRef.current = null;
    };
  }, [map, apiLoaded]);

  // ── Escape cancels both modes ─────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (isPlacingPoint) onCancelPlacing();
      if (isDirectionMode) setIsDirectionMode(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPlacingPoint, isDirectionMode, onCancelPlacing]);

  const mappablePoints = fireTests.filter((ft) => ft.lat != null && ft.lng != null);

  // ── Map click ─────────────────────────────────────────────────────────────
  function handleMapClick(e: MapMouseEvent) {
    setShowLabelMenu(false);
    if (isPlacingPoint) {
      const ll = e.detail.latLng;
      if (ll) onPointPlaced(ll.lat, ll.lng);
    } else if (!isDirectionMode) {
      onSelectId(null);
    }
  }

  // ── Marker click ─────────────────────────────────────────────────────────
  function handleMarkerClick(ft: FireTest) {
    if (isPlacingPoint) return;

    if (isDirectionMode) {
      setIsDirectionMode(false);
      setDirectionTargetId(ft.id);
      getDirections({ lat: ft.lat!, lng: ft.lng! }, ft.name ?? ft.content ?? "destination");
    } else if (!labelMode) {
      // Attribute selection is disabled while a label mode is active
      onSelectId(ft.id === selectedId ? null : ft.id);
    }
  }

  // ── Locate ────────────────────────────────────────────────────────────────
  function handleLocate() {
    if (!navigator.geolocation) { alert("Geolocation not supported."); return; }
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
      () => { alert("Unable to retrieve your location."); setLocating(false); }
    );
  }

  // ── Direction ─────────────────────────────────────────────────────────────
  function handleDirectionBtn() {
    if (hasRoute) {
      clearRoute();
    } else {
      setIsDirectionMode((prev) => !prev);
    }
  }

  function clearRoute() {
    rendererRef.current?.setDirections({ routes: [] } as unknown as google.maps.DirectionsResult);
    setHasRoute(false);
    setRouteInfo(null);
    setDirectionTargetId(null);
  }

  function getDirections(destination: { lat: number; lng: number }, destName: string) {
    if (!navigator.geolocation) { alert("Geolocation not supported."); return; }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(origin);

        try {
          const service = new google.maps.DirectionsService();
          const result = await service.route({
            origin,
            destination,
            travelMode: google.maps.TravelMode.DRIVING,
          });

          rendererRef.current?.setDirections(result);
          setHasRoute(true);

          // Extract summary info from first leg
          const leg = result.routes[0]?.legs[0];
          if (leg) {
            setRouteInfo(`${destName} · ${leg.distance?.text} · ${leg.duration?.text}`);
          }
        } catch (err) {
          console.error("Directions error:", err);
          alert(
            "Could not get directions.\n\nMake sure the Directions API is enabled in Google Cloud Console for your API key."
          );
          setDirectionTargetId(null);
        }
      },
      () => { alert("Unable to retrieve your location."); setDirectionTargetId(null); }
    );
  }

  const anyModeActive = isPlacingPoint || isDirectionMode;

  return (
    <div
      style={{ position: "relative", width: "100%", height: "100%" }}
      className={isPlacingPoint ? "map-placing" : isDirectionMode ? "map-direction" : ""}
    >
      {/* ── Top-right button stack ── */}
      {!anyModeActive && (
        <div className="map-btn-stack">
          <button className="locate-btn" onClick={handleLocate} disabled={locating}>
            {locating ? "Locating…" : "📍 Locate"}
          </button>
          <button
            className={`direction-btn ${hasRoute ? "direction-btn--active" : ""}`}
            onClick={handleDirectionBtn}
            title={hasRoute ? "Clear route" : "Get directions to a data point"}
          >
            {hasRoute ? "🗺 Clear Route" : "🧭 Direction"}
          </button>

          {/* ── Label button + dropdown ── */}
          <div style={{ position: "relative" }}>
            <button
              className={`label-btn ${labelMode ? "label-btn--active" : ""}`}
              onClick={() => setShowLabelMenu((v) => !v)}
              title="Show labels on map"
            >
              🏷 Label{labelMode ? `: ${labelMode === "pressure" ? "Pressure" : "Flow"}` : ""}
            </button>

            {showLabelMenu && (
              <div className="label-menu">
                <button
                  className={`label-menu-item ${labelMode === "pressure" ? "label-menu-item--active" : ""}`}
                  onClick={() => { setLabelMode(labelMode === "pressure" ? null : "pressure"); setShowLabelMenu(false); }}
                >
                  💧 Pressure (psi)
                </button>
                <button
                  className={`label-menu-item ${labelMode === "flow" ? "label-menu-item--active" : ""}`}
                  onClick={() => { setLabelMode(labelMode === "flow" ? null : "flow"); setShowLabelMenu(false); }}
                >
                  🌊 Flow (gpm)
                </button>
                {labelMode && (
                  <button
                    className="label-menu-item label-menu-item--clear"
                    onClick={() => { setLabelMode(null); setShowLabelMenu(false); }}
                  >
                    ✕ Clear Labels
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Place-point banner ── */}
      {isPlacingPoint && (
        <div className="placing-banner">
          📌 Click anywhere on the map to place a point
          <button className="placing-cancel" onClick={onCancelPlacing}>✕ Cancel</button>
        </div>
      )}

      {/* ── Direction mode banner ── */}
      {isDirectionMode && (
        <div className="placing-banner direction-banner">
          🧭 Click on a data point to get directions there
          <button className="placing-cancel" onClick={() => setIsDirectionMode(false)}>✕ Cancel</button>
        </div>
      )}

      {/* ── Route summary bar ── */}
      {routeInfo && (
        <div className="route-info-bar">
          🗺 {routeInfo}
          <button className="route-clear-btn" onClick={clearRoute} title="Clear route">✕</button>
        </div>
      )}

      <Map
        style={{ width: "100%", height: "100%" }}
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        disableDefaultUI={false}
        onClick={handleMapClick}
        styles={MAP_STYLES}
      >
        {/* ── FireTest markers ── */}
        {mappablePoints.map((ft) => {
          // Determine label text for this point
          const labelText =
            labelMode === "pressure" && ft.pressure != null ? `${ft.pressure} psi` :
            labelMode === "flow"     && ft.flow     != null ? `${ft.flow} gpm`      :
            null;

          // Pick icon: direction target → amber, selected → white-ring, labeled → label SVG, default → green dot
          const icon: google.maps.Icon | undefined =
            !apiLoaded ? undefined :
            ft.id === directionTargetId ? (
              labelText ? makeLabelIcon(labelText, "#f59e0b", "#b45309") : directionDotIcon
            ) :
            ft.id === selectedId ? (
              labelText ? makeLabelIcon(labelText, "#22c55e", "#15803d") : selectedDotIcon
            ) :
            labelText ? makeLabelIcon(labelText) :
            greenDotIcon;

          return (
            <Marker
              key={ft.id}
              position={{ lat: ft.lat!, lng: ft.lng! }}
              icon={icon}
              zIndex={ft.id === selectedId || ft.id === directionTargetId ? 10 : 1}
              onClick={() => handleMarkerClick(ft)}
            />
          );
        })}

        {/* ── User location marker ── */}
        {userLocation && (
          <Marker position={userLocation} icon={blueDotIcon} onClick={() => setShowUserBalloon(true)} />
        )}

        {/* ── User location balloon ── */}
        {userLocation && showUserBalloon && (
          <InfoWindow
            position={userLocation}
            onCloseClick={() => setShowUserBalloon(false)}
            headerContent={
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minWidth: 160 }}>
                <strong style={{ color: "#1a73e8" }}>📍 You are here</strong>
                <button onClick={() => setShowUserBalloon(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#666", padding: "0 0 0 12px" }}>
                  ✕
                </button>
              </div>
            }
          >
            <div style={{ fontFamily: "sans-serif", fontSize: 13 }}>
              {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
            </div>
          </InfoWindow>
        )}
      </Map>
    </div>
  );
}
