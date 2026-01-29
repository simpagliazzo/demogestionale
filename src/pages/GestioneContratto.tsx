import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  CalendarIcon, 
  Upload, 
  AlertTriangle, 
  Lock, 
  Unlock,
  Save,
  Mail,
  Euro,
  Clock,
  Send
} from "lucide-react";
import { ManualReminderSection } from "@/components/contract/ManualReminderSection";
import { ContractPaymentsSection } from "@/components/contract/ContractPaymentsSection";

interface AgencyContract {
  id: string;
  start_date: string;
  end_date: string;
  contract_file_url: string | null;
  annual_amount: number;
  is_paid: boolean;
  payment_date: string | null;
  block_after_date: string | null;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_by: string | null;
  notes: string | null;
  reminder_30_sent: boolean;
  reminder_15_sent: boolean;
  reminder_7_sent: boolean;
  client_email: string | null;
  created_at: string;
  updated_at: string;
}

export default function GestioneContratto() {
  const { isSuperAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [blockAfterDate, setBlockAfterDate] = useState<Date | undefined>();
  const [paymentDate, setPaymentDate] = useState<Date | undefined>();
  const [annualAmount, setAnnualAmount] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Redirect se non è super admin
  useEffect(() => {
    if (!roleLoading && !isSuperAdmin) {
      navigate("/");
    }
  }, [isSuperAdmin, roleLoading, navigate]);

  const { data: contract, isLoading } = useQuery({
    queryKey: ["agency-contract"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_contract")
        .select("*")
        .maybeSingle();
      
      if (error) throw error;
      return data as AgencyContract | null;
    },
    enabled: isSuperAdmin,
  });

  // Popola i form quando i dati vengono caricati
  useEffect(() => {
    if (contract) {
      setStartDate(contract.start_date ? new Date(contract.start_date) : undefined);
      setEndDate(contract.end_date ? new Date(contract.end_date) : undefined);
      setBlockAfterDate(contract.block_after_date ? new Date(contract.block_after_date) : undefined);
      setPaymentDate(contract.payment_date ? new Date(contract.payment_date) : undefined);
      setAnnualAmount(contract.annual_amount?.toString() || "");
      setClientEmail(contract.client_email || "");
      setNotes(contract.notes || "");
      setIsPaid(contract.is_paid || false);
      setIsBlocked(contract.is_blocked || false);
    }
  }, [contract]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!startDate || !endDate) {
        throw new Error("Date obbligatorie");
      }

      const contractData = {
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        block_after_date: blockAfterDate ? format(blockAfterDate, "yyyy-MM-dd") : null,
        payment_date: paymentDate ? format(paymentDate, "yyyy-MM-dd") : null,
        annual_amount: parseFloat(annualAmount) || 0,
        client_email: clientEmail || null,
        notes: notes || null,
        is_paid: isPaid,
        is_blocked: isBlocked,
        blocked_at: isBlocked && !contract?.is_blocked ? new Date().toISOString() : contract?.blocked_at,
      };

      if (contract) {
        const { error } = await supabase
          .from("agency_contract")
          .update(contractData)
          .eq("id", contract.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("agency_contract")
          .insert(contractData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-contract"] });
      toast({ title: "Contratto salvato con successo" });
    },
    onError: (error) => {
      toast({ 
        title: "Errore nel salvataggio", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `contract_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("agency-assets")
        .upload(`contracts/${fileName}`, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("agency-assets")
        .getPublicUrl(`contracts/${fileName}`);

      // Aggiorna il contratto con l'URL del file
      if (contract) {
        await supabase
          .from("agency_contract")
          .update({ contract_file_url: publicUrl })
          .eq("id", contract.id);
      }

      queryClient.invalidateQueries({ queryKey: ["agency-contract"] });
      toast({ title: "File caricato con successo" });
    } catch (error: any) {
      toast({ 
        title: "Errore nel caricamento", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  const getDaysUntilExpiry = () => {
    if (!endDate) return null;
    return differenceInDays(endDate, new Date());
  };

  const getExpiryStatus = () => {
    const days = getDaysUntilExpiry();
    if (days === null) return null;
    if (days < 0) return { label: "Scaduto", variant: "destructive" as const };
    if (days <= 7) return { label: `Scade tra ${days} giorni`, variant: "destructive" as const };
    if (days <= 15) return { label: `Scade tra ${days} giorni`, variant: "warning" as const };
    if (days <= 30) return { label: `Scade tra ${days} giorni`, variant: "secondary" as const };
    return { label: `${days} giorni alla scadenza`, variant: "outline" as const };
  };

  if (roleLoading || isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  const expiryStatus = getExpiryStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestione Contratto</h1>
          <p className="text-muted-foreground">
            Gestisci il contratto annuale con il cliente
          </p>
        </div>
        {expiryStatus && (
          <Badge variant={expiryStatus.variant === "warning" ? "secondary" : expiryStatus.variant}>
            <Clock className="mr-1 h-3 w-3" />
            {expiryStatus.label}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Info Contratto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dettagli Contratto
            </CardTitle>
            <CardDescription>
              Informazioni principali del contratto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Inizio *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Seleziona"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      locale={it}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Data Fine *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : "Seleziona"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      locale={it}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Importo Annuale</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="number"
                  value={annualAmount}
                  onChange={(e) => setAnnualAmount(e.target.value)}
                  className="pl-9"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email Cliente (per promemoria)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="pl-9"
                  placeholder="email@cliente.it"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>File Contratto</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="flex-1"
                />
                {contract?.contract_file_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(contract.contract_file_url!, "_blank")}
                  >
                    Visualizza
                  </Button>
                )}
              </div>
              {uploading && <p className="text-sm text-muted-foreground">Caricamento in corso...</p>}
            </div>

            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note aggiuntive..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Storico Pagamenti */}
        <div className="space-y-6">
          {contract && (
            <ContractPaymentsSection
              contractId={contract.id}
              annualAmount={parseFloat(annualAmount) || 0}
            />
          )}

          <Card className={cn(isBlocked && "border-destructive")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isBlocked ? (
                  <Lock className="h-5 w-5 text-destructive" />
                ) : (
                  <Unlock className="h-5 w-5" />
                )}
                Controllo Accesso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Data Blocco Automatico</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Dopo questa data verrà mostrato un alert per bloccare l'account
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !blockAfterDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {blockAfterDate ? format(blockAfterDate, "dd/MM/yyyy") : "Nessuna data impostata"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={blockAfterDate}
                      onSelect={setBlockAfterDate}
                      locale={it}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className={cn(isBlocked && "text-destructive")}>
                    Account Bloccato
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {isBlocked 
                      ? "L'accesso all'applicazione è bloccato" 
                      : "Blocca manualmente l'accesso se necessario"
                    }
                  </p>
                </div>
                <Switch
                  checked={isBlocked}
                  onCheckedChange={setIsBlocked}
                />
              </div>

              {contract?.blocked_at && (
                <p className="text-xs text-muted-foreground">
                  Bloccato il: {format(new Date(contract.blocked_at), "dd/MM/yyyy HH:mm")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Invio Promemoria Manuale */}
          {contract && (
            <ManualReminderSection
              contractId={contract.id}
              clientEmail={contract.client_email}
              reminder30Sent={contract.reminder_30_sent}
              reminder15Sent={contract.reminder_15_sent}
              reminder7Sent={contract.reminder_7_sent}
              endDate={contract.end_date}
            />
          )}
        </div>
      </div>

      {/* Bottone Salva */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !startDate || !endDate}
          size="lg"
        >
          <Save className="mr-2 h-4 w-4" />
          {saveMutation.isPending ? "Salvataggio..." : "Salva Contratto"}
        </Button>
      </div>
    </div>
  );
}
