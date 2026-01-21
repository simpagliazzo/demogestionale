import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useActivityLog } from "@/hooks/use-activity-log";
import { Users, DollarSign, CreditCard, Divide, User } from "lucide-react";

interface Participant {
  id: string;
  full_name: string;
}

interface Payment {
  id: string;
  participant_id: string;
  amount: number;
  payment_date: string;
  payment_type: string;
  payment_method: string | null;
  notes: string | null;
  paid_by_participant_id: string | null;
}

interface GroupPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupParticipants: Participant[];
  groupNumber: number;
  tripId: string;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { value: "contanti", label: "Contanti" },
  { value: "carta", label: "Carta di Credito" },
  { value: "bonifico", label: "Bonifico" },
  { value: "assegno", label: "Assegno" },
];

export default function GroupPaymentDialog({
  open,
  onOpenChange,
  groupParticipants,
  groupNumber,
  tripId,
  onSuccess,
}: GroupPaymentDialogProps) {
  const { user } = useAuth();
  const { logCreate } = useActivityLog();
  const [loading, setLoading] = useState(false);
  const [groupPayments, setGroupPayments] = useState<Payment[]>([]);
  
  // Form state
  const [totalAmount, setTotalAmount] = useState("");
  const [paymentType, setPaymentType] = useState("acconto");
  const [paymentMethod, setPaymentMethod] = useState("bonifico");
  const [paidByParticipantId, setPaidByParticipantId] = useState("");
  const [notes, setNotes] = useState("");
  const [divideEqually, setDivideEqually] = useState(true);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && groupParticipants.length > 0) {
      loadGroupPayments();
      // Default to first participant as payer
      if (!paidByParticipantId && groupParticipants.length > 0) {
        setPaidByParticipantId(groupParticipants[0].id);
      }
    }
  }, [open, groupParticipants]);

  const loadGroupPayments = async () => {
    try {
      const participantIds = groupParticipants.map(p => p.id);
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .in("participant_id", participantIds)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      setGroupPayments(data || []);
    } catch (error) {
      console.error("Errore caricamento pagamenti gruppo:", error);
    }
  };

  const getParticipantName = (id: string | null) => {
    if (!id) return null;
    return groupParticipants.find(p => p.id === id)?.full_name || null;
  };

  const getPaymentsByPayer = () => {
    const payerMap: Record<string, { payer: string; payments: Payment[]; total: number }> = {};
    
    groupPayments.forEach(payment => {
      const payerId = payment.paid_by_participant_id || payment.participant_id;
      const payerName = getParticipantName(payerId) || "Sconosciuto";
      
      if (!payerMap[payerId]) {
        payerMap[payerId] = { payer: payerName, payments: [], total: 0 };
      }
      payerMap[payerId].payments.push(payment);
      payerMap[payerId].total += payment.amount;
    });
    
    return Object.values(payerMap);
  };

  const handleAddGroupPayment = async () => {
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      toast.error("Inserisci un importo valido");
      return;
    }

    if (!paidByParticipantId) {
      toast.error("Seleziona chi ha effettuato il pagamento");
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(totalAmount.replace(",", "."));
      
      if (divideEqually) {
        // Dividi equamente tra tutti i partecipanti
        const amountPerPerson = amount / groupParticipants.length;
        
        for (const participant of groupParticipants) {
          const { data: paymentData, error } = await supabase
            .from("payments")
            .insert({
              participant_id: participant.id,
              amount: amountPerPerson,
              payment_type: paymentType,
              payment_method: paymentMethod,
              notes: notes || null,
              paid_by_participant_id: paidByParticipantId,
              created_by: user?.id || null,
            })
            .select()
            .single();

          if (error) throw error;

          await logCreate("payment", paymentData.id, `€${amountPerPerson.toFixed(2)} - ${paymentType} (gruppo #${groupNumber})`, {
            participant_id: participant.id,
            participant_name: participant.full_name,
            paid_by: getParticipantName(paidByParticipantId),
            amount: amountPerPerson,
            payment_type: paymentType,
            payment_method: paymentMethod,
            group_number: groupNumber,
          });
        }
        
        toast.success(`Pagamento di €${amount.toFixed(2)} diviso tra ${groupParticipants.length} partecipanti`);
      } else {
        // Usa importi personalizzati
        for (const participant of groupParticipants) {
          const customAmount = parseFloat(customAmounts[participant.id]?.replace(",", ".") || "0");
          if (customAmount <= 0) continue;

          const { data: paymentData, error } = await supabase
            .from("payments")
            .insert({
              participant_id: participant.id,
              amount: customAmount,
              payment_type: paymentType,
              payment_method: paymentMethod,
              notes: notes || null,
              paid_by_participant_id: paidByParticipantId,
              created_by: user?.id || null,
            })
            .select()
            .single();

          if (error) throw error;

          await logCreate("payment", paymentData.id, `€${customAmount.toFixed(2)} - ${paymentType} (gruppo #${groupNumber})`, {
            participant_id: participant.id,
            participant_name: participant.full_name,
            paid_by: getParticipantName(paidByParticipantId),
            amount: customAmount,
            payment_type: paymentType,
            payment_method: paymentMethod,
            group_number: groupNumber,
          });
        }
        
        toast.success("Pagamenti personalizzati aggiunti");
      }

      // Reset form
      setTotalAmount("");
      setNotes("");
      setCustomAmounts({});
      loadGroupPayments();
      onSuccess();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore durante l'aggiunta del pagamento");
    } finally {
      setLoading(false);
    }
  };

  const totalGroupPayments = groupPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Pagamenti Gruppo #{groupNumber}
            <Badge variant="secondary" className="ml-2">
              {groupParticipants.length} partecipanti
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Riepilogo pagamenti del gruppo */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Riepilogo Pagamenti per Pagatore
            </h3>
            
            {groupPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nessun pagamento registrato per questo gruppo</p>
            ) : (
              <div className="space-y-2">
                {getPaymentsByPayer().map((payerData, idx) => (
                  <div key={idx} className="border rounded-lg p-3 bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">{payerData.payer}</span>
                        <Badge variant="outline" className="text-xs">
                          ha pagato
                        </Badge>
                      </div>
                      <span className="font-bold text-green-600">€{payerData.total.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {payerData.payments.map((payment, pIdx) => {
                        const recipientName = getParticipantName(payment.participant_id);
                        return (
                          <div key={pIdx} className="flex justify-between">
                            <span>
                              → {recipientName} ({payment.payment_type})
                              {payment.payment_method === "bonifico" && " 🏦"}
                              {payment.payment_method === "carta" && " 💳"}
                              {payment.payment_method === "contanti" && " 💵"}
                              {payment.payment_method === "assegno" && " 📝"}
                            </span>
                            <span>€{payment.amount.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Totale gruppo</span>
                  <span className="text-lg font-bold text-green-600">€{totalGroupPayments.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Form nuovo pagamento di gruppo */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Aggiungi Pagamento di Gruppo
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Importo Totale</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Chi ha pagato?</Label>
                <Select value={paidByParticipantId} onValueChange={setPaidByParticipantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona pagatore" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupParticipants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo Pagamento</Label>
                <Select value={paymentType} onValueChange={setPaymentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acconto">Acconto</SelectItem>
                    <SelectItem value="saldo">Saldo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Modalità Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Opzione divisione */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant={divideEqually ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDivideEqually(true)}
                  className="gap-2"
                >
                  <Divide className="h-4 w-4" />
                  Dividi equamente
                </Button>
                <Button
                  type="button"
                  variant={!divideEqually ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDivideEqually(false)}
                >
                  Importi personalizzati
                </Button>
              </div>

              {divideEqually && totalAmount && (
                <p className="text-sm text-muted-foreground">
                  Ogni partecipante riceverà: <strong>€{(parseFloat(totalAmount.replace(",", ".")) / groupParticipants.length).toFixed(2)}</strong>
                </p>
              )}

              {!divideEqually && (
                <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                  {groupParticipants.map((p) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="text-sm flex-1">{p.full_name}</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={customAmounts[p.id] || ""}
                        onChange={(e) => setCustomAmounts({ ...customAmounts, [p.id]: e.target.value })}
                        className="w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Note (opzionale)</Label>
              <Textarea
                placeholder="Es: Bonifico unico per il gruppo"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Button
              onClick={handleAddGroupPayment}
              disabled={loading || !totalAmount || !paidByParticipantId}
              className="w-full"
            >
              {loading ? "Salvataggio..." : "Aggiungi Pagamento di Gruppo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
