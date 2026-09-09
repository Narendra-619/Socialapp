import { memo } from "react";

const ChatBox = memo(({ message, own }) => {
  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  const getFullTimestamp = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  const isOnlyEmoji = (str) => {
    if (!str) return false;
    const trimmed = str.trim();
    const regex = /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\s)+$/u;
    return regex.test(trimmed) && [...trimmed].length <= 5;
  };

  const emojiOnly = isOnlyEmoji(message.text);

  return (
    <div className={`flex flex-col ${own ? 'items-end' : 'items-start'} mb-1`}>
      <div className={`max-w-[80%] md:max-w-[70%] transition-all duration-200 ${
        emojiOnly
          ? 'p-1 text-3xl sm:text-4xl bg-transparent shadow-none select-none'
          : `px-4 py-2.5 shadow-sm ${
              own 
                ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none' 
                : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-100 dark:border-zinc-700 rounded-2xl rounded-tl-none'
            }`
      }`}>
        <p className={`${emojiOnly ? 'leading-none' : 'text-[14.5px] leading-relaxed break-words whitespace-pre-wrap font-medium'}`}>
          {message.text}
        </p>
      </div>
      <span 
        title={getFullTimestamp(message.createdAt)}
        className="text-[11px] text-zinc-400 dark:text-zinc-500 px-2 mt-1 select-none tabular-nums"
      >
        {formatTime(message.createdAt)}
      </span>
    </div>
  );
});

export default ChatBox;
