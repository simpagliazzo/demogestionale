import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Mail, Send, Check, Clock } from "lucide-react";

interface ManualReminderSectionProps {
  contractId: string;
  clientEmail: string | null;
  reminder30Sent: boolean;
  reminder15Sent: boolean;
  reminder7Sent: boolean;
  endDate: string;
}

export function ManualReminderSection({
  contractId,
  clientEmail,
  reminder30Sent,
  reminder15Sent,
  reminder7Sent,
  endDate,
}: ManualReminderSectionProps) {
  const queryClient = useQueryClient();
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const markReminderMutation = useMutation({
    mutationFn: async (reminderType: "30" | "15" | "7") => {
      const updateData: Record<string, boolean> = {};
      if (reminderType === "30") updateData.reminder_30_sent = true;
      if (reminderType === "15") updateData.reminder_15_sent = true;
      if (reminderType === "7") updateData.reminder_7_sent = true;

      const { error } = await supabase
        .from("agency_contract")
        .update(updateData)
        .eq("id", contractId);

      if (error) throw error;
      return reminderType;
    },
    onSuccess: (reminderType) => {
      queryClient.invalidateQueries({ queryKey: ["agency-contract"] });
      toast({ title: `Promemoria ${reminderType} giorni segnato come inviato` });
      setSendingReminder(null);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
      setSendingReminder(null);
    },
  });

  const generateWhatsAppMessage = (days: number) => {
    const formattedDate = new Date(endDate).toLocaleDateString("it-IT");
    return encodeURIComponent(
      `Gentile Cliente,\n\nLe ricordiamo che la versione free del software scadrà tra ${days} giorni (${formattedDate}).\n\nPer continuare ad utilizzare tutte le funzionalità, La invitiamo a contattarci.\n\nGrazie per la collaborazione.`
    );
  };

  const handleSendReminder = (days: "30" | "15" | "7") => {
    if (!clientEmail) {
      toast({
        title: "Email mancante",
        description: "Inserisci l'email del cliente per inviare promemoria",
        variant: "destructive",
      });
      return;
    }

    setSendingReminder(days);
    
    // Apri WhatsApp con il messaggio precompilato
    const phone = clientEmail.includes("@") ? "" : clientEmail;
    const message = generateWhatsAppMessage(parseInt(days));
    
    // Segna come inviato
    markReminderMutation.mutate(days);
    
    // Copia il messaggio negli appunti
    const textMessage = decodeURIComponent(message);
    navigator.clipboard.writeText(textMessage).then(() => {
      toast({
        title: "Messaggio copiato",
        description: "Il testo del promemoria è stato copiato negli appunti",
      });
    });
  };

  const reminders = [
    { days: "30" as const, sent: reminder30Sent, label: "30 giorni" },
    { days: "15" as const, sent: reminder15Sent, label: "15 giorni" },
    { days: "7" as const, sent: reminder7Sent, label: "7 giorni" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Invia Promemoria Manualmente
        </CardTitle>
        <CardDescription>
          Seleziona il promemoria da inviare. Il messaggio verrà copiato negli appunti.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div
              key={reminder.days}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                {reminder.sent ? (
                  <Check className="h-5 w-5 text-primary" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-medium">{reminder.label} prima</span>
                {reminder.sent && (
                  <Badge variant="secondary">
                    Inviato
                  </Badge>
                )}
              </div>
              <Button
                variant={reminder.sent ? "outline" : "default"}
                size="sm"
                disabled={sendingReminder === reminder.days}
                onClick={() => handleSendReminder(reminder.days)}
              >
                <Mail className="mr-2 h-4 w-4" />
                {reminder.sent ? "Reinvia" : "Invia"}
              </Button>
            </div>
          ))}
        </div>
        {!clientEmail && (
          <p className="mt-4 text-sm text-destructive">
            ⚠️ Inserisci l'email del cliente nei dettagli contratto per abilitare l'invio.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
