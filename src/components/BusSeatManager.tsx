import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bus, Users, X, Settings } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import BusSeatMap, { BusLayoutConfig } from "./bus/BusSeatMap";

interface BusType {
  id: string;
  name: string;
  rows: number;
  seats_per_row: number;
  total_seats: number;
  length_meters?: number;
  has_driver_seat?: boolean;
  has_guide_seat?: boolean;
  has_front_door?: boolean;
  has_rear_door?: boolean;
  has_wc?: boolean;
  last_row_seats?: number;
  layout_type?: string;
}

interface BusConfig {
  id: string;
  trip_id: string;
  rows: number;
  seats_per_row: number;
  total_seats: number;
  carrier_id: string | null;
  bus_type_id: string | null;
  length_meters?: number;
  has_driver_seat?: boolean;
  has_guide_seat?: boolean;
  has_front_door?: boolean;
  has_rear_door?: boolean;
  has_wc?: boolean;
  last_row_seats?: number;
  layout_type?: string;
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

interface BusSeatManagerProps {
  tripId: string;
  compact?: boolean;
}

export default function BusSeatManager({ tripId, compact = false }: BusSeatManagerProps) {
  const [selectedParticipant, setSelectedParticipant] = useState<string>("");
  const [configMode, setConfigMode] = useState<"preset" | "manual">("preset");
  const [selectedBusType, setSelectedBusType] = useState<string>("");
  const [manualRows, setManualRows] = useState(11);
  const [manualLastRowSeats, setManualLastRowSeats] = useState(5);
  const queryClient = useQueryClient();

  // Fetch bus types
  const { data: busTypes = [] } = useQuery({
    queryKey: ["bus-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bus_types")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as BusType[];
    },
  });

  // Fetch bus config for trip
  const { data: busConfig } = useQuery({
    queryKey: ["bus-config", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bus_configurations")
        .select("*")
        .eq("trip_id", tripId)
        .maybeSingle();
      if (error) throw error;
      return data as BusConfig | null;
    },
    enabled: !!tripId,
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

  // Fetch participants for trip
  const { data: participants = [] } = useQuery({
    queryKey: ["participants-for-bus", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("participants")
        .select("id, full_name")
        .eq("trip_id", tripId)
        .order("full_name");
      if (error) throw error;
      return data as Participant[];
    },
    enabled: !!tripId,
  });

  // Create bus config
  const createBusConfig = useMutation({
    mutationFn: async () => {
      let configData: Partial<BusConfig>;

      if (configMode === "preset" && selectedBusType) {
        const busType = busTypes.find((bt) => bt.id === selectedBusType);
        if (!busType) throw new Error("Tipo bus non trovato");
        
        configData = {
          trip_id: tripId,
          rows: busType.rows,
          seats_per_row: busType.seats_per_row,
          total_seats: busType.total_seats,
          bus_type_id: busType.id,
          length_meters: busType.length_meters,
          has_driver_seat: busType.has_driver_seat ?? true,
          has_guide_seat: busType.has_guide_seat ?? true,
          has_front_door: busType.has_front_door ?? true,
          has_rear_door: busType.has_rear_door ?? true,
          has_wc: busType.has_wc ?? false,
          last_row_seats: busType.last_row_seats ?? 5,
          layout_type: busType.layout_type ?? "gt_standard",
        };
      } else {
        // Configurazione manuale
        const totalSeats = (manualRows - 1) * 4 + manualLastRowSeats;
        configData = {
          trip_id: tripId,
          rows: manualRows,
          seats_per_row: 4,
          total_seats: totalSeats,
          bus_type_id: null,
          has_driver_seat: true,
          has_guide_seat: true,
          has_front_door: true,
          has_rear_door: true,
          has_wc: false,
          last_row_seats: manualLastRowSeats,
          layout_type: "custom",
        };
      }

      const { data, error } = await supabase
        .from("bus_configurations")
        .insert([configData as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bus-config", tripId] });
      toast.success("Configurazione bus creata");
    },
    onError: () => {
      toast.error("Errore nella creazione della configurazione");
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

  const assignedParticipantIds = seatAssignments.map((a) => a.participant_id);
  const unassignedParticipants = participants.filter(
    (p) => !assignedParticipantIds.includes(p.id)
  );

  const handleSeatClick = (seatNumber: number, assignment?: SeatAssignment) => {
    if (assignment) {
      if (confirm(`Rimuovere ${assignment.participant?.full_name} dal posto ${seatNumber}?`)) {
        removeSeat.mutate(assignment.id);
      }
    } else if (selectedParticipant) {
      assignSeat.mutate({ seatNumber });
    }
  };

  // Build layout config for the map
  const getLayoutConfig = (): BusLayoutConfig | null => {
    if (!busConfig) return null;
    
    return {
      rows: busConfig.rows,
      totalSeats: busConfig.total_seats,
      hasDriverSeat: busConfig.has_driver_seat ?? true,
      hasGuideSeat: busConfig.has_guide_seat ?? true,
      hasFrontDoor: busConfig.has_front_door ?? true,
      hasRearDoor: busConfig.has_rear_door ?? true,
      hasWc: busConfig.has_wc ?? false,
      lastRowSeats: busConfig.last_row_seats ?? 5,
      layoutType: busConfig.layout_type ?? "gt_standard",
    };
  };

  const selectedBusTypeData = busTypes.find((bt) => bt.id === selectedBusType);

  // Configuration UI when no bus config exists
  if (!busConfig) {
    return (
      <Card>
        <CardHeader className={compact ? "pb-2" : ""}>
          <CardTitle className={cn("flex items-center gap-2", compact ? "text-sm" : "")}>
            <Settings className={compact ? "h-4 w-4" : "h-5 w-5"} />
            Configura Piantina Bus
          </CardTitle>
          <p className={cn("text-muted-foreground mt-1", compact ? "text-xs" : "text-sm")}>
            Prima di assegnare i posti, configura la piantina del bus.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={configMode === "preset" ? "default" : "outline"}
              onClick={() => setConfigMode("preset")}
              size={compact ? "sm" : "default"}
            >
              Seleziona Tipo Bus
            </Button>
            <Button
              variant={configMode === "manual" ? "default" : "outline"}
              onClick={() => setConfigMode("manual")}
              size={compact ? "sm" : "default"}
            >
              Configurazione Manuale
            </Button>
          </div>

          {configMode === "preset" ? (
            <div className="space-y-3">
              {busTypes.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nessun tipo bus configurato. Vai alla sezione Vettori per aggiungerne uno,
                  oppure usa la configurazione manuale.
                </p>
              ) : (
                <div className="space-y-2">
                  <Label className={compact ? "text-xs" : ""}>Tipo Bus</Label>
                  <Select value={selectedBusType} onValueChange={setSelectedBusType}>
                    <SelectTrigger className={compact ? "w-full" : "w-full md:w-[350px]"}>
                      <SelectValue placeholder="Seleziona tipo bus..." />
                    </SelectTrigger>
                    <SelectContent>
                      {busTypes.map((bt) => (
                        <SelectItem key={bt.id} value={bt.id}>
                          <div className="flex items-center gap-2">
                            <Bus className="h-4 w-4" />
                            <span>{bt.name}</span>
                            <Badge variant="secondary" className="ml-1">
                              {bt.total_seats} posti
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedBusTypeData && (
                    <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                      <p>
                        <strong>{selectedBusTypeData.total_seats}</strong> posti passeggeri
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {selectedBusTypeData.rows - 1} file da 4 + ultima fila da {selectedBusTypeData.last_row_seats ?? 5}
                        {selectedBusTypeData.has_wc && " • WC a bordo"}
                        {selectedBusTypeData.length_meters && ` • ${selectedBusTypeData.length_meters}m`}
                      </p>
                    </div>
                  )}
                </div>
              )}
              <Button
                onClick={() => createBusConfig.mutate()}
                disabled={!selectedBusType || createBusConfig.isPending}
                size={compact ? "sm" : "default"}
              >
                {createBusConfig.isPending ? "Creazione..." : "Crea Configurazione"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                <div className="space-y-1">
                  <Label className={compact ? "text-xs" : ""}>Numero File</Label>
                  <Input
                    type="number"
                    value={manualRows}
                    onChange={(e) => setManualRows(parseInt(e.target.value) || 5)}
                    min={5}
                    max={20}
                    className={compact ? "h-8 text-xs" : ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    Include l'ultima fila
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className={compact ? "text-xs" : ""}>Ultima Fila</Label>
                  <Input
                    type="number"
                    value={manualLastRowSeats}
                    onChange={(e) => setManualLastRowSeats(parseInt(e.target.value) || 5)}
                    min={3}
                    max={6}
                    className={compact ? "h-8 text-xs" : ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    Banco 4-5 posti
                  </p>
                </div>
              </div>
              <div className="bg-primary/10 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Posti totali:</p>
                <p className={cn("font-bold text-primary", compact ? "text-lg" : "text-xl")}>
                  {(manualRows - 1) * 4 + manualLastRowSeats}
                </p>
                <p className="text-xs text-muted-foreground">
                  {manualRows - 1} file × 4 + ultima fila da {manualLastRowSeats}
                </p>
              </div>
              <div>
                <Button
                  onClick={() => createBusConfig.mutate()}
                  disabled={createBusConfig.isPending}
                  size={compact ? "sm" : "default"}
                >
                  {createBusConfig.isPending ? "Creazione..." : "Crea Configurazione Manuale"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const layoutConfig = getLayoutConfig();

  // Main seat assignment UI
  return (
    <div className={cn("space-y-4", compact ? "" : "space-y-6")}>
      <div className={cn("grid gap-4", compact ? "" : "lg:grid-cols-3 gap-6")}>
        {/* Participant Selection */}
        <Card className={compact ? "" : "lg:col-span-1"}>
          <CardHeader className={compact ? "pb-2" : ""}>
            <CardTitle className={cn("flex items-center gap-2", compact ? "text-sm" : "")}>
              <Users className={compact ? "h-4 w-4" : "h-5 w-5"} />
              Partecipanti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className={cn("text-muted-foreground mb-2", compact ? "text-xs" : "text-sm")}>
                Seleziona un partecipante, poi clicca su un posto verde
              </p>
              <Select value={selectedParticipant} onValueChange={setSelectedParticipant}>
                <SelectTrigger className={compact ? "h-8 text-xs" : ""}>
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

            <div className={cn("space-y-1.5 pt-3 border-t", compact ? "text-xs" : "text-sm")}>
              <p className="font-medium">Legenda:</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-muted" />
                <span>Libero</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>Disponibile (clicca per assegnare)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span>Occupato (clicca per rimuovere)</span>
              </div>
            </div>

            <div className="pt-3 border-t">
              <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
                Posti assegnati: {seatAssignments.length} / {busConfig.total_seats}
              </p>
              <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
                Partecipanti senza posto: {unassignedParticipants.length}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bus Map */}
        <Card className={compact ? "" : "lg:col-span-2"}>
          <CardHeader className={compact ? "pb-2" : ""}>
            <CardTitle className={cn("flex items-center gap-2", compact ? "text-sm" : "")}>
              <Bus className={compact ? "h-4 w-4" : "h-5 w-5"} />
              Mappa Posti
              <Badge variant="secondary" className="ml-2">
                {busConfig.total_seats} posti
              </Badge>
              {busConfig.has_wc && (
                <Badge variant="outline" className="ml-1">
                  🚻 WC
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className={cn(
              "bg-muted/30 rounded-xl border-2 border-dashed",
              compact ? "p-3" : "p-6"
            )}>
              {layoutConfig && (
                <BusSeatMap
                  config={layoutConfig}
                  seatAssignments={seatAssignments}
                  selectedParticipant={selectedParticipant}
                  compact={compact}
                  onSeatClick={handleSeatClick}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned List */}
      {seatAssignments.length > 0 && (
        <Card>
          <CardHeader className={compact ? "pb-2" : ""}>
            <CardTitle className={compact ? "text-sm" : ""}>Elenco Assegnazioni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("grid gap-2", compact ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-4")}>
              {seatAssignments
                .sort((a, b) => a.seat_number - b.seat_number)
                .map((assignment) => (
                  <div
                    key={assignment.id}
                    className={cn(
                      "flex items-center justify-between bg-muted/50 rounded-lg",
                      compact ? "p-1.5" : "p-2"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={compact ? "text-xs" : ""}>
                        Posto {assignment.seat_number}
                      </Badge>
                      <span className={cn("font-medium truncate", compact ? "text-xs" : "text-sm")}>
                        {assignment.participant?.full_name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSeat.mutate(assignment.id)}
                      className={compact ? "h-6 w-6 p-0" : ""}
                    >
                      <X className={compact ? "h-3 w-3" : "h-4 w-4"} />
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
