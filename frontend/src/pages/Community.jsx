import { useState } from 'react';
import PostGrid from '../components/Community/PostGrid';
import AddPostForm from '../components/Community/AddPostForm';
import ProductGrid from '../components/Market/ProductGrid';
import { Users, Plus, Search, Sprout, Flask, Wrench, Wheat, Bird } from '../components/icons';
import { useLanguage } from '../i18n/context';

const TABS = [
  { id: 'community', Icon: Users,  labelKey: 'tabCommunity' },
  { id: 'market',    Icon: Sprout, labelKey: 'tabMarket' },
];

const POST_FILTER_IDS = ['all', 'question', 'conseil', 'problème', 'météo', 'discussion'];

const CAT_FILTER_IDS = [
  { id: 'all', Icon: null },
  { id: 'semences', Icon: Sprout },
  { id: 'engrais', Icon: Flask },
  { id: 'matériel', Icon: Wrench },
  { id: 'récolte', Icon: Wheat },
  { id: 'bétail', Icon: Bird },
];

const INITIAL_POSTS = [
  { id: 1, author: 'Ahmed Benali', region: 'Marrakech', avatar: 'AB', type: 'question', content: "Quelle est la meilleure période pour irriguer les oliviers en été ? Certains de mes arbres semblent souffrir de la chaleur malgré un arrosage régulier.", likes: 24, comments: 8, time: 'Il y a 2 h', tags: ['olivier', 'irrigation', 'été'] },
  { id: 2, author: 'Fatima Ouali', region: 'Fès', avatar: 'FO', type: 'conseil', content: "Astuce testée : l'extrait d'ail dilué (1 pour 10) fonctionne comme un pesticide naturel efficace contre les pucerons. À pulvériser le soir pour préserver les pollinisateurs.", likes: 51, comments: 14, time: 'Il y a 5 h', tags: ['bio', 'ravageurs', 'astuce'] },
  { id: 3, author: 'Youssef Nasri', region: 'Rabat', avatar: 'YN', type: 'météo', content: "Alerte : vague de chaleur prévue la semaine prochaine dans les régions du centre. Recommandé de préparer des ombrières temporaires pour le bétail.", likes: 38, comments: 6, time: 'Il y a 1 j', tags: ['météo', 'alerte', 'bétail'] },
  { id: 4, author: 'Khadija Mrabet', region: 'Meknès', avatar: 'KM', type: 'problème', content: "Mes vignes présentent un jaunissement des feuilles malgré une fertilisation régulière. Quelqu'un a-t-il rencontré ce problème ?", likes: 12, comments: 19, time: 'Il y a 2 j', tags: ['vigne', 'carence', 'diagnostic'] },
  { id: 5, author: 'Mohamed Ouazani', region: 'Agadir', avatar: 'MO', type: 'discussion', content: "Retour d'expérience sur l'irrigation goutte-à-goutte : économie de 40 % d'eau et hausse de production de 25 %. L'investissement est rentabilisé en une saison.", likes: 67, comments: 22, time: 'Il y a 3 j', tags: ['goutte-à-goutte', 'tomates', 'rentabilité'] },
];

const INITIAL_PRODUCTS = [
  { id: 1, name: 'Semences de tomates hybrides', price: 85, unit: '500 g', region: 'Agadir', seller: 'Mohamed Ouazani', category: 'semences', description: 'Variété haut rendement adaptée au climat marocain. Germination > 92 %.', image: '/products/tomato-seeds.jpg' },
  { id: 2, name: 'Compost organique naturel', price: 120, unit: 'sac 25 kg', region: 'Marrakech', seller: 'Ahmed Benali', category: 'engrais', description: "Compost 100 % organique issu de déjections animales, prêt à l'emploi.", image: '/products/compost.png' },
  { id: 3, name: 'Charrue légère — bon état', price: 3500, unit: 'unité', region: 'Fès', seller: 'Fatima Ouali', category: 'matériel', description: "Charrue d'occasion en excellent état, 2 saisons d'utilisation.", image: '/products/plow.jpg' },
  { id: 4, name: 'Olives séchées récolte 2024', price: 45, unit: 'kg', region: 'Meknès', seller: 'Khadija Mrabet', category: 'récolte', description: 'Olives séchées naturellement, sans conservateurs.', image: '/products/olives.jpg' },
  { id: 5, name: 'Poulets fermiers à vendre', price: 65, unit: 'pièce', region: 'Rabat', seller: 'Youssef Nasri', category: 'bétail', description: 'Poulets de plein air nourris naturellement, ~1,5 kg pièce.', image: '/products/chickens.jpg' },
  { id: 6, name: 'Semences de poivron doux', price: 60, unit: '200 g', region: 'Agadir', seller: 'Saïd Amrani', category: 'semences', description: 'Poivron doux haut rendement, résistant aux maladies. Germination 90 %.', image: '/products/pepper-seeds.jpg' },
];

export default function Community() {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('community');
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [filter, setFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredPosts = posts.filter((p) => {
    const matchType = filter === 'all' || p.type === filter;
    const matchSearch = !search || p.content.toLowerCase().includes(search.toLowerCase()) || p.author.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const filteredProducts = INITIAL_PRODUCTS.filter((p) => {
    const matchCat = catFilter === 'all' || p.category === catFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.seller.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-full bg-farm-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-agri-900 via-agri-800 to-agri-700 border-b border-agri-700">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-agri-500/20 border border-agri-400/30 rounded-full text-xs text-agri-300 font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-agri-400 inline-block" />
            {t('community.badge')}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
                {t('community.heroPrefix')} <span className="text-agri-400">{t('community.heroTitle')}</span>
              </h1>
              <p className="text-white/55 text-sm max-w-lg leading-relaxed">
                {t('community.heroSubtitle')}
              </p>
            </div>
            <div className="flex gap-4">
              {[
                { n: posts.length, l: t('community.statPublications') },
                { n: INITIAL_PRODUCTS.length, l: t('community.statListings') },
                { n: '12K+', l: t('community.statMembers') },
              ].map((s) => (
                <div key={s.l} className="text-center px-4 py-2.5 bg-white/[0.06] rounded-2xl border border-white/10 backdrop-blur-sm">
                  <p className="font-extrabold text-white text-lg m-0">{s.n}</p>
                  <p className="text-white/45 text-xs mt-0.5 m-0">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-7">
        {/* Tabs */}
        <div className="inline-flex gap-1 bg-white rounded-2xl p-1 border border-farm-100 shadow-sm mb-5">
          {TABS.map((tab) => {
            const Icon = tab.Icon;
            return (
              <button key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearch(''); setFilter('all'); setCatFilter('all'); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === tab.id ? 'bg-agri-500 text-white shadow-md' : 'text-farm-400 hover:text-agri-600'}`}>
                <Icon size={16} />
                {t(`community.${tab.labelKey}`)}
              </button>
            );
          })}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap gap-3 mb-5 items-center">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-farm-300" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'community' ? t('community.searchPosts') : t('community.searchProducts')}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-farm-200 text-sm text-agri-900 placeholder-farm-300 focus:outline-none focus:ring-2 focus:ring-agri-400 focus:border-transparent bg-white" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {activeTab === 'community'
              ? POST_FILTER_IDS.map((id) => {
                  const active = filter === id;
                  return (
                    <button key={id} onClick={() => setFilter(id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${active ? 'bg-agri-500 text-white border-agri-500 shadow-md' : 'bg-white text-farm-500 border-farm-200 hover:border-agri-300'}`}>
                      {t(`community.postTypes.${id}`)}
                    </button>
                  );
                })
              : CAT_FILTER_IDS.map((cat) => {
                  const active = catFilter === cat.id;
                  const FIcon = cat.Icon;
                  return (
                    <button key={cat.id} onClick={() => setCatFilter(cat.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${active ? 'bg-agri-500 text-white border-agri-500 shadow-md' : 'bg-white text-farm-500 border-farm-200 hover:border-agri-300'}`}>
                      {FIcon && <FIcon size={12} />}
                      {t(`community.categories.${cat.id}`)}
                    </button>
                  );
                })}
          </div>
        </div>

        {activeTab === 'community' && (
          <div className="max-w-2xl mx-auto">
            <AddPostForm onAddPost={(p) => setPosts((prev) => [p, ...prev])} />
            <PostGrid posts={filteredPosts} />
          </div>
        )}

        {activeTab === 'market' && (
          <div>
            <div className="flex items-center justify-between mb-5 gap-3">
              <p className="text-sm text-farm-400">
                {(() => {
                  const tpl = filteredProducts.length === 1
                    ? t('community.listingCount')
                    : t('community.listingsCount');
                  const parts = tpl.split('{n}');
                  return (
                    <>
                      {parts[0]}
                      <span className="font-semibold text-agri-700">{filteredProducts.length}</span>
                      {parts[1] || ''}
                    </>
                  );
                })()}
              </p>
              <button className="flex items-center gap-2 px-4 py-2 bg-agri-500 text-white rounded-xl text-sm font-semibold hover:bg-agri-400 transition-colors shadow-md">
                <Plus size={14} strokeWidth={2.5} />
                {t('community.newListing')}
              </button>
            </div>
            <ProductGrid products={filteredProducts} />
          </div>
        )}
      </div>
    </div>
  );
}
