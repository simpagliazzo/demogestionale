import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Calendar, Eye } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface ParticipantWithTrip {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  created_at: string;
  trip: {
    id: string;
    title: string;
    destination: string;
    departure_date: string;
    return_date: string;
    status: string;
  };
}

const statusColors = {
  planned: "bg-blue-500",
  confirmed: "bg-green-500",
  ongoing: "bg-yellow-500",
  completed: "bg-gray-500",
  cancelled: "bg-red-500",
};

const statusLabels = {
  planned: "Pianificato",
  confirmed: "Confermato",
  ongoing: "In Corso",
  completed: "Completato",
  cancelled: "Annullato",
};

export default function Partecipanti() {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<ParticipantWithTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadParticipants();
  }, []);

  const loadParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from("participants")
        .select(`
          id,
          full_name,
          email,
          phone,
          date_of_birth,
          place_of_birth,
          created_at,
          trip:trips (
            id,
            title,
            destination,
            departure_date,
            return_date,
            status
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filtra solo i partecipanti con viaggio associato
      const validParticipants = data?.filter(p => p.trip) as ParticipantWithTrip[];
      setParticipants(validParticipants || []);
    } catch (error) {
      console.error("Errore caricamento partecipanti:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredParticipants = () => {
    if (!searchQuery) return participants;
    
    const query = searchQuery.toLowerCase();
    return participants.filter(p => 
      p.full_name.toLowerCase().includes(query) ||
      p.email?.toLowerCase().includes(query) ||
      p.phone?.includes(query) ||
      p.trip.title.toLowerCase().includes(query) ||
      p.trip.destination.toLowerCase().includes(query)
    );
  };

  const getParticipantTripHistory = (participantName: string) => {
    return participants.filter(p => 
      p.full_name.toLowerCase() === participantName.toLowerCase()
    );
  };

  const filteredParticipants = getFilteredParticipants();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl font-bold mb-2">Partecipanti</h1>
        <p className="text-muted-foreground">
          Tutti i partecipanti ai viaggi con ricerca e storico
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Ricerca Partecipante
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome, email, telefono o viaggio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Risultati ({filteredParticipants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredParticipants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery 
                ? "Nessun partecipante trovato con questi criteri" 
                : "Nessun partecipante registrato"}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredParticipants.map((participant) => {
                const tripHistory = getParticipantTripHistory(participant.full_name);
                const hasMultipleTrips = tripHistory.length > 1;

                return (
                  <div
                    key={participant.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{participant.full_name}</h3>
                          {hasMultipleTrips && (
                            <Badge variant="secondary" className="text-xs">
                              {tripHistory.length} viaggi
                            </Badge>
                          )}
                        </div>
                        
                        {(participant.email || participant.phone) && (
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            {participant.email && <span>✉ {participant.email}</span>}
                            {participant.phone && <span>📞 {participant.phone}</span>}
                          </div>
                        )}

                        {(participant.date_of_birth || participant.place_of_birth) && (
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            {participant.date_of_birth && (
                              <span>
                                Nato il {format(new Date(participant.date_of_birth), "dd/MM/yyyy")}
                              </span>
                            )}
                            {participant.place_of_birth && (
                              <span>a {participant.place_of_birth}</span>
                            )}
                          </div>
                        )}

                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium">Viaggio attuale:</span>
                            <Badge className={`${statusColors[participant.trip.status as keyof typeof statusColors]} text-white`}>
                              {statusLabels[participant.trip.status as keyof typeof statusLabels]}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="font-medium">{participant.trip.title}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {participant.trip.destination}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(participant.trip.departure_date), "dd MMM yyyy", { locale: it })}
                              {" - "}
                              {format(new Date(participant.trip.return_date), "dd MMM yyyy", { locale: it })}
                            </div>
                          </div>
                        </div>

                        {hasMultipleTrips && (
                          <details className="pt-2">
                            <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">
                              Mostra storico viaggi ({tripHistory.length})
                            </summary>
                            <div className="mt-3 space-y-2 pl-4 border-l-2 border-primary/20">
                              {tripHistory.map((trip, index) => (
                                <div key={trip.id} className="text-sm">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {format(new Date(trip.trip.departure_date), "MMM yyyy", { locale: it })}
                                    </Badge>
                                    <span className="font-medium">{trip.trip.title}</span>
                                  </div>
                                  <p className="text-muted-foreground ml-2">{trip.trip.destination}</p>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/viaggi/${participant.trip.id}`)}
                        className="shrink-0"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Vedi Viaggio
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
