import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Users, DollarSign, MapPin } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface DashboardStats {
  totalTrips: number;
  upcomingTrips: number;
  totalParticipants: number;
  totalRevenue: number;
}

interface UpcomingTrip {
  id: string;
  title: string;
  destination: string;
  departure_date: string;
  participantCount: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTrips: 0,
    upcomingTrips: 0,
    totalParticipants: 0,
    totalRevenue: 0,
  });
  const [upcomingTrips, setUpcomingTrips] = useState<UpcomingTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Carica statistiche viaggi
      const { data: trips, error: tripsError } = await supabase
        .from("trips")
        .select("*");

      if (tripsError) throw tripsError;

      const today = new Date().toISOString().split("T")[0];
      const upcoming = trips?.filter((trip) => trip.departure_date >= today) || [];

      // Carica partecipanti
      const { data: participants, error: participantsError } = await supabase
        .from("participants")
        .select("*");

      if (participantsError) throw participantsError;

      // Carica pagamenti
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("amount");

      if (paymentsError) throw paymentsError;

      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      setStats({
        totalTrips: trips?.length || 0,
        upcomingTrips: upcoming.length,
        totalParticipants: participants?.length || 0,
        totalRevenue,
      });

      // Carica prossimi viaggi con conteggio partecipanti
      const upcomingWithParticipants = await Promise.all(
        upcoming.slice(0, 5).map(async (trip) => {
          const { count } = await supabase
            .from("participants")
            .select("*", { count: "exact", head: true })
            .eq("trip_id", trip.id);

          return {
            id: trip.id,
            title: trip.title,
            destination: trip.destination,
            departure_date: trip.departure_date,
            participantCount: count || 0,
          };
        })
      );

      setUpcomingTrips(upcomingWithParticipants);
    } catch (error) {
      console.error("Errore caricamento dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="font-display text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Panoramica generale dell'agenzia viaggi
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viaggi Totali</CardTitle>
            <MapPin className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalTrips}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.upcomingTrips} prossimi
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prossime Partenze</CardTitle>
            <CalendarDays className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.upcomingTrips}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Viaggi pianificati
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partecipanti</CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalParticipants}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Totale iscritti
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incassi Totali</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              €{stats.totalRevenue.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pagamenti ricevuti
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prossime Partenze</CardTitle>
          <CardDescription>
            Viaggi in programma nei prossimi mesi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingTrips.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nessun viaggio in programma
            </p>
          ) : (
            <div className="space-y-4">
              {upcomingTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="space-y-1">
                    <h4 className="font-semibold">{trip.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {trip.destination}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {format(new Date(trip.departure_date), "dd MMM yyyy", {
                        locale: it,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {trip.participantCount} partecipanti
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
