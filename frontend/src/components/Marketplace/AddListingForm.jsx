import React, { useState } from 'react';
import { useLanguage } from '../../i18n/context';
import { marketplace } from '../../services/api';

const CATEGORIES = ['crops', 'seeds', 'fertilizers', 'equipment', 'services'];

export default function AddListingForm({ onDone }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    title: '',
    category: 'crops',
    description: '',
    price: '',
    location: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await marketplace.create({
        ...form,
        price: form.price ? parseFloat(form.price) : null,
      });
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-agri-800 p-5 rounded-lg border border-agri-700 space-y-3">
      <h3 className="font-semibold text-sm text-agri-100">{t('marketplace.newListing')}</h3>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <input
        placeholder={t('marketplace.titleLabel')}
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full px-3 py-2 bg-agri-900 border border-agri-700 rounded-lg text-sm text-agri-200 placeholder:text-agri-600 focus:border-agri-500 focus:outline-none"
        required
      />

      <select
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
        className="w-full px-3 py-2 bg-agri-900 border border-agri-700 rounded-lg text-sm text-agri-200"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c} className="bg-agri-900">{t(`marketplace.${c}`)}</option>
        ))}
      </select>

      <textarea
        placeholder={t('marketplace.description')}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full px-3 py-2 bg-agri-900 border border-agri-700 rounded-lg text-sm text-agri-200 placeholder:text-agri-600"
        rows={3}
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          placeholder={t('marketplace.price')}
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          className="w-full px-3 py-2 bg-agri-900 border border-agri-700 rounded-lg text-sm text-agri-200 placeholder:text-agri-600"
        />
        <input
          placeholder={t('marketplace.location')}
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          className="w-full px-3 py-2 bg-agri-900 border border-agri-700 rounded-lg text-sm text-agri-200 placeholder:text-agri-600"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-agri-500 text-white rounded-lg text-sm font-medium hover:bg-agri-400 disabled:opacity-50 transition"
      >
        {submitting ? t('marketplace.publishing', 'Publishing...') : t('marketplace.publish')}
      </button>
    </form>
  );
}
