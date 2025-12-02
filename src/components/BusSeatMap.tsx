import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bus } from "lucide-react";
import { toast } from "sonner";

interface BusSeatMapProps {
  busConfig: { id: string; rows: number; seats_per_row: number } | null;
  occupiedSeats: number[];
  onSeatSelect: (seatNumber: number) => void;
  selectedSeat: number | null;
  loading?: boolean;
}

interface SeatAssignment {
  seat_number: number;
  participant_id: string;
}

export default function BusSeatMap({ busConfig, occupiedSeats, onSeatSelect, selectedSeat, loading = false }: BusSeatMapProps) {

  const getSeatNumber = (row: number, position: number) => {
    // Configurazione GT standard: fila 1 = posti 1-4, fila 2 = posti 5-8, etc.
    return (row - 1) * 4 + position;
  };

  const getSeatClass = (seatNumber: number) => {
    if (selectedSeat === seatNumber) {
      return "bg-blue-500 text-white hover:bg-blue-600 border-blue-700";
    }
    if (occupiedSeats.includes(seatNumber)) {
      return "bg-red-500 text-white cursor-not-allowed border-red-700";
    }
    return "bg-green-500 text-white hover:bg-green-600 border-green-700";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!busConfig) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Impossibile caricare la configurazione del bus
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bus className="h-5 w-5" />
          Scegli il tuo posto
        </CardTitle>
        <div className="flex gap-4 text-sm mt-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 border-2 border-green-700 rounded" />
            <span>Libero</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500 border-2 border-red-700 rounded" />
            <span>Occupato</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 border-2 border-blue-700 rounded" />
            <span>Selezionato</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-w-md mx-auto">
          {/* Parte anteriore del bus */}
          <div className="mb-4 text-center text-sm font-semibold text-muted-foreground border-b pb-2">
            ← AUTISTA
          </div>

          {/* Mappa dei posti */}
          <div className="space-y-3">
            {Array.from({ length: busConfig.rows }, (_, rowIndex) => {
              const row = rowIndex + 1;
              return (
                <div key={row} className="flex gap-2 justify-center items-center">
                  {/* Posti di sinistra (1-2) */}
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`w-10 h-10 p-0 text-xs font-bold border-2 ${getSeatClass(getSeatNumber(row, 1))}`}
                      disabled={occupiedSeats.includes(getSeatNumber(row, 1))}
                      onClick={() => onSeatSelect(getSeatNumber(row, 1))}
                    >
                      {getSeatNumber(row, 1)}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`w-10 h-10 p-0 text-xs font-bold border-2 ${getSeatClass(getSeatNumber(row, 2))}`}
                      disabled={occupiedSeats.includes(getSeatNumber(row, 2))}
                      onClick={() => onSeatSelect(getSeatNumber(row, 2))}
                    >
                      {getSeatNumber(row, 2)}
                    </Button>
                  </div>

                  {/* Corridoio */}
                  <div className="w-8 text-center text-xs text-muted-foreground">
                    {row}
                  </div>

                  {/* Posti di destra (3-4) */}
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`w-10 h-10 p-0 text-xs font-bold border-2 ${getSeatClass(getSeatNumber(row, 3))}`}
                      disabled={occupiedSeats.includes(getSeatNumber(row, 3))}
                      onClick={() => onSeatSelect(getSeatNumber(row, 3))}
                    >
                      {getSeatNumber(row, 3)}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`w-10 h-10 p-0 text-xs font-bold border-2 ${getSeatClass(getSeatNumber(row, 4))}`}
                      disabled={occupiedSeats.includes(getSeatNumber(row, 4))}
                      onClick={() => onSeatSelect(getSeatNumber(row, 4))}
                    >
                      {getSeatNumber(row, 4)}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Parte posteriore */}
          <div className="mt-4 text-center text-sm text-muted-foreground border-t pt-2">
            USCITA POSTERIORE →
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
