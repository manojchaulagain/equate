import React from 'react';
import { AvailabilityStatus } from '../../types/player';

interface ThreeWayToggleProps {
  value: AvailabilityStatus;
  onChange: (value: AvailabilityStatus) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ThreeWayToggle: React.FC<ThreeWayToggleProps> = ({
  value,
  onChange,
  disabled = false,
  size = 'md',
}) => {
  // Size configurations
  const sizeConfig = {
    sm: {
      track: 'w-[72px] h-7',
      handle: 'w-5 h-5',
      handleOffset: { unavailable: 'translate-x-[3px]', no_response: 'translate-x-[25px]', available: 'translate-x-[47px]' },
      text: 'text-[9px]',
      icon: 'w-2.5 h-2.5',
    },
    md: {
      track: 'w-[90px] h-9',
      handle: 'w-7 h-7',
      handleOffset: { unavailable: 'translate-x-[4px]', no_response: 'translate-x-[31px]', available: 'translate-x-[58px]' },
      text: 'text-[10px]',
      icon: 'w-3 h-3',
    },
    lg: {
      track: 'w-[110px] h-11',
      handle: 'w-9 h-9',
      handleOffset: { unavailable: 'translate-x-[4px]', no_response: 'translate-x-[37px]', available: 'translate-x-[70px]' },
      text: 'text-xs',
      icon: 'w-3.5 h-3.5',
    },
  };

  const config = sizeConfig[size];

  // Get handle position based on value
  const getHandlePosition = () => {
    return config.handleOffset[value];
  };

  // Get track background gradient based on value
  const getTrackBackground = () => {
    switch (value) {
      case 'unavailable':
        return 'bg-gradient-to-r from-rose-100 via-rose-50 to-slate-100';
      case 'no_response':
        return 'bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100';
      case 'available':
        return 'bg-gradient-to-r from-slate-100 via-emerald-50 to-emerald-100';
      default:
        return 'bg-slate-100';
    }
  };

  // Get handle styling based on value
  const getHandleStyle = () => {
    switch (value) {
      case 'unavailable':
        return 'bg-gradient-to-br from-rose-500 via-red-500 to-rose-600 shadow-rose-300/60';
      case 'no_response':
        return 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600 shadow-slate-300/60';
      case 'available':
        return 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 shadow-emerald-300/60';
      default:
        return 'bg-slate-400';
    }
  };

  // Get border color based on value
  const getBorderColor = () => {
    switch (value) {
      case 'unavailable':
        return 'border-rose-300/80';
      case 'no_response':
        return 'border-slate-300/80';
      case 'available':
        return 'border-emerald-300/80';
      default:
        return 'border-slate-200';
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    
    // Calculate which section was clicked
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const third = width / 3;
    
    if (x < third) {
      onChange('unavailable');
    } else if (x < third * 2) {
      onChange('no_response');
    } else {
      onChange('available');
    }
  };

  return (
    <div
      className={`
        relative ${config.track} rounded-full cursor-pointer
        ${getTrackBackground()}
        border-2 ${getBorderColor()}
        shadow-inner
        transition-all duration-300 ease-out
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
        overflow-hidden
      `}
      onClick={handleClick}
      role="slider"
      aria-valuenow={value === 'unavailable' ? 0 : value === 'no_response' ? 1 : 2}
      aria-valuemin={0}
      aria-valuemax={2}
      aria-label="Availability toggle"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'ArrowLeft') {
          if (value === 'available') onChange('no_response');
          else if (value === 'no_response') onChange('unavailable');
        } else if (e.key === 'ArrowRight') {
          if (value === 'unavailable') onChange('no_response');
          else if (value === 'no_response') onChange('available');
        }
      }}
    >
      {/* Background sections with subtle indicators */}
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        <div className={`${config.icon} flex items-center justify-center transition-opacity duration-200 ${value === 'unavailable' ? 'opacity-0' : 'opacity-40'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-rose-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div className={`${config.icon} flex items-center justify-center transition-opacity duration-200 ${value === 'no_response' ? 'opacity-0' : 'opacity-40'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          </svg>
        </div>
        <div className={`${config.icon} flex items-center justify-center transition-opacity duration-200 ${value === 'available' ? 'opacity-0' : 'opacity-40'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      {/* Sliding handle */}
      <div
        className={`
          absolute top-1/2 -translate-y-1/2
          ${config.handle} rounded-full
          ${getHandleStyle()}
          shadow-lg
          transition-all duration-300 ease-out
          transform ${getHandlePosition()}
          flex items-center justify-center
          ring-2 ring-white/50
        `}
      >
        {/* Handle icon */}
        {value === 'unavailable' && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`${config.icon} text-white drop-shadow-sm`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {value === 'no_response' && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`${config.icon} text-white drop-shadow-sm`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          </svg>
        )}
        {value === 'available' && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`${config.icon} text-white drop-shadow-sm`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Glow effect for active state */}
      <div
        className={`
          absolute inset-0 rounded-full pointer-events-none
          transition-opacity duration-300
          ${value === 'unavailable' ? 'bg-gradient-to-r from-rose-500/10 to-transparent' : ''}
          ${value === 'no_response' ? 'bg-gradient-to-r from-transparent via-slate-500/10 to-transparent' : ''}
          ${value === 'available' ? 'bg-gradient-to-r from-transparent to-emerald-500/10' : ''}
        `}
      />
    </div>
  );
};

export default ThreeWayToggle;

