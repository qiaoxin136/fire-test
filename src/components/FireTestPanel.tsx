import { useState } from "react";
import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

type FireTest = Schema["FireTest"]["type"];
type FieldKey = "name" | "content" | "lat" | "lng" | "pressure" | "flow";

const client = generateClient<Schema>();

interface FireTestPanelProps {
  fireTests: FireTest[];
  isPlacingPoint: boolean;
  onStartPlacing: () => void;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
}

export default function FireTestPanel({
  fireTests,
  isPlacingPoint,
  onStartPlacing,
  selectedId,
  onSelectId,
}: FireTestPanelProps) {
  const [editingField, setEditingField] = useState<FieldKey | null>(null);
  const [editValue, setEditValue] = useState("");

  const selectedPoint = fireTests.find((ft) => ft.id === selectedId) ?? null;

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this point?")) return;
    if (selectedId === id) onSelectId(null);
    await client.models.FireTest.delete({ id });
  }

  function startEdit(field: FieldKey, current: string | number | null | undefined) {
    setEditingField(field);
    setEditValue(current != null ? String(current) : "");
  }

  async function commitEdit() {
    if (!selectedPoint || editingField === null) return;
    setEditingField(null);

    const numFields: FieldKey[] = ["lat", "lng", "pressure", "flow"];
    const value = numFields.includes(editingField)
      ? editValue === "" ? null : parseFloat(editValue)
      : editValue === "" ? null : editValue;

    await client.models.FireTest.update({
      id: selectedPoint.id,
      [editingField]: value,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditingField(null);
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
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {/* ── Attribute editor ── */}
      {selectedPoint && (
        <div className="attr-panel">
          <div className="attr-header">
            <span>📋 Attributes</span>
            <button className="attr-close" onClick={() => onSelectId(null)}>✕</button>
          </div>

          <div className="attr-list">
            <AttrRow
              label="Name"
              field="name"
              value={selectedPoint.name}
              editingField={editingField}
              editValue={editValue}
              onEdit={startEdit}
              onChange={setEditValue}
              onCommit={commitEdit}
              onKeyDown={handleKeyDown}
            />
            <AttrRow
              label="Description"
              field="content"
              value={selectedPoint.content}
              editingField={editingField}
              editValue={editValue}
              onEdit={startEdit}
              onChange={setEditValue}
              onCommit={commitEdit}
              onKeyDown={handleKeyDown}
            />
            <AttrRow
              label="Lat"
              field="lat"
              value={selectedPoint.lat}
              editingField={editingField}
              editValue={editValue}
              onEdit={startEdit}
              onChange={setEditValue}
              onCommit={commitEdit}
              onKeyDown={handleKeyDown}
              type="number"
            />
            <AttrRow
              label="Lng"
              field="lng"
              value={selectedPoint.lng}
              editingField={editingField}
              editValue={editValue}
              onEdit={startEdit}
              onChange={setEditValue}
              onCommit={commitEdit}
              onKeyDown={handleKeyDown}
              type="number"
            />
            <AttrRow
              label="Pressure (psi)"
              field="pressure"
              value={selectedPoint.pressure}
              editingField={editingField}
              editValue={editValue}
              onEdit={startEdit}
              onChange={setEditValue}
              onCommit={commitEdit}
              onKeyDown={handleKeyDown}
              type="number"
            />
            <AttrRow
              label="Flow (gpm)"
              field="flow"
              value={selectedPoint.flow}
              editingField={editingField}
              editValue={editValue}
              onEdit={startEdit}
              onChange={setEditValue}
              onCommit={commitEdit}
              onKeyDown={handleKeyDown}
              type="number"
            />
          </div>
        </div>
      )}
    </aside>
  );
}

// ── Single editable row ───────────────────────────────────────────────────────
interface AttrRowProps {
  label: string;
  field: FieldKey;
  value: string | number | null | undefined;
  editingField: FieldKey | null;
  editValue: string;
  onEdit: (field: FieldKey, current: string | number | null | undefined) => void;
  onChange: (val: string) => void;
  onCommit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  type?: "text" | "number";
}

function AttrRow({
  label, field, value, editingField, editValue,
  onEdit, onChange, onCommit, onKeyDown, type = "text",
}: AttrRowProps) {
  const isEditing = editingField === field;
  const display = value != null ? String(value) : "—";

  return (
    <div className="attr-row">
      <div className="attr-label">{label}</div>
      {isEditing ? (
        <input
          className="attr-input"
          type={type}
          value={editValue}
          autoFocus
          onChange={(e) => onChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={onKeyDown}
        />
      ) : (
        <div
          className="attr-value"
          onClick={() => onEdit(field, value)}
          title="Click to edit"
        >
          {display}
        </div>
      )}
    </div>
  );
}
