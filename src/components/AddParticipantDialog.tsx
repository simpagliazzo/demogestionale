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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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
  group_number: z.string().optional(),
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
  const [nextGroupNumber, setNextGroupNumber] = useState<number>(1);
  const [useExistingGroup, setUseExistingGroup] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      participants: [{ full_name: "", date_of_birth: "", place_of_birth: "", email: "", phone: "", notes: "" }],
      room_type: "doppia",
      group_number: "",
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "participants",
  });

  const watchGroupNumber = watch("group_number");

  // Carica il prossimo numero di gruppo disponibile
  useEffect(() => {
    if (open) {
      loadNextGroupNumber();
    }
  }, [open, tripId]);

  const loadNextGroupNumber = async () => {
    try {
      const { data, error } = await supabase
        .from("participants")
        .select("group_number")
        .eq("trip_id", tripId)
        .not("group_number", "is", null)
        .order("group_number", { ascending: false })
        .limit(1);

      if (error) throw error;
      
      const maxGroup = data?.[0]?.group_number || 0;
      setNextGroupNumber(maxGroup + 1);
    } catch (error) {
      console.error("Errore caricamento numero gruppo:", error);
      setNextGroupNumber(1);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Determina il numero di gruppo da usare
      let groupNum: number;
      if (useExistingGroup && values.group_number) {
        groupNum = parseInt(values.group_number);
      } else {
        groupNum = nextGroupNumber;
      }

      // Inserisci tutti i partecipanti con lo stesso group_number
      const participantsToInsert = values.participants.map(p => ({
        trip_id: tripId,
        full_name: p.full_name,
        date_of_birth: p.date_of_birth || null,
        place_of_birth: p.place_of_birth || null,
        email: p.email || null,
        phone: p.phone || null,
        notes: p.notes ? `${p.notes} | Camera: ${values.room_type}` : `Camera: ${values.room_type}`,
        group_number: groupNum,
      }));

      const { error } = await supabase.from("participants").insert(participantsToInsert);

      if (error) throw error;

      toast.success(`${values.participants.length} partecipante/i aggiunto/i con successo (Gruppo #${groupNum})`);
      reset();
      setNumParticipants(null);
      setUseExistingGroup(false);
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
      group_number: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        setNumParticipants(null);
        setUseExistingGroup(false);
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
            {/* Sezione Numero Gruppo */}
            <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Numero Gruppo Prenotazione</Label>
                  <p className="text-sm text-muted-foreground">
                    Identifica chi viaggia insieme (amici, famiglia)
                  </p>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  #{useExistingGroup && watchGroupNumber ? watchGroupNumber : nextGroupNumber}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant={!useExistingGroup ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setUseExistingGroup(false);
                    setValue("group_number", "");
                  }}
                >
                  Nuovo gruppo (#{nextGroupNumber})
                </Button>
                <Button
                  type="button"
                  variant={useExistingGroup ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseExistingGroup(true)}
                >
                  Aggiungi a gruppo esistente
                </Button>
              </div>

              {useExistingGroup && (
                <div className="space-y-2">
                  <Label htmlFor="group_number">Inserisci numero gruppo esistente</Label>
                  <Input
                    type="number"
                    min="1"
                    {...register("group_number")}
                    placeholder="Es: 1, 2, 3..."
                    className="max-w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Usa lo stesso numero di un gruppo già esistente per collegarli
                  </p>
                </div>
              )}
            </div>

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