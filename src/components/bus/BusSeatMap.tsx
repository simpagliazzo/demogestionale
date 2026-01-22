import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface BusLayoutConfig {
  rows: number;
  totalSeats: number;
  hasDriverSeat?: boolean;
  hasGuideSeat?: boolean;
  hasFrontDoor?: boolean;
  hasRearDoor?: boolean;
  hasWc?: boolean;
  lastRowSeats?: number; // 3-6
  layoutType?: string;
  doorRowPosition?: number | null; // Fila dove si trova la porta centrale (null = automatico)
}

interface SeatAssignment {
  id: string;
  seat_number: number;
  participant_id: string;
  participant?: {
    full_name: string;
  };
}

interface BusSeatMapProps {
  config: BusLayoutConfig;
  seatAssignments: SeatAssignment[];
  selectedParticipant: string;
  compact?: boolean;
  onSeatClick: (seatNumber: number, assignment?: SeatAssignment) => void;
}

export default function BusSeatMap({
  config,
  seatAssignments,
  selectedParticipant,
  compact = false,
  onSeatClick,
}: BusSeatMapProps) {
  const {
    totalSeats,
    hasDriverSeat = true,
    hasGuideSeat = true,
    hasFrontDoor = true,
    hasRearDoor = true,
    hasWc = false,
    lastRowSeats = 5,
    layoutType = 'gt_standard',
    doorRowPosition,
  } = config;

  const getSeatAssignment = (seatNumber: number) => {
    return seatAssignments.find((a) => a.seat_number === seatNumber);
  };

  // Dimensioni sedili più realistiche
  const seatSize = compact 
    ? "w-8 h-7 text-[9px]" 
    : "w-10 h-8 text-[11px]";
  const lastRowSeatSize = compact 
    ? "w-7 h-7 text-[8px]" 
    : "w-9 h-8 text-[10px]";

  const renderSeat = (seatNumber: number, isLastRow = false) => {
    const assignment = getSeatAssignment(seatNumber);
    const isOccupied = !!assignment;
    const isSelected = selectedParticipant !== "";

    return (
      <button
        key={seatNumber}
        onClick={() => onSeatClick(seatNumber, assignment)}
        disabled={!isOccupied && !isSelected}
        className={cn(
          "rounded-md font-bold transition-all flex items-center justify-center border-2 relative",
          isLastRow ? lastRowSeatSize : seatSize,
          isOccupied
            ? "bg-red-500 text-white border-red-600 hover:bg-red-600 cursor-pointer shadow-md"
            : isSelected
            ? "bg-green-500 text-white border-green-600 hover:bg-green-600 cursor-pointer shadow-md"
            : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed",
          // Effetto sedile con bordo superiore arrotondato
          "before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:w-[60%] before:h-[3px] before:rounded-t-full",
          isOccupied 
            ? "before:bg-red-700" 
            : isSelected 
            ? "before:bg-green-700" 
            : "before:bg-slate-300"
        )}
        title={isOccupied ? `${seatNumber}: ${assignment.participant?.full_name}` : `Posto ${seatNumber}`}
      >
        {seatNumber}
      </button>
    );
  };

  // Calcola layout
  const seatsInNormalRows = totalSeats - lastRowSeats;
  const normalRowCount = Math.ceil(seatsInNormalRows / 4);
  
  // Posizione della porta centrale - usa il valore configurato o calcola automaticamente
  // doorRowPosition è 1-indexed (fila 1, 2, 3...), mentre l'array è 0-indexed
  const centralDoorPosition = doorRowPosition 
    ? doorRowPosition - 1 
    : Math.floor(normalRowCount * 0.55);
  
  // Posizione WC (in fondo, prima dell'ultima fila)
  const wcPosition = normalRowCount - 1;

  // Genera le righe
  const busRows = [];
  let seatNumber = 1;

  for (let row = 0; row < normalRowCount && seatNumber <= seatsInNormalRows; row++) {
    const leftSeats = [];
    const rightSeats = [];

    // Sinistra (2 posti: finestrino + corridoio)
    for (let col = 0; col < 2 && seatNumber <= seatsInNormalRows; col++) {
      leftSeats.push(renderSeat(seatNumber++));
    }

    // Destra (2 posti: corridoio + finestrino)
    for (let col = 0; col < 2 && seatNumber <= seatsInNormalRows; col++) {
      rightSeats.push(renderSeat(seatNumber++));
    }

    const isCentralDoorRow = hasRearDoor && row === centralDoorPosition;
    const isWcRow = hasWc && row === wcPosition;

    busRows.push(
      <div key={`row-${row}`} className="flex items-center justify-center relative">
        {/* Finestrino sinistro */}
        <div className={cn(
          "absolute left-0 h-full bg-gradient-to-r from-sky-100 to-transparent",
          compact ? "w-1" : "w-1.5"
        )} />
        
        {/* Sedili sinistri */}
        <div className="flex gap-0.5">{leftSeats}</div>
        
        {/* Corridoio centrale */}
        <div className={cn(
          "flex items-center justify-center relative",
          compact ? "w-5" : "w-8"
        )}>
          {isCentralDoorRow && (
            <div className={cn(
              "absolute flex flex-col items-center",
              compact ? "-right-2" : "-right-3"
            )}>
              <div className={cn(
                "bg-amber-400 rounded-sm flex items-center justify-center",
                compact ? "w-4 h-6 text-[8px]" : "w-5 h-8 text-[10px]"
              )}>
                🚪
              </div>
            </div>
          )}
          {isWcRow && hasWc && (
            <div className={cn(
              "absolute flex flex-col items-center",
              compact ? "-left-2" : "-left-3"
            )}>
              <div className={cn(
                "bg-purple-400 text-white rounded-sm flex items-center justify-center",
                compact ? "w-4 h-6 text-[8px]" : "w-5 h-8 text-[10px]"
              )}>
                🚻
              </div>
            </div>
          )}
        </div>
        
        {/* Sedili destri */}
        <div className="flex gap-0.5">{rightSeats}</div>
        
        {/* Finestrino destro */}
        <div className={cn(
          "absolute right-0 h-full bg-gradient-to-l from-sky-100 to-transparent",
          compact ? "w-1" : "w-1.5"
        )} />
      </div>
    );
  }

  // Ultima fila
  const lastRowContent = [];
  for (let i = 0; i < lastRowSeats && seatNumber <= totalSeats; i++) {
    lastRowContent.push(renderSeat(seatNumber++, true));
  }

  // Larghezza dinamica del bus basata sul tipo
  const busWidth = compact ? "w-[200px]" : "w-[260px]";

  return (
    <div className={cn(
      "flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 rounded-xl shadow-lg overflow-hidden border-2 border-slate-300",
      busWidth
    )}>
      {/* FRONTALE BUS - Muso arrotondato */}
      <div className={cn(
        "bg-slate-700 rounded-t-3xl flex items-center justify-center gap-2 relative",
        compact ? "py-2 px-3" : "py-3 px-4"
      )}>
        {/* Parabrezza */}
        <div className={cn(
          "absolute top-0 left-1/2 -translate-x-1/2 bg-sky-200 rounded-t-2xl",
          compact ? "w-[70%] h-[4px]" : "w-[70%] h-[6px]"
        )} />
        
        <div className="flex items-center gap-2 w-full justify-between">
          {/* Autista */}
          {hasDriverSeat && (
            <div className={cn(
              "flex flex-col items-center justify-center bg-slate-600 rounded-md",
              compact ? "p-1" : "p-1.5"
            )}>
              <span className={compact ? "text-xs" : "text-sm"}>🚌</span>
              <span className={cn("text-white font-medium", compact ? "text-[6px]" : "text-[8px]")}>
                AUTISTA
              </span>
            </div>
          )}

          {/* Porta anteriore */}
          {hasFrontDoor && (
            <div className={cn(
              "flex flex-col items-center justify-center bg-amber-400 rounded-md",
              compact ? "px-2 py-1" : "px-3 py-1.5"
            )}>
              <span className={compact ? "text-sm" : "text-base"}>🚪</span>
              <span className={cn("font-bold text-slate-800", compact ? "text-[6px]" : "text-[8px]")}>
                INGRESSO
              </span>
            </div>
          )}

          {/* Guida */}
          {hasGuideSeat && (
            <div className={cn(
              "flex flex-col items-center justify-center bg-blue-500 rounded-md",
              compact ? "p-1" : "p-1.5"
            )}>
              <span className={compact ? "text-xs" : "text-sm"}>👤</span>
              <span className={cn("text-white font-medium", compact ? "text-[6px]" : "text-[8px]")}>
                GUIDA
              </span>
            </div>
          )}
        </div>
      </div>

      {/* CORPO BUS */}
      <div className={cn(
        "flex flex-col bg-white border-x-4 border-slate-300 relative",
        compact ? "gap-0.5 py-2" : "gap-1 py-3"
      )}>
        {/* Indicatori numeri fila */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 flex flex-col justify-around items-center text-slate-400",
          compact ? "text-[7px] w-3" : "text-[8px] w-4"
        )}>
          {busRows.map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        
        {busRows}
      </div>

      {/* ULTIMA FILA - Banco posteriore */}
      <div className={cn(
        "bg-slate-200 flex flex-col items-center relative",
        compact ? "py-2" : "py-3"
      )}>
        <div className={cn(
          "text-slate-500 font-semibold mb-1",
          compact ? "text-[8px]" : "text-[10px]"
        )}>
          ULTIMA FILA ({lastRowSeats} posti)
        </div>
        <div className="flex gap-0.5 justify-center">
          {lastRowContent}
        </div>
      </div>

      {/* RETRO BUS */}
      <div className={cn(
        "bg-slate-700 rounded-b-lg flex items-center justify-center",
        compact ? "py-1.5" : "py-2"
      )}>
        <div className={cn(
          "flex items-center gap-2 text-white",
          compact ? "text-[7px]" : "text-[9px]"
        )}>
          <span>🔴</span>
          <span className="font-medium">RETRO</span>
          <span>🔴</span>
        </div>
      </div>

      {/* LEGENDA */}
      <div className={cn(
        "bg-white border-t border-slate-200 flex items-center justify-center gap-3 flex-wrap",
        compact ? "p-1.5 text-[7px]" : "p-2 text-[9px]"
      )}>
        <div className="flex items-center gap-1">
          <div className={cn(
            "rounded-sm bg-slate-100 border border-slate-200",
            compact ? "w-3 h-3" : "w-4 h-4"
          )} />
          <span className="text-slate-500">Libero</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={cn(
            "rounded-sm bg-green-500",
            compact ? "w-3 h-3" : "w-4 h-4"
          )} />
          <span className="text-slate-500">Selezionabile</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={cn(
            "rounded-sm bg-red-500",
            compact ? "w-3 h-3" : "w-4 h-4"
          )} />
          <span className="text-slate-500">Occupato</span>
        </div>
        {hasWc && (
          <div className="flex items-center gap-1">
            <span>🚻</span>
            <span className="text-slate-500">WC</span>
          </div>
        )}
      </div>

      {/* Info totale */}
      <div className={cn(
        "bg-slate-50 text-center border-t border-slate-200 text-slate-600 font-medium",
        compact ? "py-1 text-[8px]" : "py-1.5 text-[10px]"
      )}>
        Totale: {totalSeats} posti passeggeri
        {layoutType && layoutType !== 'gt_standard' && (
          <span className="ml-2 text-slate-400">
            ({layoutType.replace(/_/g, ' ').toUpperCase()})
          </span>
        )}
      </div>
    </div>
  );
}
