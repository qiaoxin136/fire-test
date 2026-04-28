import { useEffect, useRef, useState } from "react";
import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

type FireTest = Schema["FireTest"]["type"];
type FieldKey = "name" | "content" | "lat" | "lng" | "pressure" | "flow";

type Draft = Record<FieldKey, string>;

const client = generateClient<Schema>();


function toDraft(ft: FireTest): Draft {
  return {
    name:     ft.name     != null ? String(ft.name)     : "",
    content:  ft.content  != null ? String(ft.content)  : "",
    lat:      ft.lat      != null ? String(ft.lat)      : "",
    lng:      ft.lng      != null ? String(ft.lng)      : "",
    pressure: ft.pressure != null ? String(ft.pressure) : "",
    flow:     ft.flow     != null ? String(ft.flow)     : "",
  };
}

interface FireTestPanelProps {
  fireTests: FireTest[];
  isPlacingPoint: boolean;
  onStartPlacing: () => void;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  userEmail: string;
  onSignOut: () => void;
}

export default function FireTestPanel({
  fireTests,
  isPlacingPoint,
  onStartPlacing,
  selectedId,
  onSelectId,
  userEmail,
  onSignOut,
}: FireTestPanelProps) {
  const selectedPoint = fireTests.find((ft) => ft.id === selectedId) ?? null;

  const [editingField, setEditingField] = useState<FieldKey | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  // Track what was last saved so isDirty clears immediately after Apply
  const savedDraftRef = useRef<Draft | null>(null);

  // Reset draft whenever selected point changes
  useEffect(() => {
    const d = selectedPoint ? toDraft(selectedPoint) : null;
    setDraft(d);
    savedDraftRef.current = d;
    setEditingField(null);
  }, [selectedId]);

  // Also sync savedDraft when observeQuery updates the point after save
  useEffect(() => {
    if (selectedPoint) savedDraftRef.current = toDraft(selectedPoint);
  }, [selectedPoint]);

  const isDirty =
    draft !== null &&
    savedDraftRef.current !== null &&
    JSON.stringify(draft) !== JSON.stringify(savedDraftRef.current);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this point?")) return;
    if (selectedId === id) onSelectId(null);
    await client.models.FireTest.delete({ id });
  }

  function handleFieldChange(field: FieldKey, value: string) {
    setDraft((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setEditingField(null);
    if (e.key === "Tab")    setEditingField(null);
  }

  async function handleApply() {
    if (!selectedPoint || !draft) return;
    setSaving(true);
    setEditingField(null);

    try {
      const { data: updated, errors } = await client.models.FireTest.update({
        id:       selectedPoint.id,
        name:     draft.name     !== "" ? draft.name                  : null,
        content:  draft.content  !== "" ? draft.content               : null,
        lat:      draft.lat      !== "" ? parseFloat(draft.lat)       : null,
        lng:      draft.lng      !== "" ? parseFloat(draft.lng)       : null,
        pressure: draft.pressure !== "" ? parseFloat(draft.pressure)  : null,
        flow:     draft.flow     !== "" ? parseFloat(draft.flow)      : null,
      });

      if (errors && errors.length > 0) {
        console.error("Amplify update errors:", errors);
        alert("Save failed: " + errors.map((e) => e.message).join(", "));
        setSaving(false);
        return;
      }

      console.log("Saved:", updated);
      // Snapshot saved state so isDirty clears immediately
      savedDraftRef.current = { ...draft };
    } catch (err) {
      console.error("Update exception:", err);
      alert("Save failed: " + String(err));
    }

    setSaving(false);
  }

  return (
    <aside className="panel">
      {/* ── Header ── */}
      <div className="panel-header">
        <h2>🔥 Fire Tests</h2>
        <button
          className={`btn-add ${isPlacingPoint ? "btn-add--active" : ""}`}
          onClick={onStartPlacing}
          disabled={isPlacingPoint}
        >
          {isPlacingPoint ? "📌 Click map…" : "+ Add Point"}
        </button>
      </div>

      {/* ── User bar ── */}
      <div className="user-bar">
        <span className="user-email" title={userEmail}>👤 {userEmail}</span>
        <button className="btn-signout" onClick={onSignOut}>Sign out</button>
      </div>

      {/* ── Point list ── */}
      <ul className="point-list">
        {fireTests.length === 0 && (
          <li className="empty">No data points yet. Click "+ Add Point".</li>
        )}
        {fireTests.map((ft) => (
          <li
            key={ft.id}
            className={`point-item ${ft.id === selectedId ? "point-item--selected" : ""}`}
            onClick={() => onSelectId(ft.id === selectedId ? null : ft.id)}
          >
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
              onClick={(e) => { e.stopPropagation(); handleDelete(ft.id); }}
              title="Delete"
            >✕</button>
          </li>
        ))}
      </ul>

      {/* ── Attribute editor ── */}
      {selectedPoint && draft && (
        <div className="attr-panel">
          <div className="attr-header">
            <span>📋 Attributes</span>
            <button className="attr-close" onClick={() => onSelectId(null)}>✕</button>
          </div>

          <div className="attr-list">
            {(
              [
                { label: "Name",           field: "name"     as FieldKey, type: "text"   },
                { label: "Description",    field: "content"  as FieldKey, type: "text"   },
                { label: "Lat",            field: "lat"      as FieldKey, type: "number" },
                { label: "Lng",            field: "lng"      as FieldKey, type: "number" },
                { label: "Pressure (psi)", field: "pressure" as FieldKey, type: "number" },
                { label: "Flow (gpm)",     field: "flow"     as FieldKey, type: "number" },
              ] as { label: string; field: FieldKey; type: "text" | "number" }[]
            ).map(({ label, field, type }) => (
              <div className="attr-row" key={field}>
                <div className="attr-label">{label}</div>
                {editingField === field ? (
                  <input
                    className="attr-input"
                    type={type}
                    value={draft[field]}
                    autoFocus
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    onBlur={() => setEditingField(null)}
                    onKeyDown={handleKeyDown}
                  />
                ) : (
                  <div
                    className={`attr-value ${draft[field] !== (selectedPoint[field] != null ? String(selectedPoint[field]) : "") ? "attr-value--dirty" : ""}`}
                    onClick={() => setEditingField(field)}
                    title="Click to edit"
                  >
                    {draft[field] !== "" ? draft[field] : "—"}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Apply / Delete buttons ── */}
          <div className="attr-footer">
            <button
              className="btn-apply"
              onClick={handleApply}
              disabled={saving || !isDirty}
            >
              {saving ? "Saving…" : "Apply"}
            </button>
            <button
              className="btn-delete-point"
              onClick={() => handleDelete(selectedPoint.id)}
              disabled={saving}
              title="Delete this point"
            >
              🗑 Delete
            </button>
            {isDirty && <span className="unsaved-hint">Unsaved changes</span>}
          </div>
        </div>
      )}
    </aside>
  );
}
