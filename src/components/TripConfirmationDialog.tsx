import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, MessageCircle, X, MapPin, Calendar, Bus, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppTemplates, formatPhoneForWhatsApp, openWhatsApp } from "@/hooks/use-whatsapp-templates";

interface Payment {
  amount: number;
  payment_type: string;
}

interface TripConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId?: string;
  tripId?: string;
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
  participantId,
  tripId,
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
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const { formatMessage, agencySettings } = useWhatsAppTemplates();

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

  // Genera token per upload documenti
  const generateUploadToken = async (): Promise<string | null> => {
    if (!participantId) return null;

    try {
      // Controlla se esiste già un token valido
      const { data: existingToken } = await supabase
        .from('upload_tokens')
        .select('token')
        .eq('participant_id', participantId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingToken) {
        return existingToken.token;
      }

      // Genera nuovo token
      const array = new Uint8Array(24);
      crypto.getRandomValues(array);
      const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase
        .from('upload_tokens')
        .insert({
          participant_id: participantId,
          token,
        });

      if (error) throw error;
      return token;
    } catch (err) {
      console.error('Error generating upload token:', err);
      return null;
    }
  };

  // Genera token per scelta posto bus
  const generateBusSeatToken = async (): Promise<string | null> => {
    if (!participantId || !tripId) return null;

    try {
      // Controlla se esiste già un token valido
      const { data: existingToken } = await supabase
        .from('bus_seat_tokens')
        .select('token')
        .eq('participant_id', participantId)
        .eq('trip_id', tripId)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingToken) {
        return existingToken.token;
      }

      // Genera nuovo token
      const array = new Uint8Array(24);
      crypto.getRandomValues(array);
      const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase
        .from('bus_seat_tokens')
        .insert({
          participant_id: participantId,
          trip_id: tripId,
          token,
        });

      if (error) throw error;
      return token;
    } catch (err) {
      console.error('Error generating bus seat token:', err);
      return null;
    }
  };

  const handleWhatsApp = async () => {
    const phone = formatPhoneForWhatsApp(participantPhone);
    
    if (!phone) {
      toast.error("Numero di telefono mancante per questo partecipante");
      return;
    }

    setSendingWhatsApp(true);

    // Genera link upload documento
    let uploadLink = "";
    if (participantId) {
      const token = await generateUploadToken();
      if (token) {
        uploadLink = `${window.location.origin}/upload-documenti/${token}`;
      }
    }

    // Genera link scelta posto bus
    let busSeatLink = "";
    if (participantId && tripId) {
      const token = await generateBusSeatToken();
      if (token) {
        busSeatLink = `${window.location.origin}/scegli-posto/${token}`;
      }
    }

    setSendingWhatsApp(false);

    const departureDate = format(new Date(tripDepartureDate), "d MMMM yyyy", { locale: it });
    const returnDate = format(new Date(tripReturnDate), "d MMMM yyyy", { locale: it });
    const roomLabel = currentRoomType ? ROOM_LABELS[currentRoomType] || currentRoomType : "";

    // Usa template dal database
    const message = formatMessage("booking_confirmation", {
      NOME_PARTECIPANTE: participantName,
      TITOLO_VIAGGIO: tripTitle,
      DESTINAZIONE: tripDestination,
      DATA_PARTENZA: departureDate,
      DATA_RITORNO: returnDate,
      TIPO_CAMERA: roomLabel,
      NUMERO_GRUPPO: groupNumber?.toString() || "",
      QUOTA_TOTALE: totalPrice.toFixed(2),
      TOTALE_PAGATO: totalPaid.toFixed(2),
      SALDO_RESIDUO: balance > 0 ? balance.toFixed(2) : "SALDATO",
      LINK_POSTO_BUS: busSeatLink,
      LINK_UPLOAD_DOCUMENTO: uploadLink,
    });

    if (message) {
      openWhatsApp(phone, message);
    } else {
      // Fallback se template non trovato
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
        busSeatLink ? `🪑 *SCEGLI IL TUO POSTO SUL BUS*` : null,
        busSeatLink ? busSeatLink : null,
        busSeatLink ? `` : null,
        uploadLink ? `📄 *DOCUMENTO DI IDENTITÀ*` : null,
        uploadLink ? uploadLink : null,
        uploadLink ? `` : null,
        `Grazie per aver scelto i nostri viaggi!`,
        ``,
        `_${agencySettings?.business_name || "Agenzia Viaggi"}_`,
        agencySettings?.phone ? `_Tel. ${agencySettings.phone}_` : null,
      ].filter(Boolean).join("\n");

      openWhatsApp(phone, messageParts);
    }
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
            {/* Header con intestazione agenzia - visibile solo in stampa */}
            <div className="hidden print:block text-center border-b pb-4 mb-4">
              <h1 className="text-2xl font-bold">Gladiatours Viaggi</h1>
              <p className="text-sm">di Palmieri Massimo</p>
              <p className="text-xs text-muted-foreground mt-1">Via Piana n°82, 03020 Torrice (FR)</p>
              <p className="text-xs text-muted-foreground">Tel. 0775 353808 | Cell. +39 320 753 2262</p>
              <p className="text-xs text-muted-foreground">info@gladiatours.it</p>
              <div className="mt-3 pt-3 border-t">
                <h2 className="text-xl font-bold">CONFERMA DI PRENOTAZIONE</h2>
                <p className="text-xs text-muted-foreground mt-1">Viaggio di Gruppo</p>
              </div>
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
          <Button onClick={handleWhatsApp} disabled={sendingWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700">
            {sendingWhatsApp ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4 mr-2" />
            )}
            WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
