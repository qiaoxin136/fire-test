import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

type FireTest = Schema["FireTest"]["type"];

const client = generateClient<Schema>();

interface FireTestPanelProps {
  fireTests: FireTest[];
}

export default function FireTestPanel({ fireTests }: FireTestPanelProps) {
  async function handleCreate() {
    const name = window.prompt("Name:");
    if (!name) return;

    const content = window.prompt("Label / description:");
    const latStr = window.prompt("Latitude (e.g. 35.7796):");
    const lngStr = window.prompt("Longitude (e.g. -78.6382):");
    const pressureStr = window.prompt("Pressure (psi):");
    const flowStr = window.prompt("Flow (gpm):");

    await client.models.FireTest.create({
      name,
      content: content ?? undefined,
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
            <div className="point-title">{ft.name ?? ft.content ?? "Unnamed"}</div>
            {ft.content && <div className="point-desc">{ft.content}</div>}
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
