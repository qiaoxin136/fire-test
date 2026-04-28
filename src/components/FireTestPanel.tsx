import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

type FireTest = Schema["FireTest"]["type"];

const client = generateClient<Schema>();

interface FireTestPanelProps {
  fireTests: FireTest[];
}

export default function FireTestPanel({ fireTests }: FireTestPanelProps) {
  async function handleCreate() {
    const content = window.prompt("Label / description:");
    if (!content) return;

    const latStr = window.prompt("Latitude (e.g. 37.7749):");
    const lngStr = window.prompt("Longitude (e.g. -122.4194):");
    const pressureStr = window.prompt("Pressure (psi):");
    const flowStr = window.prompt("Flow (gpm):");

    await client.models.FireTest.create({
      content,
      lat: latStr ? parseFloat(latStr) : undefined,
      lng: lngStr ? parseFloat(lngStr) : undefined,
      pressure: pressureStr ? parseFloat(pressureStr) : undefined,
      flow: flowStr ? parseFloat(flowStr) : undefined,
    });
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this point?")) return;
    await client.models.FireTest.delete({ id });
  }

  return (
    <aside className="panel">
      <div className="panel-header">
        <h2>🔥 Fire Tests</h2>
        <button className="btn-add" onClick={handleCreate}>
          + Add Point
        </button>
      </div>

      <ul className="point-list">
        {fireTests.length === 0 && (
          <li className="empty">No data points yet. Click "+ Add Point".</li>
        )}
        {fireTests.map((ft) => (
          <li key={ft.id} className="point-item">
            <div className="point-title">{ft.content ?? "Unnamed"}</div>
            <div className="point-coords">
              {ft.lat != null && ft.lng != null
                ? `${ft.lat.toFixed(5)}, ${ft.lng.toFixed(5)}`
                : "No coordinates"}
            </div>
            <div className="point-stats">
              {ft.pressure != null && <span>💧 {ft.pressure} psi</span>}
              {ft.flow != null && <span>🌊 {ft.flow} gpm</span>}
            </div>
            <button
              className="btn-delete"
              onClick={() => handleDelete(ft.id)}
              title="Delete"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
