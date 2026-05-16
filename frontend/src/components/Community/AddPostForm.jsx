import { useState } from 'react';

const POST_TYPES = [
  { value: 'question',   label: '❓ Question' },
  { value: 'conseil',    label: '💡 Conseil' },
  { value: 'problème',   label: '⚠️ Problème' },
  { value: 'météo',      label: '🌦️ Météo' },
  { value: 'discussion', label: '💬 Discussion' },
];

export default function AddPostForm({ onAddPost }) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [type, setType] = useState('discussion');
  const [region, setRegion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      onAddPost?.({
        id: Date.now(),
        author: 'Vous',
        avatar: 'V',
        region: region || 'Non précisé',
        content: content.trim(),
        type,
        likes: 0,
        comments: 0,
        time: "À l'instant",
        tags: [],
      });
      setContent(''); setRegion(''); setType('discussion');
      setExpanded(false); setSubmitting(false);
    }, 600);
  }

  return (
    <div className="bg-white rounded-2xl border border-farm-100 shadow-sm overflow-hidden mb-6">
      {!expanded ? (
        <button onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-3 p-4 hover:bg-farm-50 transition-colors duration-200">
          <div className="w-9 h-9 rounded-full bg-agri-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">V</div>
          <span className="flex-1 text-left text-farm-300 text-sm bg-farm-50 rounded-xl px-4 py-2.5 border border-farm-100">
            Partagez une question, une astuce ou une expérience agricole...
          </span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-agri-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-1">V</div>
            <textarea value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="Partagez votre expérience, question ou conseil avec la communauté..."
              rows={4} autoFocus
              className="flex-1 resize-none rounded-xl border border-farm-200 px-4 py-3 text-sm text-agri-800 placeholder-farm-300 focus:outline-none focus:ring-2 focus:ring-agri-400 focus:border-transparent transition-all duration-200" />
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-farm-500 mb-1.5 uppercase tracking-wide">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-farm-200 px-3 py-2 text-sm text-agri-800 focus:outline-none focus:ring-2 focus:ring-agri-400 bg-white">
                {POST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-farm-500 mb-1.5 uppercase tracking-wide">Région</label>
              <input type="text" value={region} onChange={(e) => setRegion(e.target.value)}
                placeholder="Ex : Marrakech, Fès..."
                className="w-full rounded-xl border border-farm-200 px-3 py-2 text-sm text-agri-800 placeholder-farm-300 focus:outline-none focus:ring-2 focus:ring-agri-400" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => setExpanded(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-farm-500 hover:bg-farm-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={!content.trim() || submitting}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-agri-500 text-white hover:bg-agri-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-md">
              {submitting ? 'Publication...' : 'Publier'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
