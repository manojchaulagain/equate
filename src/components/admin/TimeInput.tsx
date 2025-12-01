import React, { useState, useEffect, useRef } from "react";

interface TimeInputProps {
  value: string; // HH:MM format (24-hour)
  onChange: (value: string) => void;
  className?: string;
}

const TimeInput: React.FC<TimeInputProps> = ({ value, onChange, className = "" }) => {
  const [hours, setHours] = useState<string>("6");
  const [minutes, setMinutes] = useState<string>("00");
  const [isPM, setIsPM] = useState<boolean>(false);
  const isInternalUpdate = useRef(false);

  // Parse 24-hour format to 12-hour format when value prop changes
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    
    if (value && value.includes(':')) {
      const [h, m] = value.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        if (h === 0) {
          setHours("12");
          setIsPM(false);
        } else if (h < 12) {
          setHours(h.toString());
          setIsPM(false);
        } else if (h === 12) {
          setHours("12");
          setIsPM(true);
        } else {
          setHours((h - 12).toString());
          setIsPM(true);
        }
        setMinutes(m.toString().padStart(2, '0'));
      }
    }
  }, [value]);

  // Convert 12-hour format to 24-hour format
  const updateTime = (h: string, m: string, pm: boolean) => {
    if (!h || !m || h === '' || m === '') return;
    
    const hourNum = parseInt(h);
    const minNum = parseInt(m);
    
    if (isNaN(hourNum) || isNaN(minNum) || hourNum < 1 || hourNum > 12 || minNum < 0 || minNum > 59) {
      return;
    }
    
    isInternalUpdate.current = true;
    
    let h24 = hourNum;
    if (hourNum === 12) {
      h24 = pm ? 12 : 0;
    } else {
      h24 = pm ? hourNum + 12 : hourNum;
    }
    
    const h24Str = h24.toString().padStart(2, '0');
    const mStr = minNum.toString().padStart(2, '0');
    onChange(`${h24Str}:${mStr}`);
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setHours(val);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setMinutes(val);
  };

  const handleHoursBlur = () => {
    let h = hours.trim();
    if (!h || h === '') {
      h = "6";
      setHours("6");
    } else {
      const num = parseInt(h);
      if (isNaN(num) || num < 1) {
        h = "1";
        setHours("1");
      } else if (num > 12) {
        h = "12";
        setHours("12");
      } else {
        h = num.toString();
        setHours(h);
      }
    }
    updateTime(h, minutes || "00", isPM);
  };

  const handleMinutesBlur = () => {
    let m = minutes.trim();
    if (!m || m === '') {
      m = "00";
      setMinutes("00");
    } else {
      const num = parseInt(m);
      if (isNaN(num) || num < 0) {
        m = "00";
        setMinutes("00");
      } else if (num > 59) {
        m = "59";
        setMinutes("59");
      } else {
        m = num.toString().padStart(2, '0');
        setMinutes(m);
      }
    }
    updateTime(hours || "6", m, isPM);
  };

  const handleAMPMToggle = () => {
    const newIsPM = !isPM;
    setIsPM(newIsPM);
    updateTime(hours || "6", minutes || "00", newIsPM);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: 'hours' | 'minutes') => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
    // Allow typing numbers and backspace/delete
    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border-2 border-slate-300/80 rounded-lg px-3 py-2 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200">
        <input
          type="text"
          value={hours}
          onChange={handleHoursChange}
          onBlur={handleHoursBlur}
          onKeyDown={(e) => handleKeyDown(e, 'hours')}
          className="w-8 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded bg-transparent"
          maxLength={2}
          placeholder="6"
        />
        <span className="text-slate-400 font-bold">:</span>
        <input
          type="text"
          value={minutes}
          onChange={handleMinutesChange}
          onBlur={handleMinutesBlur}
          onKeyDown={(e) => handleKeyDown(e, 'minutes')}
          className="w-10 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded bg-transparent"
          maxLength={2}
          placeholder="00"
        />
        <button
          type="button"
          onClick={handleAMPMToggle}
          className={`ml-1.5 px-2.5 py-1 rounded-md font-bold text-xs transition-all duration-200 ${
            isPM
              ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          {isPM ? "PM" : "AM"}
        </button>
      </div>
    </div>
  );
};

export default TimeInput;
