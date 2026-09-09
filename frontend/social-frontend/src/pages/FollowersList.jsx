import { useState, useEffect, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../utils/api";
import { AuthContext } from "../context/AuthContext";

export default function FollowersList() {
  const { userId } = useParams();
  const { user: currentUser } = useContext(AuthContext);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    const controller = new AbortController();
    const fetchFollowers = async () => {
      try {
        const res = await API.get(`/users/${userId}/followers`, { signal: controller.signal });
        setFollowers(res.data);
      } catch (err) {
        if (err.name !== "CanceledError" && err.name !== "AbortError") {
          setError("Failed to load followers");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchFollowers();
    return () => controller.abort();
  }, [userId]);

  const handleFollowToggle = async (targetUserId) => {
    setActionLoading(targetUserId);
    try {
      const res = await API.post(`/users/${targetUserId}/follow`);
      setFollowers(prev => prev.map(u => {
        if (u._id === targetUserId) {
          return {
            ...u,
            isFollowing: res.data.isFollowing !== undefined ? res.data.isFollowing : u.isFollowing,
            isPending: res.data.isPending !== undefined ? res.data.isPending : false
          };
        }
        return u;
      }));
    } catch (err) {
      console.error("Follow toggle failed", err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6 sm:py-10 px-4 sm:px-0">
      {/* Header */}
      <div className="mb-8 fade-in">
        <Link
          to={`/profile/${userId}`}
          className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors mb-4 font-medium text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Profile
        </Link>
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Followers</h1>
        {loading ? (
          <div className="w-20 h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse mt-2" />
        ) : (
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 font-medium">{followers.length} people</p>
        )}
      </div>

      {/* Skeletons while loading */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 animate-pulse"
            >
              <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-32" />
                <div className="h-3 bg-zinc-100 dark:bg-zinc-800/60 rounded w-20" />
              </div>
              <div className="w-24 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500 dark:text-red-400 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Try again
          </button>
        </div>
      ) : followers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium italic">No followers yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {followers.map(u => {
            const isOwn = currentUser && (String(currentUser._id || currentUser.id) === String(u._id || u.id));
            return (
              <Link
                key={u._id}
                to={`/profile/${u._id}`}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all group fade-in"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0">
                  {u.profilePicture ? (
                    <img src={u.profilePicture} alt={u.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-blue-600">
                      {u.username?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors truncate">{u.username}</span>
                    {u.isPrivate && (
                      <svg className="w-3.5 h-3.5 text-zinc-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                    )}
                  </div>
                </div>
                {!isOwn && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleFollowToggle(u._id);
                    }}
                    disabled={actionLoading === u._id}
                    className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 ${
                      u.isFollowing
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-red-500"
                        : u.isPending
                        ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {actionLoading === u._id ? "..." : (u.isFollowing ? "Following" : u.isPending ? "Requested" : "Follow")}
                  </button>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
