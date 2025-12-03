import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Trip {
  id: string;
  title: string;
  destination: string;
  departure_date: string;
}

interface BusConfig {
  id: string;
  trip_id: string;
  rows: number;
  seats_per_row: number;
  total_seats: number;
  carrier_id: string | null;
  bus_type_id: string | null;
}

interface SeatAssignment {
  id: string;
  bus_config_id: string;
  participant_id: string;
  seat_number: number;
  participant?: {
    full_name: string;
  };
}

interface Participant {
  id: string;
  full_name: string;
}

export default function BusPage() {
  const [selectedTrip, setSelectedTrip] = useState<string>("");
  const [selectedParticipant, setSelectedParticipant] = useState<string>("");
  const queryClient = useQueryClient();

  // Fetch trips
  const { data: trips = [] } = useQuery({
    queryKey: ["trips-for-bus"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, title, destination, departure_date")
        .order("departure_date", { ascending: true });
      if (error) throw error;
      return data as Trip[];
    },
  });

  // Fetch bus config for selected trip
  const { data: busConfig } = useQuery({
    queryKey: ["bus-config", selectedTrip],
    queryFn: async () => {
      if (!selectedTrip) return null;
      const { data, error } = await supabase
        .from("bus_configurations")
        .select("*")
        .eq("trip_id", selectedTrip)
        .maybeSingle();
      if (error) throw error;
      return data as BusConfig | null;
    },
    enabled: !!selectedTrip,
  });

  // Fetch seat assignments
  const { data: seatAssignments = [] } = useQuery({
    queryKey: ["seat-assignments", busConfig?.id],
    queryFn: async () => {
      if (!busConfig?.id) return [];
      const { data, error } = await supabase
        .from("bus_seat_assignments")
        .select(`
          id,
          bus_config_id,
          participant_id,
          seat_number,
          participant:participants(full_name)
        `)
        .eq("bus_config_id", busConfig.id);
      if (error) throw error;
      return data as unknown as SeatAssignment[];
    },
    enabled: !!busConfig?.id,
  });

  // Fetch participants for selected trip
  const { data: participants = [] } = useQuery({
    queryKey: ["participants-for-bus", selectedTrip],
    queryFn: async () => {
      if (!selectedTrip) return [];
      const { data, error } = await supabase
        .from("participants")
        .select("id, full_name")
        .eq("trip_id", selectedTrip)
        .order("full_name");
      if (error) throw error;
      return data as Participant[];
    },
    enabled: !!selectedTrip,
  });

  // Create default bus config if not exists
  const createBusConfig = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("bus_configurations")
        .insert({
          trip_id: selectedTrip,
          rows: 13,
          seats_per_row: 4,
          total_seats: 52,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bus-config", selectedTrip] });
      toast.success("Configurazione bus creata");
    },
  });

  // Assign seat
  const assignSeat = useMutation({
    mutationFn: async ({ seatNumber }: { seatNumber: number }) => {
      if (!busConfig?.id || !selectedParticipant) return;
      const { error } = await supabase
        .from("bus_seat_assignments")
        .insert({
          bus_config_id: busConfig.id,
          participant_id: selectedParticipant,
          seat_number: seatNumber,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seat-assignments", busConfig?.id] });
      setSelectedParticipant("");
      toast.success("Posto assegnato");
    },
    onError: () => {
      toast.error("Errore nell'assegnazione del posto");
    },
  });

  // Remove seat assignment
  const removeSeat = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("bus_seat_assignments")
        .delete()
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seat-assignments", busConfig?.id] });
      toast.success("Assegnazione rimossa");
    },
  });

  const getSeatAssignment = (seatNumber: number) => {
    return seatAssignments.find((a) => a.seat_number === seatNumber);
  };

  const assignedParticipantIds = seatAssignments.map((a) => a.participant_id);
  const unassignedParticipants = participants.filter(
    (p) => !assignedParticipantIds.includes(p.id)
  );

  const renderSeat = (seatNumber: number) => {
    const assignment = getSeatAssignment(seatNumber);
    const isOccupied = !!assignment;
    const isSelected = selectedParticipant !== "";

    return (
      <button
        key={seatNumber}
        onClick={() => {
          if (isOccupied) {
            if (confirm(`Rimuovere ${assignment.participant?.full_name} dal posto ${seatNumber}?`)) {
              removeSeat.mutate(assignment.id);
            }
          } else if (selectedParticipant) {
            assignSeat.mutate({ seatNumber });
          }
        }}
        disabled={!isOccupied && !isSelected}
        className={cn(
          "w-12 h-12 rounded-lg text-xs font-medium transition-all flex items-center justify-center",
          isOccupied
            ? "bg-red-500 text-white hover:bg-red-600 cursor-pointer"
            : isSelected
            ? "bg-green-500 text-white hover:bg-green-600 cursor-pointer"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
        title={isOccupied ? assignment.participant?.full_name : `Posto ${seatNumber}`}
      >
        {seatNumber}
      </button>
    );
  };

  const renderBusMap = () => {
    if (!busConfig) return null;

    const rows = [];
    let seatNumber = 1;

    for (let row = 0; row < busConfig.rows; row++) {
      const leftSeats = [];
      const rightSeats = [];

      // Left side (2 seats)
      for (let col = 0; col < 2; col++) {
        leftSeats.push(renderSeat(seatNumber++));
      }

      // Right side (2 seats)
      for (let col = 0; col < 2; col++) {
        rightSeats.push(renderSeat(seatNumber++));
      }

      rows.push(
        <div key={row} className="flex items-center gap-2">
          <div className="flex gap-1">{leftSeats}</div>
          <div className="w-8" /> {/* Corridor */}
          <div className="flex gap-1">{rightSeats}</div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        {/* Driver area */}
        <div className="flex items-center justify-center mb-4">
          <div className="bg-primary/20 text-primary px-4 py-2 rounded-lg text-sm font-medium">
            🚌 Autista
          </div>
        </div>
        {rows}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="font-display text-4xl font-bold">Posti Bus</h1>
        <p className="text-muted-foreground mt-1">
          Assegna i posti sul bus ai partecipanti
        </p>
      </div>

      {/* Trip Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bus className="h-5 w-5" />
            Seleziona Viaggio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTrip} onValueChange={setSelectedTrip}>
            <SelectTrigger className="w-full md:w-[400px]">
              <SelectValue placeholder="Seleziona un viaggio..." />
            </SelectTrigger>
            <SelectContent>
              {trips.map((trip) => (
                <SelectItem key={trip.id} value={trip.id}>
                  {trip.title} - {trip.destination}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedTrip && !busConfig && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              Nessuna configurazione bus per questo viaggio.
            </p>
            <Button onClick={() => createBusConfig.mutate()}>
              Crea Configurazione Bus (52 posti)
            </Button>
          </CardContent>
        </Card>
      )}

      {busConfig && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Participant Selection */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Partecipanti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Seleziona un partecipante, poi clicca su un posto verde
                </p>
                <Select value={selectedParticipant} onValueChange={setSelectedParticipant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona partecipante..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedParticipants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedParticipant && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedParticipant("")}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Annulla selezione
                </Button>
              )}

              <div className="space-y-2 pt-4 border-t">
                <p className="text-sm font-medium">Legenda:</p>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-muted" />
                  <span>Libero</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-green-500" />
                  <span>Disponibile (clicca per assegnare)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-red-500" />
                  <span>Occupato (clicca per rimuovere)</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Posti assegnati: {seatAssignments.length} / {busConfig.total_seats}
                </p>
                <p className="text-sm text-muted-foreground">
                  Partecipanti senza posto: {unassignedParticipants.length}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bus Map */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Mappa Posti</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="bg-muted/30 p-6 rounded-xl border-2 border-dashed">
                {renderBusMap()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assigned List */}
      {busConfig && seatAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Elenco Assegnazioni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              {seatAssignments
                .sort((a, b) => a.seat_number - b.seat_number)
                .map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Posto {assignment.seat_number}</Badge>
                      <span className="text-sm font-medium truncate">
                        {assignment.participant?.full_name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSeat.mutate(assignment.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
