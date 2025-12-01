import React from "react";
import { Position, PlayerAvailability } from "../../types/player";
import { POSITION_LABELS } from "../../constants/player";

interface FormationViewProps {
  players: PlayerAvailability[];
  theme: {
    badgeBg: string;
    badgeText: string;
    countText: string;
  };
}

// Define formation positions (rows from top/forward to bottom/goalkeeper)
// Each row defines which positions should appear and their order (left to right)
const FORMATION_LAYOUT: { row: number; positions: (Position | null)[] }[] = [
  { row: 1, positions: ["LW", null, "ST", null, "RW"] }, // Forwards (Top)
  { row: 2, positions: [null, null, "CAM", null, null] }, // Attacking Midfielder
  { row: 3, positions: [null, "CM", null, "CDM", null] }, // Midfielders
  { row: 4, positions: ["LB", null, "CB", null, "RB"] }, // Defenders
  { row: 5, positions: [null, null, "GK", null, null] }, // Goalkeeper (Bottom)
];

// Memoize grass pattern style to avoid creating new object on every render
const GRASS_PATTERN_STYLE: React.CSSProperties = {
  backgroundImage: `repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(34, 197, 94, 0.1) 2px,
    rgba(34, 197, 94, 0.1) 4px
  )`,
};

const FormationView: React.FC<FormationViewProps> = ({ players, theme }) => {
  // Memoize players array reference - use empty array only once
  const stablePlayers = React.useMemo(() => {
    return players && Array.isArray(players) ? players : [];
  }, [players]);

  // Group players by position
  const playersByPosition = React.useMemo(() => {
    const grouped: Record<Position, PlayerAvailability[]> = {
      GK: [],
      LB: [],
      RB: [],
      CB: [],
      CDM: [],
      CM: [],
      CAM: [],
      ST: [],
      LW: [],
      RW: [],
    };
    
    stablePlayers.forEach(player => {
      if (player && player.position && grouped[player.position]) {
        grouped[player.position].push(player);
      }
    });
    
    return grouped;
  }, [stablePlayers]);

  return (
    <div className="relative w-full contain-layout">
      {/* Soccer Field Background */}
      <div className="relative bg-gradient-to-b from-emerald-100/90 via-green-100/70 to-emerald-100/90 border-2 border-emerald-400/70 rounded-xl p-3 sm:p-5 overflow-hidden shadow-lg min-h-[280px] sm:min-h-[320px] will-change-auto">
        {/* Field pattern (grass texture effect) */}
        <div className="absolute inset-0 opacity-30" style={GRASS_PATTERN_STYLE}></div>
        
        {/* Field lines */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-28 sm:h-28 border-2 border-emerald-500/40 rounded-full"></div>
          {/* Center line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-500/50"></div>
          {/* Penalty boxes */}
          <div className="absolute top-0 left-1/4 w-1/2 h-6 sm:h-10 border-l-2 border-r-2 border-b-2 border-emerald-500/40 rounded-b-xl"></div>
          <div className="absolute bottom-0 left-1/4 w-1/2 h-6 sm:h-10 border-l-2 border-r-2 border-t-2 border-emerald-500/40 rounded-t-xl"></div>
          {/* Goal areas */}
          <div className="absolute top-0 left-[35%] w-[30%] h-3 sm:h-5 border-l-2 border-r-2 border-b-2 border-emerald-500/40"></div>
          <div className="absolute bottom-0 left-[35%] w-[30%] h-3 sm:h-5 border-l-2 border-r-2 border-t-2 border-emerald-500/40"></div>
        </div>

        {/* Formation Positions */}
        <div className="relative space-y-2 sm:space-y-2.5 py-1 contain-layout">
          {FORMATION_LAYOUT.map(({ row, positions: rowPositions }) => (
            <div
              key={row}
              className="flex items-center justify-center gap-2 sm:gap-3 will-change-auto"
            >
              {rowPositions.map((pos, idx) => {
                if (pos === null) {
                  return <div key={idx} className="w-14 sm:w-20"></div>;
                }
                const playersAtPosition = playersByPosition[pos] || [];
                const hasPlayers = playersAtPosition.length > 0;
                
                return (
                  <div
                    key={pos}
                    className="flex flex-col items-center gap-1.5 z-10"
                  >
                    {/* Player cards */}
                    <div className="flex flex-col gap-0.5 items-center max-h-32 sm:max-h-40 overflow-y-auto custom-scrollbar">
                      {hasPlayers ? (
                        playersAtPosition.map((player) => (
                          <FormationPlayerCard
                            key={player.id}
                            player={player}
                            theme={theme}
                          />
                        ))
                      ) : (
                        <div className="w-16 sm:w-20 h-11 sm:h-12 rounded-md flex items-center justify-center bg-slate-200/40 text-slate-400 border-2 border-dashed border-slate-300/40">
                          <p className="text-[9px] font-bold">-</p>
                        </div>
                      )}
                    </div>
                    {/* Position label */}
                    <div className="text-center bg-white/70 backdrop-blur-sm px-1.5 py-0.5 rounded-md shadow-sm border border-white/80">
                      <p className={`text-[10px] sm:text-xs font-bold ${
                        hasPlayers ? "text-slate-800" : "text-slate-400"
                      }`}>
                        {pos}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Player Card Component - memoized for performance
const FormationPlayerCard = React.memo<{
  player: PlayerAvailability;
  theme: FormationViewProps['theme'];
}>(({ player, theme }) => {
  const firstName = player.name?.split(' ')[0] || player.name || '';
  
  return (
    <div
      className={`w-16 sm:w-20 h-11 sm:h-12 rounded-md flex flex-col items-center justify-center p-1 sm:p-1.5 shadow-md transition-all duration-300 transform hover:scale-110 hover:z-20 relative ${theme.badgeBg} ${theme.badgeText} ring-1 ring-white/60`}
      title={`${player.name} (${player.position}) - Skill: ${player.skillLevel}`}
    >
      <p className="text-[9px] sm:text-[10px] font-bold truncate w-full text-center leading-tight max-w-[3.5rem]">
        {firstName}
      </p>
      <p className="text-[8px] sm:text-[9px] font-semibold opacity-80">
        S{player.skillLevel}
      </p>
    </div>
  );
}, (prev, next) => {
  return prev.player.id === next.player.id &&
         prev.player.name === next.player.name &&
         prev.player.skillLevel === next.player.skillLevel &&
         prev.theme.badgeBg === next.theme.badgeBg &&
         prev.theme.badgeText === next.theme.badgeText;
});

FormationPlayerCard.displayName = 'FormationPlayerCard';

// Custom comparison for FormationView to prevent unnecessary re-renders
const areFormationPropsEqual = (prevProps: FormationViewProps, nextProps: FormationViewProps) => {
  // Quick comparison: check players array length first
  if (prevProps.players.length !== nextProps.players.length) {
    return false;
  }
  
  // If no players, only compare theme
  if (prevProps.players.length === 0) {
    return prevProps.theme.badgeBg === nextProps.theme.badgeBg &&
           prevProps.theme.badgeText === nextProps.theme.badgeText;
  }
  
  // Compare all player IDs to ensure they match (quick string comparison)
  const prevIds = prevProps.players.map(p => p?.id || '').filter(Boolean).sort().join(',');
  const nextIds = nextProps.players.map(p => p?.id || '').filter(Boolean).sort().join(',');
  if (prevIds !== nextIds) {
    return false;
  }
  
  // Compare theme - check all properties
  return prevProps.theme.badgeBg === nextProps.theme.badgeBg &&
         prevProps.theme.badgeText === nextProps.theme.badgeText &&
         prevProps.theme.countText === nextProps.theme.countText;
};

export default React.memo(FormationView, areFormationPropsEqual);

