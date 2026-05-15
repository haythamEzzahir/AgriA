import React from 'react';

const recommendations = [
  'Schedule irrigation before sunrise for the tomato zone.',
  'Add mulch near exposed rows to slow soil drying.',
  'Check leaf edges this evening for early heat stress signs.',
];

export default function CropRecommendations() {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="font-semibold text-gray-800">Crop Recommendations</h3>
      <div className="mt-4 space-y-3">
        {recommendations.map((item, index) => (
          <div key={item} className="flex gap-3 rounded-lg bg-primary-50 p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
              {index + 1}
            </span>
            <p className="text-sm leading-6 text-gray-700">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
