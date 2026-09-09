import { useState, useRef, useContext, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function CreatePost({ refresh }) {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [previewVideo, setPreviewVideo] = useState("");
  const [draftImage, setDraftImage] = useState("");
  const [draftVideo, setDraftVideo] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewImage && previewImage.startsWith("blob:")) URL.revokeObjectURL(previewImage);
      if (previewVideo && previewVideo.startsWith("blob:")) URL.revokeObjectURL(previewVideo);
    };
  }, [previewImage, previewVideo]);

  useEffect(() => {
    if (location.state?.openMedia) {
      const type = location.state.openMedia;
      if (type === "image" && fileInputRef.current) {
        fileInputRef.current.click();
      } else if (type === "video" && videoInputRef.current) {
        videoInputRef.current.click();
      }
      window.history.replaceState({}, "");
    } else if (location.state?.loadDraft) {
      handleLoadDraft(location.state.loadDraft);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        setError("File size too large (max 50MB)");
        return;
      }
      if (previewImage && previewImage.startsWith("blob:")) {
        URL.revokeObjectURL(previewImage);
      }
      setImageFile(file);
      setDraftImage("");
      setPreviewImage(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleRemoveImage = () => {
    if (previewImage && previewImage.startsWith("blob:")) {
      URL.revokeObjectURL(previewImage);
    }
    setImageFile(null);
    setDraftImage("");
    setPreviewImage("");
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError("Video too large (max 50MB)");
        return;
      }
      const video = document.createElement("video");
      video.preload = "metadata";
      const metaUrl = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(metaUrl);
        if (video.duration > 60) {
          setError("Video must be 60 seconds or less");
          return;
        }
        if (previewVideo && previewVideo.startsWith("blob:")) {
          URL.revokeObjectURL(previewVideo);
        }
        setVideoFile(file);
        setDraftVideo("");
        setPreviewVideo(URL.createObjectURL(file));
        setError("");
      };
      video.onerror = () => {
        URL.revokeObjectURL(metaUrl);
        setError("Invalid video file");
      };
      video.src = metaUrl;
    }
  };

  const handleRemoveVideo = () => {
    if (previewVideo && previewVideo.startsWith("blob:")) {
      URL.revokeObjectURL(previewVideo);
    }
    setVideoFile(null);
    setDraftVideo("");
    setPreviewVideo("");
    setError("");
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  const handleSaveDraft = async () => {
    if (!text.trim()) return;
    try {
      const payload = { text };
      if (editingDraftId) {
        await API.put(`/drafts/${editingDraftId}`, payload);
        setEditingDraftId(null);
        toast.success("Draft updated");
      } else {
        await API.post("/drafts", payload);
        toast.success("Draft saved");
      }
      setText("");
      handleRemoveImage();
      handleRemoveVideo();
    } catch {
      setError("Failed to save draft");
    }
  };

  const handleCancelEditDraft = () => {
    setEditingDraftId(null);
    setText("");
    handleRemoveImage();
    handleRemoveVideo();
  };

  const handleLoadDraft = (draft) => {
    setText(draft.text || "");
    if (draft.image) {
      setPreviewImage(draft.image);
      setDraftImage(draft.image);
      setImageFile(null);
    } else {
      setDraftImage("");
      setPreviewImage("");
    }
    if (draft.video) {
      setPreviewVideo(draft.video);
      setDraftVideo(draft.video);
      setVideoFile(null);
    } else {
      setDraftVideo("");
      setPreviewVideo("");
    }
    setEditingDraftId(draft._id);
  };

  const handlePost = async () => {
    if (!text.trim() && !imageFile && !videoFile && !draftImage && !draftVideo) return;

    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      if (text.trim()) formData.append("text", text);
      if (imageFile) {
        formData.append("image", imageFile);
      } else if (draftImage) {
        formData.append("image", draftImage);
      }
      if (videoFile) {
        formData.append("video", videoFile);
      } else if (draftVideo) {
        formData.append("video", draftVideo);
      }
      formData.append("allowDownload", allowDownload.toString());

      // Send scheduledAt if scheduling
      if (showSchedule && scheduledAt) {
        const scheduledDate = new Date(scheduledAt);
        if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
          setError("Scheduled time must be in the future");
          setLoading(false);
          return;
        }
        formData.append("scheduledAt", scheduledDate.toISOString());
      }

      await API.post("/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      // Show toast for scheduled posts
      if (scheduledAt && new Date(scheduledAt) > new Date()) {
        const date = new Date(scheduledAt);
        const formatted = date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
        const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        toast.success(`Post scheduled for ${formatted} at ${time}`);
      }

      setText("");
      handleRemoveImage();
      handleRemoveVideo();
      setAllowDownload(true);
      setScheduledAt("");
      setShowSchedule(false);
      if (editingDraftId) {
        try {
          await API.delete(`/drafts/${editingDraftId}`);
          setEditingDraftId(null);
        } catch {
          // ignore draft deletion error
        }
      }
      if (refresh) refresh();
    } catch (err) {
      console.error("Error creating post:", err);
      setError(err.response?.data?.error || "Failed to create post.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card transition-all duration-300 ring-0 focus-within:ring-2 focus-within:ring-blue-500/10 mb-6 overflow-hidden w-full max-w-full">
      <div className="p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 w-full min-w-0">
        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3 rounded-xl flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs font-medium text-red-700 dark:text-red-400 truncate">{error}</p>
            </div>
            <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Editing Draft Banner */}
        {editingDraftId && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 px-3 py-2 rounded-xl flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
              <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Editing draft</span>
            </div>
            <button
              type="button"
              onClick={handleCancelEditDraft}
              className="text-xs text-amber-700 dark:text-amber-400 hover:underline font-semibold"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Top: Avatar + Textarea */}
        <div className="flex gap-3 sm:gap-4 items-start w-full min-w-0">
          {/* User Avatar */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt={user?.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-blue-600 text-sm">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <textarea
              placeholder={`What's on your mind, ${user?.username?.split(' ')[0] || ''}?`}
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full resize-none bg-transparent border-none focus:ring-0 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 p-0 pt-1 text-base sm:text-lg leading-relaxed font-medium outline-none"
            />
          </div>
        </div>

        {/* Image Preview */}
        {previewImage && (
          <div className="relative group overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-50 dark:bg-zinc-950 w-full">
            <img src={previewImage} alt="preview" className="w-full h-auto max-h-[500px] object-contain" />
            <button 
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Video Preview */}
        {previewVideo && (
          <div className="relative group overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-black w-full">
            <video src={previewVideo} className="w-full h-auto max-h-[500px] object-contain" controls muted />
            <button 
              type="button"
              onClick={handleRemoveVideo}
              className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Action Toolbar: Spans FULL width of the card, moving icons completely to the left */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 w-full min-w-0">
          {/* Left: Action Icons starting from the far left */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 min-w-0">
            {/* Add Photo */}
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all active:scale-95"
              title="Add Image"
            >
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />

            {/* Add Video */}
            <button 
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all active:scale-95"
              title="Add Video (max 60s, 50MB)"
            >
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <input type="file" accept="video/mp4,video/webm,video/quicktime" ref={videoInputRef} onChange={handleVideoChange} className="hidden" />

            {/* Schedule Button */}
            <button
              type="button"
              onClick={() => setShowSchedule(!showSchedule)}
              className={`p-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                showSchedule || scheduledAt
                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title="Schedule post"
            >
              <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">Schedule</span>
            </button>

            {/* Drafts Button - navigates to dedicated Drafts page */}
            <button
              type="button"
              onClick={() => navigate("/drafts")}
              className="p-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="View Drafts"
            >
              <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Drafts</span>
            </button>

            {/* Media Download Toggle */}
            {(imageFile || videoFile) && (
              <button
                type="button"
                onClick={() => setAllowDownload(!allowDownload)}
                className={`p-1.5 sm:px-2 sm:py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1 ${
                  allowDownload ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-zinc-400 bg-zinc-100 dark:bg-zinc-800'
                }`}
                title={allowDownload ? "Downloads enabled" : "Downloads disabled"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">{allowDownload ? "DL on" : "DL off"}</span>
              </button>
            )}
          </div>

          {/* Right: Save Draft + Post Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {(text.trim() || imageFile || videoFile || draftImage || draftVideo) && (
              <button 
                type="button"
                onClick={handleSaveDraft}
                className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400 px-2 sm:px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center gap-1"
                title={editingDraftId ? "Update draft" : "Save as draft"}
              >
                <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>{editingDraftId ? "Update" : "Save"}</span>
              </button>
            )}

            <button 
              type="button"
              onClick={handlePost} 
              disabled={
                (!text.trim() && !imageFile && !videoFile && !draftImage && !draftVideo) || 
                loading || 
                (showSchedule && scheduledAt && new Date(scheduledAt) <= new Date())
              }
              className="btn-primary py-1.5 sm:py-2 px-3.5 sm:px-6 text-sm font-semibold disabled:bg-zinc-200 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600 shrink-0"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (showSchedule && scheduledAt && new Date(scheduledAt) > new Date()) ? "Schedule" : "Post"}
            </button>
          </div>
        </div>

        {/* Scheduler Section - at the bottom of the card, full width, cleanly bounded */}
        {showSchedule && (
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 fade-in space-y-2.5 w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full min-w-0">
              <div className="flex items-center gap-2 flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 w-full">
                <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                  className="w-full min-w-0 bg-transparent text-sm text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
                />
              </div>

              {scheduledAt && (
                <button
                  type="button"
                  onClick={() => { setScheduledAt(""); setShowSchedule(false); }}
                  className="self-end sm:self-auto text-xs text-red-500 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center gap-1 shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Clear</span>
                </button>
              )}
            </div>

            {scheduledAt && new Date(scheduledAt) > new Date() && (
              <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
                <span className="truncate">
                  Will post {new Date(scheduledAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} at {new Date(scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )}

            {scheduledAt && new Date(scheduledAt) <= new Date() && (
              <div className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400 font-medium pl-1">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Scheduled time must be in the future (at least 1 min ahead)</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}