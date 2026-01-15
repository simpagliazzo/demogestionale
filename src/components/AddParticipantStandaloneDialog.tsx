import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useActivityLog } from "@/hooks/use-activity-log";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Baby, AlertTriangle } from "lucide-react";

const participantSchema = z.object({
  cognome: z.string().min(1, "Il cognome è obbligatorio"),
  nome: z.string().min(1, "Il nome è obbligatorio"),
  date_of_birth: z.string().optional(),
  place_of_birth: z.string().optional(),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
  is_infant: z.boolean().optional(),
});

type ParticipantFormData = z.infer<typeof participantSchema>;

interface BlacklistAlertData {
  name: string;
  reason: string | null;
}

interface AddParticipantStandaloneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddParticipantStandaloneDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddParticipantStandaloneDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [blacklistAlert, setBlacklistAlert] = useState<BlacklistAlertData | null>(null);
  const { toast } = useToast();
  const { logActivity } = useActivityLog();

  const form = useForm<ParticipantFormData>({
    resolver: zodResolver(participantSchema),
    defaultValues: {
      cognome: "",
      nome: "",
      date_of_birth: "",
      place_of_birth: "",
      email: "",
      phone: "",
      notes: "",
      is_infant: false,
    },
  });

  const convertDateToISO = (dateStr: string): string | null => {
    if (!dateStr) return null;
    // Se è già in formato ISO (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // Altrimenti converte da DD/MM/YYYY a YYYY-MM-DD
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return null;
  };

  const onSubmit = async (data: ParticipantFormData) => {
    setIsSubmitting(true);
    try {
      const fullName = `${data.cognome} ${data.nome}`.trim();
      const dateOfBirth = convertDateToISO(data.date_of_birth || "");

      // Verifica se il partecipante è in blacklist (case-insensitive)
      const { data: allBlacklist, error: blacklistError } = await supabase
        .from("blacklist")
        .select("full_name, reason");

      if (blacklistError) {
        console.error("Errore verifica blacklist:", blacklistError);
      } else if (allBlacklist && allBlacklist.length > 0) {
        const matchedBlacklist = allBlacklist.find(
          (b) => b.full_name.toLowerCase() === fullName.toLowerCase()
        );

        if (matchedBlacklist) {
          setBlacklistAlert({
            name: fullName,
            reason: matchedBlacklist.reason,
          });
          setIsSubmitting(false);
          return;
        }
      }

      const { error } = await supabase.from("participants").insert({
        full_name: fullName,
        date_of_birth: dateOfBirth,
        place_of_birth: data.place_of_birth || null,
        email: data.email || null,
        phone: data.phone || null,
        notes: data.notes || null,
        trip_id: null, // Nessun viaggio associato
        is_infant: data.is_infant || false,
      });

      if (error) throw error;

      await logActivity({
        actionType: "create",
        entityType: "participant",
        entityName: fullName,
        details: { standalone: true },
      });

      toast({
        title: "Partecipante aggiunto",
        description: `${fullName} è stato aggiunto con successo`,
      });

      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Errore:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile aggiungere il partecipante",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aggiungi Partecipante</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cognome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cognome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Rossi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Mario" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data di Nascita</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="place_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Luogo di Nascita</FormLabel>
                      <FormControl>
                        <Input placeholder="Roma" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@esempio.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <Input placeholder="333 1234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_infant"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-blue-50/50">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2">
                        <Baby className="h-4 w-4 text-blue-500" />
                        È un Infant
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        L'infant non paga e dorme nel letto con i genitori
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Note aggiuntive..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                  {isSubmitting ? "Salvataggio..." : "Aggiungi Partecipante"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Alert dialog per blacklist */}
      <AlertDialog open={!!blacklistAlert} onOpenChange={(open) => !open && setBlacklistAlert(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              ATTENZIONE - BLACKLIST
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <p className="text-base font-medium text-foreground">
                  Impossibile procedere con l'iscrizione!
                </p>
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="font-semibold text-destructive">{blacklistAlert?.name}</p>
                  {blacklistAlert?.reason ? (
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium">Motivazione:</span> {blacklistAlert.reason}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1 italic">
                      Nessuna motivazione specificata
                    </p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Questo nominativo è stato inserito nella blacklist e non può essere aggiunto.
                  Solo un amministratore può rimuoverlo dalla blacklist.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => setBlacklistAlert(null)}>
              Ho capito
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
