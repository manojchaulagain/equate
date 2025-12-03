import React, { useState, useEffect, useRef } from "react";
import { LogOut, Shield } from "lucide-react";
import { UserRole } from "../../types/user";

interface ProfileMenuProps {
  userEmail: string | null;
  userRole: UserRole;
  playerName?: string;
  onSignOut: () => void;
}

const ProfileMenu: React.FC<ProfileMenuProps> = React.memo(({ userEmail, userRole, playerName, onSignOut }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const getInitials = (name?: string, email?: string): string => {
    if (name) {
      const nameParts = name.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
      } else if (nameParts.length === 1) {
        const nameStr = nameParts[0];
        return nameStr.length >= 2 
          ? (nameStr.charAt(0) + nameStr.charAt(1)).toUpperCase()
          : nameStr.charAt(0).toUpperCase();
      }
    }
    return email ? email.charAt(0).toUpperCase() : "?";
  };

  const getGradientColor = (email: string | null): string => {
    if (!email) {
      return 'from-indigo-500 to-purple-600';
    }
    const hash = email.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const colors = [
      'from-indigo-500 to-purple-600',
      'from-blue-500 to-cyan-600',
      'from-purple-500 to-pink-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-pink-500 to-rose-600',
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const gradientClass = getGradientColor(userEmail);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popupWidth = Math.min(360, window.innerWidth - 16);
      const rightEdge = window.innerWidth - rect.right;
      const leftEdge = rect.left;
      
      let right = rightEdge;
      if (rightEdge < 8) {
        right = window.innerWidth - leftEdge - popupWidth;
      }
      right = Math.max(8, Math.min(right, window.innerWidth - popupWidth - 8));

      const estimatedHeight = 200;
      const spaceBelow = window.innerHeight - rect.bottom;
      let top = rect.bottom + 8;
      if (spaceBelow < estimatedHeight && rect.top > estimatedHeight) {
        top = rect.top - estimatedHeight - 8;
      }
      
      setMenuPosition({
        top: Math.max(8, top),
        right: right,
      });
    } else {
      setMenuPosition(null);
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 border-2 border-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2`}
        aria-label="User menu"
      >
        {getInitials(playerName, userEmail || undefined)}
        {userRole === "admin" && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full border-2 border-white flex items-center justify-center">
            <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
          </div>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[110]"
            onClick={() => setIsOpen(false)}
          />
          {menuPosition && (
            <div 
              className="fixed w-[280px] sm:w-[320px] md:w-[360px] max-w-[calc(100vw-1rem)] bg-white/98 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/60 z-[120] overflow-visible animate-in fade-in slide-in-from-top-2 duration-200"
              style={{
                top: `${menuPosition.top}px`,
                right: `${menuPosition.right}px`,
                left: 'auto',
                maxHeight: 'calc(100vh - 16px)',
                overflowY: 'auto',
              }}
            >
              <div className={`bg-gradient-to-br ${gradientClass} p-4 sm:p-5 md:p-6 text-white relative overflow-hidden rounded-t-3xl`}>
                <div className="absolute inset-0 bg-black/10 rounded-t-3xl"></div>
                <div className="relative flex items-center gap-3 sm:gap-4">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-white font-bold text-xl sm:text-2xl border-[3px] border-white/40 shadow-xl ring-2 ring-white/20 flex-shrink-0`}>
                    {getInitials(playerName, userEmail || undefined)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm sm:text-base md:text-lg truncate drop-shadow-md mb-1">{userEmail || 'User'}</p>
                    {playerName && (
                      <p className="text-xs sm:text-sm text-white/90 truncate font-medium mb-1.5">{playerName}</p>
                    )}
                    {userRole === "admin" && (
                      <div className="flex items-center gap-1.5 mt-2 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 w-fit">
                        <Shield className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                        <span className="text-[10px] sm:text-xs font-bold">Administrator</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-3 sm:p-4 bg-gradient-to-b from-slate-50/50 to-white border-t border-slate-200/50 rounded-b-3xl">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-red-500 via-red-600 to-rose-600 hover:from-red-600 hover:via-red-700 hover:to-rose-700 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] border border-red-400/30 min-h-[44px]"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
});

ProfileMenu.displayName = 'ProfileMenu';

export default ProfileMenu;

