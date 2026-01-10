import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, MessageCircle, X } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { useWhatsAppTemplates, formatPhoneForWhatsApp, openWhatsApp } from "@/hooks/use-whatsapp-templates";

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_type: string;
  payment_method: string | null;
  notes: string | null;
}

interface PaymentReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | null;
  participantName: string;
  participantPhone: string | null;
  tripTitle: string;
  tripDestination: string;
  tripDepartureDate: string;
  tripReturnDate: string;
  totalPrice: number;
  totalPaid: number;
  balance: number;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  contanti: "Contanti",
  carta: "Carta di Credito",
  bonifico: "Bonifico Bancario",
  assegno: "Assegno",
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  acconto: "Acconto",
  saldo: "Saldo",
};

export default function PaymentReceiptDialog({
  open,
  onOpenChange,
  payment,
  participantName,
  participantPhone,
  tripTitle,
  tripDestination,
  tripDepartureDate,
  tripReturnDate,
  totalPrice,
  totalPaid,
  balance,
}: PaymentReceiptDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { formatMessage, agencySettings } = useWhatsAppTemplates();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Ricevuta_${participantName.replace(/\s+/g, "_")}_${payment?.payment_date || ""}`,
  });

  const handleWhatsApp = () => {
    const phone = formatPhoneForWhatsApp(participantPhone);
    
    if (!phone) {
      toast.error("Numero di telefono mancante per questo partecipante");
      return;
    }

    if (!payment) return;

    const paymentDate = format(new Date(payment.payment_date), "d MMMM yyyy", { locale: it });
    const departureDate = format(new Date(tripDepartureDate), "d MMMM yyyy", { locale: it });
    const returnDate = format(new Date(tripReturnDate), "d MMMM yyyy", { locale: it });

    // Usa template dal database
    const message = formatMessage("payment_reminder", {
      NOME_PARTECIPANTE: participantName,
      TITOLO_VIAGGIO: tripTitle,
      DESTINAZIONE: tripDestination,
      DATA_PARTENZA: departureDate,
      DATA_RITORNO: returnDate,
      IMPORTO_PAGAMENTO: payment.amount.toFixed(2),
      TIPO_PAGAMENTO: PAYMENT_TYPE_LABELS[payment.payment_type] || payment.payment_type,
      METODO_PAGAMENTO: PAYMENT_METHOD_LABELS[payment.payment_method || ""] || payment.payment_method || "N/D",
      DATA_PAGAMENTO: paymentDate,
      NOTE_PAGAMENTO: payment.notes || "",
      QUOTA_TOTALE: totalPrice.toFixed(2),
      TOTALE_PAGATO: totalPaid.toFixed(2),
      SALDO_RESIDUO: balance > 0 ? balance.toFixed(2) : "SALDATO",
    });

    if (message) {
      openWhatsApp(phone, message);
    } else {
      // Fallback se template non trovato
      const messageParts = [
        `📄 *RICEVUTA DI PAGAMENTO*`,
        ``,
        `Gentile *${participantName}*,`,
        ``,
        `Confermiamo la ricezione del seguente pagamento:`,
        ``,
        `💰 *Importo:* €${payment.amount.toFixed(2)}`,
        `📋 *Tipo:* ${PAYMENT_TYPE_LABELS[payment.payment_type] || payment.payment_type}`,
        `💳 *Modalità:* ${PAYMENT_METHOD_LABELS[payment.payment_method || ""] || payment.payment_method || "N/D"}`,
        `📅 *Data:* ${paymentDate}`,
        payment.notes ? `📝 *Note:* ${payment.notes}` : null,
        ``,
        `🚌 *VIAGGIO*`,
        `${tripTitle}`,
        `📍 ${tripDestination}`,
        `📅 ${departureDate} - ${returnDate}`,
        ``,
        `💵 *RIEPILOGO PAGAMENTI*`,
        `Totale viaggio: €${totalPrice.toFixed(2)}`,
        `Totale pagato: €${totalPaid.toFixed(2)}`,
        balance > 0 ? `Saldo residuo: €${balance.toFixed(2)}` : `✅ Saldato`,
        ``,
        `_Documento non valido ai fini fiscali_`,
        ``,
        `_${agencySettings?.business_name || "Agenzia Viaggi"}_`,
      ].filter(Boolean).join("\n");

      openWhatsApp(phone, messageParts);
    }
  };

  if (!payment) return null;

  const paymentDate = format(new Date(payment.payment_date), "d MMMM yyyy", { locale: it });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span>Ricevuta Pagamento</span>
            <Badge variant="outline">{PAYMENT_TYPE_LABELS[payment.payment_type] || payment.payment_type}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Contenuto scrollabile */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div ref={printRef} className="space-y-4 print:p-8">
            {/* Header con intestazione agenzia - visibile solo in stampa */}
            <div className="hidden print:block text-center border-b pb-4 mb-4">
              <h1 className="text-2xl font-bold">Gladiatours Viaggi</h1>
              <p className="text-sm">di Palmieri Massimo</p>
              <p className="text-xs text-muted-foreground mt-1">Via Piana n°82, 03020 Torrice (FR)</p>
              <p className="text-xs text-muted-foreground">Tel. 0775 353808 | Cell. +39 320 753 2262</p>
              <p className="text-xs text-muted-foreground">info@gladiatours.it</p>
              <div className="mt-3 pt-3 border-t">
                <h2 className="text-xl font-bold">RICEVUTA DI PAGAMENTO</h2>
                <p className="text-xs text-muted-foreground mt-1">Documento non valido ai fini fiscali</p>
              </div>
            </div>

            {/* Info Ricevuta */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Data: {paymentDate}</p>
                  <p className="text-3xl font-bold text-primary">€{payment.amount.toFixed(2)}</p>
                  <div className="flex justify-center gap-2 flex-wrap">
                    <Badge>{PAYMENT_TYPE_LABELS[payment.payment_type] || payment.payment_type}</Badge>
                    <Badge variant="secondary">
                      {PAYMENT_METHOD_LABELS[payment.payment_method || ""] || payment.payment_method || "N/D"}
                    </Badge>
                  </div>
                  {payment.notes && (
                    <p className="text-sm text-muted-foreground italic mt-2">"{payment.notes}"</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Info Partecipante */}
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">INTESTATARIO</h3>
                <p className="text-lg font-bold">{participantName}</p>
                {participantPhone && <p className="text-sm text-muted-foreground">{participantPhone}</p>}
              </CardContent>
            </Card>

            {/* Info Viaggio */}
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">VIAGGIO</h3>
                <p className="font-bold">{tripTitle}</p>
                <p className="text-sm text-muted-foreground">{tripDestination}</p>
                <p className="text-sm">
                  {format(new Date(tripDepartureDate), "d MMM", { locale: it })} - {format(new Date(tripReturnDate), "d MMM yyyy", { locale: it })}
                </p>
              </CardContent>
            </Card>

            {/* Riepilogo Pagamenti */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">RIEPILOGO</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Totale viaggio</span>
                    <span className="font-semibold">€{totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Totale pagato</span>
                    <span className="font-semibold">€{totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-bold">Saldo residuo</span>
                    <span className={`font-bold ${balance > 0 ? "text-amber-600" : "text-green-600"}`}>
                      {balance > 0 ? `€${balance.toFixed(2)}` : "SALDATO ✓"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disclaimer - visibile solo in stampa */}
            <div className="hidden print:block text-center text-xs text-muted-foreground border-t pt-4 mt-6">
              <p>Documento proforma - Non valido ai fini fiscali</p>
              <p className="mt-1">Stampato il {format(new Date(), "d MMMM yyyy", { locale: it })}</p>
            </div>
          </div>
        </div>

        {/* Azioni - sempre visibili */}
        <div className="flex gap-2 pt-4 border-t print:hidden flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Chiudi
          </Button>
          <Button variant="outline" onClick={() => handlePrint()} className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Stampa
          </Button>
          <Button onClick={handleWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700">
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
