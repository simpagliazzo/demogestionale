import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plane, Hotel, Car, Package, Send, Printer, Trash2, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useReactToPrint } from "react-to-print";

interface Flight {
  type: string;
  airline: string;
  departure_time: string;
  arrival_time: string;
  baggage_type?: string;
  price: number;
}

const BAGGAGE_LABELS: Record<string, string> = {
  zaino: "Solo zaino personale",
  bagaglio_mano: "Bagaglio a mano (max 10kg)",
  bagaglio_mano_plus: "Bagaglio a mano priority (max 10kg + zaino)",
  stiva_15kg: "Bagaglio da stiva 15kg",
  stiva_20kg: "Bagaglio da stiva 20kg",
  stiva_23kg: "Bagaglio da stiva 23kg",
  stiva_32kg: "Bagaglio da stiva 32kg",
};

interface Transfer {
  type: string;
  price: number;
}

interface OtherItem {
  description: string;
  price: number;
}

interface Quote {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  destination: string;
  departure_date: string | null;
  return_date: string | null;
  num_passengers: number;
  flights: Flight[];
  hotel_name: string | null;
  hotel_address: string | null;
  hotel_room_type: string | null;
  hotel_check_in: string | null;
  hotel_check_out: string | null;
  hotel_price_per_night: number;
  hotel_nights: number;
  hotel_total: number;
  transfers: Transfer[];
  other_items: OtherItem[];
  subtotal: number;
  markup_percentage: number;
  markup_amount: number;
  total_price: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface QuoteDetailDialogProps {
  quoteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const statusLabels: Record<string, string> = {
  draft: "Bozza",
  sent: "Inviato",
  accepted: "Accettato",
  rejected: "Rifiutato",
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function QuoteDetailDialog({
  quoteId,
  open,
  onOpenChange,
  onUpdate,
}: QuoteDetailDialogProps) {
  const { toast } = useToast();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && quoteId) {
      fetchQuote();
    }
  }, [open, quoteId]);

  const fetchQuote = async () => {
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", quoteId)
        .single();

      if (error) throw error;
      
      // Parse JSONB fields with proper type handling
      const flights = Array.isArray(data.flights) 
        ? (data.flights as unknown as Flight[]) 
        : [];
      const transfers = Array.isArray(data.transfers) 
        ? (data.transfers as unknown as Transfer[]) 
        : [];
      const other_items = Array.isArray(data.other_items) 
        ? (data.other_items as unknown as OtherItem[]) 
        : [];
      
      setQuote({
        ...data,
        flights,
        transfers,
        other_items,
      } as Quote);
    } catch (error) {
      console.error("Errore caricamento preventivo:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare il preventivo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from("quotes")
        .update({ status: newStatus })
        .eq("id", quoteId);

      if (error) throw error;

      setQuote((prev) => (prev ? { ...prev, status: newStatus } : null));
      onUpdate();
      toast({
        title: "Stato aggiornato",
        description: `Preventivo impostato come "${statusLabels[newStatus]}"`,
      });
    } catch (error) {
      console.error("Errore aggiornamento stato:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Sei sicuro di voler eliminare questo preventivo?")) return;

    try {
      const { error } = await supabase.from("quotes").delete().eq("id", quoteId);

      if (error) throw error;

      toast({
        title: "Preventivo eliminato",
        description: "Il preventivo è stato eliminato",
      });
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Errore eliminazione:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare il preventivo",
        variant: "destructive",
      });
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Preventivo_${quote?.customer_name}_${quote?.destination}`,
  });

  const handleWhatsApp = () => {
    if (!quote) return;

    // Pulisci il numero di telefono: rimuovi tutti i caratteri non numerici
    let phone = quote.customer_phone?.replace(/[^\d]/g, "") || "";
    
    if (!phone) {
      toast({
        title: "Numero mancante",
        description: "Inserisci un numero di telefono per inviare via WhatsApp",
        variant: "destructive",
      });
      return;
    }
    
    // Se inizia con 0, sostituisci con prefisso italiano 39
    if (phone.startsWith("0")) {
      phone = "39" + phone.substring(1);
    }
    // Se non ha prefisso internazionale (numero corto), aggiungi 39
    else if (phone.length <= 10) {
      phone = "39" + phone;
    }

    const flightsText = quote.flights
      .map((f) => {
        const baggage = f.baggage_type ? `\n   🧳 ${BAGGAGE_LABELS[f.baggage_type] || f.baggage_type}` : "";
        return `✈️ ${f.type}: ${f.airline} ${f.departure_time}-${f.arrival_time}${baggage}`;
      })
      .join("\n");

    const hotelText = quote.hotel_name
      ? `🏨 Hotel: ${quote.hotel_name}\n   ${quote.hotel_room_type || ""}\n   Check-in: ${quote.hotel_check_in ? format(new Date(quote.hotel_check_in), "d MMM yyyy", { locale: it }) : ""}\n   Check-out: ${quote.hotel_check_out ? format(new Date(quote.hotel_check_out), "d MMM yyyy", { locale: it }) : ""}`
      : "";

    const transfersText = quote.transfers.length > 0
      ? quote.transfers.map((t) => `🚗 Transfer: ${t.type}`).join("\n")
      : "";

    const otherText = quote.other_items.length > 0
      ? quote.other_items.map((o) => `📦 ${o.description}`).join("\n")
      : "";

    const message = `
*PREVENTIVO VIAGGIO*
━━━━━━━━━━━━━━━━━

📍 *Destinazione:* ${quote.destination}
👥 *Passeggeri:* ${quote.num_passengers}
${quote.departure_date ? `📅 *Partenza:* ${format(new Date(quote.departure_date), "d MMMM yyyy", { locale: it })}` : ""}
${quote.return_date ? `📅 *Ritorno:* ${format(new Date(quote.return_date), "d MMMM yyyy", { locale: it })}` : ""}

${flightsText}

${hotelText}

${transfersText}

${otherText}

━━━━━━━━━━━━━━━━━
💰 *TOTALE: €${quote.total_price.toFixed(2)}*
━━━━━━━━━━━━━━━━━

${quote.notes ? `📝 Note: ${quote.notes}` : ""}
    `.trim();

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="text-center py-8">Caricamento...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!quote) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Dettaglio Preventivo</DialogTitle>
            <Badge className={statusColors[quote.status]}>
              {statusLabels[quote.status]}
            </Badge>
          </div>
        </DialogHeader>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Select value={quote.status} onValueChange={updateStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Bozza</SelectItem>
              <SelectItem value="sent">Inviato</SelectItem>
              <SelectItem value="accepted">Accettato</SelectItem>
              <SelectItem value="rejected">Rifiutato</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handlePrint()}>
            <Printer className="h-4 w-4 mr-2" />
            Stampa
          </Button>
          <Button variant="outline" onClick={handleWhatsApp}>
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Elimina
          </Button>
        </div>

        {/* Printable Content */}
        <div ref={printRef} className="space-y-4 print:p-8">
          {/* Header for print */}
          <div className="hidden print:block text-center mb-6">
            <h1 className="text-2xl font-bold">PREVENTIVO DI VIAGGIO</h1>
            <p className="text-muted-foreground">
              Data: {format(new Date(), "d MMMM yyyy", { locale: it })}
            </p>
          </div>

          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Nome:</span> {quote.customer_name}
                </div>
                {quote.customer_email && (
                  <div>
                    <span className="font-medium">Email:</span> {quote.customer_email}
                  </div>
                )}
                {quote.customer_phone && (
                  <div>
                    <span className="font-medium">Telefono:</span> {quote.customer_phone}
                  </div>
                )}
                <div>
                  <span className="font-medium">Passeggeri:</span> {quote.num_passengers}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trip Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Viaggio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Destinazione:</span> {quote.destination}
                </div>
                {quote.departure_date && (
                  <div>
                    <span className="font-medium">Partenza:</span>{" "}
                    {format(new Date(quote.departure_date), "d MMMM yyyy", { locale: it })}
                  </div>
                )}
                {quote.return_date && (
                  <div>
                    <span className="font-medium">Ritorno:</span>{" "}
                    {format(new Date(quote.return_date), "d MMMM yyyy", { locale: it })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Flights */}
          {quote.flights.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  Voli
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {quote.flights.map((flight, index) => (
                    <div key={index} className="text-sm border-b pb-2 last:border-0 last:pb-0">
                      <div className="flex justify-between">
                        <span>
                          {flight.type}: {flight.airline} ({flight.departure_time} - {flight.arrival_time})
                        </span>
                        <span className="print:hidden">€{(flight.price * quote.num_passengers).toFixed(2)}</span>
                      </div>
                      {flight.baggage_type && (
                        <div className="text-xs text-muted-foreground mt-1">
                          🧳 {BAGGAGE_LABELS[flight.baggage_type] || flight.baggage_type}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hotel */}
          {quote.hotel_name && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Hotel className="h-4 w-4" />
                  Hotel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <div className="font-medium">{quote.hotel_name}</div>
                  {quote.hotel_address && <div className="text-muted-foreground">{quote.hotel_address}</div>}
                  {quote.hotel_room_type && <div>Camera: {quote.hotel_room_type}</div>}
                  <div>
                    Check-in: {quote.hotel_check_in ? format(new Date(quote.hotel_check_in), "d MMM yyyy", { locale: it }) : "-"}
                    {" | "}
                    Check-out: {quote.hotel_check_out ? format(new Date(quote.hotel_check_out), "d MMM yyyy", { locale: it }) : "-"}
                  </div>
                  <div className="print:hidden">
                    {quote.hotel_nights} notti = €{quote.hotel_total.toFixed(2)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transfers */}
          {quote.transfers.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Transfer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {quote.transfers.map((transfer, index) => (
                    <div key={index} className="text-sm flex justify-between">
                      <span>{transfer.type}</span>
                      <span className="print:hidden">€{transfer.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Other Items */}
          {quote.other_items.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Altro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {quote.other_items.map((item, index) => (
                    <div key={index} className="text-sm flex justify-between">
                      <span>{item.description}</span>
                      <span className="print:hidden">€{item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {quote.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Note</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Total - visible to customer */}
          <Card className="bg-primary/5 border-primary">
            <CardContent className="p-4">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>TOTALE</span>
                <span className="text-primary">€{quote.total_price.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Internal costs - hidden in print */}
          <Card className="print:hidden bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Dettaglio costi (interno)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Subtotale (costo)</span>
                  <span>€{quote.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Markup {quote.markup_percentage > 0 ? `(${quote.markup_percentage}%)` : "(fisso)"}</span>
                  <span>€{quote.markup_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t">
                  <span>Margine</span>
                  <span>€{quote.markup_amount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
