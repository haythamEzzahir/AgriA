import { Sprout, Flask, Wrench, Wheat, Bird, MapPin } from '../icons';
import { useLanguage } from '../../i18n/context';

const CATEGORY_META = {
  semences: { Icon: Sprout, gradient: 'from-emerald-400 to-emerald-600' },
  engrais:  { Icon: Flask,  gradient: 'from-amber-400 to-amber-600' },
  matériel: { Icon: Wrench, gradient: 'from-slate-400 to-slate-600' },
  récolte:  { Icon: Wheat,  gradient: 'from-orange-400 to-orange-600' },
  bétail:   { Icon: Bird,   gradient: 'from-rose-400 to-rose-600' },
};

const FALLBACK = { Icon: Sprout, gradient: 'from-agri-400 to-agri-600' };

export default function ProductCard({ product }) {
  const { t } = useLanguage();
  const meta = CATEGORY_META[product.category] || FALLBACK;
  const Icon = meta.Icon;
  const categoryLabel = t(`community.categories.${product.category}`) || product.category;

  return (
    <article className="bg-white rounded-2xl border border-farm-100 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <div className={`h-40 relative overflow-hidden ${product.image ? '' : `bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}`}>
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <Icon size={56} className="text-white/85" strokeWidth={1.5} />
        )}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/95 text-agri-700 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm shadow-sm">
          <Icon size={11} />
          {categoryLabel}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-agri-900 text-sm leading-tight mb-1">
          {product.name}
        </h3>

        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-2xl font-extrabold text-agri-600">{product.price}</span>
          <span className="text-xs text-farm-400 font-medium">{t('community.perUnit')}{product.unit}</span>
        </div>

        <p className="text-xs text-farm-400 leading-relaxed mb-3 line-clamp-2 flex-1">
          {product.description}
        </p>

        <div className="flex items-center gap-2 text-[11px] text-farm-500 mb-3">
          <span className="flex items-center gap-1">
            <MapPin size={11} className="text-agri-500" />
            {product.region}
          </span>
          <span className="text-farm-300">·</span>
          <span>{product.seller}</span>
        </div>

        <button className="w-full px-3 py-2 bg-agri-500 hover:bg-agri-400 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm">
          {t('community.contactSeller')}
        </button>
      </div>
    </article>
  );
}
