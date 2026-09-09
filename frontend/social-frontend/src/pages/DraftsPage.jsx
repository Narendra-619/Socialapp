import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../utils/api";

export default function DraftsPage() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const res = await API.get("/drafts");
      setDrafts(res.data);
    } catch (err) {
      console.error("Failed to fetch drafts", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = async (draftId) => {
    try {
      await API.delete(`/drafts/${draftId}`);
      setDrafts((prev) => prev.filter((d) => d._id !== draftId));
    } catch (err) {
      console.error("Failed to delete draft", err);
    }
  };

  const handleEditDraft = (draft) => {
    navigate("/feed", { state: { loadDraft: draft } });
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 sm:px-0">
      <div className="mb-8 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Drafts</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
              {loading
                ? "Loading drafts..."
                : `${drafts.length} ${drafts.length === 1 ? "draft" : "drafts"} saved`}
            </p>
          </div>
          <Link
            to="/feed"
            className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>New Post</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center fade-in card border-zinc-200/60 dark:border-zinc-800/60 p-12">
          <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No drafts saved</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-xs mb-6 leading-relaxed">
            When you create a post and tap "Save" instead of "Post", it will appear here so you can finish it anytime.
          </p>
          <Link to="/feed" className="btn-primary text-sm px-6 py-2.5">
            Create a Draft
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <div
              key={draft._id}
              className="card overflow-hidden fade-in border-zinc-200/60 dark:border-zinc-800/60 p-5 hover:shadow-md transition-all group"
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center text-xs">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2.5 0 113.536 3.536L12 14.036H8v-4z" />
                      </svg>
                    </span>
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      Draft
                    </span>
                    <span className="text-xs text-zinc-400">·</span>
                    <span className="text-xs text-zinc-400">
                      Last edited {new Date(draft.updatedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>

                  <p className="text-[15px] font-medium text-zinc-900 dark:text-white line-clamp-3 leading-relaxed mb-3">
                    {draft.text || (
                      <span className="italic text-zinc-400">
                        {draft.image ? "Image attached (no text)" : draft.video ? "Video attached (no text)" : "Empty draft"}
                      </span>
                    )}
                  </p>

                  {/* Media attachment previews */}
                  {draft.image && (
                    <div className="w-32 h-20 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-3 border border-zinc-200 dark:border-zinc-700">
                      <img src={draft.image} alt="Draft preview" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {draft.video && (
                    <div className="w-32 h-20 rounded-xl overflow-hidden bg-zinc-950 mb-3 relative flex items-center justify-center border border-zinc-800">
                      <video src={draft.video} className="w-full h-full object-cover opacity-75" preload="metadata" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => handleEditDraft(draft)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Edit & Post</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteDraft(draft._id)}
                    className="text-zinc-400 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    title="Delete draft"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
