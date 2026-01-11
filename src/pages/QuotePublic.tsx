import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Hotel, Car } from "lucide-react";

interface Flight {
  type: string;
  airline: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  baggage_type?: string;
}

interface Transfer {
  type: string;
  price: number;
}

interface OtherItem {
  description: string;
  price: number;
}

interface HotelOption {
  name: string;
  address: string;
  room_type: string;
  check_in: string;
  check_out: string;
  price_per_night: number;
  nights: number;
  total: number;
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
  hotels: HotelOption[];
  hotel_name: string | null;
  hotel_address: string | null;
  hotel_room_type: string | null;
  hotel_check_in: string | null;
  hotel_check_out: string | null;
  hotel_nights: number;
  hotel_total: number;
  hotel_price_per_night: number;
  transfers: Transfer[];
  other_items: OtherItem[];
  total_price: number;
  markup_percentage: number;
  markup_amount: number;
  notes: string | null;
  created_at: string;
}

const BAGGAGE_LABELS: Record<string, string> = {
  zaino: "Solo zaino personale",
  bagaglio_mano: "Bagaglio a mano (max 10kg)",
  bagaglio_mano_grande: "Bagaglio a mano grande (max 12kg)",
  stiva_15kg: "Bagaglio da stiva (15kg)",
  stiva_20kg: "Bagaglio da stiva (20kg)",
  stiva_23kg: "Bagaglio da stiva (23kg)",
  stiva_32kg: "Bagaglio da stiva (32kg)",
};

export default function QuotePublic() {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!id) {
        setError("Preventivo non trovato");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setError("Preventivo non trovato o non accessibile");
        setLoading(false);
        return;
      }

      setQuote({
        ...data,
        flights: (data.flights as unknown as Flight[]) || [],
        transfers: (data.transfers as unknown as Transfer[]) || [],
        other_items: (data.other_items as unknown as OtherItem[]) || [],
        hotels: (data.hotels as unknown as HotelOption[]) || [],
      });
      setLoading(false);
    };

    fetchQuote();
  }, [id]);

  // Calculate totals for each hotel option
  const calculateHotelOptionTotal = (hotel: HotelOption) => {
    if (!quote) return { subtotal: 0, markupAmount: 0, total: 0 };
    
    const flightsTotal = quote.flights.reduce((sum, f) => sum + (f.price || 0), 0) * quote.num_passengers;
    const transfersTotal = quote.transfers.reduce((sum, t) => sum + (t.price || 0), 0);
    const otherTotal = quote.other_items.reduce((sum, o) => sum + (o.price || 0), 0);
    const hotelTotal = hotel.total || (hotel.price_per_night * hotel.nights);
    
    const subtotal = flightsTotal + hotelTotal + transfersTotal + otherTotal;
    const markupAmount = quote.markup_percentage > 0 
      ? subtotal * (quote.markup_percentage / 100) 
      : quote.markup_amount;
    const total = subtotal + markupAmount;
    
    return { subtotal, markupAmount, total, hotelTotal };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Caricamento preventivo...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-bold text-destructive mb-2">Errore</h1>
            <p className="text-muted-foreground">{error || "Preventivo non trovato"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const issueDate = format(new Date(quote.created_at), "d MMMM yyyy", { locale: it });

  // Determine which hotels to display
  const hotelsToDisplay = quote.hotels.length > 0 ? quote.hotels : (quote.hotel_name ? [{
    name: quote.hotel_name,
    address: quote.hotel_address || "",
    room_type: quote.hotel_room_type || "",
    check_in: quote.hotel_check_in || "",
    check_out: quote.hotel_check_out || "",
    price_per_night: quote.hotel_price_per_night,
    nights: quote.hotel_nights,
    total: quote.hotel_total,
  }] : []);

  const hasMultipleHotels = hotelsToDisplay.length > 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Preventivo di Viaggio</h1>
          <p className="text-muted-foreground">Data emissione: {issueDate}</p>
        </div>

        {/* Customer Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Gentile {quote.customer_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Ecco il preventivo richiesto per il viaggio a <strong>{quote.destination}</strong>
              {quote.num_passengers > 1 && ` per ${quote.num_passengers} persone`}.
            </p>
          </CardContent>
        </Card>

        {/* Trip Dates */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dettagli Viaggio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Destinazione:</span>
                <p className="text-muted-foreground">{quote.destination}</p>
              </div>
              <div>
                <span className="font-medium">Passeggeri:</span>
                <p className="text-muted-foreground">{quote.num_passengers}</p>
              </div>
              {quote.departure_date && (
                <div>
                  <span className="font-medium">Partenza:</span>
                  <p className="text-muted-foreground">
                    {format(new Date(quote.departure_date), "d MMMM yyyy", { locale: it })}
                  </p>
                </div>
              )}
              {quote.return_date && (
                <div>
                  <span className="font-medium">Ritorno:</span>
                  <p className="text-muted-foreground">
                    {format(new Date(quote.return_date), "d MMMM yyyy", { locale: it })}
                  </p>
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
              <div className="space-y-3">
                {quote.flights.map((flight, index) => (
                  <div key={index} className="flex justify-between items-start border-b last:border-0 pb-2 last:pb-0">
                    <div>
                      <p className="font-medium">{flight.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {flight.airline} • {flight.departure_time} - {flight.arrival_time}
                      </p>
                      {flight.baggage_type && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {BAGGAGE_LABELS[flight.baggage_type] || flight.baggage_type}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hotels - Multiple Options */}
        {hotelsToDisplay.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Hotel className="h-4 w-4" />
                {hasMultipleHotels ? "Opzioni Alloggio" : "Alloggio"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {hotelsToDisplay.map((hotel, index) => {
                  const hotelTotals = calculateHotelOptionTotal(hotel);
                  return (
                    <div key={index} className={`${hasMultipleHotels ? "border rounded-lg p-4 bg-muted/30" : ""}`}>
                      {hasMultipleHotels && (
                        <div className="text-xs font-medium text-primary mb-2 uppercase tracking-wide">
                          Opzione {index + 1}
                        </div>
                      )}
                      <p className="font-medium text-lg">{hotel.name}</p>
                      {hotel.room_type && (
                        <p className="text-sm text-muted-foreground">Camera: {hotel.room_type}</p>
                      )}
                      {hotel.address && (
                        <p className="text-sm text-muted-foreground">{hotel.address}</p>
                      )}
                      <div className="text-sm text-muted-foreground mt-2">
                        {hotel.check_in && (
                          <span>Check-in: {format(new Date(hotel.check_in), "d MMM yyyy", { locale: it })}</span>
                        )}
                        {hotel.check_in && hotel.check_out && <span> • </span>}
                        {hotel.check_out && (
                          <span>Check-out: {format(new Date(hotel.check_out), "d MMM yyyy", { locale: it })}</span>
                        )}
                        {hotel.nights > 0 && <span> ({hotel.nights} notti)</span>}
                      </div>
                      
                      {hasMultipleHotels && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex justify-between items-center text-lg font-bold text-primary">
                            <span>TOTALE</span>
                            <span>€{hotelTotals.total.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
              <div className="space-y-2">
                {quote.transfers.map((transfer, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{transfer.type}</span>
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
              <CardTitle className="text-sm">Altri Servizi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {quote.other_items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.description}</span>
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

        {/* Total - only show single total if no multiple hotels */}
        {!hasMultipleHotels && (
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex justify-between items-center text-2xl font-bold">
                <span>TOTALE</span>
                <span>€{quote.total_price.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Validity Disclaimer */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              Il presente preventivo è valido fino al {issueDate} salvo disponibilità al momento della conferma. 
              L'inizio del viaggio è subordinato al versamento dell'acconto del 50% entro la data di emissione del preventivo.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
