import React from "react";
import { Position, PlayerAvailability } from "../../types/player";

interface FormationViewProps {
  players: PlayerAvailability[];
  theme: {
    badgeBg: string;
    badgeText: string;
    countText: string;
  };
}

// Simplified formation layout - faster rendering
const FORMATION_LAYOUT: { row: number; positions: (Position | null)[] }[] = [
  { row: 1, positions: ["LW", null, "ST", null, "RW"] },
  { row: 2, positions: [null, null, "CAM", null, null] },
  { row: 3, positions: [null, "CM", null, "CDM", null] },
  { row: 4, positions: ["LB", null, "CB", null, "RB"] },
  { row: 5, positions: [null, null, "GK", null, null] },
];

const FormationView: React.FC<FormationViewProps> = ({ players, theme }) => {
  const stablePlayers = React.useMemo(() => {
    return players && Array.isArray(players) ? players : [];
  }, [players]);

  // Group players by position - simplified
  const playersByPosition = React.useMemo(() => {
    const grouped: Record<Position, PlayerAvailability[]> = {
      GK: [], LB: [], RB: [], CB: [], CDM: [], CM: [], CAM: [], ST: [], LW: [], RW: [],
    };
    
    stablePlayers.forEach(player => {
      if (player && player.position && grouped[player.position]) {
        grouped[player.position].push(player);
      }
    });
    
    return grouped;
  }, [stablePlayers]);

  return (
    <div className="relative w-full">
      {/* Simplified Soccer Field - No expensive effects */}
      <div className="relative bg-gradient-to-b from-emerald-100 via-green-100 to-emerald-100 border-2 border-emerald-400/70 rounded-xl p-3 sm:p-4 overflow-hidden shadow-sm min-h-[240px] sm:min-h-[280px]">
        {/* Simple center line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-500/40"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-20 sm:h-20 border-2 border-emerald-500/30 rounded-full"></div>

        {/* Formation Positions - Simplified rendering */}
        <div className="relative space-y-2 sm:space-y-2.5 py-2">
          {FORMATION_LAYOUT.map(({ row, positions: rowPositions }) => (
            <div
              key={row}
              className="flex items-center justify-center gap-2 sm:gap-3"
            >
              {rowPositions.map((pos, idx) => {
                if (pos === null) {
                  return <div key={idx} className="w-12 sm:w-16"></div>;
                }
                const playersAtPosition = playersByPosition[pos] || [];
                const hasPlayers = playersAtPosition.length > 0;
                
                return (
                  <div
                    key={pos}
                    className="flex flex-col items-center gap-1"
                  >
                    {/* Player cards - Simplified */}
                    <div className="flex flex-col gap-0.5 items-center max-h-28 sm:max-h-32 overflow-y-auto">
                      {hasPlayers ? (
                        playersAtPosition.map((player) => (
                          <FormationPlayerCard
                            key={player.id}
                            player={player}
                            theme={theme}
                          />
                        ))
                      ) : (
                        <div className="w-14 sm:w-16 h-10 sm:h-11 rounded-md flex items-center justify-center bg-slate-200/40 text-slate-400 border border-dashed border-slate-300/40">
                          <p className="text-[9px] font-bold">-</p>
                        </div>
                      )}
                    </div>
                    {/* Position label - Simplified */}
                    <div className="text-center bg-white/80 px-1.5 py-0.5 rounded shadow-sm border border-white/80">
                      <p className={`text-[9px] sm:text-[10px] font-bold ${
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

// Simplified Player Card - No hover effects for faster rendering
const FormationPlayerCard = React.memo<{
  player: PlayerAvailability;
  theme: FormationViewProps['theme'];
}>(({ player, theme }) => {
  const firstName = player.name?.split(' ')[0] || player.name || '';
  
  return (
    <div
      className={`w-14 sm:w-16 h-10 sm:h-11 rounded-md flex flex-col items-center justify-center p-1 shadow-sm ${theme.badgeBg} ${theme.badgeText} border border-white/60 relative`}
      title={`${player.name} (${player.position}) - Skill: ${player.skillLevel}${player.jerseyNumber !== undefined && player.jerseyNumber !== null ? ` - #${player.jerseyNumber}` : ''}`}
    >
      {player.jerseyNumber !== undefined && player.jerseyNumber !== null && (
        <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center z-10">
          <span className="text-[8px] sm:text-[9px] font-black text-slate-800">
            {player.jerseyNumber}
          </span>
        </div>
      )}
      <p className="text-[8px] sm:text-[9px] font-bold truncate w-full text-center leading-tight">
        {firstName}
      </p>
      <p className="text-[7px] sm:text-[8px] font-semibold opacity-80">
        S{player.skillLevel}
      </p>
    </div>
  );
}, (prev, next) => {
  return prev.player.id === next.player.id &&
         prev.player.name === next.player.name &&
         prev.player.skillLevel === next.player.skillLevel &&
         prev.player.jerseyNumber === next.player.jerseyNumber &&
         prev.theme.badgeBg === next.theme.badgeBg &&
         prev.theme.badgeText === next.theme.badgeText;
});

FormationPlayerCard.displayName = 'FormationPlayerCard';

// Simplified comparison
const areFormationPropsEqual = (prevProps: FormationViewProps, nextProps: FormationViewProps) => {
  if (prevProps.players.length !== nextProps.players.length) {
    return false;
  }
  
  if (prevProps.players.length === 0) {
    return prevProps.theme.badgeBg === nextProps.theme.badgeBg &&
           prevProps.theme.badgeText === nextProps.theme.badgeText;
  }
  
  const prevIds = prevProps.players.map(p => p?.id || '').filter(Boolean).sort().join(',');
  const nextIds = nextProps.players.map(p => p?.id || '').filter(Boolean).sort().join(',');
  
  return prevIds === nextIds &&
         prevProps.theme.badgeBg === nextProps.theme.badgeBg &&
         prevProps.theme.badgeText === nextProps.theme.badgeText;
};

export default React.memo(FormationView, areFormationPropsEqual);
