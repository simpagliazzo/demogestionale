import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, MessageCircle, X, MapPin, Calendar, Bus, Check } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";

interface Payment {
  amount: number;
  payment_type: string;
}

interface TripConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantName: string;
  participantPhone: string | null;
  tripTitle: string;
  tripDestination: string;
  tripDepartureDate: string;
  tripReturnDate: string;
  totalPrice: number;
  payments: Payment[];
  roomType?: string | null;
  groupNumber?: number | null;
  notes?: string | null;
}

const ROOM_LABELS: Record<string, string> = {
  singola: "Camera Singola",
  doppia: "Camera Doppia",
  matrimoniale: "Camera Matrimoniale",
  tripla: "Camera Tripla",
  quadrupla: "Camera Quadrupla",
};

export default function TripConfirmationDialog({
  open,
  onOpenChange,
  participantName,
  participantPhone,
  tripTitle,
  tripDestination,
  tripDepartureDate,
  tripReturnDate,
  totalPrice,
  payments,
  roomType,
  groupNumber,
  notes,
}: TripConfirmationDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = totalPrice - totalPaid;

  // Estrai tipo camera dalle note
  const extractRoomType = (): string | null => {
    if (roomType) return roomType;
    if (!notes) return null;
    const match = notes.match(/Camera:\s*(\w+)/i);
    return match ? match[1].toLowerCase() : null;
  };

  const currentRoomType = extractRoomType();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Conferma_${participantName.replace(/\s+/g, "_")}_${tripTitle.replace(/\s+/g, "_")}`,
  });

  const handleWhatsApp = () => {
    let phone = participantPhone?.replace(/[^\d]/g, "") || "";
    
    if (!phone) {
      toast.error("Numero di telefono mancante per questo partecipante");
      return;
    }
    
    if (phone.startsWith("0")) {
      phone = "39" + phone.substring(1);
    } else if (phone.length <= 10) {
      phone = "39" + phone;
    }

    const departureDate = format(new Date(tripDepartureDate), "d MMMM yyyy", { locale: it });
    const returnDate = format(new Date(tripReturnDate), "d MMMM yyyy", { locale: it });

    const roomLabel = currentRoomType ? ROOM_LABELS[currentRoomType] || currentRoomType : null;

    const messageParts = [
      `✅ *CONFERMA PRENOTAZIONE*`,
      ``,
      `Gentile *${participantName}*,`,
      ``,
      `Siamo lieti di confermare la Sua partecipazione al viaggio:`,
      ``,
      `🚌 *${tripTitle}*`,
      `📍 *Destinazione:* ${tripDestination}`,
      `📅 *Partenza:* ${departureDate}`,
      `📅 *Ritorno:* ${returnDate}`,
      roomLabel ? `🏨 *Sistemazione:* ${roomLabel}` : null,
      groupNumber ? `👥 *Gruppo prenotazione:* #${groupNumber}` : null,
      ``,
      `💵 *RIEPILOGO ECONOMICO*`,
      `Quota di partecipazione: €${totalPrice.toFixed(2)}`,
      `Totale versato: €${totalPaid.toFixed(2)}`,
      balance > 0 ? `Saldo da versare: €${balance.toFixed(2)}` : `✅ Quota completamente saldata`,
      ``,
      `Per qualsiasi informazione non esiti a contattarci.`,
      ``,
      `Grazie per aver scelto i nostri viaggi!`,
    ].filter(Boolean).join("\n");

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(messageParts)}`;
    window.open(whatsappUrl, "_blank");
  };

  const departureDate = format(new Date(tripDepartureDate), "EEEE d MMMM yyyy", { locale: it });
  const returnDate = format(new Date(tripReturnDate), "EEEE d MMMM yyyy", { locale: it });
  const roomLabel = currentRoomType ? ROOM_LABELS[currentRoomType] || currentRoomType : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <span>Conferma Prenotazione</span>
          </DialogTitle>
        </DialogHeader>

        {/* Contenuto scrollabile */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div ref={printRef} className="space-y-4 print:p-8">
            {/* Header - visibile solo in stampa */}
            <div className="hidden print:block text-center border-b pb-4 mb-4">
              <h1 className="text-2xl font-bold">CONFERMA DI PRENOTAZIONE</h1>
              <p className="text-sm text-muted-foreground mt-1">Viaggio di Gruppo</p>
            </div>

            {/* Banner conferma */}
            <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-50 to-transparent dark:from-green-900/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">Prenotazione Confermata</p>
                  <p className="text-2xl font-bold">{participantName}</p>
                  {groupNumber && (
                    <Badge variant="secondary" className="text-sm">
                      Gruppo #{groupNumber}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Info Viaggio */}
            <Card className="border-2 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Bus className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xl font-bold">{tripTitle}</p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{tripDestination}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Date e Sistemazione */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4 text-center">
                  <Calendar className="h-5 w-5 mx-auto text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">PARTENZA</p>
                  <p className="font-semibold text-sm capitalize">{departureDate}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <Calendar className="h-5 w-5 mx-auto text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">RITORNO</p>
                  <p className="font-semibold text-sm capitalize">{returnDate}</p>
                </CardContent>
              </Card>
            </div>

            {roomLabel && (
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sistemazione</span>
                    <Badge variant="outline">{roomLabel}</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Riepilogo Economico */}
            <Card className="bg-gradient-to-br from-amber-50 to-transparent dark:from-amber-900/10">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">RIEPILOGO ECONOMICO</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Quota di partecipazione</span>
                    <span className="font-bold">€{totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Totale versato</span>
                    <span className="font-semibold">€{totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-bold">Saldo residuo</span>
                    <span className={`font-bold text-lg ${balance > 0 ? "text-amber-600" : "text-green-600"}`}>
                      {balance > 0 ? `€${balance.toFixed(2)}` : "SALDATO ✓"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Footer stampa */}
            <div className="hidden print:block text-center text-xs text-muted-foreground border-t pt-4 mt-6">
              <p>Documento generato il {format(new Date(), "d MMMM yyyy 'alle' HH:mm", { locale: it })}</p>
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
