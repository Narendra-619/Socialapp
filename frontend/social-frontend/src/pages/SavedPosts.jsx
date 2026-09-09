import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../utils/api";
import PostCard from "../components/PostCard";

export default function SavedPosts() {
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    if (activeCollection) {
      fetchCollectionPosts(activeCollection._id);
    } else {
      fetchAllSaved();
    }
  }, [activeCollection]);

  const fetchCollections = async () => {
    try {
      const res = await API.get("/collections");
      setCollections(res.data);
    } catch {
      console.error("Failed to fetch collections");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSaved = async () => {
    try {
      const res = await API.get("/posts/saved");
      setPosts(res.data);
    } catch {
      console.error("Failed to fetch saved posts");
    }
  };

  const fetchCollectionPosts = async (collectionId) => {
    try {
      const res = await API.get(`/collections/${collectionId}/posts`);
      setPosts(res.data.posts);
    } catch {
      console.error("Failed to fetch collection posts");
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    try {
      const res = await API.post("/collections", { name: newCollectionName.trim() });
      const created = res.data?.collection;
      setNewCollectionName("");
      setShowNewCollection(false);
      if (created) {
        setCollections((prev) => [
          ...prev.filter((c) => c._id !== created._id),
          created
        ]);
        setActiveCollection(created);
      } else {
        fetchCollections();
      }
    } catch {
      console.error("Failed to create collection");
    }
  };

  const handleDeleteCollection = async (collectionId) => {
    try {
      await API.delete(`/collections/${collectionId}`);
      if (activeCollection?._id === collectionId) {
        setActiveCollection(null);
      }
      fetchCollections();
    } catch {
      console.error("Failed to delete collection");
    }
  };

  const handlePostDelete = (postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  const handlePostUpdate = (updatedPost) => {
    setPosts((prev) => prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Saved</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">{posts.length} posts</p>
      </div>

      {/* Collection Tabs */}
      {!loading && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4">
          <button
            onClick={() => setActiveCollection(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              !activeCollection
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            All Saved
          </button>
          {collections.filter(c => c.name !== "All Saved").map((collection) => (
            <div key={collection._id} className="relative group">
              <button
                onClick={() => setActiveCollection(collection)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCollection?._id === collection._id
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {collection.name}
                <span className="ml-1.5 text-xs opacity-60">{collection.posts?.length || 0}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCollection(collection._id);
                }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() => setShowNewCollection(true)}
            className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
          >
            + New
          </button>
        </div>
      )}

      {/* New Collection Input */}
      {showNewCollection && (
        <div className="flex gap-2 mb-6 fade-in">
          <input
            type="text"
            placeholder="Collection name"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateCollection()}
            className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            autoFocus
          />
          <button
            onClick={handleCreateCollection}
            disabled={!newCollectionName.trim()}
            className="btn-primary py-2 px-4 text-sm"
          >
            Create
          </button>
          <button
            onClick={() => { setShowNewCollection(false); setNewCollectionName(""); }}
            className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 2h14a1 1 0 011 1v19.143a.5.5 0 01-.766.424L12 18.03l-7.234 4.536A.5.5 0 014 22.143V3a1 1 0 011-1zm7 14l5.5-3.5V3H6.5v9.5L12 16z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">No saved posts yet</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-xs">
            Save posts by tapping the bookmark icon.
          </p>
          <Link
            to="/feed"
            className="mt-6 btn-primary text-sm"
          >
            Browse Feed
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onPostDelete={handlePostDelete}
              onPostUpdate={handlePostUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
