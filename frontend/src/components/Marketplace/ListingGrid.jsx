import React from 'react';

const listings = [
  { title: 'Fresh tomato crates', category: 'crops', price: '120 MAD', location: 'Oujda' },
  { title: 'Drip irrigation kit', category: 'equipment', price: '850 MAD', location: 'Berkane' },
  { title: 'Organic compost bags', category: 'fertilizers', price: '45 MAD', location: 'Fes' },
  { title: 'Certified tomato seeds', category: 'seeds', price: '75 MAD', location: 'Meknes' },
  { title: 'Soil inspection visit', category: 'services', price: '300 MAD', location: 'Rabat' },
];

export default function ListingGrid({ category }) {
  const filteredListings = category === 'all'
    ? listings
    : listings.filter((listing) => listing.category === category);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filteredListings.map((listing) => (
        <article key={listing.title} className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-primary-700">{listing.category}</p>
          <h3 className="mt-2 text-lg font-bold text-gray-900">{listing.title}</h3>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="font-bold text-primary-700">{listing.price}</span>
            <span className="text-gray-500">{listing.location}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
