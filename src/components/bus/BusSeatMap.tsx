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
  lastRowSeats?: number; // 4 o 5
  layoutType?: string;
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
    rows,
    totalSeats,
    hasDriverSeat = true,
    hasGuideSeat = true,
    hasFrontDoor = true,
    hasRearDoor = true,
    hasWc = false,
    lastRowSeats = 5,
    layoutType = 'gt_standard',
  } = config;

  const getSeatAssignment = (seatNumber: number) => {
    return seatAssignments.find((a) => a.seat_number === seatNumber);
  };

  const seatSize = compact ? "w-9 h-9 text-[10px]" : "w-11 h-11 text-xs";
  const specialSeatSize = compact ? "w-9 h-9 text-[9px]" : "w-11 h-11 text-[10px]";

  const renderSeat = (seatNumber: number, isSpecial = false) => {
    const assignment = getSeatAssignment(seatNumber);
    const isOccupied = !!assignment;
    const isSelected = selectedParticipant !== "";

    return (
      <button
        key={seatNumber}
        onClick={() => onSeatClick(seatNumber, assignment)}
        disabled={!isOccupied && !isSelected}
        className={cn(
          "rounded-lg font-semibold transition-all flex items-center justify-center shadow-sm border",
          isSpecial ? specialSeatSize : seatSize,
          isOccupied
            ? "bg-red-500 text-white hover:bg-red-600 cursor-pointer border-red-600"
            : isSelected
            ? "bg-green-500 text-white hover:bg-green-600 cursor-pointer border-green-600"
            : "bg-muted text-muted-foreground cursor-not-allowed border-muted-foreground/20"
        )}
        title={isOccupied ? `${seatNumber}: ${assignment.participant?.full_name}` : `Posto ${seatNumber}`}
      >
        {seatNumber}
      </button>
    );
  };

  // Calcola quante file normali (4 posti) ci sono
  const seatsInNormalRows = totalSeats - lastRowSeats;
  const normalRows = Math.ceil(seatsInNormalRows / 4);
  
  // Genera la mappa posti
  const busRows = [];
  let seatNumber = 1;

  // Righe normali (2+2)
  for (let row = 0; row < normalRows && seatNumber <= totalSeats - lastRowSeats; row++) {
    const leftSeats = [];
    const rightSeats = [];

    // Lato sinistro (2 posti - lato finestrino + corridoio)
    for (let col = 0; col < 2 && seatNumber <= totalSeats - lastRowSeats; col++) {
      leftSeats.push(renderSeat(seatNumber++));
    }

    // Lato destro (2 posti - corridoio + finestrino)
    for (let col = 0; col < 2 && seatNumber <= totalSeats - lastRowSeats; col++) {
      rightSeats.push(renderSeat(seatNumber++));
    }

    // Porta centrale/posteriore? (circa a metà bus)
    const isRearDoorRow = hasRearDoor && row === Math.floor(normalRows / 2);

    busRows.push(
      <div key={`row-${row}`} className="flex items-center justify-center">
        <div className="flex gap-1">{leftSeats}</div>
        <div className={cn(
          "flex items-center justify-center",
          compact ? "w-6" : "w-10"
        )}>
          {isRearDoorRow && (
            <div className={cn(
              "bg-amber-100 text-amber-700 rounded text-[8px] px-1 py-0.5 font-medium",
              compact ? "text-[7px]" : ""
            )}>
              🚪
            </div>
          )}
        </div>
        <div className="flex gap-1">{rightSeats}</div>
      </div>
    );
  }

  // Ultima fila (4 o 5 posti)
  const lastRowContent = [];
  for (let i = 0; i < lastRowSeats && seatNumber <= totalSeats; i++) {
    lastRowContent.push(renderSeat(seatNumber++, true));
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Area frontale: Autista + Guida + Porta anteriore */}
      <div className={cn(
        "flex items-stretch justify-center mb-3 gap-1",
        compact ? "mb-2" : ""
      )}>
        {/* Autista (sinistra) */}
        {hasDriverSeat && (
          <div className={cn(
            "flex flex-col items-center justify-center bg-slate-700 text-white rounded-lg",
            compact ? "px-2 py-1" : "px-3 py-2"
          )}>
            <span className={compact ? "text-sm" : "text-base"}>🚌</span>
            <span className={cn("font-medium", compact ? "text-[8px]" : "text-[10px]")}>
              Autista
            </span>
          </div>
        )}

        {/* Porta anteriore (centro) */}
        {hasFrontDoor && (
          <div className={cn(
            "flex flex-col items-center justify-center bg-amber-50 text-amber-700 rounded-lg border border-amber-200",
            compact ? "px-3 py-1" : "px-4 py-2"
          )}>
            <span className={compact ? "text-base" : "text-lg"}>🚪</span>
            <span className={cn("font-medium", compact ? "text-[8px]" : "text-[10px]")}>
              Ingresso
            </span>
          </div>
        )}

        {/* Guida/Accompagnatore (destra) */}
        {hasGuideSeat && (
          <div className={cn(
            "flex flex-col items-center justify-center bg-blue-100 text-blue-700 rounded-lg border border-blue-200",
            compact ? "px-2 py-1" : "px-3 py-2"
          )}>
            <span className={compact ? "text-sm" : "text-base"}>👤</span>
            <span className={cn("font-medium", compact ? "text-[8px]" : "text-[10px]")}>
              Guida
            </span>
          </div>
        )}
      </div>

      {/* Separatore */}
      <div className={cn(
        "border-t border-dashed border-muted-foreground/30",
        compact ? "my-1" : "my-2"
      )} />

      {/* Righe passeggeri */}
      <div className="flex flex-col gap-1">
        {busRows}
      </div>

      {/* Separatore prima dell'ultima fila */}
      <div className={cn(
        "border-t border-dashed border-muted-foreground/30",
        compact ? "my-1" : "my-2"
      )} />

      {/* Ultima fila (banco da 4 o 5) */}
      <div className="flex flex-col items-center gap-1">
        <div className={cn(
          "text-muted-foreground font-medium",
          compact ? "text-[9px]" : "text-[10px]"
        )}>
          Ultima fila ({lastRowSeats} posti)
        </div>
        <div className="flex gap-1 justify-center">
          {lastRowContent}
        </div>
      </div>

      {/* WC se presente */}
      {hasWc && (
        <div className="flex justify-end mt-2">
          <div className={cn(
            "flex items-center gap-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-200",
            compact ? "px-2 py-1 text-[9px]" : "px-3 py-1.5 text-xs"
          )}>
            <span>🚻</span>
            <span className="font-medium">WC</span>
          </div>
        </div>
      )}

      {/* Indicatori lati */}
      <div className={cn(
        "flex justify-between text-muted-foreground mt-2",
        compact ? "text-[9px] px-1" : "text-[10px] px-2"
      )}>
        <span>← Finestrino sx</span>
        <span>Finestrino dx →</span>
      </div>
    </div>
  );
}
