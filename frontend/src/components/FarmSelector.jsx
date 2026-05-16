import React, { useState } from 'react';
import FarmDrawer from './Map/FarmDrawer';
import { farms as farmsApi } from '../services/api';

export default function FarmSelector({ farms, selectedId, onSelect, onAdd }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [polygon, setPolygon] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const current = farms.find((f) => f.id === selectedId) || farms[0];

  const resetForm = () => {
    setName('');
    setPolygon(null);
    setError('');
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Farm name is required'); return; }
    if (!polygon) { setError('Draw the farm boundary on the map'); return; }
    setSaving(true);
    setError('');
    try {
      const ring = polygon.coordinates?.[0] || [];
      const lats = ring.map((p) => p[1]);
      const lngs = ring.map((p) => p[0]);
      const latitude = lats.reduce((a, b) => a + b, 0) / lats.length;
      const longitude = lngs.reduce((a, b) => a + b, 0) / lngs.length;

      const created = await farmsApi.create({
        name: name.trim(),
        polygon,
        latitude,
        longitude,
        crops: [],
      });
      onAdd(created);
      setAdding(false);
      resetForm();
    } catch (err) {
      setError(err.message || 'Failed to create farm');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-bold text-agri-50 hover:text-agri-200 transition"
        >
          <span>{current?.name || 'Select farm'}</span>
          <span className="text-[9px] text-agri-500">▼</span>
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-[40]" onClick={() => setOpen(false)} />
            <div className="absolute top-full left-0 mt-1 min-w-56 bg-agri-800 border border-agri-700 rounded-lg shadow-xl z-[50] overflow-hidden">
              {farms.length > 0 && farms.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { onSelect(f.id); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs transition ${
                    f.id === (selectedId || current?.id)
                      ? 'bg-agri-700 text-agri-100 font-medium'
                      : 'text-agri-300 hover:bg-agri-700'
                  }`}
                >
                  {f.name}
                </button>
              ))}
              <button
                onClick={() => { setAdding(true); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-emerald-400 hover:bg-agri-700 border-t border-agri-700"
              >
                + Add new farm
              </button>
            </div>
          </>
        )}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl bg-agri-900 rounded-xl border border-agri-700 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-agri-50 mb-1">Add new farm</h2>
            <p className="text-agri-500 text-xs mb-4">Name your farm and draw the boundary on the map.</p>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Farm name"
              className="w-full px-3 py-2 mb-4 rounded bg-agri-800 border border-agri-700 text-agri-100 text-sm focus:border-agri-500 outline-none"
            />

            <FarmDrawer onPolygonChange={setPolygon} />

            {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => { setAdding(false); resetForm(); }}
                disabled={saving}
                className="px-4 py-2 text-sm text-agri-400 hover:text-agri-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim() || !polygon}
                className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-agri-700 disabled:text-agri-500 text-white rounded transition"
              >
                {saving ? 'Saving…' : 'Save farm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
