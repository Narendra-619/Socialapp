import { useEffect } from "react";
import { createPortal } from "react-dom";
import { lockScroll, unlockScroll } from "../utils/scrollLock";

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      lockScroll();
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      if (isOpen) unlockScroll();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-white dark:bg-zinc-900 w-full max-w-[340px] rounded-3xl shadow-2xl overflow-hidden animate-modal-pop">
        <div className="p-8 text-center">
          <div className="w-14 h-14 bg-red-50 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
            {title || "Delete Post?"}
          </h3>
          
          <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
            {message || "Are you sure? This action cannot be undone."}
          </p>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            onClick={() => { onClose(); onConfirm(); }}
            className="w-full py-3 rounded-2xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all active:scale-[0.97]"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;
