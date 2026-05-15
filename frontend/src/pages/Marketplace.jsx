import React, { useState } from 'react';
import { useLanguage } from '../i18n/context';
import ListingGrid from '../components/Marketplace/ListingGrid';
import AddListingForm from '../components/Marketplace/AddListingForm';

const categories = [
  { key: 'all', id: 'all' },
  { key: 'crops', id: 'crops' },
  { key: 'seeds', id: 'seeds' },
  { key: 'fertilizers', id: 'fertilizers' },
  { key: 'equipment', id: 'equipment' },
  { key: 'services', id: 'services' },
];

export default function Marketplace() {
  const { t } = useLanguage();
  const [category, setCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-agri-50">{t('marketplace.title')}</h1>
          <p className="text-agri-500 text-xs">{t('marketplace.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-agri-500 text-white rounded-lg text-sm font-medium hover:bg-agri-400 transition">
          {showForm ? t('marketplace.cancel') : t('marketplace.addListing')}
        </button>
      </div>

      {showForm && <AddListingForm onDone={() => setShowForm(false)} />}

      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button key={cat.id} onClick={() => setCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
              category === cat.id ? 'bg-agri-700 text-agri-200' : 'bg-agri-800 text-agri-500 hover:bg-agri-700 hover:text-agri-300 border border-agri-700'
            }`}>
            {t(`marketplace.${cat.key}`)}
          </button>
        ))}
      </div>

      <ListingGrid category={category} />
    </div>
  );
}
