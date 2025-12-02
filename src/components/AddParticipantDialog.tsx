import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BusSeatMap from "./BusSeatMap";

const participantSchema = z.object({
  full_name: z.string().min(2, "Il nome completo deve contenere almeno 2 caratteri"),
  date_of_birth: z.string().optional(),
  place_of_birth: z.string().optional(),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

const formSchema = z.object({
  participants: z.array(participantSchema).min(1, "Aggiungi almeno un partecipante").max(4, "Massimo 4 partecipanti"),
  room_type: z.enum(["singola", "doppia", "matrimoniale", "tripla", "quadrupla"]),
});

interface AddParticipantDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddParticipantDialog({
  tripId,
  open,
  onOpenChange,
  onSuccess,
}: AddParticipantDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [numParticipants, setNumParticipants] = useState<number | null>(null);
  const [assignBusSeat, setAssignBusSeat] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<Record<number, number>>({});
  const [busConfig, setBusConfig] = useState<{ id: string; rows: number; seats_per_row: number } | null>(null);
  const [occupiedSeats, setOccupiedSeats] = useState<number[]>([]);
  const [loadingBusConfig, setLoadingBusConfig] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      participants: [{ full_name: "", date_of_birth: "", place_of_birth: "", email: "", phone: "", notes: "" }],
      room_type: "doppia",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "participants",
  });

  const loadBusConfiguration = async () => {
    if (!assignBusSeat) return;
    
    setLoadingBusConfig(true);
    try {
      // Carica configurazione bus per questo viaggio
      const { data: config, error: configError } = await supabase
        .from("bus_configurations")
        .select("*")
        .eq("trip_id", tripId)
        .maybeSingle();

      if (configError) throw configError;

      // Se non esiste una configurazione, creane una standard GT (13 file x 4 posti = 52 posti)
      if (!config) {
        const { data: newConfig, error: createError } = await supabase
          .from("bus_configurations")
          .insert({
            trip_id: tripId,
            rows: 13,
            seats_per_row: 4,
            total_seats: 52
          })
          .select()
          .single();

        if (createError) throw createError;
        setBusConfig(newConfig);
      } else {
        setBusConfig(config);

        // Carica posti già occupati
        const { data: assignments, error: assignError } = await supabase
          .from("bus_seat_assignments")
          .select("seat_number")
          .eq("bus_config_id", config.id);

        if (assignError) throw assignError;
        setOccupiedSeats(assignments?.map(a => a.seat_number) || []);
      }
    } catch (error) {
      console.error("Errore caricamento configurazione bus:", error);
      toast.error("Errore nel caricamento della mappa del bus");
    } finally {
      setLoadingBusConfig(false);
    }
  };

  // Carica configurazione bus quando viene attivata l'assegnazione posti
  useEffect(() => {
    if (assignBusSeat && open) {
      loadBusConfiguration();
    }
  }, [assignBusSeat, open]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Verifica che tutti i partecipanti abbiano un posto assegnato se l'opzione è attiva
      if (assignBusSeat) {
        const missingSeats = values.participants.filter((_, idx) => !selectedSeats[idx]);
        if (missingSeats.length > 0) {
          toast.error("Seleziona un posto bus per tutti i partecipanti");
          setIsSubmitting(false);
          return;
        }
      }

      // Inserisci tutti i partecipanti
      const participantsToInsert = values.participants.map(p => ({
        trip_id: tripId,
        full_name: p.full_name,
        date_of_birth: p.date_of_birth || null,
        place_of_birth: p.place_of_birth || null,
        email: p.email || null,
        phone: p.phone || null,
        notes: p.notes ? `${p.notes} | Camera: ${values.room_type}` : `Camera: ${values.room_type}`,
      }));

      const { data: insertedParticipants, error } = await supabase
        .from("participants")
        .insert(participantsToInsert)
        .select();

      if (error) throw error;

      // Se l'assegnazione posti è attiva, salva i posti selezionati
      if (assignBusSeat && insertedParticipants && busConfig) {
        const seatAssignments = insertedParticipants.map((participant, idx) => ({
          bus_config_id: busConfig.id,
          participant_id: participant.id,
          seat_number: selectedSeats[idx],
        }));

        const { error: seatError } = await supabase
          .from("bus_seat_assignments")
          .insert(seatAssignments);

        if (seatError) throw seatError;
      }

      toast.success(`${values.participants.length} partecipante/i aggiunto/i con successo`);
      reset();
      setNumParticipants(null);
      setAssignBusSeat(false);
      setSelectedSeats({});
      setBusConfig(null);
      setOccupiedSeats([]);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore durante l'aggiunta dei partecipanti");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNumParticipantsSelect = (num: number) => {
    setNumParticipants(num);
    const newParticipants = Array(num).fill(null).map(() => ({
      full_name: "", 
      date_of_birth: "", 
      place_of_birth: "", 
      email: "", 
      phone: "", 
      notes: ""
    }));
    reset({
      participants: newParticipants,
      room_type: "doppia",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        setNumParticipants(null);
        setAssignBusSeat(false);
        setSelectedSeats({});
        setBusConfig(null);
        setOccupiedSeats([]);
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aggiungi Partecipanti</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Seleziona il numero di partecipanti che condivideranno la stessa camera
          </p>
        </DialogHeader>

        {numParticipants === null ? (
          <div className="space-y-4 py-8">
            <Label className="text-center block text-lg">Quanti partecipanti vuoi aggiungere?</Label>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((num) => (
                <Button
                  key={num}
                  type="button"
                  variant="outline"
                  className="h-24 text-2xl font-bold"
                  onClick={() => handleNumParticipantsSelect(num)}
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label>Tipologia Camera <span className="text-destructive">*</span></Label>
              <Controller
                name="room_type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tipologia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="singola">Singola</SelectItem>
                      <SelectItem value="doppia">Doppia</SelectItem>
                      <SelectItem value="matrimoniale">Matrimoniale</SelectItem>
                      <SelectItem value="tripla">Tripla</SelectItem>
                      <SelectItem value="quadrupla">Quadrupla</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/30">
              <Checkbox 
                id="assignBusSeat" 
                checked={assignBusSeat}
                onCheckedChange={(checked) => {
                  setAssignBusSeat(checked as boolean);
                  if (!checked) setSelectedSeats({});
                }}
              />
              <Label 
                htmlFor="assignBusSeat" 
                className="cursor-pointer font-medium"
              >
                Assegna posto/i sul bus
              </Label>
            </div>

            {assignBusSeat && (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Posto per {fields[index]?.full_name || `Partecipante ${index + 1}`}
                      {selectedSeats[index] && (
                        <span className="ml-2 text-primary">
                          (Posto {selectedSeats[index]} selezionato)
                        </span>
                      )}
                    </Label>
                    <BusSeatMap
                      busConfig={busConfig}
                      occupiedSeats={occupiedSeats}
                      selectedSeat={selectedSeats[index] || null}
                      loading={loadingBusConfig}
                      onSeatSelect={(seatNumber) => {
                        setSelectedSeats(prev => ({ ...prev, [index]: seatNumber }));
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4">
              <Label className="text-base font-semibold">Partecipanti ({fields.length})</Label>

              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium">Partecipante {index + 1}</h4>

                <div className="space-y-2">
                  <Label htmlFor={`participants.${index}.full_name`}>
                    Nome e Cognome <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    {...register(`participants.${index}.full_name`)}
                    placeholder="Mario Rossi"
                  />
                  {errors.participants?.[index]?.full_name && (
                    <p className="text-sm text-destructive">{errors.participants[index]?.full_name?.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`participants.${index}.date_of_birth`}>Data di Nascita (gg/mm/aaaa)</Label>
                    <Input
                      {...register(`participants.${index}.date_of_birth`)}
                      placeholder="01/01/1990"
                      type="text"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`participants.${index}.place_of_birth`}>Luogo di Nascita</Label>
                    <Input
                      {...register(`participants.${index}.place_of_birth`)}
                      placeholder="Roma"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`participants.${index}.email`}>Email</Label>
                    <Input
                      {...register(`participants.${index}.email`)}
                      type="email"
                      placeholder="mario.rossi@email.com"
                    />
                    {errors.participants?.[index]?.email && (
                      <p className="text-sm text-destructive">{errors.participants[index]?.email?.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`participants.${index}.phone`}>Telefono</Label>
                    <Input
                      {...register(`participants.${index}.phone`)}
                      placeholder="+39 333 1234567"
                    />
                  </div>
                </div>

                  <div className="space-y-2">
                    <Label htmlFor={`participants.${index}.notes`}>Note (Viaggia con...)</Label>
                    <Textarea
                      {...register(`participants.${index}.notes`)}
                      placeholder="Es. Viaggia con amici, preferisce posti vicini sul bus"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNumParticipants(null)}
                disabled={isSubmitting}
              >
                Indietro
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvataggio..." : `Aggiungi ${fields.length} Partecipante/i`}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
