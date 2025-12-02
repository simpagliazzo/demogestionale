import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MapPin, Calendar, Users, DollarSign, Plus, Hotel, Bus, User, Save, Search, Euro, TrendingUp, FileText, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useUserRole } from "@/hooks/use-user-role";
import { toast } from "sonner";
import AddParticipantDialog from "@/components/AddParticipantDialog";
import EditParticipantDialog from "@/components/EditParticipantDialog";

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
  allotment_singole: number;
  allotment_doppie: number;
  allotment_matrimoniali: number;
  allotment_triple: number;
  allotment_quadruple: number;
  carrier_id: string | null;
  companion_name: string | null;
}

interface Participant {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  place_of_birth: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
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
  const [editParticipantOpen, setEditParticipantOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [carriers, setCarriers] = useState<{ id: string; name: string }[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState<string>("");
  const [busTypes, setBusTypes] = useState<{ id: string; name: string; total_seats: number }[]>([]);
  const [selectedBusType, setSelectedBusType] = useState<string>("");
  const [companion, setCompanion] = useState<string>("");
  const [allotmentData, setAllotmentData] = useState({
    singole: 0,
    doppie: 0,
    matrimoniali: 0,
    triple: 0,
    quadruple: 0,
  });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortAlphabetically, setSortAlphabetically] = useState<boolean>(false);
  const [groupByRoom, setGroupByRoom] = useState<boolean>(false);
  const [totalDeposits, setTotalDeposits] = useState<number>(0);
  const { isAdmin, isAgent } = useUserRole();

  useEffect(() => {
    loadTripDetails();
    loadCarriers();
    loadBusTypes();
  }, [id]);

  useEffect(() => {
    if (participants.length > 0) {
      loadPayments();
    }
  }, [participants]);

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

  const loadBusTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("bus_types")
        .select("id, name, total_seats")
        .order("name");

      if (error) throw error;
      setBusTypes(data || []);
    } catch (error) {
      console.error("Errore caricamento tipi bus:", error);
    }
  };

  const loadPayments = async () => {
    try {
      const participantIds = participants.map(p => p.id);
      const { data, error } = await supabase
        .from("payments")
        .select("amount")
        .in("participant_id", participantIds);

      if (error) throw error;
      
      const total = data?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
      setTotalDeposits(total);
    } catch (error) {
      console.error("Errore caricamento pagamenti:", error);
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
      
      // Carica dati allotment, carrier e companion dal database
      if (tripData) {
        setAllotmentData({
          singole: tripData.allotment_singole || 0,
          doppie: tripData.allotment_doppie || 0,
          matrimoniali: tripData.allotment_matrimoniali || 0,
          triple: tripData.allotment_triple || 0,
          quadruple: tripData.allotment_quadruple || 0,
        });
        setSelectedCarrier(tripData.carrier_id || "");
        setCompanion(tripData.companion_name || "");

        // Carica il tipo di bus dalla configurazione
        const { data: busConfig } = await supabase
          .from("bus_configurations")
          .select("bus_type_id")
          .eq("trip_id", tripData.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (busConfig?.bus_type_id) {
          setSelectedBusType(busConfig.bus_type_id);
        }
      }

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

  const getRoomOccupancy = () => {
    const occupied = {
      singole: 0,
      doppie: 0,
      matrimoniali: 0,
      triple: 0,
      quadruple: 0,
    };

    // Raggruppa partecipanti per created_at e tipo di camera
    const roomGroups: Record<string, number> = {};
    
    participants.forEach(p => {
      if (p.notes) {
        let roomType = '';
        if (p.notes.includes("Camera: singola")) roomType = 'singole';
        else if (p.notes.includes("Camera: doppia")) roomType = 'doppie';
        else if (p.notes.includes("Camera: matrimoniale")) roomType = 'matrimoniali';
        else if (p.notes.includes("Camera: tripla")) roomType = 'triple';
        else if (p.notes.includes("Camera: quadrupla")) roomType = 'quadruple';
        
        if (roomType) {
          const groupKey = `${roomType}-${p.created_at}`;
          roomGroups[groupKey] = 1; // Ogni gruppo (stesso created_at) = 1 camera
        }
      }
    });

    // Conta le camere uniche (non i partecipanti)
    Object.keys(roomGroups).forEach(key => {
      const roomType = key.split('-')[0] as keyof typeof occupied;
      occupied[roomType]++;
    });

    return occupied;
  };

  const handleEditParticipant = (participant: Participant) => {
    setSelectedParticipant(participant);
    setEditParticipantOpen(true);
  };

  const saveAllotment = async () => {
    if (!trip || !isAdmin) return;
    
    try {
      const { error } = await supabase
        .from("trips")
        .update({
          allotment_singole: allotmentData.singole,
          allotment_doppie: allotmentData.doppie,
          allotment_matrimoniali: allotmentData.matrimoniali,
          allotment_triple: allotmentData.triple,
          allotment_quadruple: allotmentData.quadruple,
        })
        .eq("id", trip.id);

      if (error) throw error;
      toast.success("Allotment salvato con successo");
      loadTripDetails();
    } catch (error) {
      console.error("Errore salvataggio allotment:", error);
      toast.error("Errore nel salvataggio dell'allotment");
    }
  };

  const saveCarrier = async (carrierId: string) => {
    if (!trip) return;
    
    try {
      const { error } = await supabase
        .from("trips")
        .update({ carrier_id: carrierId || null })
        .eq("id", trip.id);

      if (error) throw error;
      toast.success("Vettore salvato con successo");
    } catch (error) {
      console.error("Errore salvataggio vettore:", error);
      toast.error("Errore nel salvataggio del vettore");
    }
  };

  const saveCompanion = async () => {
    if (!trip) return;
    
    try {
      const { error } = await supabase
        .from("trips")
        .update({ companion_name: companion || null })
        .eq("id", trip.id);

      if (error) throw error;
      toast.success("Accompagnatore salvato con successo");
    } catch (error) {
      console.error("Errore salvataggio accompagnatore:", error);
      toast.error("Errore nel salvataggio dell'accompagnatore");
    }
  };

  const saveBusType = async (busTypeId: string) => {
    if (!trip) return;
    
    try {
      // Controlla se esiste già una configurazione bus
      const { data: existingConfig } = await supabase
        .from("bus_configurations")
        .select("id")
        .eq("trip_id", trip.id)
        .limit(1)
        .maybeSingle();

      if (busTypeId) {
        // Carica i dati del tipo di bus selezionato
        const { data: busType } = await supabase
          .from("bus_types")
          .select("*")
          .eq("id", busTypeId)
          .single();

        if (!busType) throw new Error("Tipo di bus non trovato");

        if (existingConfig) {
          // Aggiorna la configurazione esistente
          const { error } = await supabase
            .from("bus_configurations")
            .update({
              bus_type_id: busTypeId,
              rows: busType.rows,
              seats_per_row: busType.seats_per_row,
              total_seats: busType.total_seats,
            })
            .eq("id", existingConfig.id);

          if (error) throw error;
        } else {
          // Crea una nuova configurazione
          const { error } = await supabase
            .from("bus_configurations")
            .insert({
              trip_id: trip.id,
              bus_type_id: busTypeId,
              rows: busType.rows,
              seats_per_row: busType.seats_per_row,
              total_seats: busType.total_seats,
            });

          if (error) throw error;
        }
      } else if (existingConfig) {
        // Se deselezionato, rimuovi il bus_type_id ma mantieni la configurazione
        const { error } = await supabase
          .from("bus_configurations")
          .update({ bus_type_id: null })
          .eq("id", existingConfig.id);

        if (error) throw error;
      }

      toast.success("Tipo di bus salvato con successo");
    } catch (error) {
      console.error("Errore salvataggio tipo bus:", error);
      toast.error("Errore nel salvataggio del tipo di bus");
    }
  };

  const getFilteredAndSortedParticipants = () => {
    let filtered = participants.filter(p => 
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortAlphabetically) {
      filtered = [...filtered].sort((a, b) => a.full_name.localeCompare(b.full_name));
    }

    return filtered;
  };

  const getParticipantsByRoom = () => {
    const byRoom: Record<string, Participant[][]> = {
      singola: [],
      doppia: [],
      matrimoniale: [],
      tripla: [],
      quadrupla: [],
      altro: [],
    };

    const filtered = getFilteredAndSortedParticipants();
    
    // Raggruppa i partecipanti per created_at e tipo di camera (inseriti insieme)
    const grouped: Record<string, Participant[]> = {};
    
    filtered.forEach(p => {
      let roomType = 'altro';
      if (p.notes?.includes("Camera: singola")) roomType = 'singola';
      else if (p.notes?.includes("Camera: doppia")) roomType = 'doppia';
      else if (p.notes?.includes("Camera: matrimoniale")) roomType = 'matrimoniale';
      else if (p.notes?.includes("Camera: tripla")) roomType = 'tripla';
      else if (p.notes?.includes("Camera: quadrupla")) roomType = 'quadrupla';
      
      const groupKey = `${roomType}-${p.created_at}`;
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(p);
    });

    // Organizza i gruppi per tipo di camera
    Object.values(grouped).forEach(group => {
      const firstParticipant = group[0];
      if (firstParticipant.notes?.includes("Camera: singola")) byRoom.singola.push(group);
      else if (firstParticipant.notes?.includes("Camera: doppia")) byRoom.doppia.push(group);
      else if (firstParticipant.notes?.includes("Camera: matrimoniale")) byRoom.matrimoniale.push(group);
      else if (firstParticipant.notes?.includes("Camera: tripla")) byRoom.tripla.push(group);
      else if (firstParticipant.notes?.includes("Camera: quadrupla")) byRoom.quadrupla.push(group);
      else byRoom.altro.push(group);
    });

    return byRoom;
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

      {hotels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hotel className="h-5 w-5" />
              Hotel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {hotels.map((hotel) => (
                <div key={hotel.id} className="border rounded-lg p-4">
                  <p className="font-medium text-lg">{hotel.name}</p>
                  {hotel.address && (
                    <p className="text-sm text-muted-foreground mt-1">{hotel.address}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Check-in: {format(new Date(hotel.check_in_date), "dd/MM/yyyy")}</span>
                    <span>Check-out: {format(new Date(hotel.check_out_date), "dd/MM/yyyy")}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acconti Ricevuti</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">€{totalDeposits.toLocaleString("it-IT")}</div>
            <p className="text-xs text-muted-foreground">totale versato</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mancante</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              €{((participants.length * trip.price) - totalDeposits).toLocaleString("it-IT")}
            </div>
            <p className="text-xs text-muted-foreground">da incassare</p>
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
              <div className="space-y-2">
                <Select value={selectedCarrier} onValueChange={(value) => {
                  setSelectedCarrier(value);
                  saveCarrier(value);
                }}>
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
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {carriers.find(c => c.id === selectedCarrier)?.name || "Non ancora assegnato"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5" />
              Tipo di Bus
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(isAdmin || isAgent) ? (
              <div className="space-y-2">
                {busTypes.length > 0 ? (
                  <Select 
                    value={selectedBusType || "none"} 
                    onValueChange={(value) => {
                      const newValue = value === "none" ? "" : value;
                      setSelectedBusType(newValue);
                      saveBusType(newValue);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tipo bus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nessun tipo bus</SelectItem>
                      {busTypes.map((busType) => (
                        <SelectItem key={busType.id} value={busType.id}>
                          {busType.name} - {busType.total_seats} posti
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">Caricamento tipi bus...</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {busTypes.find(bt => bt.id === selectedBusType)?.name || "Non ancora assegnato"}
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
                <div className="flex gap-2">
                  <Input
                    id="companion"
                    value={companion}
                    onChange={(e) => setCompanion(e.target.value)}
                    placeholder="Inserisci nome accompagnatore"
                  />
                  <Button onClick={saveCompanion} size="icon" variant="outline">
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {companion || "Non ancora assegnato"}
              </p>
            )}
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Hotel className="h-5 w-5" />
                  Allotment Camere
                </CardTitle>
                <Button onClick={saveAllotment} size="sm" className="gap-2">
                  <Save className="h-4 w-4" />
                  Salva Allotment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}
      </div>

      {(isAdmin || isAgent) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hotel className="h-5 w-5" />
              Disponibilità Camere
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                const occupied = getRoomOccupancy();
                const roomTypes = [
                  { key: 'singole', label: 'Singole' },
                  { key: 'doppie', label: 'Doppie' },
                  { key: 'matrimoniali', label: 'Matrimoniali' },
                  { key: 'triple', label: 'Triple' },
                  { key: 'quadruple', label: 'Quadruple' },
                ] as const;

                return roomTypes.map(({ key, label }) => {
                  const total = allotmentData[key];
                  const used = occupied[key];
                  const available = total - used;
                  
                  if (total === 0) return null;
                  
                  return (
                    <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">{label}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          Occupate: {used} / {total}
                        </span>
                        <span className={`font-bold ${available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Disponibili: {available}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
              {allotmentData.singole === 0 && allotmentData.doppie === 0 && 
               allotmentData.matrimoniali === 0 && allotmentData.triple === 0 && 
               allotmentData.quadruple === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Configura l'allotment delle camere per visualizzare la disponibilità
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Partecipanti ({participants.length})</CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={() => window.open(`/viaggi/${id}/hotel-list`, '_blank')} 
                variant="outline"
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Lista Hotel
              </Button>
              <Button 
                onClick={() => window.open(`/viaggi/${id}/companion-list`, '_blank')} 
                variant="outline"
                className="gap-2"
              >
                <ClipboardList className="h-4 w-4" />
                Lista Accompagnatore
              </Button>
              {(isAdmin || isAgent) && (
                <Button onClick={() => setAddParticipantOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Aggiungi Partecipante
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca partecipante..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Button
                variant={sortAlphabetically ? "default" : "outline"}
                onClick={() => setSortAlphabetically(!sortAlphabetically)}
                size="sm"
              >
                A-Z
              </Button>
              <Button
                variant={groupByRoom ? "default" : "outline"}
                onClick={() => setGroupByRoom(!groupByRoom)}
                size="sm"
              >
                Per Camera
              </Button>
            </div>

            {participants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessun partecipante ancora iscritto
              </div>
            ) : groupByRoom ? (
              <div className="space-y-6">
                {Object.entries(getParticipantsByRoom()).map(([roomType, roomGroups]) => {
                  if (roomGroups.length === 0) return null;
                  
                  const roomLabels: Record<string, string> = {
                    singola: "Camere Singole",
                    doppia: "Camere Doppie",
                    matrimoniale: "Camere Matrimoniali",
                    tripla: "Camere Triple",
                    quadrupla: "Camere Quadruple",
                    altro: "Senza Camera Assegnata",
                  };

                  const totalParticipants = roomGroups.reduce((sum, group) => sum + group.length, 0);

                  return (
                    <div key={roomType} className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        {roomLabels[roomType]} ({totalParticipants} {totalParticipants === 1 ? 'partecipante' : 'partecipanti'})
                      </h3>
                      <div className="space-y-3">
                        {roomGroups.map((group, groupIndex) => {
                          const groupTotal = trip.price * group.length;
                          return (
                            <div
                              key={groupIndex}
                              className="border rounded-lg p-4 bg-card hover:bg-accent/30 transition-colors"
                            >
                              <div className="space-y-3">
                                {group.map((participant, idx) => (
                                  <div
                                    key={participant.id}
                                    className="flex items-center justify-between cursor-pointer hover:bg-accent/50 p-3 rounded-md -mx-3"
                                    onClick={() => (isAdmin || isAgent) && handleEditParticipant(participant)}
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          {idx + 1}
                                        </Badge>
                                        <p className="font-medium">{participant.full_name}</p>
                                      </div>
                                      <div className="text-sm text-muted-foreground space-y-1 mt-1 ml-8">
                                        {participant.date_of_birth && (
                                          <p>Nato/a il {format(new Date(participant.date_of_birth), "dd/MM/yyyy")}</p>
                                        )}
                                        {participant.place_of_birth && (
                                          <p>a {participant.place_of_birth}</p>
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
                              <div className="mt-3 pt-3 border-t flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">
                                  Totale Camera ({group.length} {group.length === 1 ? 'persona' : 'persone'})
                                </span>
                                <span className="text-lg font-bold text-primary">
                                  €{groupTotal.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {getFilteredAndSortedParticipants().map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => (isAdmin || isAgent) && handleEditParticipant(participant)}
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
          </div>
        </CardContent>
      </Card>

      <AddParticipantDialog
        tripId={id!}
        open={addParticipantOpen}
        onOpenChange={setAddParticipantOpen}
        onSuccess={loadTripDetails}
      />

      <EditParticipantDialog
        participant={selectedParticipant}
        tripPrice={trip?.price || 0}
        depositType={trip?.deposit_type || "fixed"}
        depositAmount={trip?.deposit_amount || 0}
        open={editParticipantOpen}
        onOpenChange={setEditParticipantOpen}
        onSuccess={loadTripDetails}
      />
    </div>
  );
}
