import { useState, useEffect, useRef, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../utils/api";
import { AuthContext } from "../context/AuthContext";

export default function NotificationDropdown() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState("all"); // "all" | "unread"
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const dropdownRef = useRef(null);

  const fetchNotifications = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n) => !n.read).length);
    } catch {
      console.error("Failed to fetch notifications");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications(notifications.length === 0);
    }
  };

  const markAllAsRead = async () => {
    try {
      await API.put("/notifications/read");
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      console.error("Failed to mark all as read");
    }
  };

  const handleSingleRead = async (notificationId) => {
    try {
      await API.put(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Non-blocking
    }
  };

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation();
    try {
      await API.delete(`/notifications/${notificationId}`);
      setNotifications((prev) => {
        const item = prev.find((n) => n._id === notificationId);
        if (item && !item.read) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n._id !== notificationId);
      });
    } catch {
      console.error("Failed to delete notification");
    }
  };

  const handleFollowRequest = async (e, notificationId, followRequestId, action) => {
    e.stopPropagation();
    setProcessingId(notificationId);
    try {
      await API.put(`/users/follow-requests/${followRequestId}`, { action });
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      console.error("Failed to handle follow request");
    } finally {
      setProcessingId(null);
    }
  };

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d`;
    return date.toLocaleDateString();
  };

  const renderBadgeIcon = (type) => {
    switch (type) {
      case "like":
        return (
          <div className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center shadow">
            <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        );
      case "comment":
        return (
          <div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center shadow">
            <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
              <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" />
            </svg>
          </div>
        );
      case "follow":
      case "follow_request":
        return (
          <div className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow">
            <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        );
      case "follow_accept":
        return (
          <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
            <svg className="w-2.5 h-2.5 fill-none stroke-current" strokeWidth="3" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case "mention":
        return (
          <div className="w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center text-[9px] font-bold shadow">
            @
          </div>
        );
      case "welcome":
        return (
          <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold shadow">
            ✨
          </div>
        );
      default:
        return (
          <div className="w-4 h-4 rounded-full bg-zinc-500 text-white flex items-center justify-center text-[9px] font-bold shadow">
            •
          </div>
        );
    }
  };

  const filteredNotifications = tab === "unread"
    ? notifications.filter((n) => !n.read)
    : notifications;

  const handleNotificationClick = (n) => {
    if (!n.read) {
      handleSingleRead(n._id);
    }
    setIsOpen(false);
    if (n.type === "follow" || n.type === "follow_request" || n.type === "follow_accept") {
      if (n.sender?._id) navigate(`/profile/${n.sender._id}`);
    } else if (n.post?._id || n.post) {
      navigate(`/post/${n.post._id || n.post}`);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={handleToggle}
        className={`relative p-2 rounded-2xl transition-all ${
          isOpen
            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
            : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
        }`}
        title="Notifications"
        aria-label="Open notifications"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1 shadow-sm ring-2 ring-white dark:ring-zinc-900 animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 max-w-[calc(100vw-32px)] bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden z-[100] animate-modal-pop flex flex-col">
          {/* Header */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex px-4 pt-2.5 pb-2 gap-2 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
            <button
              onClick={() => setTab("all")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                tab === "all"
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setTab("unread")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                tab === "unread"
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {loading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                      <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {tab === "unread" ? "No unread notifications" : "No notifications yet"}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                  {tab === "unread" ? "You're all caught up!" : "When someone interacts with you, you'll see it here."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const sender = n.sender || {};
                const post = n.post || null;
                const isFollowRequest = n.type === "follow_request";

                return (
                  <div
                    key={n._id}
                    onClick={() => handleNotificationClick(n)}
                    className={`group relative flex items-start gap-3 p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors ${
                      !n.read ? "bg-blue-50/40 dark:bg-blue-950/15" : ""
                    }`}
                  >
                    {/* Avatar with Type Badge */}
                    <div className="relative shrink-0">
                      <Link
                        to={sender._id ? `/profile/${sender._id}` : "#"}
                        onClick={(e) => e.stopPropagation()}
                        className="block w-10 h-10 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                      >
                        {sender.profilePicture ? (
                          <img
                            src={sender.profilePicture}
                            alt={sender.username || "User"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-xs text-blue-600 bg-blue-50 dark:bg-zinc-800">
                            {sender.username ? sender.username.charAt(0).toUpperCase() : "N"}
                          </div>
                        )}
                      </Link>
                      <div className="absolute -bottom-1 -right-1">
                        {renderBadgeIcon(n.type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-4">
                      {n.type === "welcome" ? (
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-snug">
                          <span className="font-semibold text-zinc-900 dark:text-white">Nexora</span>{" "}
                          {n.message || "Welcome to the community!"}
                        </p>
                      ) : (
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-snug">
                          <span className="font-semibold text-zinc-900 dark:text-white hover:text-blue-600">
                            {sender.username || "Someone"}
                          </span>{" "}
                          {n.type === "like" && "liked your post."}
                          {n.type === "comment" && "commented on your post."}
                          {n.type === "follow" && "started following you."}
                          {n.type === "follow_request" && "requested to follow you."}
                          {n.type === "follow_accept" && "accepted your follow request."}
                          {n.type === "mention" && "mentioned you in a post."}
                        </p>
                      )}

                      {/* Comment preview snippet */}
                      {n.type === "comment" && n.message && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1 italic bg-zinc-100/70 dark:bg-zinc-800/50 px-2 py-0.5 rounded-md">
                          "{n.message}"
                        </p>
                      )}

                      {/* Follow request action buttons */}
                      {isFollowRequest && n.followRequest && (
                        <div className="flex gap-2 mt-2.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            disabled={processingId === n._id}
                            onClick={(e) =>
                              handleFollowRequest(
                                e,
                                n._id,
                                n.followRequest._id || n.followRequest,
                                "accept"
                              )
                            }
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95"
                          >
                            {processingId === n._id ? "..." : "Accept"}
                          </button>
                          <button
                            disabled={processingId === n._id}
                            onClick={(e) =>
                              handleFollowRequest(
                                e,
                                n._id,
                                n.followRequest._id || n.followRequest,
                                "reject"
                              )
                            }
                            className="px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition-all active:scale-95"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {/* Timestamp */}
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 font-medium">
                        {formatTimeAgo(n.createdAt)}
                      </p>
                    </div>

                    {/* Post Image Preview Thumbnail */}
                    {post && post.image && (
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-zinc-200/60 dark:border-zinc-700/60">
                        <img src={post.image} alt="post" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Unread dot or Dismiss Button */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-600 shadow-sm" />
                      )}
                      <button
                        onClick={(e) => handleDeleteNotification(e, n._id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-all"
                        title="Dismiss notification"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
