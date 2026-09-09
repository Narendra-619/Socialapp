import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../utils/api";
import PostPreviewModal from "../components/PostPreviewModal";

export default function ScheduledPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewPost, setPreviewPost] = useState(null);

  useEffect(() => {
    fetchScheduled();
  }, []);

  const fetchScheduled = async () => {
    try {
      const res = await API.get("/posts/scheduled");
      setPosts(res.data);
    } catch {
      console.error("Failed to fetch scheduled posts");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (postId) => {
    try {
      await API.post(`/posts/${postId}/cancel-schedule`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch {
      console.error("Failed to cancel schedule");
    }
  };

  const formatScheduledDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date - now;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHrs / 24);

    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const dateStr2 = date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

    let relative = "";
    if (diffMs < 0) relative = "Past due";
    else if (diffDays > 0) relative = `in ${diffDays}d`;
    else if (diffHrs > 0) relative = `in ${diffHrs}h`;
    else {
      const diffMin = Math.floor(diffMs / (1000 * 60));
      relative = diffMin > 0 ? `in ${diffMin}m` : "soon";
    }

    return { timeStr, dateStr: dateStr2, relative };
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 sm:px-0">
      <div className="mb-8 fade-in">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Scheduled</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
          {loading ? "Loading..." : `${posts.length} ${posts.length === 1 ? "post" : "posts"} scheduled`}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center fade-in">
          <div className="w-20 h-20 rounded-3xl bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No scheduled posts</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-xs mb-6">
            Create a post and schedule it to be published later.
          </p>
          <Link to="/feed" className="btn-primary text-sm px-6 py-2.5">
            Go to Feed
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const { timeStr, dateStr, relative } = formatScheduledDate(post.scheduledAt);
            return (
              <div key={post._id} className="card overflow-hidden fade-in border-zinc-200/60 dark:border-zinc-800/60 cursor-pointer hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Schedule indicator */}
                    <div className="shrink-0 w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex flex-col items-center justify-center">
                      <svg className="w-5 h-5 text-blue-500 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase">{relative}</span>
                    </div>

                    {/* Post content - clickable */}
                    <div onClick={() => setPreviewPost(post)} className="flex-1 min-w-0 group cursor-pointer">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          Posts {relative}
                        </span>
                        <span className="text-xs text-zinc-400">·</span>
                        <span className="text-xs text-zinc-400">{dateStr} at {timeStr}</span>
                      </div>

                      {post.text && (
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed line-clamp-2 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {post.text}
                        </p>
                      )}

                      {post.image && (
                        <div className="mt-2 inline-block">
                          <img
                            src={post.image}
                            alt="scheduled"
                            className="h-20 w-20 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700"
                          />
                        </div>
                      )}

                      {post.video && (
                        <div className="mt-2 inline-block">
                          <div className="h-20 w-20 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                      )}

                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 group-hover:text-blue-500 transition-colors">Click to preview</p>
                    </div>

                    {/* Cancel button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCancel(post._id); }}
                      className="shrink-0 text-xs font-medium text-red-500 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PostPreviewModal
        isOpen={!!previewPost}
        onClose={() => setPreviewPost(null)}
        post={previewPost}
      />
    </div>
  );
}
