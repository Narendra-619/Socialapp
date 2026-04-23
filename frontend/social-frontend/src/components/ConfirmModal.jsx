import React, { useEffect } from "react";

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Premium Overlay with deep blur */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-500"
        onClick={onClose}
      ></div>
      
      {/* Modal Content - Animated Scale In */}
      <div className="relative bg-[#09090b] border border-zinc-800/50 w-full max-w-[400px] rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden transform transition-all animate-modal-pop">
        
        {/* Subtle top inner glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-500/20 to-transparent"></div>

        <div className="p-8 pt-10 text-center">
          {/* Modern Warning Icon with Glow */}
          <div className="mx-auto w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full"></div>
            <div className="relative w-16 h-16 bg-gradient-to-b from-red-500/20 to-red-500/5 rounded-full flex items-center justify-center border border-red-500/20 shadow-inner">
               <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>

          <h3 className="text-2xl font-black text-white tracking-tight mb-3">
            {title || "Delete Post?"}
          </h3>
          
          <p className="text-zinc-400 text-[15px] font-medium leading-relaxed px-2">
            {message || "Are you sure? This action is permanent and your content will be removed from Nexora forever."}
          </p>
        </div>

        <div className="p-6 pt-2 flex flex-col gap-3 px-8 pb-10">
           <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full py-4 rounded-2xl text-[15px] font-black bg-red-600 hover:bg-red-500 text-white shadow-[0_12px_24px_-8px_rgba(220,38,38,0.4)] hover:shadow-[0_16px_32px_-8px_rgba(220,38,38,0.5)] transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 group"
          >
            <span>Confirm Delete</span>
            <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl text-[15px] font-bold text-zinc-400 hover:text-white bg-transparent hover:bg-zinc-800/50 transition-all duration-300"
          >
            Go Back
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes modalPop {
          0% { opacity: 0; transform: scale(0.9) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-pop {
          animation: modalPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
      `}} />
    </div>
  );
};

export default ConfirmModal;
