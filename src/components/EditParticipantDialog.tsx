import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const participantSchema = z.object({
  full_name: z.string().min(2, "Il nome completo deve contenere almeno 2 caratteri"),
  date_of_birth: z.string().optional(),
  place_of_birth: z.string().optional(),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
  group_number: z.string().optional(),
});

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_type: string;
  notes: string | null;
}

interface EditParticipantDialogProps {
  participant: {
    id: string;
    full_name: string;
    date_of_birth: string | null;
    place_of_birth: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    group_number?: number | null;
  } | null;
  tripPrice: number;
  depositType: "fixed" | "percentage";
  depositAmount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditParticipantDialog({
  participant,
  tripPrice,
  depositType,
  depositAmount,
  open,
  onOpenChange,
  onSuccess,
}: EditParticipantDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newPaymentType, setNewPaymentType] = useState("acconto");
  const [newPaymentNotes, setNewPaymentNotes] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<z.infer<typeof participantSchema>>({
    resolver: zodResolver(participantSchema),
  });

  useEffect(() => {
    if (participant) {
      reset({
        full_name: participant.full_name,
        date_of_birth: participant.date_of_birth || "",
        place_of_birth: participant.place_of_birth || "",
        email: participant.email || "",
        phone: participant.phone || "",
        notes: participant.notes || "",
        group_number: participant.group_number?.toString() || "",
      });
      loadPayments();
    }
  }, [participant, reset]);

  const loadPayments = async () => {
    if (!participant) return;
    
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("participant_id", participant.id)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Errore caricamento pagamenti:", error);
    }
  };

  const calculateDepositAmount = () => {
    if (depositType === "fixed") {
      return depositAmount;
    } else {
      return (tripPrice * depositAmount) / 100;
    }
  };

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const depositDue = calculateDepositAmount();
  const balance = tripPrice - totalPaid;

  const handleAddPayment = async () => {
    if (!participant) return;
    
    if (!newPaymentAmount || newPaymentAmount.trim() === "") {
      toast.error("Inserisci un importo");
      return;
    }

    const amount = parseFloat(newPaymentAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      toast.error("Inserisci un importo valido maggiore di zero");
      return;
    }

    if (!newPaymentType || newPaymentType.trim() === "") {
      toast.error("Inserisci un tipo di pagamento");
      return;
    }

    try {
      const { error } = await supabase
        .from("payments")
        .insert({
          participant_id: participant.id,
          amount,
          payment_type: newPaymentType.trim(),
          notes: newPaymentNotes?.trim() || null,
        });

      if (error) throw error;

      toast.success("Pagamento aggiunto con successo");
      setNewPaymentAmount("");
      setNewPaymentType("acconto");
      setNewPaymentNotes("");
      loadPayments();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore durante l'aggiunta del pagamento");
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo pagamento?")) return;

    try {
      const { error } = await supabase
        .from("payments")
        .delete()
        .eq("id", paymentId);

      if (error) throw error;

      toast.success("Pagamento eliminato");
      loadPayments();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore durante l'eliminazione del pagamento");
    }
  };

  const onSubmit = async (values: z.infer<typeof participantSchema>) => {
    if (!participant) return;
    
    setIsSubmitting(true);
    try {
      const groupNum = values.group_number ? parseInt(values.group_number) : null;
      
      const { error } = await supabase
        .from("participants")
        .update({
          full_name: values.full_name,
          date_of_birth: values.date_of_birth || null,
          place_of_birth: values.place_of_birth || null,
          email: values.email || null,
          phone: values.phone || null,
          notes: values.notes || null,
          group_number: groupNum,
        })
        .eq("id", participant.id);

      if (error) throw error;

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

  const handleDelete = async () => {
    if (!participant) return;
    
    if (!confirm("Sei sicuro di voler eliminare questo partecipante?")) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("participants")
        .delete()
        .eq("id", participant.id);

      if (error) throw error;

      toast.success("Partecipante eliminato con successo");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore durante l'eliminazione del partecipante");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Modifica Partecipante
            {participant?.group_number && (
              <Badge variant="secondary">Gruppo #{participant.group_number}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Sezione Dati Partecipante */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Numero Gruppo */}
            <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
              <Label htmlFor="group_number" className="font-semibold">
                Numero Gruppo Prenotazione
              </Label>
              <Input
                type="number"
                min="1"
                {...register("group_number")}
                placeholder="Es: 1, 2, 3..."
                className="max-w-32"
              />
              <p className="text-xs text-muted-foreground">
                Assegna lo stesso numero a chi viaggia insieme
              </p>
            </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">
              Nome e Cognome <span className="text-destructive">*</span>
            </Label>
            <Input
              {...register("full_name")}
              placeholder="Mario Rossi"
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
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
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                Elimina
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

          {/* Sezione Pagamenti */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Situazione Pagamenti</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Prezzo Viaggio</span>
                  <span className="text-lg font-bold">€{tripPrice.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">
                    Acconto Dovuto {depositType === "percentage" ? `(${depositAmount}%)` : ""}
                  </span>
                  <span className="text-lg font-semibold text-amber-600">€{depositDue.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Totale Pagato</span>
                  <span className="text-lg font-semibold text-green-600">€{totalPaid.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border-2 border-primary">
                  <span className="text-sm font-bold">Saldo Residuo</span>
                  <span className="text-xl font-bold text-primary">€{balance.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-md font-semibold mb-3">Cronologia Pagamenti</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nessun pagamento registrato
                  </p>
                ) : (
                  payments.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-start p-3 bg-card border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {payment.payment_type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(payment.payment_date).toLocaleDateString("it-IT")}
                          </span>
                        </div>
                        {payment.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">€{payment.amount.toFixed(2)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePayment(payment.id)}
                          className="h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 className="text-md font-semibold mb-3">Aggiungi Pagamento</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Importo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newPaymentAmount}
                    onChange={(e) => setNewPaymentAmount(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Tipo Pagamento</Label>
                  <Input
                    type="text"
                    placeholder="es: acconto, saldo, bonifico..."
                    value={newPaymentType}
                    onChange={(e) => setNewPaymentType(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Note</Label>
                  <Textarea
                    placeholder="Note opzionali"
                    rows={2}
                    value={newPaymentNotes}
                    onChange={(e) => setNewPaymentNotes(e.target.value)}
                  />
                </div>
                
                <Button
                  type="button"
                  onClick={handleAddPayment}
                  className="w-full"
                  disabled={!newPaymentAmount}
                >
                  Aggiungi Pagamento
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}