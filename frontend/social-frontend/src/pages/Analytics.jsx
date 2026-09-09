import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../utils/api";
import EngagementGraph from "../components/EngagementGraph";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";

const getVideoSnapshot = (videoUrl) => {
  if (!videoUrl || typeof videoUrl !== "string") return null;
  if (videoUrl.includes("cloudinary.com")) {
    return videoUrl
      .replace(/\.(mp4|webm|mov|quicktime|mkv)($|\?)/i, ".jpg$2")
      .replace("/video/upload/", "/video/upload/so_1,w_300,h_300,c_fill/");
  }
  return null;
};

function VideoSnapshotLogo({ videoUrl }) {
  const [fallbackToVideo, setFallbackToVideo] = useState(false);
  const snapshotUrl = getVideoSnapshot(videoUrl);

  return (
    <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-950 shrink-0 relative flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-sm group-hover:scale-[1.03] transition-transform">
      {snapshotUrl && !fallbackToVideo ? (
        <img
          src={snapshotUrl}
          alt="Video snapshot logo"
          className="w-full h-full object-cover"
          onError={() => setFallbackToVideo(true)}
        />
      ) : (
        <video
          src={`${videoUrl}#t=0.5`}
          className="w-full h-full object-cover"
          preload="metadata"
          muted
          playsInline
        />
      )}
      <div className="absolute inset-0 bg-black/35 flex items-center justify-center pointer-events-none">
        <div className="w-6 h-6 rounded-full bg-white/95 dark:bg-white text-zinc-900 flex items-center justify-center shadow-md">
          <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await API.get(`/posts/analytics/user?period=${period}`);
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [period]);

  const [filterType, setFilterType] = useState("all");
  const [postToDelete, setPostToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const toast = useToast();

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    try {
      setDeleteLoading(true);
      await API.delete(`/posts/${postToDelete._id}`);
      setData((prev) => {
        if (!prev) return prev;
        const isVid = Boolean(postToDelete.video);
        const isImg = Boolean(postToDelete.image) && !isVid;
        const isTw = !isVid && !isImg;
        return {
          ...prev,
          total: {
            ...prev.total,
            posts: Math.max(0, (prev.total.posts || 1) - 1),
            videos: isVid ? Math.max(0, (prev.total.videos || 1) - 1) : (prev.total.videos ?? 0),
            photos: isImg ? Math.max(0, (prev.total.photos || 1) - 1) : (prev.total.photos ?? 0),
            tweets: isTw ? Math.max(0, (prev.total.tweets || 1) - 1) : (prev.total.tweets ?? 0),
          },
          topPosts: (prev.topPosts || []).filter((p) => p._id !== postToDelete._id)
        };
      });
      toast.success("Post deleted successfully");
      setPostToDelete(null);
    } catch (err) {
      console.error("Failed to delete post", err);
      toast.error("Failed to delete post");
    } finally {
      setDeleteLoading(false);
    }
  };

  const statCards = data ? [
    { label: "Total Views", value: data.total.views, change: data.change.views, icon: "👁", color: "blue" },
    { label: "Total Likes", value: data.total.likes, change: data.change.likes, icon: "❤", color: "red" },
    { label: "Total Comments", value: data.total.comments, change: data.change.comments, icon: "💬", color: "green" },
    { label: "Posts", value: data.total.posts, change: 0, icon: "📝", color: "purple" }
  ] : [];

  const filteredTopPosts = (data?.topPosts || []).filter((post) => {
    if (filterType === "video") return Boolean(post.video);
    if (filterType === "photo") return Boolean(post.image) && !post.video;
    if (filterType === "tweet") return !post.image && !post.video;
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Analytics</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Track your content performance</p>
      </div>

      {/* Period Toggle */}
      <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl mb-8 w-fit">
        <button
          onClick={() => setPeriod("7d")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            period === "7d"
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
              : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          7 days
        </button>
        <button
          onClick={() => setPeriod("30d")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            period === "30d"
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
              : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          30 days
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : !data ? (
        <div className="text-center py-20">
          <p className="text-zinc-500 dark:text-zinc-400">No analytics data available yet.</p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {statCards.map((stat) => (
              <div key={stat.label} className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">{stat.label}</span>
                  {stat.change !== 0 && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      stat.change > 0 ? "bg-green-50 dark:bg-green-900/20 text-green-600" : "bg-red-50 dark:bg-red-900/20 text-red-600"
                    }`}>
                      {stat.change > 0 ? "+" : ""}{stat.change}%
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-zinc-900 dark:text-white tabular-nums">
                  {(stat.value ?? 0).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {/* Content Distribution: Tweets, Photos, Videos */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 mb-8 border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Content Distribution</h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Capturing all your tweets, photos & videos</p>
              </div>
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
                {data.total.posts} published
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Tweets */}
              <button
                type="button"
                onClick={() => setFilterType(filterType === "tweet" ? "all" : "tweet")}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  filterType === "tweet"
                    ? "bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 ring-2 ring-sky-500/20"
                    : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 flex items-center justify-center text-xs">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                    </svg>
                  </span>
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Tweets</span>
                </div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
                  {data.total.tweets ?? 0}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {data.total.posts > 0 ? Math.round(((data.total.tweets || 0) / data.total.posts) * 100) : 0}% of content
                </p>
              </button>

              {/* Photos */}
              <button
                type="button"
                onClick={() => setFilterType(filterType === "photo" ? "all" : "photo")}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  filterType === "photo"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500/20"
                    : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Photos</span>
                </div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
                  {data.total.photos ?? 0}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {data.total.posts > 0 ? Math.round(((data.total.photos || 0) / data.total.posts) * 100) : 0}% of content
                </p>
              </button>

              {/* Videos */}
              <button
                type="button"
                onClick={() => setFilterType(filterType === "video" ? "all" : "video")}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  filterType === "video"
                    ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 ring-2 ring-purple-500/20"
                    : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Videos</span>
                </div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
                  {data.total.videos ?? 0}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {data.total.posts > 0 ? Math.round(((data.total.videos || 0) / data.total.posts) * 100) : 0}% of content
                </p>
              </button>
            </div>
          </div>

          {/* Engagement Graph */}
          <div className="mb-8">
            <EngagementGraph data={data.daily} title="Engagement Overview" />
          </div>

          {/* Top Posts with Category Filter */}
          {data.topPosts && data.topPosts.length > 0 && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Top Posts</h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">Sorted by highest engagement</p>
                </div>
                {/* Category Filter Pills */}
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/70 p-1 rounded-xl w-fit">
                  <button
                    type="button"
                    onClick={() => setFilterType("all")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      filterType === "all"
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("tweet")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                      filterType === "tweet"
                        ? "bg-white dark:bg-zinc-700 text-sky-600 dark:text-sky-400 shadow-sm"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    <span>Tweets</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("photo")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                      filterType === "photo"
                        ? "bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    <span>Photos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("video")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                      filterType === "video"
                        ? "bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-400 shadow-sm"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    <span>Videos</span>
                  </button>
                </div>
              </div>

              {filteredTopPosts.length === 0 ? (
                <div className="text-center py-10 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No {filterType}s found in your top posts.</p>
                  <button
                    type="button"
                    onClick={() => setFilterType("all")}
                    className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Show all top posts
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTopPosts.map((post) => {
                    const hasVideo = Boolean(post.video);
                    const hasImage = Boolean(post.image);
                    const isTweet = !hasVideo && !hasImage;
                    const postTitle = post.text?.trim() || (hasVideo ? "View Video" : hasImage ? "View Photo" : "View Tweet");

                    return (
                      <Link
                        key={post._id}
                        to={`/post/${post._id}`}
                        className="group flex items-center gap-4 bg-white dark:bg-zinc-900 rounded-2xl p-4 hover:shadow-md border border-zinc-100 dark:border-zinc-800/80 transition-all"
                      >
                        {/* Media Preview / Snapshot Logo / Tweet Icon */}
                        {hasVideo ? (
                          <VideoSnapshotLogo videoUrl={post.video} />
                        ) : hasImage ? (
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-zinc-200/60 dark:border-zinc-700/60 group-hover:scale-[1.03] transition-transform">
                            <img src={post.image} alt="Post thumbnail" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-500 shrink-0 flex items-center justify-center border border-sky-100 dark:border-sky-900/50 group-hover:scale-[1.03] transition-transform">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                            </svg>
                          </div>
                        )}

                        {/* Content Description */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {hasVideo && (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
                                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                                Video
                              </span>
                            )}
                            {hasImage && !hasVideo && (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                                Photo
                              </span>
                            )}
                            {isTweet && (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 shrink-0">
                                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                                </svg>
                                Tweet
                              </span>
                            )}
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {postTitle}
                            </p>
                          </div>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                            {new Date(post.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>

                        {/* Metrics & Direct Action Link + Delete */}
                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
                          <div className="hidden sm:flex gap-3 text-right">
                            <span><strong>{post.views}</strong> views</span>
                            <span><strong>{post.likes}</strong> likes</span>
                            <span><strong>{post.comments}</strong> comments</span>
                          </div>
                          <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            <span>{hasVideo ? "View Video" : hasImage ? "View Photo" : "View Tweet"}</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setPostToDelete(post);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(postToDelete)}
        onClose={() => setPostToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Post?"
        message="Are you sure you want to delete this post? This action cannot be undone."
      />
    </div>
  );
}
