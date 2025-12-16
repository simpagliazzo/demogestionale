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
import { useAuth } from "@/lib/auth-context";
import { useActivityLog } from "@/hooks/use-activity-log";

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
  payment_method: string | null;
  notes: string | null;
}

const PAYMENT_METHODS = [
  { value: "contanti", label: "Contanti" },
  { value: "carta", label: "Carta di Credito" },
  { value: "bonifico", label: "Bonifico" },
  { value: "assegno", label: "Assegno" },
];

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
    discount_type?: string | null;
    discount_amount?: number | null;
  } | null;
  tripPrice: number;
  depositType: "fixed" | "percentage";
  depositAmount: number;
  singleRoomSupplement?: number;
  isSingleRoom?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditParticipantDialog({
  participant,
  tripPrice,
  depositType,
  depositAmount,
  singleRoomSupplement = 0,
  isSingleRoom = false,
  open,
  onOpenChange,
  onSuccess,
}: EditParticipantDialogProps) {
  const { user } = useAuth();
  const { logCreate, logUpdate, logDelete } = useActivityLog();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newPaymentType, setNewPaymentType] = useState("acconto");
  const [newPaymentMethod, setNewPaymentMethod] = useState("contanti");
  const [newPaymentNotes, setNewPaymentNotes] = useState("");
  const [discountType, setDiscountType] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<z.infer<typeof participantSchema>>({
    resolver: zodResolver(participantSchema),
  });

  // Converte data da YYYY-MM-DD a DD/MM/YYYY per la visualizzazione
  const convertDateToDisplay = (dateStr: string | null): string => {
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  // Converte data da DD/MM/YYYY a YYYY-MM-DD per Supabase
  const convertDateToISO = (dateStr: string | undefined): string | null => {
    if (!dateStr || dateStr.trim() === "") return null;
    
    // Se è già in formato YYYY-MM-DD, ritornalo così
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Converti da DD/MM/YYYY a YYYY-MM-DD
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (day && month && year && !isNaN(parseInt(day)) && !isNaN(parseInt(month)) && !isNaN(parseInt(year))) {
        return `${year.padStart(4, '20')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    
    return null;
  };

  useEffect(() => {
    if (participant) {
      reset({
        full_name: participant.full_name,
        date_of_birth: convertDateToDisplay(participant.date_of_birth),
        place_of_birth: participant.place_of_birth || "",
        email: participant.email || "",
        phone: participant.phone || "",
        notes: participant.notes || "",
        group_number: participant.group_number?.toString() || "",
      });
      setDiscountType(participant.discount_type || null);
      setDiscountAmount(participant.discount_amount || 0);
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

  const calculateDiscount = () => {
    if (!discountType || discountAmount <= 0) return 0;
    if (discountType === "fixed") return discountAmount;
    return (tripPrice * discountAmount) / 100;
  };

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const depositDue = calculateDepositAmount();
  const supplementAmount = isSingleRoom ? singleRoomSupplement : 0;
  const discountValue = calculateDiscount();
  const totalPrice = tripPrice + supplementAmount - discountValue;
  const balance = totalPrice - totalPaid;

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
      const { data: paymentData, error } = await supabase
        .from("payments")
        .insert({
          participant_id: participant.id,
          amount,
          payment_type: newPaymentType.trim(),
          payment_method: newPaymentMethod,
          notes: newPaymentNotes?.trim() || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Log payment creation
      await logCreate("payment", paymentData.id, `€${amount} - ${newPaymentType} (${newPaymentMethod})`, {
        participant_id: participant.id,
        participant_name: participant.full_name,
        amount,
        payment_type: newPaymentType,
        payment_method: newPaymentMethod,
      });

      toast.success("Pagamento aggiunto con successo");
      setNewPaymentAmount("");
      setNewPaymentType("acconto");
      setNewPaymentMethod("contanti");
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
      // Get payment details before deleting for logging
      const paymentToDelete = payments.find(p => p.id === paymentId);
      
      const { error } = await supabase
        .from("payments")
        .delete()
        .eq("id", paymentId);

      if (error) throw error;

      // Log payment deletion
      if (paymentToDelete) {
        await logDelete("payment", paymentId, `€${paymentToDelete.amount} - ${paymentToDelete.payment_type}`, {
          participant_name: participant?.full_name,
          amount: paymentToDelete.amount,
          payment_type: paymentToDelete.payment_type,
        });
      }

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
          date_of_birth: convertDateToISO(values.date_of_birth),
          place_of_birth: values.place_of_birth || null,
          email: values.email || null,
          phone: values.phone || null,
          notes: values.notes || null,
          group_number: groupNum,
          discount_type: discountType,
          discount_amount: discountAmount || 0,
        })
        .eq("id", participant.id);

      if (error) throw error;

      // Log participant update
      await logUpdate("participant", participant.id, values.full_name, {
        changes: {
          full_name: values.full_name,
          discount_type: discountType,
          discount_amount: discountAmount,
          group_number: groupNum,
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

      // Log participant deletion with full data for restore
      await logDelete("participant", participant.id, participant.full_name, {
        full_name: participant.full_name,
        email: participant.email,
        phone: participant.phone,
        date_of_birth: participant.date_of_birth,
        place_of_birth: participant.place_of_birth,
        notes: participant.notes,
        group_number: participant.group_number,
        discount_type: participant.discount_type,
        discount_amount: participant.discount_amount,
      });

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
                
                {isSingleRoom && singleRoomSupplement > 0 && (
                  <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      Supplemento Singola
                    </span>
                    <span className="text-lg font-semibold text-amber-600">+€{singleRoomSupplement.toFixed(2)}</span>
                  </div>
                )}

                {discountValue > 0 && (
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      Sconto {discountType === "percentage" ? `(${discountAmount}%)` : ""}
                    </span>
                    <span className="text-lg font-semibold text-green-600">-€{discountValue.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg border-t-2 border-primary/30">
                  <span className="text-sm font-bold">Totale Dovuto</span>
                  <span className="text-lg font-bold">€{totalPrice.toFixed(2)}</span>
                </div>

                {/* Campo Sconto */}
                <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
                  <Label className="text-xs font-semibold">Applica Sconto</Label>
                  <div className="flex gap-2">
                    <select
                      value={discountType || ""}
                      onChange={(e) => setDiscountType(e.target.value || null)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Nessuno</option>
                      <option value="fixed">Importo (€)</option>
                      <option value="percentage">Percentuale (%)</option>
                    </select>
                    {discountType && (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                        placeholder={discountType === "percentage" ? "Es: 10" : "Es: 50"}
                        className="w-24"
                      />
                    )}
                  </div>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {payment.payment_type}
                          </Badge>
                          {payment.payment_method && (
                            <Badge variant="secondary" className="text-xs">
                              {PAYMENT_METHODS.find(m => m.value === payment.payment_method)?.label || payment.payment_method}
                            </Badge>
                          )}
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
                  <select
                    value={newPaymentType}
                    onChange={(e) => setNewPaymentType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="acconto">Acconto</option>
                    <option value="saldo">Saldo</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label>Modalità Pagamento</Label>
                  <select
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
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