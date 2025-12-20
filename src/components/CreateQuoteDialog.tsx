import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Plane, Hotel, Car, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Flight {
  type: string;
  airline: string;
  departure_time: string;
  arrival_time: string;
  baggage_type?: string;
  price: number;
}

const BAGGAGE_OPTIONS = [
  { value: "", label: "Seleziona bagaglio" },
  { value: "zaino", label: "Solo zaino personale" },
  { value: "bagaglio_mano", label: "Bagaglio a mano (max 10kg)" },
  { value: "bagaglio_mano_plus", label: "Bagaglio a mano priority (max 10kg + zaino)" },
  { value: "stiva_15kg", label: "Bagaglio da stiva 15kg" },
  { value: "stiva_20kg", label: "Bagaglio da stiva 20kg" },
  { value: "stiva_23kg", label: "Bagaglio da stiva 23kg" },
  { value: "stiva_32kg", label: "Bagaglio da stiva 32kg" },
];

interface Transfer {
  type: string;
  price: number;
}

interface OtherItem {
  description: string;
  price: number;
}

interface QuoteData {
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
  transfers: Transfer[];
  other_items: OtherItem[];
  markup_percentage: number;
  notes: string | null;
  status: string;
}

interface CreateQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editQuote?: QuoteData | null;
}

export function CreateQuoteDialog({
  open,
  onOpenChange,
  onSuccess,
  editQuote,
}: CreateQuoteDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Customer info
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Trip info
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [numPassengers, setNumPassengers] = useState(1);

  // Flights
  const [flights, setFlights] = useState<Flight[]>([
    { type: "Andata", airline: "", departure_time: "", arrival_time: "", baggage_type: "", price: 0 },
  ]);

  // Hotel
  const [hotelName, setHotelName] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [hotelRoomType, setHotelRoomType] = useState("");
  const [hotelCheckIn, setHotelCheckIn] = useState("");
  const [hotelCheckOut, setHotelCheckOut] = useState("");
  const [hotelPricePerNight, setHotelPricePerNight] = useState(0);

  // Transfers
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  // Other items
  const [otherItems, setOtherItems] = useState<OtherItem[]>([]);

  // Markup
  const [markupType, setMarkupType] = useState<"percentage" | "fixed">("percentage");
  const [markupPercentage, setMarkupPercentage] = useState(0);
  const [markupFixed, setMarkupFixed] = useState(0);

  // Notes
  const [notes, setNotes] = useState("");

  // Load edit data when editQuote changes
  useEffect(() => {
    if (editQuote) {
      setCustomerName(editQuote.customer_name || "");
      setCustomerEmail(editQuote.customer_email || "");
      setCustomerPhone(editQuote.customer_phone || "");
      setDestination(editQuote.destination || "");
      setDepartureDate(editQuote.departure_date || "");
      setReturnDate(editQuote.return_date || "");
      setNumPassengers(editQuote.num_passengers || 1);
      setFlights(editQuote.flights?.length > 0 ? editQuote.flights : [{ type: "Andata", airline: "", departure_time: "", arrival_time: "", baggage_type: "", price: 0 }]);
      setHotelName(editQuote.hotel_name || "");
      setHotelAddress(editQuote.hotel_address || "");
      setHotelRoomType(editQuote.hotel_room_type || "");
      setHotelCheckIn(editQuote.hotel_check_in || "");
      setHotelCheckOut(editQuote.hotel_check_out || "");
      setHotelPricePerNight(editQuote.hotel_price_per_night || 0);
      setTransfers(editQuote.transfers || []);
      setOtherItems(editQuote.other_items || []);
      setMarkupPercentage(editQuote.markup_percentage || 0);
      setMarkupType(editQuote.markup_percentage > 0 ? "percentage" : "fixed");
      setNotes(editQuote.notes || "");
    } else {
      resetForm();
    }
  }, [editQuote, open]);

  const calculateHotelNights = () => {
    if (!hotelCheckIn || !hotelCheckOut) return 0;
    const start = new Date(hotelCheckIn);
    const end = new Date(hotelCheckOut);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const calculateTotals = () => {
    const flightsTotal = flights.reduce((sum, f) => sum + (f.price || 0), 0) * numPassengers;
    const hotelNights = calculateHotelNights();
    const hotelTotal = hotelPricePerNight * hotelNights;
    const transfersTotal = transfers.reduce((sum, t) => sum + (t.price || 0), 0);
    const otherTotal = otherItems.reduce((sum, o) => sum + (o.price || 0), 0);
    
    const subtotal = flightsTotal + hotelTotal + transfersTotal + otherTotal;
    const markupAmount = markupType === "percentage" 
      ? subtotal * (markupPercentage / 100) 
      : markupFixed;
    const total = subtotal + markupAmount;

    return { flightsTotal, hotelTotal, hotelNights, transfersTotal, otherTotal, subtotal, markupAmount, total };
  };

  const totals = calculateTotals();

  const addFlight = () => {
    setFlights([...flights, { type: "Ritorno", airline: "", departure_time: "", arrival_time: "", baggage_type: "", price: 0 }]);
  };

  const removeFlight = (index: number) => {
    setFlights(flights.filter((_, i) => i !== index));
  };

  const updateFlight = (index: number, field: keyof Flight, value: string | number) => {
    const updated = [...flights];
    updated[index] = { ...updated[index], [field]: value };
    setFlights(updated);
  };

  const addTransfer = () => {
    setTransfers([...transfers, { type: "", price: 0 }]);
  };

  const removeTransfer = (index: number) => {
    setTransfers(transfers.filter((_, i) => i !== index));
  };

  const updateTransfer = (index: number, field: keyof Transfer, value: string | number) => {
    const updated = [...transfers];
    updated[index] = { ...updated[index], [field]: value };
    setTransfers(updated);
  };

  const addOtherItem = () => {
    setOtherItems([...otherItems, { description: "", price: 0 }]);
  };

  const removeOtherItem = (index: number) => {
    setOtherItems(otherItems.filter((_, i) => i !== index));
  };

  const updateOtherItem = (index: number, field: keyof OtherItem, value: string | number) => {
    const updated = [...otherItems];
    updated[index] = { ...updated[index], [field]: value };
    setOtherItems(updated);
  };

  const handleSave = async () => {
    if (!customerName.trim() || !destination.trim()) {
      toast({
        title: "Errore",
        description: "Nome cliente e destinazione sono obbligatori",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const quoteData = {
        customer_name: customerName,
        customer_email: customerEmail || null,
        customer_phone: customerPhone || null,
        destination,
        departure_date: departureDate || null,
        return_date: returnDate || null,
        num_passengers: numPassengers,
        flights: flights.filter(f => f.airline || f.price > 0) as unknown as any,
        hotel_name: hotelName || null,
        hotel_address: hotelAddress || null,
        hotel_room_type: hotelRoomType || null,
        hotel_check_in: hotelCheckIn || null,
        hotel_check_out: hotelCheckOut || null,
        hotel_price_per_night: hotelPricePerNight,
        hotel_nights: totals.hotelNights,
        hotel_total: totals.hotelTotal,
        transfers: transfers.filter(t => t.type || t.price > 0) as unknown as any,
        other_items: otherItems.filter(o => o.description || o.price > 0) as unknown as any,
        subtotal: totals.subtotal,
        markup_percentage: markupType === "percentage" ? markupPercentage : 0,
        markup_amount: totals.markupAmount,
        total_price: totals.total,
        notes: notes || null,
      };

      if (editQuote) {
        // Update existing quote
        const { error } = await supabase
          .from("quotes")
          .update(quoteData)
          .eq("id", editQuote.id);

        if (error) throw error;

        toast({
          title: "Preventivo aggiornato",
          description: "Le modifiche sono state salvate",
        });
      } else {
        // Create new quote
        const { error } = await supabase.from("quotes").insert([{
          ...quoteData,
          created_by: user?.id,
          status: "draft",
        }]);

        if (error) throw error;

        toast({
          title: "Preventivo creato",
          description: "Il preventivo è stato salvato come bozza",
        });
      }

      resetForm();
      onSuccess();
    } catch (error) {
      console.error("Errore salvataggio preventivo:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare il preventivo",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setDestination("");
    setDepartureDate("");
    setReturnDate("");
    setNumPassengers(1);
    setFlights([{ type: "Andata", airline: "", departure_time: "", arrival_time: "", baggage_type: "", price: 0 }]);
    setHotelName("");
    setHotelAddress("");
    setHotelRoomType("");
    setHotelCheckIn("");
    setHotelCheckOut("");
    setHotelPricePerNight(0);
    setTransfers([]);
    setOtherItems([]);
    setMarkupType("percentage");
    setMarkupPercentage(0);
    setMarkupFixed(0);
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editQuote ? "Modifica Preventivo" : "Nuovo Preventivo"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="cliente" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="cliente">Cliente</TabsTrigger>
            <TabsTrigger value="voli">Voli</TabsTrigger>
            <TabsTrigger value="hotel">Hotel</TabsTrigger>
            <TabsTrigger value="altro">Transfer/Altro</TabsTrigger>
            <TabsTrigger value="riepilogo">Riepilogo</TabsTrigger>
          </TabsList>

          <TabsContent value="cliente" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Nome Cliente *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Mario Rossi"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="mario@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Telefono</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+39 333 1234567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numPassengers">N° Passeggeri</Label>
                <Input
                  id="numPassengers"
                  type="number"
                  min={1}
                  value={numPassengers}
                  onChange={(e) => setNumPassengers(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="destination">Destinazione *</Label>
                <Input
                  id="destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Praga"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="departureDate">Data Partenza</Label>
                <Input
                  id="departureDate"
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="returnDate">Data Ritorno</Label>
                <Input
                  id="returnDate"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="voli" className="space-y-4 mt-4">
            {flights.map((flight, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Plane className="h-4 w-4" />
                      Volo {flight.type}
                    </CardTitle>
                    {flights.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFlight(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Input
                        value={flight.type}
                        onChange={(e) => updateFlight(index, "type", e.target.value)}
                        placeholder="Andata/Ritorno"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Compagnia</Label>
                      <Input
                        value={flight.airline}
                        onChange={(e) => updateFlight(index, "airline", e.target.value)}
                        placeholder="Ryanair"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Partenza</Label>
                      <Input
                        value={flight.departure_time}
                        onChange={(e) => updateFlight(index, "departure_time", e.target.value)}
                        placeholder="08:00"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Arrivo</Label>
                      <Input
                        value={flight.arrival_time}
                        onChange={(e) => updateFlight(index, "arrival_time", e.target.value)}
                        placeholder="10:30"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Bagaglio</Label>
                      <Select
                        value={flight.baggage_type}
                        onValueChange={(value) => updateFlight(index, "baggage_type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona bagaglio" />
                        </SelectTrigger>
                        <SelectContent>
                          {BAGGAGE_OPTIONS.filter(o => o.value).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Prezzo (per pax)</Label>
                      <Input
                        type="number"
                        value={flight.price}
                        onChange={(e) => updateFlight(index, "price", parseFloat(e.target.value) || 0)}
                        placeholder="150"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" onClick={addFlight} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Volo
            </Button>
          </TabsContent>

          <TabsContent value="hotel" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Hotel className="h-4 w-4" />
                  Sistemazione Hotel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome Hotel</Label>
                    <Input
                      value={hotelName}
                      onChange={(e) => setHotelName(e.target.value)}
                      placeholder="Hotel Praga Centro"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipologia Camera</Label>
                    <Input
                      value={hotelRoomType}
                      onChange={(e) => setHotelRoomType(e.target.value)}
                      placeholder="Doppia Standard"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Indirizzo</Label>
                  <Input
                    value={hotelAddress}
                    onChange={(e) => setHotelAddress(e.target.value)}
                    placeholder="Via Example 123, Praga"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Check-in</Label>
                    <Input
                      type="date"
                      value={hotelCheckIn}
                      onChange={(e) => setHotelCheckIn(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Check-out</Label>
                    <Input
                      type="date"
                      value={hotelCheckOut}
                      onChange={(e) => setHotelCheckOut(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prezzo/notte (tot. camera)</Label>
                    <Input
                      type="number"
                      value={hotelPricePerNight}
                      onChange={(e) => setHotelPricePerNight(parseFloat(e.target.value) || 0)}
                      placeholder="80"
                    />
                  </div>
                </div>
                {totals.hotelNights > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {totals.hotelNights} notti × €{hotelPricePerNight.toFixed(2)} = €{totals.hotelTotal.toFixed(2)}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="altro" className="space-y-4 mt-4">
            {/* Transfers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Transfer
                </h3>
                <Button variant="outline" size="sm" onClick={addTransfer}>
                  <Plus className="h-4 w-4 mr-1" />
                  Aggiungi
                </Button>
              </div>
              {transfers.map((transfer, index) => (
                <Card key={index}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Input
                        className="flex-1"
                        value={transfer.type}
                        onChange={(e) => updateTransfer(index, "type", e.target.value)}
                        placeholder="Aeroporto - Hotel"
                      />
                      <Input
                        className="w-24"
                        type="number"
                        value={transfer.price}
                        onChange={(e) => updateTransfer(index, "price", parseFloat(e.target.value) || 0)}
                        placeholder="€"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTransfer(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Other Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Altro (escursioni, assicurazione, etc.)
                </h3>
                <Button variant="outline" size="sm" onClick={addOtherItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Aggiungi
                </Button>
              </div>
              {otherItems.map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Input
                        className="flex-1"
                        value={item.description}
                        onChange={(e) => updateOtherItem(index, "description", e.target.value)}
                        placeholder="Escursione centro storico"
                      />
                      <Input
                        className="w-24"
                        type="number"
                        value={item.price}
                        onChange={(e) => updateOtherItem(index, "price", parseFloat(e.target.value) || 0)}
                        placeholder="€"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOtherItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note aggiuntive per il preventivo..."
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="riepilogo" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Riepilogo Costi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Voli ({numPassengers} pax)</span>
                  <span>€{totals.flightsTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Hotel ({totals.hotelNights} notti)</span>
                  <span>€{totals.hotelTotal.toFixed(2)}</span>
                </div>
                {totals.transfersTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Transfer</span>
                    <span>€{totals.transfersTotal.toFixed(2)}</span>
                  </div>
                )}
                {totals.otherTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Altro</span>
                    <span>€{totals.otherTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Subtotale (costo)</span>
                  <span>€{totals.subtotal.toFixed(2)}</span>
                </div>

                <div className="bg-muted/50 p-3 rounded-lg space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Label className="text-sm">Markup</Label>
                    <Select
                      value={markupType}
                      onValueChange={(v) => setMarkupType(v as "percentage" | "fixed")}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentuale %</SelectItem>
                        <SelectItem value="fixed">Fisso €</SelectItem>
                      </SelectContent>
                    </Select>
                    {markupType === "percentage" ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-20"
                          value={markupPercentage}
                          onChange={(e) => setMarkupPercentage(parseFloat(e.target.value) || 0)}
                          placeholder="10"
                        />
                        <span className="text-sm">%</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">€</span>
                        <Input
                          type="number"
                          className="w-24"
                          value={markupFixed}
                          onChange={(e) => setMarkupFixed(parseFloat(e.target.value) || 0)}
                          placeholder="50"
                        />
                      </div>
                    )}
                    <span className="text-sm text-muted-foreground">
                      = €{totals.markupAmount.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Il markup non sarà visibile al cliente
                  </p>
                </div>

                <div className="border-t pt-2 flex justify-between text-lg font-bold text-primary">
                  <span>TOTALE CLIENTE</span>
                  <span>€{totals.total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annulla
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvataggio..." : (editQuote ? "Aggiorna Preventivo" : "Salva Preventivo")}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
