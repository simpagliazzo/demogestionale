import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format } from "date-fns";
import { AlertTriangle, Lock, Clock, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface AgencyContract {
  id: string;
  end_date: string;
  is_blocked: boolean;
  is_paid: boolean;
  block_after_date: string | null;
}

export function ContractExpiryBanner() {
  const { data: contract } = useQuery({
    queryKey: ["agency-contract-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_contract")
        .select("id, end_date, is_blocked, is_paid, block_after_date")
        .maybeSingle();
      
      if (error) throw error;
      return data as AgencyContract | null;
    },
    staleTime: 5 * 60 * 1000, // Cache per 5 minuti
  });

  if (!contract) return null;

  const daysUntilExpiry = differenceInDays(new Date(contract.end_date), new Date());
  const isExpired = daysUntilExpiry < 0;
  const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry >= 0;

  // Se bloccato, mostra alert di blocco
  if (contract.is_blocked) {
    return (
      <Alert variant="destructive" className="mb-6 border-destructive bg-destructive/10">
        <Lock className="h-5 w-5" />
        <AlertTitle className="font-bold">Account Bloccato</AlertTitle>
        <AlertDescription>
          L'accesso all'applicazione è stato sospeso. Contatta l'amministratore per informazioni sul rinnovo.
        </AlertDescription>
      </Alert>
    );
  }

  // Se scaduto
  if (isExpired) {
    return (
      <Alert variant="destructive" className="mb-6 border-destructive bg-destructive/10">
        <XCircle className="h-5 w-5" />
        <AlertTitle className="font-bold">Contratto Scaduto</AlertTitle>
        <AlertDescription>
          Il contratto è scaduto il {format(new Date(contract.end_date), "dd/MM/yyyy")}. 
          Contatta l'amministratore per il rinnovo.
        </AlertDescription>
      </Alert>
    );
  }

  // Se in scadenza entro 30 giorni
  if (isExpiringSoon) {
    const variant = daysUntilExpiry <= 7 ? "destructive" : "default";
    const bgClass = daysUntilExpiry <= 7 
      ? "border-destructive bg-destructive/10" 
      : daysUntilExpiry <= 15 
        ? "border-orange-500 bg-orange-500/10"
        : "border-yellow-500 bg-yellow-500/10";

    return (
      <Alert className={cn("mb-6", bgClass)}>
        {daysUntilExpiry <= 7 ? (
          <AlertTriangle className="h-5 w-5 text-destructive" />
        ) : (
          <Clock className="h-5 w-5 text-orange-500" />
        )}
        <AlertTitle className="font-bold">
          {daysUntilExpiry === 0 
            ? "La versione free scade oggi!" 
            : `La versione free scade tra ${daysUntilExpiry} giorni`}
        </AlertTitle>
        <AlertDescription>
          Scadenza: {format(new Date(contract.end_date), "dd/MM/yyyy")}. 
          Contattaci per continuare ad utilizzare tutte le funzionalità.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
