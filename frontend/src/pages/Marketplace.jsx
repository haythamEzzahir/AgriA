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
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('marketplace.title')}</h1>
          <p className="text-gray-500 text-sm">{t('marketplace.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition">
          {showForm ? t('marketplace.cancel') : t('marketplace.addListing')}
        </button>
      </div>

      {showForm && <AddListingForm onDone={() => setShowForm(false)} />}

      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button key={cat.id} onClick={() => setCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition ${
              category === cat.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {t(`marketplace.${cat.key}`)}
          </button>
        ))}
      </div>

      <ListingGrid category={category} />
    </div>
  );
}
