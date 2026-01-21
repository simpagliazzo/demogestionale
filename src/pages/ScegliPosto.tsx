import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bus, MapPin, Calendar, Check, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatNameSurnameFirst } from "@/lib/format-utils";

interface TokenData {
  id: string;
  participant_id: string;
  trip_id: string;
  used_at: string | null;
  expires_at: string;
  participant: {
    full_name: string;
  };
  trip: {
    title: string;
    destination: string;
    departure_date: string;
    return_date: string;
  };
}

interface BusConfig {
  id: string;
  rows: number;
  seats_per_row: number;
  total_seats: number;
}

interface SeatAssignment {
  id: string;
  seat_number: number;
  participant_id: string;
}

export default function ScegliPosto() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [busConfig, setBusConfig] = useState<BusConfig | null>(null);
  const [seatAssignments, setSeatAssignments] = useState<SeatAssignment[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyAssigned, setAlreadyAssigned] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) {
      setError("Token non valido");
      setLoading(false);
      return;
    }

    try {
      // Carica dati del token
      const { data: tokenResult, error: tokenError } = await supabase
        .from("bus_seat_tokens")
        .select(`
          id,
          participant_id,
          trip_id,
          used_at,
          expires_at,
          participant:participants(full_name),
          trip:trips(title, destination, departure_date, return_date)
        `)
        .eq("token", token)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (tokenError || !tokenResult) {
        setError("Link non valido o scaduto");
        setLoading(false);
        return;
      }

      // Type assertion per gestire la struttura dei dati
      const formattedTokenData: TokenData = {
        id: tokenResult.id,
        participant_id: tokenResult.participant_id,
        trip_id: tokenResult.trip_id,
        used_at: tokenResult.used_at,
        expires_at: tokenResult.expires_at,
        participant: tokenResult.participant as unknown as { full_name: string },
        trip: tokenResult.trip as unknown as { title: string; destination: string; departure_date: string; return_date: string }
      };

      setTokenData(formattedTokenData);

      // Carica configurazione bus
      const { data: busData, error: busError } = await supabase
        .from("bus_configurations")
        .select("id, rows, seats_per_row, total_seats")
        .eq("trip_id", tokenResult.trip_id)
        .maybeSingle();

      if (busError || !busData) {
        setError("La piantina del bus non è ancora stata configurata per questo viaggio");
        setLoading(false);
        return;
      }

      setBusConfig(busData);

      // Carica assegnamenti posti
      const { data: assignments, error: assignError } = await supabase
        .from("bus_seat_assignments")
        .select("id, seat_number, participant_id")
        .eq("bus_config_id", busData.id);

      if (!assignError && assignments) {
        setSeatAssignments(assignments);
        
        // Controlla se il partecipante ha già un posto
        const existingAssignment = assignments.find(a => a.participant_id === tokenResult.participant_id);
        if (existingAssignment) {
          setAlreadyAssigned(existingAssignment.seat_number);
        }
      }

    } catch (err) {
      console.error("Errore caricamento dati:", err);
      setError("Si è verificato un errore");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSeat = async () => {
    if (!selectedSeat || !tokenData || !busConfig) return;

    setSaving(true);

    try {
      // Inserisci l'assegnamento
      const { error: insertError } = await supabase
        .from("bus_seat_assignments")
        .insert({
          bus_config_id: busConfig.id,
          participant_id: tokenData.participant_id,
          seat_number: selectedSeat,
        });

      if (insertError) {
        if (insertError.code === "23505") {
          toast.error("Questo posto è già stato occupato");
          loadData(); // Ricarica per aggiornare i posti
        } else {
          throw insertError;
        }
        return;
      }

      // Marca il token come usato
      await supabase
        .from("bus_seat_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("id", tokenData.id);

      setAlreadyAssigned(selectedSeat);
      toast.success(`Posto ${selectedSeat} prenotato con successo!`);
      
    } catch (err) {
      console.error("Errore salvataggio:", err);
      toast.error("Errore nella prenotazione del posto");
    } finally {
      setSaving(false);
    }
  };

  const isSeatOccupied = (seatNumber: number) => {
    return seatAssignments.some(a => a.seat_number === seatNumber);
  };

  const renderSeat = (seatNumber: number) => {
    const isOccupied = isSeatOccupied(seatNumber);
    const isSelected = selectedSeat === seatNumber;
    const isMyAssignment = alreadyAssigned === seatNumber;

    return (
      <button
        key={seatNumber}
        onClick={() => !isOccupied && !alreadyAssigned && setSelectedSeat(seatNumber)}
        disabled={isOccupied || !!alreadyAssigned}
        className={cn(
          "w-12 h-12 sm:w-14 sm:h-14 rounded-lg text-sm font-bold transition-all flex items-center justify-center shadow-sm",
          isMyAssignment
            ? "bg-blue-500 text-white ring-2 ring-blue-300"
            : isOccupied
            ? "bg-red-500/80 text-white cursor-not-allowed"
            : isSelected
            ? "bg-green-500 text-white ring-2 ring-green-300 scale-105"
            : alreadyAssigned
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-green-100 text-green-800 hover:bg-green-200 hover:scale-105 cursor-pointer"
        )}
      >
        {seatNumber}
      </button>
    );
  };

  const renderBusMap = () => {
    if (!busConfig) return null;

    const lastRowSeats = 5; // Default per bus GT
    const normalRowSeats = busConfig.total_seats - lastRowSeats;
    const normalRows = Math.ceil(normalRowSeats / 4);
    
    const rows = [];
    let seatNumber = 1;

    for (let row = 0; row < normalRows && seatNumber <= busConfig.total_seats - lastRowSeats; row++) {
      const leftSeats = [];
      const rightSeats = [];

      for (let col = 0; col < 2 && seatNumber <= busConfig.total_seats - lastRowSeats; col++) {
        leftSeats.push(renderSeat(seatNumber++));
      }

      for (let col = 0; col < 2 && seatNumber <= busConfig.total_seats - lastRowSeats; col++) {
        rightSeats.push(renderSeat(seatNumber++));
      }

      rows.push(
        <div key={row} className="flex items-center justify-center gap-2">
          <div className="flex gap-1">{leftSeats}</div>
          <div className="w-6 sm:w-10" />
          <div className="flex gap-1">{rightSeats}</div>
        </div>
      );
    }

    // Ultima fila (5 posti)
    const lastRow = [];
    for (let i = 0; i < lastRowSeats && seatNumber <= busConfig.total_seats; i++) {
      lastRow.push(renderSeat(seatNumber++));
    }

    return (
      <div className="flex flex-col gap-2">
        {/* Area autista e guida */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="bg-slate-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex flex-col items-center">
            <span>🚌</span>
            <span className="text-[10px]">Autista</span>
          </div>
          <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-lg text-sm font-medium border border-amber-200 flex flex-col items-center">
            <span>🚪</span>
            <span className="text-[10px]">Ingresso</span>
          </div>
          <div className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium border border-blue-200 flex flex-col items-center">
            <span>👤</span>
            <span className="text-[10px]">Guida</span>
          </div>
        </div>
        <div className="border-t border-dashed border-muted-foreground/30 my-2" />
        {rows}
        <div className="border-t border-dashed border-muted-foreground/30 my-2" />
        {/* Ultima fila */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Ultima fila ({lastRowSeats} posti)</span>
          <div className="flex gap-1 justify-center">{lastRow}</div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Oops!</h1>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Bus className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Scegli il tuo posto</CardTitle>
            <p className="text-muted-foreground mt-2">
              Ciao <span className="font-semibold">{tokenData?.participant.full_name ? formatNameSurnameFirst(tokenData.participant.full_name) : ''}</span>!
            </p>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Bus className="h-4 w-4 text-primary" />
                <span className="font-medium">{tokenData?.trip.title}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{tokenData?.trip.destination}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {tokenData && format(new Date(tokenData.trip.departure_date), "d MMMM yyyy", { locale: it })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stato prenotazione */}
        {alreadyAssigned && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 text-white w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg">
                  {alreadyAssigned}
                </div>
                <div>
                  <p className="font-semibold text-blue-900">Posto prenotato!</p>
                  <p className="text-sm text-blue-700">
                    Hai già scelto il posto numero {alreadyAssigned}
                  </p>
                </div>
                <Check className="h-8 w-8 text-blue-500 ml-auto" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Piantina Bus */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bus className="h-5 w-5" />
              Piantina Bus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-4">
              {renderBusMap()}
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-green-100 border border-green-300" />
                <span>Disponibile</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-red-500" />
                <span>Occupato</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-green-500" />
                <span>Selezionato</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-blue-500" />
                <span>Il tuo posto</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pulsante conferma */}
        {!alreadyAssigned && (
          <Card>
            <CardContent className="pt-6">
              {selectedSeat ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Posto selezionato:</span>
                    <Badge variant="secondary" className="text-lg px-4 py-1">
                      N° {selectedSeat}
                    </Badge>
                  </div>
                  <Button 
                    onClick={handleSelectSeat} 
                    disabled={saving}
                    className="w-full h-12 text-lg"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Prenotazione in corso...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        Conferma posto {selectedSeat}
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-center text-muted-foreground">
                  Tocca un posto verde per selezionarlo
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          Gladiatours Viaggi • Tel. 0775 353808
        </p>
      </div>
    </div>
  );
}
