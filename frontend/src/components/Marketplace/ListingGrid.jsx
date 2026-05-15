import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/context';
import { marketplace } from '../../services/api';

const fallbackListings = [
  { id: 'demo-1', title: 'Fresh tomato crates', category: 'crops', price: 120, location: 'Oujda' },
  { id: 'demo-2', title: 'Drip irrigation kit', category: 'equipment', price: 850, location: 'Berkane' },
  { id: 'demo-3', title: 'Organic compost bags', category: 'fertilizers', price: 45, location: 'Fes' },
  { id: 'demo-4', title: 'Certified tomato seeds', category: 'seeds', price: 75, location: 'Meknes' },
  { id: 'demo-5', title: 'Soil inspection visit', category: 'services', price: 300, location: 'Rabat' },
];

const labelMap = {
  crops: 'Crop',
  seeds: 'Seed',
  fertilizers: 'Fert',
  equipment: 'Gear',
  services: 'Svc',
};

export default function ListingGrid({ category }) {
  const { t } = useLanguage();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await marketplace.list({ category });
        if (alive) setListings(data || []);
      } catch (err) {
        const filtered = category === 'all'
          ? fallbackListings
          : fallbackListings.filter((listing) => listing.category === category);
        if (alive) {
          setListings(filtered);
          setError(err.message);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [category]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">{t('dashboard.loading')}</p>
      </div>
    );
  }

  if (!listings.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">{t('marketplace.noListings', 'No listings found.')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-amber-400">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {listings.map((listing) => (
          <div key={listing.id || listing.title} className="bg-agri-800 p-4 rounded-lg border border-agri-700 hover:border-agri-600 transition">
            <div className="h-28 bg-agri-900 rounded-lg mb-3 flex items-center justify-center text-sm font-bold text-agri-400">
              {labelMap[listing.category] || 'Item'}
            </div>
            <h3 className="font-semibold text-sm text-agri-100">{listing.title}</h3>
            <p className="text-xs text-agri-500 capitalize">{t(`marketplace.${listing.category}`)}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="font-bold text-agri-300 text-sm">{listing.price ? `${listing.price} MAD` : '-'}</span>
              <span className="text-xs text-agri-600">{listing.location || listing.users?.location || ''}</span>
            </div>
            {listing.users?.name && (
              <p className="text-xs text-agri-600 mt-1">{t('marketplace.by')} {listing.users.name}</p>
            )}
            <button className="mt-3 w-full py-2 bg-agri-500 text-white rounded-lg text-xs font-medium hover:bg-agri-400 transition">
              {t('marketplace.contact')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
