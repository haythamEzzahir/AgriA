import React, { useState } from 'react';
import ListingGrid from '../components/Marketplace/ListingGrid';
import AddListingForm from '../components/Marketplace/AddListingForm';

const categories = ['all', 'crops', 'seeds', 'fertilizers', 'equipment', 'services'];

export default function Marketplace() {
  const [category, setCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Marketplace</h1>
          <p className="text-gray-600">Buy and sell agricultural products and services</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          {showForm ? 'Cancel' : '+ Add Listing'}
        </button>
      </div>

      {showForm && <AddListingForm onDone={() => setShowForm(false)} />}

      <div className="flex gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${
              category === cat ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <ListingGrid category={category} />
    </div>
  );
}
