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

      // Collect all unique trip IDs from secondary participants
      const secondaryTripsToKeep = secondaryParticipants
        .filter(p => p.trip)
        .map(p => ({
          participantId: p.id,
          tripId: p.trip!.id,
          tripTitle: p.trip!.title
        }));

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

      // For each secondary participant that has a trip:
      // 1. Transfer payments, bus seats, and room assignments to the primary
      // 2. Update the secondary participant's data to match primary (keep it as a separate record for that trip!)
      // NOTE: We DON'T delete records with trips - they represent real bookings!
      
      const secondaryIdsWithoutTrips: string[] = [];
      
      for (const secondary of secondaryParticipants) {
        // Transfer payments to primary (only if they don't have a trip - otherwise payments are per-booking)
        // Actually, keep payments tied to their original booking/trip
        
        if (secondary.trip) {
          // This secondary has a trip - update their data to match primary but KEEP the record
          // This ensures the participant stays in that trip
          const { error: updateSecondaryError } = await supabase
            .from("participants")
            .update({
              email: mergedData.email,
              phone: mergedData.phone,
              date_of_birth: mergedData.date_of_birth,
              place_of_birth: mergedData.place_of_birth,
              // Don't update notes - they might be trip-specific
            })
            .eq("id", secondary.id);

          if (updateSecondaryError) {
            console.error("Error updating secondary participant:", updateSecondaryError);
          }
        } else {
          // This secondary has no trip - we can safely merge it
          // Transfer any associated data to primary
          await supabase
            .from("payments")
            .update({ participant_id: selectedPrimary })
            .eq("participant_id", secondary.id);

          await supabase
            .from("bus_seat_assignments")
            .update({ participant_id: selectedPrimary })
            .eq("participant_id", secondary.id);

          await supabase
            .from("room_assignments")
            .update({ participant_id: selectedPrimary })
            .eq("participant_id", secondary.id);

          secondaryIdsWithoutTrips.push(secondary.id);
        }
      }

      // Only delete secondary records that don't have trips
      if (secondaryIdsWithoutTrips.length > 0) {
        const { error: deleteError } = await supabase
          .from("participants")
          .delete()
          .in("id", secondaryIdsWithoutTrips);

        if (deleteError) {
          console.error("Error deleting orphan records:", deleteError);
        }
      }

      await logActivity({
        actionType: "update",
        entityType: "participant",
        entityId: selectedPrimary,
        entityName: primaryParticipant.full_name,
        details: {
          action: "merge",
          mergedCount: secondaryParticipants.length,
          deletedOrphanRecords: secondaryIdsWithoutTrips.length,
          preservedTripRecords: secondaryParticipants.length - secondaryIdsWithoutTrips.length,
        },
      });

      const tripsPreserved = secondaryParticipants.length - secondaryIdsWithoutTrips.length;
      toast({
        title: "Dati unificati",
        description: tripsPreserved > 0 
          ? `Dati anagrafici unificati. ${tripsPreserved} viaggi mantenuti, ${secondaryIdsWithoutTrips.length} record orfani rimossi.`
          : `${secondaryIdsWithoutTrips.length + 1} record sono stati uniti in uno`,
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
            Unifica Dati Partecipante
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
          <p className="text-sm font-medium">Seleziona il record con i dati anagrafici più completi:</p>
          
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
                          <div className="text-sm flex items-center gap-2">
                            <Badge className="bg-green-500 text-white text-xs">Viaggio</Badge>
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

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
          <h4 className="font-medium mb-2 flex items-center gap-2 text-green-800">
            <Check className="h-4 w-4" />
            Cosa succederà:
          </h4>
          <ul className="text-sm space-y-1 text-green-700">
            <li>• I dati anagrafici verranno unificati su tutti i record</li>
            <li>• <strong>Tutti i viaggi associati verranno mantenuti</strong></li>
            <li>• I pagamenti e le assegnazioni posti/stanze restano invariati per ogni viaggio</li>
            <li>• Solo i record senza viaggi verranno eliminati (orfani)</li>
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
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? "Unificazione in corso..." : "Unifica Dati"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
