import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Phone, AlertTriangle, ChevronRight, X, Calendar, Users, CheckCircle, Trash2 } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

const MANAGED_NOTIFICATIONS_KEY = "managed_notifications";

interface ParticipantWithoutDeposit {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
}

interface TripNotification {
  tripId: string;
  tripTitle: string;
  destination: string;
  departureDate: string;
  daysUntilDeparture: number;
  participantsWithoutDeposit: ParticipantWithoutDeposit[];
}

// Tipo per notifica gestita
interface ManagedNotification {
  tripId: string;
  participantId: string;
  managedAt: string;
}

export function NotificationsCard() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<TripNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<TripNotification | null>(null);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [managedNotifications, setManagedNotifications] = useState<ManagedNotification[]>([]);

  // Carica notifiche gestite da localStorage
  useEffect(() => {
    const stored = localStorage.getItem(MANAGED_NOTIFICATIONS_KEY);
    if (stored) {
      try {
        setManagedNotifications(JSON.parse(stored));
      } catch (e) {
        console.error("Errore parsing notifiche gestite:", e);
      }
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const today = new Date();
      const thirtyDaysFromNow = addDays(today, 30);
      
      // Carica viaggi con partenza entro 30 giorni (solo viaggi multi-giornalieri)
      const { data: trips, error: tripsError } = await supabase
        .from("trips")
        .select("id, title, destination, departure_date, price, deposit_amount, deposit_type, trip_type")
        .eq("trip_type", "standard")
        .gte("departure_date", today.toISOString().split("T")[0])
        .lte("departure_date", thirtyDaysFromNow.toISOString().split("T")[0])
        .order("departure_date", { ascending: true });

      if (tripsError) throw tripsError;
      if (!trips || trips.length === 0) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const tripNotifications: TripNotification[] = [];

      for (const trip of trips) {
        // Carica partecipanti del viaggio (escludi infant)
        const { data: participants, error: participantsError } = await supabase
          .from("participants")
          .select("id, full_name, phone, email, is_infant")
          .eq("trip_id", trip.id)
          .eq("is_infant", false);

        if (participantsError) throw participantsError;
        if (!participants || participants.length === 0) continue;

        // Per ogni partecipante, verifica se ha versato un acconto
        const participantsWithoutDeposit: ParticipantWithoutDeposit[] = [];

        for (const participant of participants) {
          const { data: payments, error: paymentsError } = await supabase
            .from("payments")
            .select("amount, payment_type")
            .eq("participant_id", participant.id);

          if (paymentsError) throw paymentsError;

          // Verifica se ha almeno un pagamento di tipo "acconto" o qualsiasi pagamento
          const hasDeposit = payments && payments.some(p => 
            p.payment_type === "acconto" || p.payment_type === "saldo"
          );

          if (!hasDeposit) {
            participantsWithoutDeposit.push({
              id: participant.id,
              full_name: participant.full_name,
              phone: participant.phone,
              email: participant.email,
            });
          }
        }

        if (participantsWithoutDeposit.length > 0) {
          const daysUntil = differenceInDays(new Date(trip.departure_date), today);
          tripNotifications.push({
            tripId: trip.id,
            tripTitle: trip.title,
            destination: trip.destination,
            departureDate: trip.departure_date,
            daysUntilDeparture: daysUntil,
            participantsWithoutDeposit,
          });
        }
      }

      setNotifications(tripNotifications);
    } catch (error) {
      console.error("Errore caricamento notifiche:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtra le notifiche escludendo i partecipanti già gestiti
  const getFilteredNotifications = () => {
    return notifications.map(notification => ({
      ...notification,
      participantsWithoutDeposit: notification.participantsWithoutDeposit.filter(
        p => !managedNotifications.some(
          m => m.tripId === notification.tripId && m.participantId === p.id
        )
      )
    })).filter(n => n.participantsWithoutDeposit.length > 0);
  };

  const filteredNotifications = getFilteredNotifications();

  const totalParticipantsWithoutDeposit = filteredNotifications.reduce(
    (sum, n) => sum + n.participantsWithoutDeposit.length,
    0
  );

  // Segna un partecipante come gestito
  const markAsManaged = (tripId: string, participantId: string, participantName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    const newManagedNotification: ManagedNotification = {
      tripId,
      participantId,
      managedAt: new Date().toISOString()
    };
    
    const updated = [...managedNotifications, newManagedNotification];
    setManagedNotifications(updated);
    localStorage.setItem(MANAGED_NOTIFICATIONS_KEY, JSON.stringify(updated));
    
    toast({
      title: "Notifica gestita",
      description: `${participantName} è stato segnato come gestito`,
    });

    // Aggiorna la notifica selezionata se necessario
    if (selectedNotification && selectedNotification.tripId === tripId) {
      const updatedParticipants = selectedNotification.participantsWithoutDeposit.filter(
        p => p.id !== participantId
      );
      if (updatedParticipants.length === 0) {
        setSelectedNotification(null);
      } else {
        setSelectedNotification({
          ...selectedNotification,
          participantsWithoutDeposit: updatedParticipants
        });
      }
    }
  };

  // Segna tutti i partecipanti di un viaggio come gestiti
  const markAllAsManaged = (notification: TripNotification, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    const newManagedNotifications: ManagedNotification[] = notification.participantsWithoutDeposit.map(p => ({
      tripId: notification.tripId,
      participantId: p.id,
      managedAt: new Date().toISOString()
    }));
    
    const updated = [...managedNotifications, ...newManagedNotifications];
    setManagedNotifications(updated);
    localStorage.setItem(MANAGED_NOTIFICATIONS_KEY, JSON.stringify(updated));
    
    toast({
      title: "Viaggio gestito",
      description: `${notification.participantsWithoutDeposit.length} partecipanti segnati come gestiti`,
    });
    
    setSelectedNotification(null);
  };

  // Ripristina tutte le notifiche gestite
  const clearManagedNotifications = () => {
    setManagedNotifications([]);
    localStorage.removeItem(MANAGED_NOTIFICATIONS_KEY);
    toast({
      title: "Notifiche ripristinate",
      description: "Tutte le notifiche sono state ripristinate",
    });
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 7) return "destructive";
    if (days <= 14) return "default";
    return "secondary";
  };

  const getUrgencyText = (days: number) => {
    if (days === 0) return "Oggi!";
    if (days === 1) return "Domani!";
    if (days <= 7) return `${days} giorni`;
    return `${days} giorni`;
  };

  if (loading) {
    return (
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Notifiche</CardTitle>
          <Bell className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Notifiche</CardTitle>
            {totalParticipantsWithoutDeposit > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                {totalParticipantsWithoutDeposit}
              </Badge>
            )}
          </div>
          <Bell className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">Nessuna notifica</p>
              <p className="text-xs text-muted-foreground mt-1">Tutti gli acconti sono stati versati</p>
              {managedNotifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs text-muted-foreground"
                  onClick={clearManagedNotifications}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Ripristina notifiche gestite ({managedNotifications.length})
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {filteredNotifications.length} viaggio/i con acconti mancanti
                </p>
                {managedNotifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground"
                    onClick={clearManagedNotifications}
                    title="Ripristina notifiche gestite"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <ScrollArea className="max-h-32">
                <div className="space-y-1.5">
                  {filteredNotifications.slice(0, 3).map((notification) => (
                    <div
                      key={notification.tripId}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted cursor-pointer transition-colors text-sm"
                      onClick={() => {
                        setSelectedNotification(notification);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{notification.tripTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {notification.participantsWithoutDeposit.length} da contattare
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getUrgencyColor(notification.daysUntilDeparture)} className="text-xs">
                          {getUrgencyText(notification.daysUntilDeparture)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                          onClick={(e) => markAllAsManaged(notification, e)}
                          title="Segna tutti come gestiti"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {filteredNotifications.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAllNotifications(true)}
                >
                  +{filteredNotifications.length - 3} altri viaggi - Vedi tutti
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog tutti i viaggi */}
      <Dialog open={showAllNotifications} onOpenChange={setShowAllNotifications}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-destructive" />
              Tutti i Viaggi con Acconti Mancanti
            </DialogTitle>
            <DialogDescription>
              {notifications.length} viaggi con partecipanti da contattare
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-80">
            <div className="space-y-2">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.tripId}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => {
                    setShowAllNotifications(false);
                    setSelectedNotification(notification);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{notification.tripTitle}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(notification.departureDate), "dd MMM yyyy", { locale: it })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {notification.participantsWithoutDeposit.length} da contattare
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getUrgencyColor(notification.daysUntilDeparture)} className="text-xs">
                      {getUrgencyText(notification.daysUntilDeparture)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                      onClick={(e) => markAllAsManaged(notification, e)}
                      title="Segna tutti come gestiti"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog dettaglio notifica */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-destructive" />
              Partecipanti da Contattare
            </DialogTitle>
            <DialogDescription>
              Partecipanti senza acconto per questo viaggio
            </DialogDescription>
          </DialogHeader>

          {selectedNotification && (
            <div className="space-y-4">
              {/* Info viaggio */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{selectedNotification.tripTitle}</h3>
                  <Badge variant={getUrgencyColor(selectedNotification.daysUntilDeparture)}>
                    {getUrgencyText(selectedNotification.daysUntilDeparture)}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(selectedNotification.departureDate), "dd MMMM yyyy", { locale: it })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {selectedNotification.participantsWithoutDeposit.length} partecipanti
                  </span>
                </div>
              </div>

              {/* Lista partecipanti */}
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {selectedNotification.participantsWithoutDeposit.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <p className="font-medium">{participant.full_name}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {participant.phone && (
                            <a 
                              href={`tel:${participant.phone}`}
                              className="flex items-center gap-1 hover:text-primary"
                            >
                              <Phone className="h-3 w-3" />
                              {participant.phone}
                            </a>
                          )}
                          {participant.email && (
                            <a 
                              href={`mailto:${participant.email}`}
                              className="hover:text-primary"
                            >
                              {participant.email}
                            </a>
                          )}
                          {!participant.phone && !participant.email && (
                            <span className="text-muted-foreground italic">
                              Nessun contatto disponibile
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {participant.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => window.open(`tel:${participant.phone}`, '_self')}
                          >
                            <Phone className="h-3.5 w-3.5" />
                            Chiama
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                          onClick={(e) => markAsManaged(selectedNotification.tripId, participant.id, participant.full_name, e)}
                          title="Segna come gestito"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Gestito
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Azioni */}
              <div className="flex justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedNotification(null)}
                >
                  Chiudi
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="gap-1 text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                    onClick={(e) => markAllAsManaged(selectedNotification, e)}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Segna tutti gestiti
                  </Button>
                  <Button
                    onClick={() => {
                      navigate(`/viaggi/${selectedNotification.tripId}`);
                      setSelectedNotification(null);
                    }}
                  >
                    Vai al Viaggio
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
