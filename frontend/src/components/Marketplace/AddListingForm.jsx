import React, { useState } from 'react';
import { useLanguage } from '../../i18n/context';

const categories = ['crops', 'seeds', 'fertilizers', 'equipment', 'services'];

export default function AddListingForm({ onDone }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ title: '', category: 'crops', description: '', price: '', location: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-farm-100 space-y-4">
      <h3 className="font-semibold">{t('marketplace.newListing')}</h3>

      <input placeholder={t('marketplace.titleLabel')} value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-gray-900 focus:outline-none" required />

      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
        {categories.map((c) => (
          <option key={c} value={c}>{t(`marketplace.${c}`)}</option>
        ))}
      </select>

      <textarea placeholder={t('marketplace.description')} value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" rows={3} />

      <div className="grid grid-cols-2 gap-4">
        <input type="number" placeholder={t('marketplace.price')} value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
        <input placeholder={t('marketplace.location')} value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
      </div>

      <button type="submit" className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition">
        {t('marketplace.publish')}
      </button>
    </form>
  );
}
