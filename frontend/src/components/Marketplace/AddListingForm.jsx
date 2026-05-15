import React, { useState } from 'react';

export default function AddListingForm({ onDone }) {
  const [title, setTitle] = useState('');

  const submitListing = (event) => {
    event.preventDefault();
    setTitle('');
    onDone?.();
  };

  return (
    <form onSubmit={submitListing} className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Listing title"
          className="rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          required
        />
        <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700">
          Save demo listing
        </button>
      </div>
    </form>
  );
}
