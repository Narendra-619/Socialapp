import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import API from "../utils/api";
import { lockScroll, unlockScroll } from "../utils/scrollLock";

export default function CollectionPickerModal({ isOpen, onClose, postId, onSaved }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(null);
  const [feedback, setFeedback] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchCollections();
      setShowNew(false);
      setNewName("");
      setFeedback("");
    }
  }, [isOpen]);

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

  useEffect(() => {
    if (showNew && inputRef.current) inputRef.current.focus();
  }, [showNew]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const res = await API.get("/collections");
      setCollections(res.data);
    } catch {
      console.error("Failed to fetch collections");
    } finally {
      setLoading(false);
    }
  };

  const isPostInCollection = (col) => {
    if (!col || !col.posts) return false;
    return col.posts.some((p) => {
      const pId = (p?._id || p)?.toString();
      return pId && pId === postId?.toString();
    });
  };

  const handleSaveToCollection = async (collection) => {
    try {
      setSaving(collection._id || "all-saved");
      let updatedCol;

      if (collection === "all-saved" || collection.name === "All Saved") {
        const allSavedObj = collections.find(c => c.name === "All Saved");
        if (allSavedObj) {
          const res = await API.post(`/collections/${allSavedObj._id}/posts`, { postId });
          updatedCol = res.data.collection;
        } else {
          await API.post(`/posts/${postId}/save`);
          await fetchCollections();
        }
      } else {
        const res = await API.post(`/collections/${collection._id}/posts`, { postId });
        updatedCol = res.data.collection;
      }

      if (updatedCol) {
        setCollections((prev) =>
          prev.map((c) => (c._id === updatedCol._id ? updatedCol : c))
        );
      }

      setFeedback(`Saved to ${collection.name || "All Saved"}!`);
      if (onSaved) onSaved();

      setTimeout(() => {
        onClose();
      }, 700);
    } catch {
      console.error("Failed to save to collection");
    } finally {
      setSaving(null);
    }
  };

  const handleCreateAndSave = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      setSaving("new");
      // Atomic create + add post in backend
      const res = await API.post("/collections", { name: trimmed, postId });
      const newCol = res.data.collection;

      // Provide the new collection right there with its name loaded
      setCollections((prev) => [
        newCol,
        ...prev.filter((c) => c._id !== newCol._id && c.name?.toLowerCase() !== trimmed.toLowerCase())
      ]);

      setFeedback(`Created and saved to ${trimmed}!`);
      setShowNew(false);
      setNewName("");
      if (onSaved) onSaved();

      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      console.error("Failed to create collection:", err);
    } finally {
      setSaving(null);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm shadow-2xl border border-zinc-200 dark:border-zinc-800 fade-in overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b dark:border-zinc-800">
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white">Save to collection</h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Select or create a collection</p>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {feedback && (
            <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/50 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold fade-in">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
              <span>{feedback}</span>
            </div>
          )}

          <div className="p-2 max-h-80 overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {/* All Saved (Default) */}
                {(() => {
                  const allSavedObj = collections.find(c => c.name === "All Saved") || { name: "All Saved", _id: "all-saved" };
                  const isSaved = isPostInCollection(allSavedObj);
                  return (
                    <button
                      onClick={() => handleSaveToCollection(allSavedObj)}
                      disabled={saving !== null}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-zinc-800 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 2h14a1 1 0 011 1v19.143a.5.5 0 01-.766.424L12 18.03l-7.234 4.536A.5.5 0 014 22.143V3a1 1 0 011-1z" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">All Saved</p>
                        <p className="text-xs text-zinc-400">Default collection • {allSavedObj.posts?.length || 0} posts</p>
                      </div>
                      {saving === (allSavedObj._id || "all-saved") ? (
                        <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                      ) : isSaved ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                          Saved
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          Save
                        </span>
                      )}
                    </button>
                  );
                })()}

                {/* Custom Collections */}
                {collections.filter(c => c.name !== "All Saved").map((collection) => {
                  const isSaved = isPostInCollection(collection);
                  return (
                    <button
                      key={collection._id}
                      onClick={() => handleSaveToCollection(collection)}
                      disabled={saving !== null}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{collection.name}</p>
                        <p className="text-xs text-zinc-400">{collection.posts?.length || 0} posts</p>
                      </div>
                      {saving === collection._id ? (
                        <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                      ) : isSaved ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                          Saved
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          Save
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Create New Collection Inline */}
                {showNew ? (
                  <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700 fade-in mt-2">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Collection name (e.g. Photography)..."
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateAndSave()}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white mb-2"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setShowNew(false); setNewName(""); }}
                        className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateAndSave}
                        disabled={!newName.trim() || saving === "new"}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-1.5 px-3.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        {saving === "new" ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <span>Create & Save</span>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNew(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50/60 dark:hover:bg-blue-900/20 transition-colors text-left text-blue-600 dark:text-blue-400 mt-1"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Create Collection</p>
                      <p className="text-xs text-blue-500/70">Organize saved posts</p>
                    </div>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
