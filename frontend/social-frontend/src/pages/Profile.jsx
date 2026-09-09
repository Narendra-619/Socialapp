import { useState, useEffect, useContext, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, Link, useNavigate } from "react-router-dom";
import API from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import FollowRequestsPanel from "../components/FollowRequestsPanel";
import { lockScroll, unlockScroll } from "../utils/scrollLock";

const COVER_GRADIENTS = [
  "from-blue-500 via-indigo-500 to-purple-600",
  "from-rose-500 via-pink-500 to-fuchsia-600",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-orange-500 via-amber-500 to-yellow-600",
  "from-violet-500 via-purple-500 to-indigo-600",
  "from-cyan-500 via-sky-500 to-blue-600",
  "from-pink-500 via-rose-500 to-red-600",
  "from-lime-500 via-green-500 to-emerald-600",
];

function getCoverGradient(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length];
}

function CropModal({ imageSrc, onCrop, onCancel }) {
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const pinchStartRef = useRef({ dist: 0, zoom: 1 });
  const imgRef = useRef(null);

  const C = 240;

  useEffect(() => {
    lockScroll();
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setNaturalSize({ w: img.width, h: img.height });
      setOffset({ x: 0, y: 0 });
      setZoom(1);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const baseScale = naturalSize.w && naturalSize.h
    ? Math.max(C / naturalSize.w, C / naturalSize.h)
    : 1;

  const currentScale = baseScale * zoom;
  const renderedW = naturalSize.w * currentScale;
  const renderedH = naturalSize.h * currentScale;

  const maxOffsetX = Math.max(0, (renderedW - C) / 2);
  const maxOffsetY = Math.max(0, (renderedH - C) / 2);

  const clampOffset = (x, y) => ({
    x: Math.max(-maxOffsetX, Math.min(maxOffsetX, x)),
    y: Math.max(-maxOffsetY, Math.min(maxOffsetY, y)),
  });

  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch { /* pointer capture not supported in this browser */ }
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset(clampOffset(dragStartRef.current.offsetX + dx, dragStartRef.current.offsetY + dy));
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch { /* pointer capture not supported in this browser */ }
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartRef.current = { dist, zoom };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchStartRef.current.dist > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / pinchStartRef.current.dist;
      const newZoom = Math.min(3, Math.max(1, pinchStartRef.current.zoom * factor));
      setZoom(newZoom);
    }
  };

  const handleApply = () => {
    if (!imgRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");

    const factor = 400 / C;
    const targetW = renderedW * factor;
    const targetH = renderedH * factor;
    const targetX = 200 + (offset.x * factor) - (targetW / 2);
    const targetY = 200 + (offset.y * factor) - (targetH / 2);

    ctx.drawImage(imgRef.current, targetX, targetY, targetW, targetH);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
          onCrop(file);
        }
      },
      "image/jpeg",
      0.92
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110]  flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onCancel}
    >
      <div className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity" />

      <div
        className="relative bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-modal-pop my-auto flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white mb-4 text-center">
          Adjust profile picture
        </h3>

        {/* Circular Crop Viewport */}
        <div
          className="relative rounded-full overflow-hidden border-2 border-white shadow-xl cursor-grab active:cursor-grabbing select-none touch-none bg-zinc-950 flex items-center justify-center"
          style={{ width: C, height: C }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="crop"
            className="absolute max-w-none select-none pointer-events-none"
            style={{
              width: `${renderedW}px`,
              height: `${renderedH}px`,
              left: `${C / 2 - renderedW / 2 + offset.x}px`,
              top: `${C / 2 - renderedH / 2 + offset.y}px`,
            }}
            draggable={false}
          />
        </div>

        {/* Zoom Controls */}
        <div className="w-full mt-4 space-y-2">
          <div className="flex items-center gap-3 px-2">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg"
              title="Zoom out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
              </svg>
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => {
                const newZoom = parseFloat(e.target.value);
                setZoom(newZoom);
                const newCurrentScale = baseScale * newZoom;
                const newW = naturalSize.w * newCurrentScale;
                const newH = naturalSize.h * newCurrentScale;
                const newMaxX = Math.max(0, (newW - C) / 2);
                const newMaxY = Math.max(0, (newH - C) / 2);
                setOffset((prev) => ({
                  x: Math.max(-newMaxX, Math.min(newMaxX, prev.x)),
                  y: Math.max(-newMaxY, Math.min(newMaxY, prev.y)),
                }));
              }}
              className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg"
              title="Zoom in"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500">
            Drag image to reposition · Zoom to scale
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-5 w-full">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-sm rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 btn-primary py-2.5 text-sm font-semibold"
          >
            Apply
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function BannerCropModal({ imageSrc, onCrop, onCancel }) {
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const pinchStartRef = useRef({ dist: 0, zoom: 1 });
  const imgRef = useRef(null);

  // Aspect ratio 3:1 (330px width, 110px height viewport)
  const W = 330;
  const H = 110;

  useEffect(() => {
    lockScroll();
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setNaturalSize({ w: img.width, h: img.height });
      setOffset({ x: 0, y: 0 });
      setZoom(1);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const baseScale = naturalSize.w && naturalSize.h
    ? Math.max(W / naturalSize.w, H / naturalSize.h)
    : 1;

  const currentScale = baseScale * zoom;
  const renderedW = naturalSize.w * currentScale;
  const renderedH = naturalSize.h * currentScale;

  const maxOffsetX = Math.max(0, (renderedW - W) / 2);
  const maxOffsetY = Math.max(0, (renderedH - H) / 2);

  const clampOffset = (x, y) => ({
    x: Math.max(-maxOffsetX, Math.min(maxOffsetX, x)),
    y: Math.max(-maxOffsetY, Math.min(maxOffsetY, y)),
  });

  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch { /* fallback */ }
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset(clampOffset(dragStartRef.current.offsetX + dx, dragStartRef.current.offsetY + dy));
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch { /* fallback */ }
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartRef.current = { dist, zoom };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchStartRef.current.dist > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / pinchStartRef.current.dist;
      const newZoom = Math.min(3, Math.max(1, pinchStartRef.current.zoom * factor));
      setZoom(newZoom);
    }
  };

  const handleApply = () => {
    if (!imgRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");

    const factor = 1200 / W;
    const targetW = renderedW * factor;
    const targetH = renderedH * factor;
    const targetX = 600 + (offset.x * factor) - (targetW / 2);
    const targetY = 200 + (offset.y * factor) - (targetH / 2);

    ctx.drawImage(imgRef.current, targetX, targetY, targetW, targetH);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "banner.jpg", { type: "image/jpeg" });
          onCrop(file);
        }
      },
      "image/jpeg",
      0.92
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onCancel}
    >
      <div className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity" />

      <div
        className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-modal-pop my-auto flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white mb-2 text-center">
          Adjust banner image
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 text-center">
          Drag to reposition and zoom to select your banner portion
        </p>

        {/* Rectangular Banner Crop Viewport */}
        <div
          className="relative rounded-2xl overflow-hidden border-2 border-white/80 dark:border-zinc-700 shadow-xl cursor-grab active:cursor-grabbing select-none touch-none bg-zinc-950 flex items-center justify-center"
          style={{ width: W, height: H }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="crop banner"
            className="absolute max-w-none select-none pointer-events-none"
            style={{
              width: `${renderedW}px`,
              height: `${renderedH}px`,
              left: `${W / 2 - renderedW / 2 + offset.x}px`,
              top: `${H / 2 - renderedH / 2 + offset.y}px`,
            }}
            draggable={false}
          />
        </div>

        {/* Zoom Controls */}
        <div className="w-full mt-4 space-y-2">
          <div className="flex items-center gap-3 px-2">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg"
              title="Zoom out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
              </svg>
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => {
                const newZoom = parseFloat(e.target.value);
                setZoom(newZoom);
                const newCurrentScale = baseScale * newZoom;
                const newW = naturalSize.w * newCurrentScale;
                const newH = naturalSize.h * newCurrentScale;
                const newMaxX = Math.max(0, (newW - W) / 2);
                const newMaxY = Math.max(0, (newH - H) / 2);
                setOffset((prev) => ({
                  x: Math.max(-newMaxX, Math.min(newMaxX, prev.x)),
                  y: Math.max(-newMaxY, Math.min(newMaxY, prev.y)),
                }));
              }}
              className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg"
              title="Zoom in"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500">
            Drag image to reposition · Zoom to scale
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-5 w-full">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-sm rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 btn-primary py-2.5 text-sm font-semibold"
          >
            Apply & Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editImage, setEditImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [profileTab, setProfileTab] = useState("posts");
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const sentinelRef = useRef(null);

  const [showCrop, setShowCrop] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [showCoverCrop, setShowCoverCrop] = useState(false);
  const [cropCoverSrc, setCropCoverSrc] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    return () => {
      if (previewImage && typeof previewImage === "string" && previewImage.startsWith("blob:")) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  useEffect(() => {
    return () => {
      if (cropImageSrc && typeof cropImageSrc === "string" && cropImageSrc.startsWith("blob:")) {
        URL.revokeObjectURL(cropImageSrc);
      }
    };
  }, [cropImageSrc]);

  useEffect(() => {
    return () => {
      if (cropCoverSrc && typeof cropCoverSrc === "string" && cropCoverSrc.startsWith("blob:")) {
        URL.revokeObjectURL(cropCoverSrc);
      }
    };
  }, [cropCoverSrc]);

  useEffect(() => {
    if (isEditing) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [isEditing]);

  const coverGradient = useMemo(() => {
    return getCoverGradient(profile?.username || "user");
  }, [profile?.username]);

  useEffect(() => {
    fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/users/${userId}`);
      setProfile(res.data.user);
      setPosts(res.data.posts);
      setHasMore(res.data.hasMore || false);
      setIsFollowing(res.data.isFollowing);
      setIsLocked(res.data.isLocked);
      setPendingRequest(res.data.pendingRequest);
      setFollowersCount(res.data.followersCount);
      setFollowingCount(res.data.followingCount);
      setEditUsername(res.data.user.username);
      setEditBio(res.data.user.bio);
      setEditIsPrivate(res.data.user.isPrivate || false);
      setLoading(false);

      const myId = (currentUser?._id || currentUser?.id)?.toString();
      if (myId && myId === res.data.user._id?.toString()) {
        fetchProfileDrafts();
      }
    } catch (err) {
      console.error("Error fetching profile", err);
      setLoading(false);
    }
  };

  const fetchProfileDrafts = async () => {
    try {
      setDraftsLoading(true);
      const res = await API.get("/drafts");
      setDrafts(res.data);
    } catch (err) {
      console.error("Failed to load drafts", err);
    } finally {
      setDraftsLoading(false);
    }
  };

  const handleDeleteProfileDraft = async (draftId) => {
    try {
      await API.delete(`/drafts/${draftId}`);
      setDrafts((prev) => prev.filter((d) => d._id !== draftId));
    } catch (err) {
      console.error("Failed to delete draft", err);
    }
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || posts.length === 0) return;
    setLoadingMore(true);
    try {
      const lastPostId = posts[posts.length - 1]._id;
      const res = await API.get(`/users/${userId}/posts?before=${lastPostId}`);
      setPosts(prev => [...prev, ...res.data.posts]);
      setHasMore(res.data.hasMore);
    } catch (err) {
      console.error("Error loading more posts", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, posts, userId]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const handleFollow = async () => {
    setFollowLoading(true);
    const targetId = profile?._id || userId;
    try {
      const res = await API.post(`/users/${targetId}/follow`);
      if (res.data.isFollowing !== undefined) {
        setIsFollowing(res.data.isFollowing);
        setPendingRequest(false);
        setFollowersCount((prev) => (res.data.isFollowing ? prev + 1 : prev - 1));
      } else if (res.data.isPending !== undefined) {
        setPendingRequest(res.data.isPending);
      }
    } catch (err) {
      console.error("Follow error", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 20 * 1024 * 1024) {
        setEditError("Profile picture must be under 20MB");
        e.target.value = "";
        return;
      }
      setEditError("");
      const src = URL.createObjectURL(file);
      setCropImageSrc(src);
      setShowCrop(true);
    }
    e.target.value = "";
  };

  const handleCropApply = (croppedFile) => {
    setEditImage(croppedFile);
    setPreviewImage(URL.createObjectURL(croppedFile));
    setShowCrop(false);
    setCropImageSrc(null);
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert("Cover image must be under 20MB");
      e.target.value = "";
      return;
    }
    if (cropCoverSrc && typeof cropCoverSrc === "string" && cropCoverSrc.startsWith("blob:")) {
      URL.revokeObjectURL(cropCoverSrc);
    }
    const src = URL.createObjectURL(file);
    setCropCoverSrc(src);
    setShowCoverCrop(true);
    e.target.value = "";
  };

  const handleCoverCropApply = async (croppedFile) => {
    if (cropCoverSrc && typeof cropCoverSrc === "string" && cropCoverSrc.startsWith("blob:")) {
      URL.revokeObjectURL(cropCoverSrc);
    }
    setShowCoverCrop(false);
    setCropCoverSrc(null);
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("coverImage", croppedFile);
      const res = await API.put("/users/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setProfile(prev => ({ ...prev, ...res.data.user }));
      if (updateUser) updateUser(res.data.user);
    } catch (err) {
      console.error("Error uploading cover", err);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCoverCropCancel = () => {
    if (cropCoverSrc && typeof cropCoverSrc === "string" && cropCoverSrc.startsWith("blob:")) {
      URL.revokeObjectURL(cropCoverSrc);
    }
    setShowCoverCrop(false);
    setCropCoverSrc(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError("");

    const cleanUsername = editUsername.trim();
    if (!cleanUsername) {
      setEditError("Username is required");
      return;
    }
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      setEditError("Username must be between 3 and 30 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      setEditError("Username can only contain letters, numbers, and underscores (_)");
      return;
    }

    setUpdateLoading(true);
    const formData = new FormData();
    formData.append("username", cleanUsername);
    formData.append("bio", editBio);
    formData.append("isPrivate", editIsPrivate);
    if (editImage) {
      formData.append("profilePicture", editImage);
    }

    try {
      const res = await API.put("/users/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setProfile(prev => ({ ...prev, ...res.data.user }));
      if (updateUser) {
        updateUser(res.data.user);
      }
      if (res.data.user.username && res.data.user.username !== userId && isOwnProfile) {
        navigate(`/profile/${res.data.user.username}`, { replace: true });
      }
      setIsEditing(false);
      setEditImage(null);
      setPreviewImage(null);
    } catch (err) {
      setEditError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setUpdateLoading(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="animate-spin rounded-full h-12 w-12 border-2 border-zinc-200 dark:border-zinc-800 border-t-blue-600"></div>
    </div>
  );

  if (!profile) return (
    <div className="max-w-xl mx-auto py-24 text-center px-6">
      <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-zinc-400">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">User not found</h2>
      <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">This profile does not exist.</p>
      <Link to="/feed" className="btn-primary mt-8 inline-block px-10">Back to Feed</Link>
    </div>
  );

  const isOwnProfile = currentUser && profile && ((currentUser._id || currentUser.id) === (profile._id || profile.id));

  return (
    <div className="max-w-xl mx-auto py-6 sm:py-10 px-4 sm:px-0">
      {showCrop && cropImageSrc && (
        <CropModal imageSrc={cropImageSrc} onCrop={handleCropApply} onCancel={() => { setShowCrop(false); setCropImageSrc(null); }} />
      )}

      {showCoverCrop && cropCoverSrc && (
        <BannerCropModal
          imageSrc={cropCoverSrc}
          onCrop={handleCoverCropApply}
          onCancel={handleCoverCropCancel}
        />
      )}

      <div className="card overflow-hidden mb-6 sm:mb-10 fade-in">
        {/* Cover */}
        <div
          className={`h-32 sm:h-48 relative group ${!profile.coverImage ? `bg-gradient-to-br ${coverGradient}` : ""} cursor-pointer`}
          onClick={isOwnProfile ? () => coverInputRef.current?.click() : undefined}
        >
          {profile.coverImage ? (
            <img src={profile.coverImage} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-black/5" />
          )}
          {isOwnProfile && (
            <>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                {uploadingCover ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <div className="bg-white/90 dark:bg-zinc-900/90 rounded-full px-4 py-2 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Change cover
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" ref={coverInputRef} onChange={handleCoverChange} className="hidden" />
            </>
          )}
        </div>

        <div className="px-5 sm:px-8 pb-6 sm:pb-8 relative">
          <div className="flex justify-between items-end -mt-10 sm:-mt-14 mb-4 sm:mb-6">
            <div className="relative group">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-white dark:bg-zinc-950 overflow-hidden shadow-lg transition-all group-hover:shadow-xl">
                {profile.profilePicture ? (
                  <img src={profile.profilePicture} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-blue-600 font-bold bg-blue-50 dark:bg-zinc-900">
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {profile.isPrivate && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-zinc-900 dark:bg-white rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900">
                  <svg className="w-4 h-4 text-white dark:text-zinc-900" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 translate-y-2 sm:translate-y-0">
              {isOwnProfile ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="p-2.5 sm:px-5 sm:py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-medium text-sm rounded-xl transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-[0.97] flex items-center justify-center gap-2 shadow-sm"
                  title="Edit Profile"
                  aria-label="Edit Profile"
                >
                  <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span className="hidden sm:inline">Edit Profile</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`px-6 py-2 font-medium text-sm rounded-xl transition-all active:scale-[0.97] ${
                      isFollowing
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:text-red-500 dark:hover:text-red-400"
                        : pendingRequest
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {followLoading ? (
                      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    ) : isFollowing ? "Following" : pendingRequest ? "Requested" : "Follow"}
                  </button>
                  <Link
                    to="/messenger"
                    state={{ startChatWith: profile }}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-all active:scale-[0.97]"
                  >
                    Message
                  </Link>
                </>
              )}
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{profile.username}</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm leading-relaxed whitespace-pre-wrap max-w-lg">
              {profile.bio || "No bio available."}
            </p>
          </div>

          <div className="mt-4 sm:mt-5 flex gap-6 sm:gap-8 pt-3 sm:pt-4">
            <Link
              to={`/profile/${profile?._id || userId}/followers`}
              className="hover:opacity-80 transition-opacity"
            >
              <span className="block font-bold text-zinc-900 dark:text-white text-lg tabular-nums">{followersCount}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Followers</span>
            </Link>
            <Link
              to={`/profile/${profile?._id || userId}/following`}
              className="hover:opacity-80 transition-opacity"
            >
              <span className="block font-bold text-zinc-900 dark:text-white text-lg tabular-nums">{followingCount}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Following</span>
            </Link>
            <div>
              <span className="block font-bold text-zinc-900 dark:text-white text-lg tabular-nums">{posts.length}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Posts</span>
            </div>
          </div>
        </div>
      </div>

      {isOwnProfile && <FollowRequestsPanel />}

      {isLocked ? (
        <div className="card p-16 text-center fade-in">
          <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800/50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-zinc-400">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">This account is private</h3>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">Follow this account to see their posts.</p>
        </div>
      ) : (
        <>
          {isEditing && createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
              onClick={() => { setIsEditing(false); setEditImage(null); setPreviewImage(null); }}
            >
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />

              <div
                className="relative bg-white dark:bg-zinc-900 w-full max-w-md p-6 sm:p-8 my-auto animate-modal-pop shadow-2xl border border-zinc-200 dark:border-zinc-800 rounded-3xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
              onClick={() => { setIsEditing(false); setEditImage(null); setPreviewImage(null); setEditError(""); }}
                  className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <h2 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white">Edit Profile</h2>
                {editError && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3 mb-4 rounded-xl flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">{editError}</p>
                  </div>
                )}
                <form onSubmit={handleEditSubmit} className="space-y-5">
                  <div className="flex justify-center mb-6">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-1.5 transition-all group-hover:border-blue-500">
                        <img
                          src={previewImage || profile.profilePicture || "https://via.placeholder.com/150"}
                          className="w-full h-full rounded-full object-cover transition-all group-hover:brightness-50"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Username</label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Bio</label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={3}
                      className="input-field resize-none leading-relaxed"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-white text-sm">Private Account</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Only followers can see your posts</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditIsPrivate(!editIsPrivate)}
                      className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${editIsPrivate ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                    >
                      <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${editIsPrivate ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={updateLoading}
                      className="btn-primary w-full py-3 font-semibold"
                    >
                      {updateLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                      ) : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

          {/* Profile Tabs (Posts | Drafts for owner) */}
          {isOwnProfile ? (
            <div className="flex items-center gap-2 mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <button
                type="button"
                onClick={() => setProfileTab("posts")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  profileTab === "posts"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <span>Posts</span>
                <span className="text-xs opacity-75">{posts.length}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfileTab("drafts");
                  fetchProfileDrafts();
                }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  profileTab === "drafts"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>Drafts</span>
                {drafts.length > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    profileTab === "drafts"
                      ? "bg-white text-amber-600 font-bold"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                  }`}>
                    {drafts.length}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Recent Posts</h2>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
            </div>
          )}

          {/* Profile Tab Content */}
          {profileTab === "drafts" && isOwnProfile ? (
            <div className="space-y-4 fade-in">
              {draftsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
                </div>
              ) : drafts.length === 0 ? (
                <div className="text-center py-16 card border-zinc-200/60 dark:border-zinc-800/60 p-8">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-zinc-900 dark:text-white text-base mb-1">No drafts yet</h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs mx-auto mb-4">
                    Posts you save as drafts will appear here so you can finish and publish them anytime.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/feed")}
                    className="btn-primary text-xs px-4 py-2"
                  >
                    Create a Post
                  </button>
                </div>
              ) : (
                drafts.map((draft) => (
                  <div
                    key={draft._id}
                    className="card p-4 sm:p-5 border-zinc-200/60 dark:border-zinc-800/60 hover:shadow-md transition-all flex flex-col sm:flex-row items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center text-xs">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2.5 0 113.536 3.536L12 14.036H8v-4z" />
                          </svg>
                        </span>
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Draft</span>
                        <span className="text-xs text-zinc-400">·</span>
                        <span className="text-xs text-zinc-400">
                          {new Date(draft.updatedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 line-clamp-2 mb-2 leading-relaxed">
                        {draft.text || <span className="italic text-zinc-400">Media attachment (no text)</span>}
                      </p>
                      {draft.image && (
                        <div className="w-24 h-16 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 mb-2">
                          <img src={draft.image} alt="draft" className="w-full h-full object-cover" />
                        </div>
                      )}
                      {draft.video && (
                        <div className="w-24 h-16 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 relative flex items-center justify-center mb-2">
                          <video src={draft.video} className="w-full h-full object-cover opacity-75" preload="metadata" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => navigate("/feed", { state: { loadDraft: draft } })}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <span>Edit & Post</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProfileDraft(draft._id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete draft"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {posts.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">No posts yet.</p>
                </div>
              ) : (
                posts.map(post => (
                  <PostCard
                    key={post._id}
                    post={post}
                    onPostDelete={() => setPosts(prev => prev.filter(p => p._id !== post._id))}
                    onPostUpdate={(updatedPost) => setPosts(prev => prev.map(p => p._id === updatedPost._id ? updatedPost : p))}
                  />
                ))
              )}
              {hasMore && <div ref={sentinelRef} className="h-1" />}
              {loadingMore && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-200 dark:border-zinc-800 border-t-blue-600"></div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Profile;
