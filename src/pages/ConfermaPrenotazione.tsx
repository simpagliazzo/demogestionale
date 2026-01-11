import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, MapPin, Calendar, Bus, AlertCircle, FileText, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatPhoneForWhatsApp, openWhatsApp } from "@/hooks/use-whatsapp-templates";

interface BookingData {
  token: string;
  participant_id: string;
  trip_id: string;
  confirmed_at: string | null;
  expires_at: string;
  participant: {
    full_name: string;
    phone: string | null;
    email: string | null;
  };
  trip: {
    title: string;
    destination: string;
    departure_date: string;
    return_date: string;
    price: number;
  };
}

interface AgencySettings {
  business_name: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  travel_conditions: string | null;
  whatsapp_notification_phone: string | null;
}

export default function ConfermaPrenotazione() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [agencySettings, setAgencySettings] = useState<AgencySettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConditions, setShowConditions] = useState(false);

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) {
      setError("Token non valido");
      setLoading(false);
      return;
    }

    try {
      // Carica dati del token con partecipante e viaggio
      const { data: tokenData, error: tokenError } = await supabase
        .from("booking_confirmation_tokens")
        .select(`
          token,
          participant_id,
          trip_id,
          confirmed_at,
          expires_at
        `)
        .eq("token", token)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (tokenError || !tokenData) {
        setError("Link non valido o scaduto");
        setLoading(false);
        return;
      }

      // Carica partecipante
      const { data: participant, error: participantError } = await supabase
        .from("participants")
        .select("full_name, phone, email")
        .eq("id", tokenData.participant_id)
        .single();

      if (participantError || !participant) {
        setError("Partecipante non trovato");
        setLoading(false);
        return;
      }

      // Carica viaggio
      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .select("title, destination, departure_date, return_date, price")
        .eq("id", tokenData.trip_id)
        .single();

      if (tripError || !trip) {
        setError("Viaggio non trovato");
        setLoading(false);
        return;
      }

      // Carica impostazioni agenzia
      const { data: agency } = await supabase
        .from("agency_settings")
        .select("*")
        .limit(1)
        .single();

      setBookingData({
        ...tokenData,
        participant,
        trip,
      });
      setAgencySettings(agency);
    } catch (err) {
      console.error("Errore nel caricamento:", err);
      setError("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!bookingData || !token || !agencySettings) return;

    setConfirming(true);
    try {
      // Aggiorna il token come confermato
      const { error } = await supabase
        .from("booking_confirmation_tokens")
        .update({ confirmed_at: new Date().toISOString() })
        .eq("token", token);

      if (error) throw error;

      // Invia notifica WhatsApp all'agenzia
      const notificationPhone = formatPhoneForWhatsApp(agencySettings.whatsapp_notification_phone || agencySettings.phone);
      
      if (notificationPhone) {
        const departureDate = format(new Date(bookingData.trip.departure_date), "d MMMM yyyy", { locale: it });
        const confirmationDate = format(new Date(), "d MMMM yyyy 'alle' HH:mm", { locale: it });
        
        const message = `✅ *CONFERMA RICEVUTA*

Il cliente *${bookingData.participant.full_name}* ha confermato la prenotazione per:

🚌 *${bookingData.trip.title}*
📍 ${bookingData.trip.destination}
📅 Partenza: ${departureDate}

⏰ Confermato il: ${confirmationDate}
${bookingData.participant.phone ? `📞 Tel: ${bookingData.participant.phone}` : ""}`;

        openWhatsApp(notificationPhone, message);
      }

      // Aggiorna lo stato locale
      setBookingData({
        ...bookingData,
        confirmed_at: new Date().toISOString(),
      });

      toast.success("Prenotazione confermata con successo!");
    } catch (err) {
      console.error("Errore nella conferma:", err);
      toast.error("Errore nella conferma della prenotazione");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-destructive mb-2">Errore</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!bookingData) return null;

  const departureDate = format(new Date(bookingData.trip.departure_date), "EEEE d MMMM yyyy", { locale: it });
  const returnDate = format(new Date(bookingData.trip.return_date), "EEEE d MMMM yyyy", { locale: it });
  const isConfirmed = !!bookingData.confirmed_at;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header Agenzia */}
        {agencySettings && (
          <div className="text-center space-y-2">
            {agencySettings.logo_url && (
              <img
                src={agencySettings.logo_url}
                alt={agencySettings.business_name}
                className="h-16 mx-auto object-contain"
              />
            )}
            <h1 className="text-2xl font-bold">{agencySettings.business_name}</h1>
            {agencySettings.phone && (
              <p className="text-sm text-muted-foreground">Tel. {agencySettings.phone}</p>
            )}
          </div>
        )}

        {/* Card Principale */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Conferma Prenotazione</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Nome partecipante */}
            <div className="text-center">
              <p className="text-2xl font-bold">{bookingData.participant.full_name}</p>
            </div>

            {/* Info Viaggio */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Bus className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-lg font-bold">{bookingData.trip.title}</p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{bookingData.trip.destination}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Date */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-muted/20">
                <CardContent className="pt-4 text-center">
                  <Calendar className="h-5 w-5 mx-auto text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">PARTENZA</p>
                  <p className="font-semibold text-sm capitalize">{departureDate}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/20">
                <CardContent className="pt-4 text-center">
                  <Calendar className="h-5 w-5 mx-auto text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">RITORNO</p>
                  <p className="font-semibold text-sm capitalize">{returnDate}</p>
                </CardContent>
              </Card>
            </div>

            {/* Prezzo */}
            <Card className="bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Quota di partecipazione</span>
                  <span className="text-xl font-bold">€{bookingData.trip.price.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Condizioni di viaggio */}
            {agencySettings?.travel_conditions && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowConditions(!showConditions)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {showConditions ? "Nascondi condizioni" : "Leggi condizioni di viaggio"}
                </Button>
                
                {showConditions && (
                  <Card className="mt-3 bg-muted/20">
                    <CardContent className="pt-4">
                      <h4 className="font-semibold mb-2">Condizioni di Viaggio</h4>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto">
                        {agencySettings.travel_conditions}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Pulsante Conferma */}
            {isConfirmed ? (
              <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-50 to-transparent dark:from-green-900/20">
                <CardContent className="pt-6 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">
                    Prenotazione Confermata!
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Confermato il {format(new Date(bookingData.confirmed_at!), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-center text-muted-foreground">
                  Cliccando "Conferma" accetti le condizioni di viaggio e confermi la tua partecipazione.
                </p>
                <Button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                >
                  {confirming ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-5 w-5 mr-2" />
                  )}
                  CONFERMA PRENOTAZIONE
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer contatti */}
        {agencySettings && (
          <div className="text-center text-sm text-muted-foreground space-y-1">
            {agencySettings.email && <p>{agencySettings.email}</p>}
            {agencySettings.website && <p>{agencySettings.website}</p>}
            {agencySettings.address && (
              <p>{agencySettings.address}{agencySettings.city ? `, ${agencySettings.city}` : ""}{agencySettings.province ? ` (${agencySettings.province})` : ""}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}