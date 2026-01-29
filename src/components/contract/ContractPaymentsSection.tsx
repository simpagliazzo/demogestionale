import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Euro, CalendarIcon, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface ContractPaymentsSectionProps {
  contractId: string;
  annualAmount: number;
}

interface ContractPayment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
}

const PAYMENT_METHODS = [
  { value: "bonifico", label: "Bonifico" },
  { value: "contanti", label: "Contanti" },
  { value: "carta", label: "Carta di Credito" },
  { value: "assegno", label: "Assegno" },
];

export function ContractPaymentsSection({ contractId, annualAmount }: ContractPaymentsSectionProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState("bonifico");
  const [notes, setNotes] = useState("");

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["contract-payments", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_payments")
        .select("*")
        .eq("contract_id", contractId)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data as ContractPayment[];
    },
  });

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = annualAmount - totalPaid;
  const progressPercent = annualAmount > 0 ? (totalPaid / annualAmount) * 100 : 0;

  const addPaymentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contract_payments").insert({
        contract_id: contractId,
        amount: parseFloat(amount),
        payment_date: format(paymentDate, "yyyy-MM-dd"),
        payment_method: paymentMethod,
        notes: notes || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-payments", contractId] });
      toast({ title: "Pagamento registrato" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from("contract_payments")
        .delete()
        .eq("id", paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-payments", contractId] });
      toast({ title: "Pagamento eliminato" });
    },
    onError: (error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setAmount("");
    setPaymentDate(new Date());
    setPaymentMethod("bonifico");
    setNotes("");
  };

  const getMethodLabel = (value: string) => {
    return PAYMENT_METHODS.find((m) => m.value === value)?.label || value;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Storico Pagamenti
            </CardTitle>
            <CardDescription>
              Registra i pagamenti ricevuti per il contratto
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Aggiungi Pagamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuovo Pagamento</DialogTitle>
                <DialogDescription>
                  Registra un nuovo pagamento ricevuto
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Importo *</Label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-9"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data Pagamento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !paymentDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {paymentDate ? format(paymentDate, "dd/MM/yyyy") : "Seleziona"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={paymentDate}
                        onSelect={(d) => d && setPaymentDate(d)}
                        locale={it}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
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

                <div className="space-y-2">
                  <Label>Note</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Note opzionali..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annulla
                </Button>
                <Button
                  onClick={() => addPaymentMutation.mutate()}
                  disabled={!amount || addPaymentMutation.isPending}
                >
                  {addPaymentMutation.isPending ? "Salvataggio..." : "Salva"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Riepilogo */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Pagato: €{totalPaid.toFixed(2)}</span>
            <span>Dovuto: €{annualAmount.toFixed(2)}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-sm">
            <Badge variant={remaining <= 0 ? "default" : "secondary"}>
              {remaining <= 0 ? "Saldato" : `Residuo: €${remaining.toFixed(2)}`}
            </Badge>
            <span className="text-muted-foreground">{progressPercent.toFixed(0)}%</span>
          </div>
        </div>

        {/* Lista pagamenti */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : payments.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            Nessun pagamento registrato
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Importo</TableHead>
                <TableHead>Modalità</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {format(new Date(payment.payment_date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">
                    €{Number(payment.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>{getMethodLabel(payment.payment_method)}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[150px] truncate">
                    {payment.notes || "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deletePaymentMutation.mutate(payment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
