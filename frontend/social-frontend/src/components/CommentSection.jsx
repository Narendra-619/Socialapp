import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import API from "../utils/api";
import { AuthContext } from "../context/AuthContext";

export default function CommentSection({ post, onCommentAdded }) {
  const { user } = useContext(AuthContext);
  const [comments, setComments] = useState(post.comments || []);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    setComments(post.comments || []);
  }, [post.comments]);

  const renderTextWithMentions = (text) => {
    if (!text) return null;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const username = part.slice(1);
        return (
          <Link
            key={i}
            to={`/profile/${username}`}
            className="text-blue-500 hover:text-blue-600 font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  const handleComment = async () => {
    if (!text.trim()) return;
    setLoading(true);

    try {
      const res = await API.post(`/posts/${post._id}/comment`, { text });
      setComments(res.data.comments);
      if (onCommentAdded) onCommentAdded(res.data.comments.length);
      setText("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    setDeletingId(commentId);
    setConfirmDeleteId(null);
    try {
      const res = await API.delete(`/posts/${post._id}/comments/${commentId}`);
      setComments(res.data.comments);
      if (onCommentAdded) onCommentAdded(res.data.comments.length);
    } catch (err) {
      console.error("Failed to delete comment", err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    if (diffDay < 7) return `${diffDay}d`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {comments.length > 0 && (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {comments.map((c) => {
            const author = c.userId || {};
            const username = author.username || "Unknown";
            const profilePicture = author.profilePicture || null;
            const initial = username.charAt(0).toUpperCase();
            const isOwner = user && ((user._id || user.id) === (author._id || author.id));
            const isConfirming = confirmDeleteId === c._id;

            return (
              <div key={c._id} className="flex gap-3 fade-in group/comment">
                <Link to={`/profile/${author._id || ""}`} className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {profilePicture ? (
                    <img src={profilePicture} alt={username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-semibold text-blue-600 text-[10px]">
                      {initial}
                    </div>
                  )}
                </Link>
                <div className="flex-1">
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2.5 rounded-2xl transition-colors relative">
                    <div className="flex items-center gap-2">
                      <Link to={`/profile/${author._id || ""}`} className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 hover:text-blue-600 transition-colors">
                        {username}
                      </Link>
                      {c.createdAt && (
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          {formatTime(c.createdAt)}
                        </span>
                      )}
                      {isOwner && !isConfirming && (
                        <button
                          onClick={() => setConfirmDeleteId(c._id)}
                          disabled={deletingId === c._id}
                          className="ml-auto opacity-0 group-hover/comment:opacity-100 transition-opacity text-zinc-400 hover:text-red-500 p-0.5"
                          title="Delete comment"
                        >
                          {deletingId === c._id ? (
                            <div className="w-3.5 h-3.5 border border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          )}
                        </button>
                      )}
                    </div>

                    {isConfirming ? (
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => handleDeleteComment(c._id)}
                          disabled={deletingId === c._id}
                          className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
                        >
                          {deletingId === c._id ? "Deleting..." : "Delete"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p className="text-zinc-700 dark:text-zinc-300 text-sm mt-0.5 leading-relaxed">
                        {renderTextWithMentions(c.text)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="Add a comment... (@ to mention)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !loading && text.trim()) {
              e.preventDefault();
              handleComment();
            }
          }}
          className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:ring-1 focus:ring-blue-500 rounded-full px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none transition-all"
        />
        <button 
          onClick={handleComment}
          disabled={!text.trim() || loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 text-white p-2.5 rounded-full transition-all active:scale-90"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}
