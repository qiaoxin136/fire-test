import { useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  Pin,
} from "@vis.gl/react-google-maps";
import type { Schema } from "../../amplify/data/resource";

type FireTest = Schema["FireTest"]["type"];

interface FireTestMapProps {
  fireTests: FireTest[];
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

// Default center: Raleigh, NC
const DEFAULT_CENTER = { lat: 35.7796, lng: -78.6382 };
const DEFAULT_ZOOM = 15;

export default function FireTestMap({ fireTests }: FireTestMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Only show points that have valid lat/lng
  const mappablePoints = fireTests.filter(
    (ft) => ft.lat != null && ft.lng != null
  );

  const selectedPoint = mappablePoints.find((ft) => ft.id === selectedId);

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        style={{ width: "100%", height: "100%" }}
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        mapId="firetest-map"
        gestureHandling="greedy"
        disableDefaultUI={false}
        onClick={() => setSelectedId(null)}
      >
        {mappablePoints.map((ft) => (
          <AdvancedMarker
            key={ft.id}
            position={{ lat: ft.lat!, lng: ft.lng! }}
            onClick={() => setSelectedId(ft.id)}
          >
            <Pin
              background="#e53935"
              borderColor="#b71c1c"
              glyphColor="#ffffff"
            />
          </AdvancedMarker>
        ))}

        {selectedPoint && selectedPoint.lat != null && selectedPoint.lng != null && (
          <InfoWindow
            position={{ lat: selectedPoint.lat, lng: selectedPoint.lng }}
            onCloseClick={() => setSelectedId(null)}
          >
            <div style={{ fontFamily: "sans-serif", minWidth: 160 }}>
              <h3 style={{ margin: "0 0 8px", color: "#b71c1c" }}>
                🔥 {selectedPoint.content ?? "FireTest"}
              </h3>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <tbody>
                  <InfoRow label="Lat" value={selectedPoint.lat?.toFixed(6)} />
                  <InfoRow label="Lng" value={selectedPoint.lng?.toFixed(6)} />
                  <InfoRow
                    label="Pressure"
                    value={
                      selectedPoint.pressure != null
                        ? `${selectedPoint.pressure} psi`
                        : "—"
                    }
                  />
                  <InfoRow
                    label="Flow"
                    value={
                      selectedPoint.flow != null
                        ? `${selectedPoint.flow} gpm`
                        : "—"
                    }
                  />
                </tbody>
              </table>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <tr>
      <td
        style={{
          fontWeight: 600,
          paddingRight: 8,
          paddingBottom: 4,
          color: "#555",
          fontSize: 13,
        }}
      >
        {label}
      </td>
      <td style={{ paddingBottom: 4, fontSize: 13 }}>{value ?? "—"}</td>
    </tr>
  );
}
