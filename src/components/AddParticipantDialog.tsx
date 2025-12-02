import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
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

      const { error } = await supabase.from("participants").insert(participantsToInsert);

      if (error) throw error;

      toast.success(`${values.participants.length} partecipante/i aggiunto/i con successo`);
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore durante l'aggiunta dei partecipanti");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aggiungi Partecipanti</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Inserisci fino a 4 partecipanti che condivideranno la stessa camera
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label>Tipologia Camera <span className="text-destructive">*</span></Label>
            <Select
              value={watch("room_type")}
              onValueChange={(value) => register("room_type").onChange({ target: { value } })}
            >
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
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Partecipanti</Label>
              {fields.length < 4 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ full_name: "", date_of_birth: "", place_of_birth: "", email: "", phone: "", notes: "" })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Partecipante
                </Button>
              )}
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => remove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                
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
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvataggio..." : `Aggiungi ${fields.length} Partecipante/i`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
