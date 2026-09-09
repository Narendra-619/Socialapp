import { useEffect, useContext } from "react";
import { createPortal } from "react-dom";
import { AuthContext } from "../context/AuthContext";
import { lockScroll, unlockScroll } from "../utils/scrollLock";

export default function PostPreviewModal({ isOpen, onClose, post }) {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      lockScroll();
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      if (isOpen) unlockScroll();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !post) return null;

  const author = (typeof post.userId === "object" && post.userId) || user || {};
  const username = author.username || "You";
  const profilePicture = author.profilePicture;
  const initial = username.charAt(0).toUpperCase();

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pt-16 sm:pt-20 overflow-y-auto"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity" />

      {/* Modal Card */}
      <div
        className="relative bg-white dark:bg-zinc-900 w-full max-w-xl rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden my-auto animate-modal-pop flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: Back button on top left, title, close button */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all group"
          >
            <svg
              className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back</span>
          </button>

          <span className="text-sm font-semibold text-zinc-900 dark:text-white">
            Post Preview
          </span>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Post Preview Content */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Author Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 p-0.5 shrink-0">
              <div className="w-full h-full rounded-full bg-white dark:bg-zinc-950 flex items-center justify-center overflow-hidden">
                {profilePicture ? (
                  <img src={profilePicture} alt={username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-blue-600 font-bold text-sm">{initial}</span>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-zinc-900 dark:text-white text-sm leading-none">{username}</h4>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40">
                  Scheduled
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">Preview</p>
            </div>
          </div>

          {/* Post Text */}
          {post.text && (
            <p className="text-zinc-900 dark:text-zinc-100 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
              {post.text}
            </p>
          )}

          {/* Post Image */}
          {post.image && (
            <div className="rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 flex items-center justify-center">
              <img
                src={post.image}
                alt="Post preview"
                className="w-full max-h-[52vh] object-contain"
              />
            </div>
          )}

          {/* Post Video */}
          {post.video && (
            <div className="rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 bg-black flex items-center justify-center">
              <video
                src={post.video}
                controls
                className="w-full max-h-[52vh] object-contain"
              />
            </div>
          )}

          {/* Fallback if post has no media or text */}
          {!post.text && !post.image && !post.video && (
            <div className="py-8 text-center text-zinc-400 dark:text-zinc-500 text-sm italic">
              No content to preview
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
