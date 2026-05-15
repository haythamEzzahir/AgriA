import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/context';
import { useAuth } from '../services/AuthContext';
import { register } from '../services/api';

const FARM_SIZES = [
  { id: 'small', icon: '🌱', labelEn: 'Small (< 1ha)', labelAr: 'صغيرة (أقل من 1 هكتار)', labelFr: 'Petite (< 1ha)' },
  { id: 'medium', icon: '🌿', labelEn: 'Medium (1-5ha)', labelAr: 'متوسطة (1-5 هكتار)', labelFr: 'Moyenne (1-5ha)' },
  { id: 'large', icon: '🌳', labelEn: 'Large (> 5ha)', labelAr: 'كبيرة (أكثر من 5 هكتار)', labelFr: 'Grande (> 5ha)' },
];

const CROPS = [
  { id: 'wheat', icon: '🌾', nameEn: 'Wheat', nameAr: 'قمح', nameFr: 'Blé' },
  { id: 'olives', icon: '🫒', nameEn: 'Olives', nameAr: 'زيتون', nameFr: 'Olives' },
  { id: 'tomatoes', icon: '🍅', nameEn: 'Tomatoes', nameAr: 'طماطم', nameFr: 'Tomates' },
  { id: 'potatoes', icon: '🥔', nameEn: 'Potatoes', nameAr: 'بطاطس', nameFr: 'Pommes' },
  { id: 'corn', icon: '🌽', nameEn: 'Corn', nameAr: 'ذرة', nameFr: 'Maïs' },
  { id: 'peppers', icon: '🫑', nameEn: 'Peppers', nameAr: 'فلفل', nameFr: 'Poivrons' },
  { id: 'carrots', icon: '🥕', nameEn: 'Carrots', nameAr: 'جزر', nameFr: 'Carottes' },
  { id: 'grapes', icon: '🍇', nameEn: 'Grapes', nameAr: 'عنب', nameFr: 'Raisins' },
];

const IRRIGATION = [
  { id: 'rain', icon: '☔', labelEn: 'Rain only', labelAr: 'مطر فقط', labelFr: 'Pluie' },
  { id: 'drip', icon: '💧', labelEn: 'Drip irrigation', labelAr: 'ري بالتنقيط', labelFr: 'Goutte-à-goutte' },
  { id: 'well', icon: '🪣', labelEn: 'Well water', labelAr: 'مياه الآبار', labelFr: 'Puits' },
  { id: 'manual', icon: '🚿', labelEn: 'Manual', labelAr: 'يدوي', labelFr: 'Manuel' },
];

const WATER_ACCESS = [
  { id: 'good', icon: '✓', labelEn: 'Good access', labelAr: 'متوفر جيداً', labelFr: 'Bon accès' },
  { id: 'moderate', icon: '~', labelEn: 'Moderate', labelAr: 'متوسط', labelFr: 'Modéré' },
  { id: 'difficult', icon: '!', labelEn: 'Difficult', labelAr: 'صعب', labelFr: 'Difficile' },
];

const GOALS = [
  { id: 'harvest', icon: '📈', labelEn: 'Improve harvest', labelAr: 'تحسين المحصول', labelFr: 'Améliorer' },
  { id: 'water', icon: '💧', labelEn: 'Save water', labelAr: 'توفير الماء', labelFr: 'Économiser' },
  { id: 'detect', icon: '🔍', labelEn: 'Detect problems', labelAr: 'كشف المشاكل', labelFr: 'Détecter' },
  { id: 'weather', icon: '🌤️', labelEn: 'Weather alerts', labelAr: 'الطقس', labelFr: 'Météo' },
  { id: 'sell', icon: '💰', labelEn: 'Sell products', labelAr: 'بيع', labelFr: 'Vendre' },
  { id: 'buy', icon: '🛒', labelEn: 'Buy supplies', labelAr: 'شراء', labelFr: 'Acheter' },
];

const REGIONS = [
  'Casablanca-Settat', 'Marrakech-Safi', 'Fès-Meknès', 'Rabat-Salé-Kénitra',
  'Tanger-Tétouan', 'Souss-Massa', 'Oriental', 'Béni Mellal-Khénifra',
  'Drâa-Tafilalet', 'Laâyoune-Sakia El Hamra', 'Dakhla-Oued Ed-Dahab',
];

function ToggleChip({ selected, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
        selected
          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
          : 'bg-white/5 border-gray-700 text-gray-400 hover:border-gray-500'
      }`}>
      {children}
    </button>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { lang, setLang, languages, t } = useLanguage();
  const { isAuthenticated } = useAuth();

  const [section, setSection] = useState(0);
  const [form, setForm] = useState({
    name: '', phone: '', region: '', goals: [],
    size: '', crops: [], irrigation: '',
    waterAccess: '', customArea: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [error, setError] = useState('');

  const update = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleArray = useCallback((key, id) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(id) ? prev[key].filter((x) => x !== id) : [...prev[key], id],
    }));
  }, []);

  const handlePersonalSubmit = async () => {
    setSavingPersonal(true);
    setError('');

    try {
      await register.create({
        name: form.name, phone: form.phone, region: form.region, goals: form.goals,
      });
      setSection(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleFarmSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      await register.create({
        name: form.name, size: form.size, customArea: form.customArea,
        crops: form.crops, irrigation: form.irrigation, waterAccess: form.waterAccess,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const l = (o) => {
    if (typeof o === 'string') return o;
    return o[`label${lang === 'ar' ? 'Ar' : lang === 'fr' ? 'Fr' : 'En'}`] || o.labelEn || o;
  };

  const isFarmerComplete = form.name?.trim() && form.phone?.length >= 10 && form.region;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-emerald-950 to-gray-900 text-white">
      <div className="border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => section > 0 ? setSection(0) : navigate('/')}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-semibold text-sm">🌾 AgriCopilot</span>
          </div>

          <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
            {languages.map((l) => (
              <button key={l.code} onClick={() => setLang(l.code)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  lang === l.code ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}>
                {l.code === 'ar' ? 'ع' : l.code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-8 pb-4">
        <div className="flex gap-2 bg-white/5 rounded-xl p-1">
          <button onClick={() => setSection(0)}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition ${
              section === 0 ? 'bg-emerald-500/20 text-emerald-300 shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}>
            👤 Farmer Information
          </button>
          <button onClick={() => setSection(isFarmerComplete ? 1 : 0)}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition ${
              section === 1 ? 'bg-emerald-500/20 text-emerald-300 shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}>
            🌾 Farm Information
          </button>
        </div>
      </div>

      {!isAuthenticated && (
        <div className="max-w-4xl mx-auto px-4 mb-4">
          <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-3 text-sm text-amber-200">
            Please <a href="/auth" className="underline font-medium">sign in</a> first to save your farm profile.
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 pb-24">
        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {section === 0 ? (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-medium block mb-3">👤 Full Name</label>
              <input value={form.name} onChange={(e) => update('name', e.target.value)}
                placeholder="Enter your full name"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:border-emerald-500/50 focus:outline-none transition text-lg" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <label className="text-xs uppercase tracking-wider text-gray-500 font-medium block mb-3">📞 Phone Number</label>
                <input value={form.phone} onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 15))}
                  placeholder="+212 6XX XXX XXX"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:border-emerald-500/50 focus:outline-none transition text-lg font-mono" />
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <label className="text-xs uppercase tracking-wider text-gray-500 font-medium block mb-3">📍 Region</label>
                <select value={form.region} onChange={(e) => update('region', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 focus:outline-none transition appearance-none">
                  <option value="" className="bg-gray-800">Select region...</option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r} className="bg-gray-800">{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-medium block mb-3">🎯 Goals (choose what matters)</label>
              <div className="flex flex-wrap gap-2">
                {GOALS.map((g) => (
                  <ToggleChip key={g.id} selected={form.goals.includes(g.id)} onClick={() => toggleArray('goals', g.id)}>
                    {g.icon} {l(g)}
                  </ToggleChip>
                ))}
              </div>
            </div>

            <div className="text-center">
              <button onClick={handlePersonalSubmit}
                disabled={!isFarmerComplete || savingPersonal}
                className="px-10 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-lg shadow-emerald-500/20">
                {savingPersonal ? '⏳ Saving...' : 'Next → Farm Information'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-medium block mb-3">📏 Farm Size</label>
              <div className="grid grid-cols-3 gap-3">
                {FARM_SIZES.map((s) => (
                  <button key={s.id} onClick={() => update('size', s.id)}
                    className={`p-4 rounded-xl border text-center transition ${
                      form.size === s.id ? 'bg-emerald-500/20 border-emerald-500' : 'bg-white/5 border-white/10 hover:border-gray-500'
                    }`}>
                    <span className="text-2xl block mb-1">{s.icon}</span>
                    <span className="text-xs text-gray-400">{l(s)}</span>
                  </button>
                ))}
              </div>
              <input value={form.customArea} onChange={(e) => update('customArea', e.target.value)}
                placeholder="or enter area in hectares"
                className="mt-3 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-emerald-500/50 focus:outline-none transition text-sm" />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-medium block mb-3">🌱 Crops (select all that apply)</label>
              <div className="grid grid-cols-4 gap-2">
                {CROPS.map((c) => (
                  <button key={c.id} onClick={() => toggleArray('crops', c.id)}
                    className={`p-3 rounded-xl border text-center transition ${
                      form.crops.includes(c.id) ? 'bg-emerald-500/20 border-emerald-500' : 'bg-white/5 border-white/10 hover:border-gray-500'
                    }`}>
                    <span className="text-xl block mb-1">{c.icon}</span>
                    <span className="text-xs text-gray-400">{l(c)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <label className="text-xs uppercase tracking-wider text-gray-500 font-medium block mb-3">💧 Irrigation Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {IRRIGATION.map((ir) => (
                    <button key={ir.id} onClick={() => update('irrigation', ir.id)}
                      className={`p-3 rounded-xl border text-center transition ${
                        form.irrigation === ir.id ? 'bg-emerald-500/20 border-emerald-500' : 'bg-white/5 border-white/10 hover:border-gray-500'
                      }`}>
                      <span className="text-lg block mb-1">{ir.icon}</span>
                      <span className="text-xs text-gray-400">{l(ir)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <label className="text-xs uppercase tracking-wider text-gray-500 font-medium block mb-3">🚰 Water Access</label>
                <div className="space-y-2">
                  {WATER_ACCESS.map((w) => (
                    <button key={w.id} onClick={() => update('waterAccess', w.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition ${
                        form.waterAccess === w.id ? 'bg-emerald-500/20 border-emerald-500' : 'bg-white/5 border-white/10 hover:border-gray-500'
                      }`}>
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        w.id === 'good' ? 'bg-emerald-500/20 text-emerald-400' :
                        w.id === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>{w.icon}</span>
                      <span className="text-sm text-gray-300">{l(w)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-center pt-4">
              <button onClick={handleFarmSubmit} disabled={submitting || !isAuthenticated || !form.size || !form.irrigation || !form.waterAccess}
                className="px-12 py-3.5 bg-emerald-500 text-white rounded-xl font-semibold text-lg hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-lg shadow-emerald-500/20">
                {submitting ? '⏳ Creating Profile...' : '✓ Create Farm Profile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
