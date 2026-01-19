import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, MapPin, Calendar, Users, DollarSign, Search } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useUserRole } from "@/hooks/use-user-role";
import { useNavigate } from "react-router-dom";
import CreateTripDialog from "@/components/CreateTripDialog";

interface Trip {
  id: string;
  title: string;
  description: string | null;
  destination: string;
  departure_date: string;
  return_date: string;
  price: number;
  deposit_amount: number;
  max_participants: number | null;
  status: string;
  participantCount?: number;
}

const statusColors = {
  planned: "bg-blue-500",
  confirmed: "bg-green-500",
  ongoing: "bg-orange-500",
  completed: "bg-yellow-500",
  cancelled: "bg-red-500",
};

const statusLabels = {
  planned: "Pianificato",
  confirmed: "Confermato",
  ongoing: "In Corso",
  completed: "Completato",
  cancelled: "Annullato",
};

export default function Viaggi() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { isAdmin, isAgent } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      // Solo viaggi con return_date >= oggi (non archiviati)
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .gte("return_date", today)
        .order("departure_date", { ascending: true });

      if (error) throw error;

      // Carica il conteggio partecipanti per ogni viaggio
      const tripsWithCount = await Promise.all(
        (data || []).map(async (trip) => {
          const { count } = await supabase
            .from("participants")
            .select("*", { count: "exact", head: true })
            .eq("trip_id", trip.id);

          return {
            ...trip,
            participantCount: count || 0,
          };
        })
      );

      setTrips(tripsWithCount);
    } catch (error) {
      console.error("Errore caricamento viaggi:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtra viaggi per ricerca
  const filteredTrips = trips.filter((trip) => {
    const query = searchQuery.toLowerCase();
    return (
      trip.title.toLowerCase().includes(query) ||
      trip.destination.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">Viaggi</h1>
          <p className="text-muted-foreground">
            Gestisci i viaggi di gruppo dell'agenzia
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Barra di ricerca */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca viaggio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {(isAdmin || isAgent) && (
            <Button className="gap-2 whitespace-nowrap" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Crea Viaggio
            </Button>
          )}
        </div>
      </div>

      {filteredTrips.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? "Nessun risultato" : "Nessun viaggio"}
            </h3>
            <p className="text-muted-foreground text-center mb-6">
              {searchQuery
                ? "Prova con una ricerca diversa"
                : "Inizia creando il primo viaggio di gruppo"}
            </p>
            {!searchQuery && (isAdmin || isAgent) && (
              <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Crea Primo Viaggio
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTrips.map((trip) => (
            <Card
              key={trip.id}
              className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
              onClick={() => navigate(`/viaggi/${trip.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="line-clamp-1">{trip.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {trip.destination}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`${statusColors[trip.status as keyof typeof statusColors]} text-white`}
                  >
                    {statusLabels[trip.status as keyof typeof statusLabels]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {trip.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {trip.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>
                      {format(new Date(trip.departure_date), "dd MMM", { locale: it })} -{" "}
                      {format(new Date(trip.return_date), "dd MMM yyyy", { locale: it })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-secondary" />
                    <span>
                      {trip.participantCount} partecipanti
                      {trip.max_participants && ` / ${trip.max_participants} max`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-accent" />
                    <span>
                      €{trip.price.toLocaleString("it-IT")} (acconto €
                      {trip.deposit_amount.toLocaleString("it-IT")})
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/viaggi/${trip.id}`);
                    }}
                  >
                    Visualizza Dettagli
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateTripDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadTrips}
      />
    </div>
  );
}
