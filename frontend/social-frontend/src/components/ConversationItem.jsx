import { memo } from "react";

const formatConversationTime = (dateInput) => {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today - targetDay) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
};

const ConversationItem = memo(({ conversation, currentUser, active }) => {
  if (!conversation?.participants) return null;
  const otherUser = conversation.participants.find((p) => {
    const pId = (p?._id || p?.id || p)?.toString();
    const myId = (currentUser?._id || currentUser?.id)?.toString();
    return pId && pId !== myId;
  });

  const timestamp = conversation.lastMessage?.createdAt || conversation.updatedAt;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200 group ${active
        ? 'bg-blue-50 dark:bg-blue-900/10'
        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
      }`}>
      <div className="relative">
        <div className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-colors ${active ? 'border-blue-500' : 'border-zinc-200 dark:border-zinc-800 group-hover:border-zinc-300 dark:group-hover:border-zinc-700'
          }`}>
          {otherUser?.profilePicture ? (
            <img src={otherUser.profilePicture} alt={otherUser.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-blue-600 bg-blue-50 dark:bg-zinc-900">
              {otherUser?.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <h3 className={`font-black truncate text-[15px] ${active ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-900 dark:text-zinc-200'}`}>
            {otherUser?.username || "Unknown"}
          </h3>
          {timestamp && !isNaN(new Date(timestamp).getTime()) && (
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 tabular-nums">
              {formatConversationTime(timestamp)}
            </span>
          )}
        </div>
        <p className={`text-xs truncate font-medium ${active ? 'text-blue-500/80 dark:text-blue-400/80' : 'text-zinc-500 dark:text-zinc-400'}`}>
          {conversation.lastMessage?.text || "Started a new chat"}
        </p>
      </div>
    </div>
  );
});

export default ConversationItem;
