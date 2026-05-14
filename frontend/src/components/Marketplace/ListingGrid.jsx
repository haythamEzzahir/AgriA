import React from 'react';
import { useLanguage } from '../../i18n/context';

const mockListings = [
  { id: 1, title: 'Organic Tomatoes', category: 'crops', price: 25, location: 'Marrakech', user: 'Farmer Ahmed' },
  { id: 2, title: 'Wheat Seeds (Premium)', category: 'seeds', price: 120, location: 'Fes', user: 'Coop Al Baraka' },
  { id: 3, title: 'NPK Fertilizer 20-20-20', category: 'fertilizers', price: 350, location: 'Casablanca', user: 'AgriSupply' },
  { id: 4, title: 'Tractor for Rent', category: 'equipment', price: 500, location: 'Rabat', user: 'Mechta Services' },
  { id: 5, title: 'Soil Analysis Service', category: 'services', price: 200, location: 'Agadir', user: 'LabVert' },
  { id: 6, title: 'Fresh Bell Peppers', category: 'crops', price: 18, location: 'Meknes', user: 'Green Valley Farm' },
];

const emojiMap = {
  crops: '🌾', seeds: '🌱', fertilizers: '🧪', equipment: '🚜', services: '🔧',
};

export default function ListingGrid({ category }) {
  const { t } = useLanguage();
  const filtered = category === 'all' ? mockListings : mockListings.filter((l) => l.category === category);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map((listing) => (
        <div key={listing.id} className="bg-white p-4 rounded-xl shadow-sm border border-farm-100 hover:shadow-md transition">
          <div className="h-32 bg-farm-50 rounded-lg mb-3 flex items-center justify-center text-3xl">
            {emojiMap[listing.category] || '📦'}
          </div>
          <h3 className="font-semibold text-sm">{listing.title}</h3>
          <p className="text-xs text-gray-400 capitalize">{t(`marketplace.${listing.category}`)}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-farm-700">{listing.price} MAD</span>
            <span className="text-xs text-gray-400">{listing.location}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{t('marketplace.by')} {listing.user}</p>
          <button className="mt-3 w-full py-2 bg-gray-900 text-white rounded-xl text-xs font-medium hover:bg-gray-800 transition">
            {t('marketplace.contact')}
          </button>
        </div>
      ))}
    </div>
  );
}
