import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useActivityLog } from "@/hooks/use-activity-log";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Check, Merge } from "lucide-react";

interface Participant {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  notes: string | null;
  created_at: string;
  trip: {
    id: string;
    title: string;
    destination: string;
    departure_date: string;
    return_date: string;
    status: string;
  } | null;
}

interface MergeParticipantsDialogProps {
  participants: Participant[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function MergeParticipantsDialog({
  participants,
  open,
  onOpenChange,
  onSuccess,
}: MergeParticipantsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPrimary, setSelectedPrimary] = useState<string>("");
  const { toast } = useToast();
  const { logActivity } = useActivityLog();

  if (participants.length < 2) return null;

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd/MM/yyyy");
    } catch {
      return date;
    }
  };

  const handleMerge = async () => {
    if (!selectedPrimary) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Seleziona il record principale da mantenere",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const primaryParticipant = participants.find(p => p.id === selectedPrimary);
      const secondaryParticipants = participants.filter(p => p.id !== selectedPrimary);

      if (!primaryParticipant) throw new Error("Partecipante principale non trovato");

      // Unisci i dati: prendi i valori non nulli dal primario, altrimenti dai secondari
      let mergedData = {
        email: primaryParticipant.email,
        phone: primaryParticipant.phone,
        date_of_birth: primaryParticipant.date_of_birth,
        place_of_birth: primaryParticipant.place_of_birth,
        notes: primaryParticipant.notes,
      };

      // Completa con dati mancanti dai record secondari
      for (const secondary of secondaryParticipants) {
        if (!mergedData.email && secondary.email) mergedData.email = secondary.email;
        if (!mergedData.phone && secondary.phone) mergedData.phone = secondary.phone;
        if (!mergedData.date_of_birth && secondary.date_of_birth) mergedData.date_of_birth = secondary.date_of_birth;
        if (!mergedData.place_of_birth && secondary.place_of_birth) mergedData.place_of_birth = secondary.place_of_birth;
        if (!mergedData.notes && secondary.notes) {
          mergedData.notes = secondary.notes;
        } else if (mergedData.notes && secondary.notes && mergedData.notes !== secondary.notes) {
          mergedData.notes = `${mergedData.notes}\n---\n${secondary.notes}`;
        }
      }

      // Aggiorna il record principale con i dati uniti
      const { error: updateError } = await supabase
        .from("participants")
        .update(mergedData)
        .eq("id", selectedPrimary);

      if (updateError) throw updateError;

      // Trasferisci i pagamenti dai record secondari al principale
      for (const secondary of secondaryParticipants) {
        await supabase
          .from("payments")
          .update({ participant_id: selectedPrimary })
          .eq("participant_id", secondary.id);

        // Trasferisci assegnazioni posti bus
        await supabase
          .from("bus_seat_assignments")
          .update({ participant_id: selectedPrimary })
          .eq("participant_id", secondary.id);

        // Trasferisci assegnazioni stanze
        await supabase
          .from("room_assignments")
          .update({ participant_id: selectedPrimary })
          .eq("participant_id", secondary.id);
      }

      // Elimina i record secondari
      const secondaryIds = secondaryParticipants.map(p => p.id);
      const { error: deleteError } = await supabase
        .from("participants")
        .delete()
        .in("id", secondaryIds);

      if (deleteError) throw deleteError;

      await logActivity({
        actionType: "update",
        entityType: "participant",
        entityId: selectedPrimary,
        entityName: primaryParticipant.full_name,
        details: {
          action: "merge",
          mergedIds: secondaryIds,
          mergedCount: secondaryIds.length,
        },
      });

      toast({
        title: "Partecipanti uniti",
        description: `${secondaryIds.length + 1} record sono stati uniti in uno`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Errore durante l'unione:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile unire i partecipanti",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Unisci Partecipanti Duplicati
          </DialogTitle>
          <DialogDescription>
            Sono stati trovati {participants.length} record con lo stesso nome. 
            Verifica se si tratta della stessa persona o di omonimi prima di procedere.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <strong>Attenzione:</strong> Verifica attentamente i dati prima di unire. 
              Potrebbero essere persone diverse con lo stesso nome (omonimi).
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-medium">Seleziona il record principale da mantenere:</p>
          
          <RadioGroup value={selectedPrimary} onValueChange={setSelectedPrimary}>
            <div className="grid gap-4">
              {participants.map((p, index) => (
                <div
                  key={p.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedPrimary === p.id 
                      ? "border-primary bg-primary/5" 
                      : "hover:border-muted-foreground/50"
                  }`}
                  onClick={() => setSelectedPrimary(p.id)}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={p.id} id={p.id} className="mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={p.id} className="font-semibold text-base cursor-pointer">
                          {p.full_name}
                        </Label>
                        <Badge variant="outline">Record #{index + 1}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Data nascita:</span>
                          <span className={p.date_of_birth ? "font-medium" : "text-muted-foreground"}>
                            {formatDate(p.date_of_birth)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Luogo nascita:</span>
                          <span className={p.place_of_birth ? "font-medium" : "text-muted-foreground"}>
                            {p.place_of_birth || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email:</span>
                          <span className={p.email ? "font-medium" : "text-muted-foreground"}>
                            {p.email || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Telefono:</span>
                          <span className={p.phone ? "font-medium" : "text-muted-foreground"}>
                            {p.phone || "-"}
                          </span>
                        </div>
                      </div>

                      {p.trip ? (
                        <div className="pt-2 border-t mt-2">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Viaggio: </span>
                            <span className="font-medium">{p.trip.title}</span>
                            <span className="text-muted-foreground"> - {p.trip.destination}</span>
                            <span className="text-muted-foreground ml-2">
                              ({formatDate(p.trip.departure_date)})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2 border-t mt-2">
                          <Badge variant="secondary">Nessun viaggio associato</Badge>
                        </div>
                      )}

                      {p.notes && (
                        <div className="pt-2">
                          <span className="text-sm text-muted-foreground">Note: </span>
                          <span className="text-sm">{p.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 mt-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Check className="h-4 w-4" />
            Cosa succederà:
          </h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Il record selezionato verrà mantenuto come principale</li>
            <li>• I dati mancanti verranno completati dagli altri record</li>
            <li>• Tutti i pagamenti verranno trasferiti al record principale</li>
            <li>• Le assegnazioni posti e stanze verranno trasferite</li>
            <li>• Gli altri record verranno eliminati</li>
          </ul>
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
          <Button
            onClick={handleMerge}
            disabled={isSubmitting || !selectedPrimary}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isSubmitting ? "Unione in corso..." : "Unisci Partecipanti"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
