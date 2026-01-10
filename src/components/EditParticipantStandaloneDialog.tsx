import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActivityLog } from "@/hooks/use-activity-log";

const participantSchema = z.object({
  cognome: z.string().min(1, "Il cognome è obbligatorio"),
  nome: z.string().min(1, "Il nome è obbligatorio"),
  date_of_birth: z.string().optional(),
  place_of_birth: z.string().optional(),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

interface Participant {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  place_of_birth: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  trip?: {
    id: string;
    title: string;
  } | null;
}

interface EditParticipantStandaloneDialogProps {
  participant: Participant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditParticipantStandaloneDialog({
  participant,
  open,
  onOpenChange,
  onSuccess,
}: EditParticipantStandaloneDialogProps) {
  const { logUpdate, logDelete } = useActivityLog();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<z.infer<typeof participantSchema>>({
    resolver: zodResolver(participantSchema),
  });

  const convertDateToDisplay = (dateStr: string | null): string => {
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const convertDateToISO = (dateStr: string | undefined): string | null => {
    if (!dateStr || dateStr.trim() === "") return null;
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (day && month && year && !isNaN(parseInt(day)) && !isNaN(parseInt(month)) && !isNaN(parseInt(year))) {
        return `${year.padStart(4, '20')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    
    return null;
  };

  // Splitta full_name in cognome e nome (assume ultimo elemento = cognome)
  const splitFullName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      const cognome = parts[parts.length - 1];
      const nome = parts.slice(0, -1).join(' ');
      return { cognome, nome };
    }
    return { cognome: fullName, nome: "" };
  };

  useEffect(() => {
    if (participant) {
      const { cognome, nome } = splitFullName(participant.full_name);
      reset({
        cognome,
        nome,
        date_of_birth: convertDateToDisplay(participant.date_of_birth),
        place_of_birth: participant.place_of_birth || "",
        email: participant.email || "",
        phone: participant.phone || "",
        notes: participant.notes || "",
      });
    }
  }, [participant, reset]);

  const onSubmit = async (values: z.infer<typeof participantSchema>) => {
    if (!participant) return;
    
    setIsSubmitting(true);
    const fullName = `${values.nome} ${values.cognome}`.trim();
    try {
      const { error } = await supabase
        .from("participants")
        .update({
          full_name: fullName,
          date_of_birth: convertDateToISO(values.date_of_birth),
          place_of_birth: values.place_of_birth || null,
          email: values.email || null,
          phone: values.phone || null,
          notes: values.notes || null,
        })
        .eq("id", participant.id);

      if (error) throw error;

      await logUpdate("participant", participant.id, fullName, {
        changes: {
          full_name: fullName,
          email: values.email,
          phone: values.phone,
        },
      });

      toast.success("Partecipante aggiornato con successo");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore durante l'aggiornamento del partecipante");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rimuovi dal viaggio (se associato) o elimina definitivamente (se non associato)
  const handleRemoveOrDelete = async () => {
    if (!participant) return;
    
    const hasTrip = !!participant.trip;
    
    const confirmMessage = hasTrip 
      ? "Sei sicuro di voler rimuovere questo partecipante dal viaggio? Rimarrà nel database e potrà essere riassegnato."
      : "Questo partecipante non è associato a nessun viaggio. Vuoi eliminarlo definitivamente dal database?";
    
    if (!confirm(confirmMessage)) return;
    
    setIsSubmitting(true);
    try {
      if (hasTrip) {
        // Rimuovi dal viaggio (imposta trip_id = null)
        const { error } = await supabase
          .from("participants")
          .update({ trip_id: null, group_number: null })
          .eq("id", participant.id);

        if (error) throw error;

        await logUpdate("participant", participant.id, participant.full_name, {
          action: "removed_from_trip",
          trip_id: participant.trip?.id,
        });

        toast.success("Partecipante rimosso dal viaggio");
      } else {
        // Elimina definitivamente (solo se non associato a un viaggio)
        const { error } = await supabase
          .from("participants")
          .delete()
          .eq("id", participant.id);

        if (error) throw error;

        await logDelete("participant", participant.id, participant.full_name, {
          full_name: participant.full_name,
          email: participant.email,
          phone: participant.phone,
        });

        toast.success("Partecipante eliminato definitivamente");
      }
      
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Errore:", error);
      toast.error(hasTrip ? "Errore durante la rimozione" : "Errore durante l'eliminazione");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifica Anagrafica Partecipante</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cognome">
                Cognome <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register("cognome")}
                placeholder="Rossi"
              />
              {errors.cognome && (
                <p className="text-sm text-destructive">{errors.cognome.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register("nome")}
                placeholder="Mario"
              />
              {errors.nome && (
                <p className="text-sm text-destructive">{errors.nome.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Data di Nascita (gg/mm/aaaa)</Label>
              <Input
                {...register("date_of_birth")}
                placeholder="01/01/1990"
                type="text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="place_of_birth">Luogo di Nascita</Label>
              <Input
                {...register("place_of_birth")}
                placeholder="Roma"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                {...register("email")}
                type="email"
                placeholder="mario.rossi@email.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input
                {...register("phone")}
                placeholder="+39 333 1234567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              {...register("notes")}
              placeholder="Note aggiuntive"
              rows={3}
            />
          </div>

          <div className="flex justify-between gap-3 pt-4">
            <Button
              type="button"
              variant={participant?.trip ? "outline" : "destructive"}
              className={participant?.trip ? "text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" : ""}
              onClick={handleRemoveOrDelete}
              disabled={isSubmitting}
            >
              {participant?.trip ? "Rimuovi dal Viaggio" : "Elimina Definitivamente"}
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvataggio..." : "Salva Modifiche"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
