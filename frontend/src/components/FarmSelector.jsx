import React, { useState } from 'react';
import FarmDrawer from './Map/FarmDrawer';
import { farms as farmsApi } from '../services/api';
import { ChevronDown, Plus } from './icons';

const THEMES = {
  light: {
    trigger: 'text-agri-900 hover:text-agri-700',
    chevron: 'text-farm-400',
    menu: 'bg-white border border-farm-100 shadow-xl',
    item: 'text-agri-700 hover:bg-farm-50',
    activeItem: 'bg-agri-50 text-agri-700 font-semibold',
    addItem: 'text-agri-600 hover:bg-agri-50 border-t border-farm-100',
  },
  dark: {
    trigger: 'text-white hover:text-agri-200',
    chevron: 'text-white/60',
    menu: 'bg-slate-950/95 border border-white/15 shadow-xl backdrop-blur',
    item: 'text-white/80 hover:bg-white/5',
    activeItem: 'bg-white/10 text-white font-semibold',
    addItem: 'text-emerald-300 hover:bg-white/5 border-t border-white/10',
  },
};

export default function FarmSelector({ farms, selectedId, onSelect, onAdd, theme = 'light' }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [polygon, setPolygon] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const t = THEMES[theme] || THEMES.light;
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
          className={`flex items-center gap-1.5 text-base font-bold transition ${t.trigger}`}
        >
          <span>{current?.name || 'Select farm'}</span>
          <ChevronDown size={14} className={t.chevron} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-[40]" onClick={() => setOpen(false)} />
            <div className={`absolute top-full left-0 mt-1.5 min-w-56 rounded-xl overflow-hidden z-[50] ${t.menu}`}>
              {farms.length > 0 && farms.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { onSelect(f.id); setOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 text-xs transition ${
                    f.id === (selectedId || current?.id) ? t.activeItem : t.item
                  }`}
                >
                  {f.name}
                </button>
              ))}
              <button
                onClick={() => { setAdding(true); setOpen(false); }}
                className={`w-full flex items-center gap-1.5 text-left px-3.5 py-2 text-xs font-semibold transition ${t.addItem}`}
              >
                <Plus size={12} />
                Add new farm
              </button>
            </div>
          </>
        )}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-farm-100 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-agri-900 mb-1">Add new farm</h2>
            <p className="text-farm-400 text-xs mb-4">Name your farm and draw the boundary on the map.</p>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Farm name"
              className="w-full px-3 py-2 mb-4 rounded-xl bg-white border border-farm-200 text-agri-800 text-sm focus:outline-none focus:ring-2 focus:ring-agri-400 focus:border-transparent"
            />

            <FarmDrawer onPolygonChange={setPolygon} />

            {error && <p className="text-rose-500 text-xs mt-3">{error}</p>}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => { setAdding(false); resetForm(); }}
                disabled={saving}
                className="px-4 py-2 text-sm text-farm-500 hover:text-agri-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim() || !polygon}
                className="px-4 py-2 text-sm bg-agri-500 hover:bg-agri-400 disabled:bg-farm-200 disabled:text-farm-400 text-white font-semibold rounded-xl transition shadow-sm"
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
