import React, { useState, useEffect, useRef } from "react";
import { Info, X } from "lucide-react";

const InfoTooltip: React.FC = React.memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; right: number } | null>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && iconRef.current) {
      setTimeout(() => {
        if (iconRef.current) {
          const rect = iconRef.current.getBoundingClientRect();
          const popupWidth = Math.min(420, window.innerWidth - 32);
          const rightEdge = window.innerWidth - rect.right;
          const leftEdge = rect.left;
          
          let right = rightEdge;
          if (rightEdge < 16) {
            right = window.innerWidth - leftEdge - popupWidth;
          }
          right = Math.max(16, Math.min(right, window.innerWidth - popupWidth - 16));
          
          const estimatedHeight = 150;
          const spaceBelow = window.innerHeight - rect.bottom;
          let top = rect.bottom + 12;
          if (spaceBelow < estimatedHeight && rect.top > estimatedHeight) {
            top = rect.top - estimatedHeight - 12;
          }
          
          setTooltipPosition({
            top: Math.max(16, top),
            right: right,
          });
        }
      }, 10);
    } else {
      setTooltipPosition(null);
    }
  }, [isOpen]);

  return (
    <div className="relative flex-shrink-0" ref={iconRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/20 transition-all duration-300 hover:scale-110 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="App information"
      >
        <Info className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[110]"
            onClick={() => setIsOpen(false)}
          />
          {tooltipPosition && (
            <div
              className="fixed w-[min(calc(100vw-2rem),400px)] sm:w-[420px] bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-xl text-white text-xs sm:text-sm rounded-3xl shadow-2xl pointer-events-auto z-[120] border border-slate-700/60 p-4 sm:p-5 transition-all duration-200"
              style={{
                top: `${tooltipPosition.top}px`,
                right: `${tooltipPosition.right}px`,
                left: 'auto',
                maxHeight: 'calc(100vh - 32px)',
                overflowY: 'auto',
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 flex-shrink-0" />
                  <h3 className="font-bold text-sm sm:text-base text-amber-300">About Sagarmatha FC</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="leading-relaxed text-slate-200 whitespace-normal break-words">
                Manage Sagarmatha FC players, track availability, and generate fair teams. The Player Roster is shared. Sign-in required for access.
              </p>
              <div className="absolute right-6 -top-2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-transparent border-b-slate-900"></div>
            </div>
          )}
        </>
      )}
    </div>
  );
});

InfoTooltip.displayName = 'InfoTooltip';

export default InfoTooltip;

