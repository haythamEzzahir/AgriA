import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/context';
import { useAuth } from '../services/AuthContext';
import { register, farms } from '../services/api';
import FarmDrawer from '../components/Map/FarmDrawer';
import {
  Leaf, ChevronLeft, Check, User, Sprout, MapPin, Phone, Target, Ruler,
  Droplet, Wheat, AlertTriangle, Plus,
} from '../components/icons';

const FARM_SIZES = [
  { id: 'small',  labelEn: 'Small',  labelAr: 'صغيرة',  labelFr: 'Petite',  hint: '< 1 ha' },
  { id: 'medium', labelEn: 'Medium', labelAr: 'متوسطة', labelFr: 'Moyenne', hint: '1 – 5 ha' },
  { id: 'large',  labelEn: 'Large',  labelAr: 'كبيرة',  labelFr: 'Grande',  hint: '> 5 ha' },
];

const CROPS = [
  { id: 'wheat',    nameEn: 'Wheat',    nameAr: 'قمح',     nameFr: 'Blé' },
  { id: 'olives',   nameEn: 'Olives',   nameAr: 'زيتون',   nameFr: 'Olives' },
  { id: 'tomatoes', nameEn: 'Tomatoes', nameAr: 'طماطم',   nameFr: 'Tomates' },
  { id: 'potatoes', nameEn: 'Potatoes', nameAr: 'بطاطس',   nameFr: 'Pommes' },
  { id: 'corn',     nameEn: 'Corn',     nameAr: 'ذرة',     nameFr: 'Maïs' },
  { id: 'peppers',  nameEn: 'Peppers',  nameAr: 'فلفل',    nameFr: 'Poivrons' },
  { id: 'carrots',  nameEn: 'Carrots',  nameAr: 'جزر',     nameFr: 'Carottes' },
  { id: 'grapes',   nameEn: 'Grapes',   nameAr: 'عنب',     nameFr: 'Raisins' },
];

const IRRIGATION = [
  { id: 'rain',   labelEn: 'Rain only',       labelAr: 'مطر فقط',     labelFr: 'Pluie' },
  { id: 'drip',   labelEn: 'Drip irrigation', labelAr: 'ري بالتنقيط', labelFr: 'Goutte-à-goutte' },
  { id: 'well',   labelEn: 'Well water',      labelAr: 'مياه الآبار', labelFr: 'Puits' },
  { id: 'manual', labelEn: 'Manual',          labelAr: 'يدوي',        labelFr: 'Manuel' },
];

const WATER_ACCESS = [
  { id: 'good',      labelEn: 'Good access', labelAr: 'متوفر جيداً', labelFr: 'Bon accès', dot: 'bg-emerald-500' },
  { id: 'moderate',  labelEn: 'Moderate',    labelAr: 'متوسط',      labelFr: 'Modéré',    dot: 'bg-amber-400' },
  { id: 'difficult', labelEn: 'Difficult',   labelAr: 'صعب',        labelFr: 'Difficile', dot: 'bg-rose-500' },
];

const GOALS = [
  { id: 'harvest', labelEn: 'Improve harvest',  labelAr: 'تحسين المحصول', labelFr: 'Améliorer la récolte' },
  { id: 'water',   labelEn: 'Save water',       labelAr: 'توفير الماء',   labelFr: 'Économiser l\'eau' },
  { id: 'detect',  labelEn: 'Detect problems',  labelAr: 'كشف المشاكل',   labelFr: 'Détecter les problèmes' },
  { id: 'weather', labelEn: 'Weather alerts',   labelAr: 'تنبيهات الطقس', labelFr: 'Alertes météo' },
  { id: 'sell',    labelEn: 'Sell products',    labelAr: 'بيع المنتجات',  labelFr: 'Vendre' },
  { id: 'buy',     labelEn: 'Buy supplies',     labelAr: 'شراء',          labelFr: 'Acheter' },
];

const REGIONS = [
  'Casablanca-Settat', 'Marrakech-Safi', 'Fès-Meknès', 'Rabat-Salé-Kénitra',
  'Tanger-Tétouan', 'Souss-Massa', 'Oriental', 'Béni Mellal-Khénifra',
  'Drâa-Tafilalet', 'Laâyoune-Sakia El Hamra', 'Dakhla-Oued Ed-Dahab',
];

const STEPS = [
  { id: 0, label: 'Farmer', Icon: User },
  { id: 1, label: 'Farm',   Icon: Sprout },
  { id: 2, label: 'Land',   Icon: MapPin },
];

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white border border-farm-100 rounded-2xl shadow-sm p-5">
      <label className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-farm-500 font-semibold mb-3">
        {Icon && <Icon size={13} className="text-agri-500" />}
        {title}
      </label>
      {children}
    </div>
  );
}

function Chip({ selected, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
        selected
          ? 'bg-agri-500 text-white border-agri-500 shadow-md'
          : 'bg-white text-farm-500 border-farm-200 hover:border-agri-300'
      } ${className}`}
    >
      {children}
    </button>
  );
}

function GridButton({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 rounded-xl border text-center transition ${
        selected
          ? 'bg-agri-50 border-agri-500 ring-1 ring-agri-500'
          : 'bg-white border-farm-200 hover:border-agri-300'
      }`}
    >
      {children}
    </button>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { lang, setLang, languages } = useLanguage();
  const { isAuthenticated } = useAuth();

  const [section, setSection] = useState(0);
  const [form, setForm] = useState({
    name: '', phone: '', region: '', goals: [],
    size: '', crops: [], irrigation: '',
    waterAccess: '', customArea: '',
  });
  const [farmId, setFarmId] = useState(null);
  const [polygon, setPolygon] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingLand, setSavingLand] = useState(false);
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
    if (!isAuthenticated) { setError('Please sign in before saving your profile.'); setSavingPersonal(false); return; }
    try {
      await register.create({ name: form.name, phone: form.phone, region: form.region, goals: form.goals });
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
    if (!isAuthenticated) { setError('Please sign in before saving your profile.'); setSubmitting(false); return; }
    if (!form.size || !form.irrigation || !form.waterAccess) {
      setError('Please fill in Farm size, Irrigation method and Water access.');
      setSubmitting(false);
      return;
    }
    try {
      const res = await register.create({
        name: form.name, size: form.size, customArea: form.customArea,
        crops: form.crops, irrigation: form.irrigation, waterAccess: form.waterAccess,
      });
      if (res.farmId) setFarmId(res.farmId);
      setSection(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLandSubmit = async () => {
    setSavingLand(true);
    setError('');
    if (!isAuthenticated) { setError('Please sign in before saving your profile.'); setSavingLand(false); return; }
    if (!farmId) { setError('Farm profile not found. Go back and complete the farm step.'); setSavingLand(false); return; }
    if (!polygon) { setError('Please draw your farm boundary on the map.'); setSavingLand(false); return; }
    try {
      await farms.update(farmId, { polygon });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingLand(false);
    }
  };

  const l = (o) => {
    if (typeof o === 'string') return o;
    const key = lang === 'ar' ? 'Ar' : lang === 'fr' ? 'Fr' : 'En';
    return o[`label${key}`] || o[`name${key}`] || o.labelEn || o.nameEn || o;
  };

  const isFarmerComplete = form.name?.trim() && form.phone?.length >= 10 && form.region;

  return (
    <div className="min-h-screen bg-farm-50">
      {/* Top bar */}
      <nav className="bg-agri-900 border-b border-agri-800 sticky top-0 z-[1000]">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => (section === 2 ? setSection(1) : section === 1 ? setSection(0) : navigate('/'))}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white transition"
              aria-label="Back"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
              <Leaf size={18} className="text-agri-400" />
              <span className="font-bold text-white text-base tracking-tight">AgriCopilot</span>
            </div>
          </div>
          <div className="flex gap-1 bg-agri-950 rounded-lg p-0.5">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => setLang(language.code)}
                className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition ${
                  lang === language.code ? 'bg-agri-700 text-agri-200' : 'text-white/55 hover:text-white'
                }`}
              >
                {language.code === 'ar' ? 'ع' : language.code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Step indicator */}
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-4">
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 border border-farm-100 shadow-sm">
          {STEPS.map((step) => {
            const Icon = step.Icon;
            const isActive = section === step.id;
            const canNav = step.id === 0 || (step.id === 1 && isFarmerComplete) || (step.id === 2 && farmId);
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => canNav && setSection(step.id)}
                disabled={!canNav}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-agri-500 text-white shadow-md'
                    : canNav
                      ? 'text-farm-500 hover:text-agri-600'
                      : 'text-farm-300 cursor-not-allowed'
                }`}
              >
                <Icon size={14} />
                {step.label}
              </button>
            );
          })}
        </div>
      </div>

      {!isAuthenticated && (
        <div className="max-w-4xl mx-auto px-6 mb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle size={14} />
              You need an account to save your farm profile.
            </span>
            <a href="/auth" className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold text-xs transition">
              Sign in
            </a>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 pb-12">
        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700 inline-flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {section === 0 && (
          <div className="space-y-4">
            <Section icon={User} title="Full name">
              <input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Enter your full name"
                className="w-full bg-white border border-farm-200 rounded-xl px-4 py-3 text-agri-900 placeholder:text-farm-300 focus:outline-none focus:ring-2 focus:ring-agri-400 focus:border-transparent transition text-base"
              />
            </Section>

            <div className="grid md:grid-cols-2 gap-4">
              <Section icon={Phone} title="Phone number">
                <input
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 15))}
                  placeholder="+212 6XX XXX XXX"
                  className="w-full bg-white border border-farm-200 rounded-xl px-4 py-3 text-agri-900 placeholder:text-farm-300 focus:outline-none focus:ring-2 focus:ring-agri-400 focus:border-transparent transition text-base font-mono"
                />
              </Section>
              <Section icon={MapPin} title="Region">
                <select
                  value={form.region}
                  onChange={(e) => update('region', e.target.value)}
                  className="w-full bg-white border border-farm-200 rounded-xl px-4 py-3 text-agri-900 focus:outline-none focus:ring-2 focus:ring-agri-400 focus:border-transparent transition appearance-none"
                >
                  <option value="">Select region…</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Section>
            </div>

            <Section icon={Target} title="Goals (choose what matters)">
              <div className="flex flex-wrap gap-2">
                {GOALS.map((g) => (
                  <Chip key={g.id} selected={form.goals.includes(g.id)} onClick={() => toggleArray('goals', g.id)}>
                    {l(g)}
                  </Chip>
                ))}
              </div>
            </Section>

            <div className="text-center pt-2">
              <button
                onClick={handlePersonalSubmit}
                disabled={!isFarmerComplete || savingPersonal}
                className="px-10 py-3 bg-agri-500 hover:bg-agri-400 disabled:bg-farm-200 disabled:text-farm-400 text-white rounded-xl font-semibold transition shadow-md"
              >
                {savingPersonal ? 'Saving…' : 'Next — Farm information'}
              </button>
            </div>
          </div>
        )}

        {section === 1 && (
          <div className="space-y-4">
            <Section icon={Ruler} title="Farm size">
              <div className="grid grid-cols-3 gap-3">
                {FARM_SIZES.map((s) => (
                  <GridButton key={s.id} selected={form.size === s.id} onClick={() => update('size', s.id)}>
                    <span className="block text-sm font-semibold text-agri-900">{l(s)}</span>
                    <span className="block text-[11px] text-farm-400 mt-0.5">{s.hint}</span>
                  </GridButton>
                ))}
              </div>
              <input
                value={form.customArea}
                onChange={(e) => update('customArea', e.target.value)}
                placeholder="Or enter area in hectares"
                className="mt-3 w-full bg-white border border-farm-200 rounded-xl px-4 py-2.5 text-agri-900 placeholder:text-farm-300 focus:outline-none focus:ring-2 focus:ring-agri-400 focus:border-transparent transition text-sm"
              />
            </Section>

            <Section icon={Wheat} title="Crops (select all that apply)">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CROPS.map((c) => (
                  <Chip key={c.id} selected={form.crops.includes(c.id)} onClick={() => toggleArray('crops', c.id)} className="justify-center">
                    {l(c)}
                  </Chip>
                ))}
              </div>
            </Section>

            <div className="grid md:grid-cols-2 gap-4">
              <Section icon={Droplet} title="Irrigation method">
                <div className="grid grid-cols-2 gap-2">
                  {IRRIGATION.map((ir) => (
                    <GridButton key={ir.id} selected={form.irrigation === ir.id} onClick={() => update('irrigation', ir.id)}>
                      <span className="block text-sm font-semibold text-agri-900">{l(ir)}</span>
                    </GridButton>
                  ))}
                </div>
              </Section>
              <Section icon={Droplet} title="Water access">
                <div className="space-y-2">
                  {WATER_ACCESS.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => update('waterAccess', w.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition ${
                        form.waterAccess === w.id
                          ? 'bg-agri-50 border-agri-500 ring-1 ring-agri-500'
                          : 'bg-white border-farm-200 hover:border-agri-300'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${w.dot}`} />
                      <span className="text-sm font-medium text-agri-800">{l(w)}</span>
                    </button>
                  ))}
                </div>
              </Section>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={handleFarmSubmit}
                disabled={submitting}
                className="px-12 py-3 bg-agri-500 hover:bg-agri-400 disabled:bg-farm-200 disabled:text-farm-400 text-white rounded-xl font-semibold text-base transition shadow-md"
              >
                {submitting ? 'Creating…' : 'Next — Select your land'}
              </button>
            </div>
          </div>
        )}

        {section === 2 && (
          <div className="space-y-4">
            <Section icon={MapPin} title="Draw your farm boundary">
              <p className="text-sm text-farm-500 mb-3">
                Click on the map to place points around your farm. The area will be calculated automatically.
              </p>
              <FarmDrawer onPolygonChange={setPolygon} />
              {polygon && (
                <p className="inline-flex items-center gap-1.5 text-sm text-agri-600 mt-3 font-medium">
                  <Check size={14} />
                  Farm boundary set — ready to save
                </p>
              )}
            </Section>

            <div className="text-center pt-2 flex justify-center gap-3">
              <button
                onClick={() => setSection(1)}
                className="inline-flex items-center gap-1.5 px-6 py-3 bg-white border border-farm-200 text-farm-600 hover:bg-farm-50 rounded-xl font-semibold text-base transition"
              >
                <ChevronLeft size={14} />
                Back
              </button>
              <button
                onClick={handleLandSubmit}
                disabled={savingLand}
                className="inline-flex items-center gap-1.5 px-10 py-3 bg-agri-500 hover:bg-agri-400 disabled:bg-farm-200 disabled:text-farm-400 text-white rounded-xl font-semibold text-base transition shadow-md"
              >
                <Check size={14} />
                {savingLand ? 'Saving…' : 'Save & finish'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
