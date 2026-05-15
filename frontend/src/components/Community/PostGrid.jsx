import PostCard from './PostCard';

export default function PostGrid({ posts, loading = false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-farm-100 shadow-sm p-5 animate-pulse">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-farm-100" />
              <div className="flex-1">
                <div className="h-3 bg-farm-100 rounded w-32 mb-2" />
                <div className="h-3 bg-farm-100 rounded w-20" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-farm-100 rounded w-full" />
              <div className="h-3 bg-farm-100 rounded w-4/5" />
              <div className="h-3 bg-farm-100 rounded w-3/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-agri-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-agri-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-agri-700 font-medium text-sm mb-1">لا توجد منشورات بعد</p>
        <p className="text-farm-400 text-xs">كن أول من يشارك في المجتمع الزراعي</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {posts.map((post, i) => (
        <div key={post.id} className="animate-fadeIn" style={{ animationDelay: `${i * 60}ms` }}>
          <PostCard post={post} index={i} />
        </div>
      ))}
    </div>
  );
}