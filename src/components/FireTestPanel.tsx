import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

type FireTest = Schema["FireTest"]["type"];

const client = generateClient<Schema>();

interface FireTestPanelProps {
  fireTests: FireTest[];
  isPlacingPoint: boolean;
  onStartPlacing: () => void;
}

export default function FireTestPanel({
  fireTests,
  isPlacingPoint,
  onStartPlacing,
}: FireTestPanelProps) {
  async function handleDelete(id: string) {
    if (!window.confirm("Delete this point?")) return;
    await client.models.FireTest.delete({ id });
  }

  return (
    <aside className="panel">
      <div className="panel-header">
        <h2>🔥 Fire Tests</h2>
        <button
          className={`btn-add ${isPlacingPoint ? "btn-add--active" : ""}`}
          onClick={onStartPlacing}
          disabled={isPlacingPoint}
          title="Click the map to place a point"
        >
          {isPlacingPoint ? "📌 Click map…" : "+ Add Point"}
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
