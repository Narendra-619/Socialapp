import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../utils/api";

export default function FollowRequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await API.get("/users/follow-requests");
      setRequests(res.data);
    } catch (err) {
      console.error("Failed to fetch follow requests", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (requestId, action) => {
    try {
      await API.put(`/users/follow-requests/${requestId}`, { action });
      setRequests(prev => prev.filter(r => r._id !== requestId));
    } catch (err) {
      console.error("Failed to handle request", err);
    }
  };

  if (loading || requests.length === 0) return null;

  return (
    <div className="card p-6 mb-10 fade-in">
      <h3 className="text-sm font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
        Follow Requests ({requests.length})
      </h3>
      <div className="space-y-3">
        {requests.map(req => {
          if (!req.requester) return null;
          return (
          <div key={req._id} className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50">
            <Link to={`/profile/${req.requester._id}`} className="shrink-0">
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                {req.requester.profilePicture ? (
                  <img src={req.requester.profilePicture} alt={req.requester.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-blue-600 text-sm">
                    {req.requester.username?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
            </Link>
            <Link to={`/profile/${req.requester._id}`} className="flex-1 min-w-0">
              <span className="font-bold text-zinc-900 dark:text-white text-sm hover:text-blue-600 transition-colors">
                {req.requester.username || "Deleted user"}
              </span>
            </Link>
            <div className="flex gap-2">
              <button
                onClick={() => handleRequest(req._id, "accept")}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
              >
                Accept
              </button>
              <button
                onClick={() => handleRequest(req._id, "reject")}
                className="px-4 py-1.5 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 text-xs font-bold rounded-xl transition-all active:scale-95"
              >
                Reject
              </button>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
