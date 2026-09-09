import { useState, useRef, useEffect } from "react";

const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    name: "Smileys",
    icon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊",
      "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😋", "😛", "😜", "🤪", "😝",
      "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒",
      "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢",
      "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓",
      "🧐", "😕", "😟", "🙁", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😰",
      "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤",
      "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻"
    ]
  },
  {
    id: "gestures",
    name: "Gestures",
    icon: "👍",
    emojis: [
      "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇",
      "☝️", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾",
      "🦵", "🦶", "👂", "🦻", "👃", "👀", "👁️", "👅", "👄", "💋", "🫂", "👋"
    ]
  },
  {
    id: "hearts",
    name: "Hearts",
    icon: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕",
      "💞", "💓", "💗", "💖", "💘", "💝", "💟", "💌", "💐", "🌸", "💮", "🌹",
      "🌺", "🌻", "🌼", "🌷", "✨", "⭐", "🌟", "💫", "🔥", "💥", "⚡", "🌈"
    ]
  },
  {
    id: "celebration",
    name: "Fun & Vibe",
    icon: "🎉",
    emojis: [
      "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🥈", "🥉", "⚽", "🏀", "🏈", "⚾",
      "🎾", "🏐", "🎮", "🕹️", "🎲", "🎯", "🎨", "🎤", "🎧", "🎷", "🎸", "🎹",
      "🥁", "🥂", "🍻", "🍺", "🍷", "🍸", "🍹", "🍾", "🍿", "🍕", "🍔", "🍟"
    ]
  }
];

const POPULAR_EMOJIS = ["🔥", "❤️", "😂", "👍", "😍", "🎉", "✨", "🥺", "🙌", "💯", "😎", "👏"];

export default function EmojiPicker({ onSelectEmoji, onClose }) {
  const [activeTab, setActiveTab] = useState("smileys");
  const [search, setSearch] = useState("");
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const allEmojis = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
  const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeTab);
  const displayEmojis = search.trim()
    ? allEmojis.filter((emoji) => emoji.includes(search.trim()))
    : currentCategory?.emojis || [];

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-16 right-0 sm:right-auto sm:left-4 z-50 w-72 sm:w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden fade-in animate-in slide-in-from-bottom-2 duration-150"
    >
      {/* Top Quick Popular Bar */}
      <div className="p-2 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-800/30">
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1 px-1">
          Quick Reactions
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {POPULAR_EMOJIS.map((emoji, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectEmoji(emoji)}
              className="text-lg p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg hover:scale-125 transition-transform shrink-0"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-zinc-100 dark:border-zinc-800">
        {EMOJI_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setActiveTab(cat.id);
              setSearch("");
            }}
            className={`flex-1 py-2 text-sm flex items-center justify-center transition-colors ${
              activeTab === cat.id && !search
                ? "border-b-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            }`}
            title={cat.name}
          >
            <span>{cat.icon}</span>
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="p-2.5 h-48 overflow-y-auto grid grid-cols-7 sm:grid-cols-8 gap-1">
        {displayEmojis.map((emoji, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectEmoji(emoji)}
            className="w-8 h-8 flex items-center justify-center text-xl rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:scale-125 active:scale-95 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
