import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MapPin, Calendar, Users, DollarSign, Plus, Hotel, Bus, User } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useUserRole } from "@/hooks/use-user-role";
import { toast } from "sonner";
import AddParticipantDialog from "@/components/AddParticipantDialog";

interface Trip {
  id: string;
  title: string;
  description: string | null;
  destination: string;
  departure_date: string;
  return_date: string;
  price: number;
  deposit_type: "fixed" | "percentage";
  deposit_amount: number;
  max_participants: number | null;
  status: string;
}

interface Participant {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  place_of_birth: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

interface Hotel {
  id: string;
  name: string;
  address: string | null;
  check_in_date: string;
  check_out_date: string;
}

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  capacity: number;
  hotel_id: string;
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

export default function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [carriers, setCarriers] = useState<{ id: string; name: string }[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState<string>("");
  const [companion, setCompanion] = useState<string>("");
  const [allotmentData, setAllotmentData] = useState({
    singole: 0,
    doppie: 0,
    matrimoniali: 0,
    triple: 0,
    quadruple: 0,
  });
  const { isAdmin, isAgent } = useUserRole();

  useEffect(() => {
    loadTripDetails();
    loadCarriers();
  }, [id]);

  const loadCarriers = async () => {
    try {
      const { data, error } = await supabase
        .from("bus_carriers")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCarriers(data || []);
    } catch (error) {
      console.error("Errore caricamento vettori:", error);
    }
  };

  const loadTripDetails = async () => {
    try {
      // Carica viaggio
      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .select("*")
        .eq("id", id)
        .single();

      if (tripError) throw tripError;
      setTrip(tripData);

      // Carica partecipanti
      const { data: participantsData, error: participantsError } = await supabase
        .from("participants")
        .select("*")
        .eq("trip_id", id)
        .order("full_name");

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);

      // Carica hotel
      const { data: hotelsData, error: hotelsError } = await supabase
        .from("hotels")
        .select("*")
        .eq("trip_id", id);

      if (hotelsError) throw hotelsError;
      setHotels(hotelsData || []);

      // Carica camere
      if (hotelsData && hotelsData.length > 0) {
        const hotelIds = hotelsData.map(h => h.id);
        const { data: roomsData, error: roomsError } = await supabase
          .from("rooms")
          .select("*")
          .in("hotel_id", hotelIds);

        if (roomsError) throw roomsError;
        setRooms(roomsData || []);
      }
    } catch (error) {
      console.error("Errore caricamento dettagli:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRoomTypeCount = () => {
    const counts: Record<string, number> = {};
    rooms.forEach(room => {
      counts[room.room_type] = (counts[room.room_type] || 0) + 1;
    });
    return counts;
  };

  const getAvailableSpots = () => {
    if (!trip?.max_participants) return "Illimitati";
    return trip.max_participants - participants.length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Viaggio non trovato</p>
        <Button onClick={() => navigate("/viaggi")} className="mt-4">
          Torna ai viaggi
        </Button>
      </div>
    );
  }

  const roomTypeCounts = getRoomTypeCount();
  const depositDisplay = trip.deposit_type === "percentage" 
    ? `${trip.deposit_amount}%` 
    : `€${trip.deposit_amount.toLocaleString("it-IT")}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/viaggi")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-4xl font-bold">{trip.title}</h1>
            <Badge className={`${statusColors[trip.status as keyof typeof statusColors]} text-white`}>
              {statusLabels[trip.status as keyof typeof statusLabels]}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {trip.destination}
          </div>
        </div>
      </div>

      {trip.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{trip.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Iscritti</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{participants.length}</div>
            <p className="text-xs text-muted-foreground">
              {trip.max_participants && `su ${trip.max_participants} posti`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponibilità</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getAvailableSpots()}</div>
            <p className="text-xs text-muted-foreground">posti rimasti</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prezzo</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{trip.price.toLocaleString("it-IT")}</div>
            <p className="text-xs text-muted-foreground">Acconto: {depositDisplay}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Partenza</p>
              <p className="font-medium">
                {format(new Date(trip.departure_date), "dd MMMM yyyy", { locale: it })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ritorno</p>
              <p className="font-medium">
                {format(new Date(trip.return_date), "dd MMMM yyyy", { locale: it })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5" />
              Società Bus
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(isAdmin || isAgent) ? (
              <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona vettore" />
                </SelectTrigger>
                <SelectContent>
                  {carriers.map((carrier) => (
                    <SelectItem key={carrier.id} value={carrier.id}>
                      {carrier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                {selectedCarrier || "Non ancora assegnato"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Accompagnatore
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(isAdmin || isAgent) ? (
              <div className="space-y-2">
                <Label htmlFor="companion">Nome Accompagnatore</Label>
                <Input
                  id="companion"
                  value={companion}
                  onChange={(e) => setCompanion(e.target.value)}
                  placeholder="Inserisci nome accompagnatore"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {companion || "Non ancora assegnato"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hotel className="h-5 w-5" />
              Allotment Camere
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(isAdmin || isAgent) ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="singole" className="text-xs">Singole</Label>
                    <Input
                      id="singole"
                      type="number"
                      min="0"
                      value={allotmentData.singole}
                      onChange={(e) => setAllotmentData({...allotmentData, singole: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="doppie" className="text-xs">Doppie</Label>
                    <Input
                      id="doppie"
                      type="number"
                      min="0"
                      value={allotmentData.doppie}
                      onChange={(e) => setAllotmentData({...allotmentData, doppie: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="matrimoniali" className="text-xs">Matrimoniali</Label>
                    <Input
                      id="matrimoniali"
                      type="number"
                      min="0"
                      value={allotmentData.matrimoniali}
                      onChange={(e) => setAllotmentData({...allotmentData, matrimoniali: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="triple" className="text-xs">Triple</Label>
                    <Input
                      id="triple"
                      type="number"
                      min="0"
                      value={allotmentData.triple}
                      onChange={(e) => setAllotmentData({...allotmentData, triple: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="quadruple" className="text-xs">Quadruple</Label>
                    <Input
                      id="quadruple"
                      type="number"
                      min="0"
                      value={allotmentData.quadruple}
                      onChange={(e) => setAllotmentData({...allotmentData, quadruple: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>
            ) : (
              Object.keys(roomTypeCounts).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(roomTypeCounts).map(([type, count]) => (
                    <div key={type} className="flex justify-between">
                      <span className="capitalize">{type}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nessuna camera configurata</p>
              )
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Partecipanti ({participants.length})</CardTitle>
            {(isAdmin || isAgent) && (
              <Button onClick={() => setAddParticipantOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Aggiungi Partecipante
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessun partecipante ancora iscritto
            </div>
          ) : (
            <div className="space-y-2">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{participant.full_name}</p>
                    <div className="text-sm text-muted-foreground space-y-1 mt-1">
                      {participant.date_of_birth && (
                        <p>Nato/a il {format(new Date(participant.date_of_birth), "dd/MM/yyyy")}</p>
                      )}
                      {participant.place_of_birth && (
                        <p>a {participant.place_of_birth}</p>
                      )}
                      {participant.notes && (
                        <p className="text-xs mt-2 italic">Nota: {participant.notes}</p>
                      )}
                    </div>
                  </div>
                  {(participant.email || participant.phone) && (
                    <div className="text-sm text-muted-foreground text-right">
                      {participant.email && <p>{participant.email}</p>}
                      {participant.phone && <p>{participant.phone}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddParticipantDialog
        tripId={id!}
        open={addParticipantOpen}
        onOpenChange={setAddParticipantOpen}
        onSuccess={loadTripDetails}
      />
    </div>
  );
}
