import { HelpCircle, Lightbulb, AlertTriangle, Cloud, MessageSquare, Heart, MessageCircle, Share, MapPin } from '../icons';
import { useLanguage } from '../../i18n/context';

const TYPE_META = {
  question:   { bg: 'bg-blue-50',  text: 'text-blue-700',  Icon: HelpCircle },
  conseil:    { bg: 'bg-amber-50', text: 'text-amber-700', Icon: Lightbulb },
  problème:   { bg: 'bg-rose-50',  text: 'text-rose-700',  Icon: AlertTriangle },
  météo:      { bg: 'bg-sky-50',   text: 'text-sky-700',   Icon: Cloud },
  discussion: { bg: 'bg-agri-50',  text: 'text-agri-700',  Icon: MessageSquare },
};

export default function PostCard({ post }) {
  const { t } = useLanguage();
  const meta = TYPE_META[post.type] || TYPE_META.discussion;
  const Icon = meta.Icon;
  const label = t(`community.postTypeLabel.${post.type}`) || post.type;

  return (
    <article className="bg-white rounded-2xl border border-farm-100 shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
      <header className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-agri-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {post.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="font-semibold text-agri-900 text-sm">{post.author}</p>
            <span className="text-farm-300">·</span>
            <span className="inline-flex items-center gap-1 text-xs text-farm-400">
              <MapPin size={11} />
              {post.region}
            </span>
            <span className="text-farm-300">·</span>
            <p className="text-xs text-farm-400">{post.time}</p>
          </div>
          <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${meta.bg} ${meta.text}`}>
            <Icon size={11} />
            {label}
          </span>
        </div>
      </header>

      <p className="text-agri-800 text-sm leading-relaxed mb-3 whitespace-pre-line">
        {post.content}
      </p>

      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {post.tags.map((tag) => (
            <span key={tag} className="text-[11px] text-agri-600 bg-agri-50 px-2 py-0.5 rounded-md font-medium">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <footer className="flex items-center gap-5 pt-3 border-t border-farm-100">
        <button className="flex items-center gap-1.5 text-farm-400 hover:text-rose-500 transition-colors text-sm">
          <Heart size={14} />
          <span className="font-medium">{post.likes}</span>
        </button>
        <button className="flex items-center gap-1.5 text-farm-400 hover:text-agri-500 transition-colors text-sm">
          <MessageCircle size={14} />
          <span className="font-medium">{post.comments}</span>
        </button>
        <button className="ml-auto text-farm-400 hover:text-agri-500 transition-colors">
          <Share size={14} />
        </button>
      </footer>
    </article>
  );
}
