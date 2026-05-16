import ProductCard from './ProductCard';

export default function ProductGrid({ products, loading = false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-farm-100 shadow-sm overflow-hidden animate-pulse">
            <div className="h-40 bg-farm-100" />
            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <div className="h-3 bg-farm-100 rounded w-24" />
                <div className="h-3 bg-farm-100 rounded w-16" />
              </div>
              <div className="h-3 bg-farm-100 rounded w-full" />
              <div className="h-3 bg-farm-100 rounded w-3/4" />
              <div className="h-8 bg-farm-100 rounded-xl w-full mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-agri-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-agri-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <p className="text-agri-700 font-medium text-sm mb-1">Aucune annonce disponible</p>
        <p className="text-farm-400 text-xs">Soyez le premier à déposer une annonce</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product, i) => (
        <div key={product.id} className="animate-fadeIn" style={{ animationDelay: `${i * 60}ms` }}>
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
