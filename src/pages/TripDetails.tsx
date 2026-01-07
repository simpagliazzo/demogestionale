import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MapPin, Calendar, Users, DollarSign, Plus, Hotel, Bus, User, Save, Search, Euro, TrendingUp, FileText, ClipboardList, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useUserRole } from "@/hooks/use-user-role";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";
import AddParticipantDialog from "@/components/AddParticipantDialog";
import EditParticipantDialog from "@/components/EditParticipantDialog";
import { DeleteTripDialog } from "@/components/DeleteTripDialog";
import EditTripDialog from "@/components/EditTripDialog";
import { formatNameSurnameFirst, calculateDiscountedPrice } from "@/lib/format-utils";
import { TripFileUpload } from "@/components/TripFileUpload";
import { ParticipantDocUpload } from "@/components/ParticipantDocUpload";

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
  single_room_supplement: number;
  max_participants: number | null;
  status: string;
  allotment_singole: number;
  allotment_doppie: number;
  allotment_matrimoniali: number;
  allotment_triple: number;
  allotment_quadruple: number;
  carrier_id: string | null;
  companion_name: string | null;
  guide_name: string | null;
  trip_type: string;
}

interface Guide {
  id: string;
  full_name: string;
  phone: string | null;
  role: string;
}

interface TripGuide {
  id: string;
  guide_id: string;
  guide?: Guide;
}

interface TripCompanion {
  id: string;
  guide_id: string;
  guide?: Guide;
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
  group_number: number | null;
  discount_type: string | null;
  discount_amount: number | null;
}

interface ParticipantPayment {
  participant_id: string;
  amount: number;
}

interface Hotel {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
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
  const [groupByGroupNumber, setGroupByGroupNumber] = useState<boolean>(false);
  const [totalDeposits, setTotalDeposits] = useState<number>(0);
  const [singleSupplement, setSingleSupplement] = useState<number>(0);
  const [participantPayments, setParticipantPayments] = useState<ParticipantPayment[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editTripDialogOpen, setEditTripDialogOpen] = useState(false);
  const [tripGuides, setTripGuides] = useState<TripGuide[]>([]);
  const [tripCompanions, setTripCompanions] = useState<TripCompanion[]>([]);
  const [availableGuides, setAvailableGuides] = useState<Guide[]>([]);
  const [availableCompanions, setAvailableCompanions] = useState<Guide[]>([]);
  const [newHotelData, setNewHotelData] = useState({ name: "", address: "", phone: "" });
  const { isAdmin, isAgent } = useUserRole();
  const { canDeleteTrips } = usePermissions();

  // Calcola il numero di partecipanti in camera singola
  const getSingleRoomParticipantsCount = () => {
    return participants.filter(p => p.notes?.includes("Camera: singola")).length;
  };

  // Calcola il prezzo effettivo per un partecipante (con sconto e supplemento singola)
  const getParticipantPrice = (participant: Participant) => {
    const basePrice = trip?.price || 0;
    const discountedPrice = calculateDiscountedPrice(basePrice, participant.discount_type, participant.discount_amount);
    const isSingle = participant.notes?.includes("Camera: singola");
    const supplement = isSingle ? (trip?.single_room_supplement || 0) : 0;
    return discountedPrice + supplement;
  };

  // Calcola il totale dovuto comprensivo di supplementi singola e sconti
  const getTotalDue = () => {
    return participants.reduce((total, p) => total + getParticipantPrice(p), 0);
  };

  useEffect(() => {
    loadTripDetails();
    loadCarriers();
    loadAvailableGuides();
    loadAvailableCompanions();
    loadTripGuides();
    loadTripCompanions();
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

  const loadAvailableGuides = async () => {
    try {
      const { data, error } = await supabase
        .from("guides")
        .select("id, full_name, phone, role")
        .eq("role", "guida")
        .order("full_name");

      if (error) throw error;
      setAvailableGuides(data || []);
    } catch (error) {
      console.error("Errore caricamento guide:", error);
    }
  };

  const loadAvailableCompanions = async () => {
    try {
      const { data, error } = await supabase
        .from("guides")
        .select("id, full_name, phone, role")
        .eq("role", "accompagnatore")
        .order("full_name");

      if (error) throw error;
      setAvailableCompanions(data || []);
    } catch (error) {
      console.error("Errore caricamento accompagnatori:", error);
    }
  };

  const loadTripGuides = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from("trip_guides")
        .select(`
          id,
          guide_id,
          guides:guide_id (
            id,
            full_name,
            phone,
            role
          )
        `)
        .eq("trip_id", id);

      if (error) throw error;
      setTripGuides((data || []).map((tg: any) => ({
        id: tg.id,
        guide_id: tg.guide_id,
        guide: tg.guides
      })));
    } catch (error) {
      console.error("Errore caricamento guide viaggio:", error);
    }
  };

  const loadTripCompanions = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from("trip_companions")
        .select(`
          id,
          guide_id,
          guides:guide_id (
            id,
            full_name,
            phone,
            role
          )
        `)
        .eq("trip_id", id);

      if (error) throw error;
      setTripCompanions((data || []).map((tc: any) => ({
        id: tc.id,
        guide_id: tc.guide_id,
        guide: tc.guides
      })));
    } catch (error) {
      console.error("Errore caricamento accompagnatori viaggio:", error);
    }
  };

  const loadPayments = async () => {
    try {
      const participantIds = participants.map(p => p.id);
      const { data, error } = await supabase
        .from("payments")
        .select("participant_id, amount")
        .in("participant_id", participantIds);

      if (error) throw error;
      
      setParticipantPayments(data || []);
      const total = data?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
      setTotalDeposits(total);
    } catch (error) {
      console.error("Errore caricamento pagamenti:", error);
    }
  };

  const getParticipantDeposit = (participantId: string) => {
    return participantPayments
      .filter(p => p.participant_id === participantId)
      .reduce((sum, p) => sum + Number(p.amount), 0);
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
        setSingleSupplement(tripData.single_room_supplement || 0);
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
      
      // Reset new hotel form
      setNewHotelData({ name: "", address: "", phone: "" });

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
          single_room_supplement: singleSupplement,
        })
        .eq("id", trip.id);

      if (error) throw error;
      toast.success("Allotment e supplemento salvati con successo");
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

  const addHotel = async () => {
    if (!trip || !newHotelData.name) {
      toast.error("Inserisci almeno il nome dell'hotel");
      return;
    }
    
    try {
      const { error } = await supabase
        .from("hotels")
        .insert({
          trip_id: trip.id,
          name: newHotelData.name,
          address: newHotelData.address || null,
          phone: newHotelData.phone || null,
          check_in_date: trip.departure_date,
          check_out_date: trip.return_date,
        });

      if (error) throw error;
      toast.success("Hotel aggiunto con successo");
      setNewHotelData({ name: "", address: "", phone: "" });
      loadTripDetails();
    } catch (error) {
      console.error("Errore aggiunta hotel:", error);
      toast.error("Errore nell'aggiunta dell'hotel");
    }
  };

  const deleteHotel = async (hotelId: string) => {
    try {
      const { error } = await supabase
        .from("hotels")
        .delete()
        .eq("id", hotelId);

      if (error) throw error;
      toast.success("Hotel eliminato");
      loadTripDetails();
    } catch (error) {
      console.error("Errore eliminazione hotel:", error);
      toast.error("Errore nell'eliminazione dell'hotel");
    }
  };

  const addGuideToTrip = async (guideId: string) => {
    if (!trip || !guideId) return;
    
    try {
      const { error } = await supabase
        .from("trip_guides")
        .insert({
          trip_id: trip.id,
          guide_id: guideId,
        });

      if (error) throw error;
      toast.success("Guida aggiunta al viaggio");
      loadTripGuides();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error("Questa guida è già assegnata al viaggio");
      } else {
        console.error("Errore aggiunta guida:", error);
        toast.error("Errore nell'aggiunta della guida");
      }
    }
  };

  const removeGuideFromTrip = async (tripGuideId: string) => {
    try {
      const { error } = await supabase
        .from("trip_guides")
        .delete()
        .eq("id", tripGuideId);

      if (error) throw error;
      toast.success("Guida rimossa dal viaggio");
      loadTripGuides();
    } catch (error) {
      console.error("Errore rimozione guida:", error);
      toast.error("Errore nella rimozione della guida");
    }
  };

  const addCompanionToTrip = async (guideId: string) => {
    if (!trip || !guideId) return;
    
    try {
      const { error } = await supabase
        .from("trip_companions")
        .insert({
          trip_id: trip.id,
          guide_id: guideId,
        });

      if (error) throw error;
      toast.success("Accompagnatore aggiunto al viaggio");
      loadTripCompanions();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error("Questo accompagnatore è già assegnato al viaggio");
      } else {
        console.error("Errore aggiunta accompagnatore:", error);
        toast.error("Errore nell'aggiunta dell'accompagnatore");
      }
    }
  };

  const removeCompanionFromTrip = async (tripCompanionId: string) => {
    try {
      const { error } = await supabase
        .from("trip_companions")
        .delete()
        .eq("id", tripCompanionId);

      if (error) throw error;
      toast.success("Accompagnatore rimosso dal viaggio");
      loadTripCompanions();
    } catch (error) {
      console.error("Errore rimozione accompagnatore:", error);
      toast.error("Errore nella rimozione dell'accompagnatore");
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

  // Raggruppa partecipanti per numero gruppo prenotazione
  const getParticipantsByGroupNumber = () => {
    const filtered = getFilteredAndSortedParticipants();
    const byGroupNumber: Record<string, Participant[]> = {};
    
    filtered.forEach(p => {
      const groupKey = p.group_number?.toString() || 'senza-gruppo';
      if (!byGroupNumber[groupKey]) {
        byGroupNumber[groupKey] = [];
      }
      byGroupNumber[groupKey].push(p);
    });

    // Ordina per numero di gruppo
    const sortedKeys = Object.keys(byGroupNumber).sort((a, b) => {
      if (a === 'senza-gruppo') return 1;
      if (b === 'senza-gruppo') return -1;
      return parseInt(a) - parseInt(b);
    });

    return sortedKeys.map(key => ({
      groupNumber: key === 'senza-gruppo' ? null : parseInt(key),
      participants: byGroupNumber[key]
    }));
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

  const saveStatus = async (newStatus: string) => {
    if (!trip || (!isAdmin && !isAgent)) return;
    
    try {
      const { error } = await supabase
        .from("trips")
        .update({ status: newStatus as "planned" | "confirmed" | "ongoing" | "completed" | "cancelled" })
        .eq("id", trip.id);

      if (error) throw error;
      setTrip({ ...trip, status: newStatus });
      toast.success("Stato viaggio aggiornato");
    } catch (error) {
      console.error("Errore aggiornamento stato:", error);
      toast.error("Errore nell'aggiornamento dello stato");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/viaggi")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-4xl font-bold">{trip.title}</h1>
            {(isAdmin || isAgent) ? (
              <Select value={trip.status} onValueChange={saveStatus}>
                <SelectTrigger className="w-[160px]">
                  <Badge className={`${statusColors[trip.status as keyof typeof statusColors]} text-white`}>
                    {statusLabels[trip.status as keyof typeof statusLabels]}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Pianificato</SelectItem>
                  <SelectItem value="confirmed">Confermato</SelectItem>
                  <SelectItem value="ongoing">In Corso</SelectItem>
                  <SelectItem value="completed">Completato</SelectItem>
                  <SelectItem value="cancelled">Annullato</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge className={`${statusColors[trip.status as keyof typeof statusColors]} text-white`}>
                {statusLabels[trip.status as keyof typeof statusLabels]}
              </Badge>
            )}
            {trip.trip_type === 'day_trip' && (
              <Badge variant="outline" className="border-blue-500 text-blue-600">
                Giornaliero
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {trip.destination}
          </div>
        </div>
        
        {(isAdmin || isAgent) && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setEditTripDialogOpen(true)}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            Modifica
          </Button>
        )}
        
        {canDeleteTrips && (
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Elimina Viaggio
          </Button>
        )}
      </div>

      <EditTripDialog
        open={editTripDialogOpen}
        onOpenChange={setEditTripDialogOpen}
        onSuccess={loadTripDetails}
        trip={trip}
      />

      <DeleteTripDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        tripId={trip.id}
        tripTitle={trip.title}
      />

      {trip.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{trip.description}</p>
          </CardContent>
        </Card>
      )}

      <TripFileUpload tripId={id!} />

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
            <p className="text-xs text-muted-foreground">
              Acconto: {depositDisplay}
              {trip.single_room_supplement > 0 && ` • Suppl. singola: €${trip.single_room_supplement}`}
            </p>
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
              €{(getTotalDue() - totalDeposits).toLocaleString("it-IT")}
            </div>
            <p className="text-xs text-muted-foreground">
              da incassare {getSingleRoomParticipantsCount() > 0 && trip.single_room_supplement > 0 && 
                `(incl. ${getSingleRoomParticipantsCount()} suppl. singola)`}
            </p>
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
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Accompagnatore e Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Accompagnatori */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Accompagnatori ({tripCompanions.length})</p>
              {(isAdmin || isAgent) ? (
                <div className="space-y-2">
                  {tripCompanions.map((tc) => (
                    <div key={tc.id} className="p-2 border rounded-lg bg-muted/50 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{tc.guide?.full_name}</p>
                        {tc.guide?.phone && <p className="text-xs text-muted-foreground">Tel: {tc.guide.phone}</p>}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removeCompanionFromTrip(tc.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  
                  {availableCompanions.filter(c => !tripCompanions.some(tc => tc.guide_id === c.id)).length > 0 && (
                    <Select onValueChange={(value) => addCompanionToTrip(value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="+ Aggiungi accompagnatore..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCompanions
                          .filter(c => !tripCompanions.some(tc => tc.guide_id === c.id))
                          .map((companion) => (
                            <SelectItem key={companion.id} value={companion.id}>
                              {companion.full_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {tripCompanions.length === 0 && availableCompanions.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nessun accompagnatore disponibile. Creane uno nella sezione "Accompagnatori e Guide".</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {tripCompanions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessun accompagnatore assegnato</p>
                  ) : (
                    tripCompanions.map((tc) => (
                      <div key={tc.id}>
                        <p className="font-medium text-sm">{tc.guide?.full_name}</p>
                        {tc.guide?.phone && <p className="text-xs text-muted-foreground">Tel: {tc.guide.phone}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Guide */}
            <div className="pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">Guide ({tripGuides.length})</p>
              {(isAdmin || isAgent) ? (
                <div className="space-y-2">
                  {tripGuides.map((tg) => (
                    <div key={tg.id} className="p-2 border rounded-lg bg-muted/50 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{tg.guide?.full_name}</p>
                        {tg.guide?.phone && <p className="text-xs text-muted-foreground">Tel: {tg.guide.phone}</p>}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removeGuideFromTrip(tg.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  
                  {availableGuides.filter(g => !tripGuides.some(tg => tg.guide_id === g.id)).length > 0 && (
                    <Select onValueChange={(value) => addGuideToTrip(value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="+ Aggiungi guida..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableGuides
                          .filter(g => !tripGuides.some(tg => tg.guide_id === g.id))
                          .map((guide) => (
                            <SelectItem key={guide.id} value={guide.id}>
                              {guide.full_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {tripGuides.length === 0 && availableGuides.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nessuna guida disponibile. Creane una nella sezione "Accompagnatori e Guide".</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {tripGuides.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessuna guida assegnata</p>
                  ) : (
                    tripGuides.map((tg) => (
                      <div key={tg.id}>
                        <p className="font-medium text-sm">{tg.guide?.full_name}</p>
                        {tg.guide?.phone && <p className="text-xs text-muted-foreground">Tel: {tg.guide.phone}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {trip?.trip_type !== 'day_trip' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hotel className="h-5 w-5" />
                Hotel ({hotels.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(isAdmin || isAgent) ? (
                <div className="space-y-4">
                  {/* Lista hotel esistenti */}
                  {hotels.map((hotel) => (
                    <div key={hotel.id} className="p-3 border rounded-lg bg-muted/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{hotel.name}</p>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => deleteHotel(hotel.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {hotel.address && <p className="text-xs text-muted-foreground">{hotel.address}</p>}
                      {hotel.phone && <p className="text-xs text-muted-foreground">Tel: {hotel.phone}</p>}
                    </div>
                  ))}
                  
                  {/* Form per aggiungere nuovo hotel */}
                  <div className="pt-3 border-t space-y-2">
                    <p className="text-sm font-medium">Aggiungi nuovo hotel</p>
                    <Input
                      value={newHotelData.name}
                      onChange={(e) => setNewHotelData({...newHotelData, name: e.target.value})}
                      placeholder="Nome dell'hotel"
                    />
                    <Input
                      value={newHotelData.address}
                      onChange={(e) => setNewHotelData({...newHotelData, address: e.target.value})}
                      placeholder="Indirizzo"
                    />
                    <Input
                      value={newHotelData.phone}
                      onChange={(e) => setNewHotelData({...newHotelData, phone: e.target.value})}
                      placeholder="Telefono"
                    />
                    <Button onClick={addHotel} className="w-full gap-2">
                      <Plus className="h-4 w-4" />
                      Aggiungi Hotel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {hotels.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessun hotel configurato</p>
                  ) : (
                    hotels.map((hotel) => (
                      <div key={hotel.id} className="p-2 border-b last:border-b-0">
                        <p className="font-medium">{hotel.name}</p>
                        {hotel.address && <p className="text-sm text-muted-foreground">{hotel.address}</p>}
                        {hotel.phone && <p className="text-sm text-muted-foreground">Tel: {hotel.phone}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}


        {isAdmin && trip?.trip_type !== 'day_trip' && (
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
                <div className="pt-3 border-t">
                  <div className="space-y-1">
                    <Label htmlFor="singleSupplement" className="text-xs font-medium">Supplemento Singola (€)</Label>
                    <Input
                      id="singleSupplement"
                      type="number"
                      min="0"
                      step="0.01"
                      value={singleSupplement}
                      onChange={(e) => setSingleSupplement(parseFloat(e.target.value) || 0)}
                      placeholder="Es: 50.00"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {(isAdmin || isAgent) && trip?.trip_type !== 'day_trip' && (
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
                onClick={() => window.open(`/trips/${id}/hotel-list`, '_blank')} 
                variant="outline"
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Lista Hotel
              </Button>
              <Button 
                onClick={() => window.open(`/trips/${id}/companion-list`, '_blank')} 
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
                onClick={() => {
                  setGroupByRoom(!groupByRoom);
                  if (!groupByRoom) setGroupByGroupNumber(false);
                }}
                size="sm"
              >
                Per Camera
              </Button>
              <Button
                variant={groupByGroupNumber ? "default" : "outline"}
                onClick={() => {
                  setGroupByGroupNumber(!groupByGroupNumber);
                  if (!groupByGroupNumber) setGroupByRoom(false);
                }}
                size="sm"
              >
                Per Gruppo
              </Button>
            </div>

            {participants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessun partecipante ancora iscritto
              </div>
            ) : groupByGroupNumber ? (
              <div className="space-y-6">
                {getParticipantsByGroupNumber().map(({ groupNumber, participants: groupParticipants }) => {
                  const groupTotal = groupParticipants.reduce((sum, p) => sum + getParticipantPrice(p), 0);
                  const groupDeposit = groupParticipants.reduce((sum, p) => sum + getParticipantDeposit(p.id), 0);
                  const groupRemaining = groupTotal - groupDeposit;
                  return (
                    <div key={groupNumber ?? 'no-group'} className="border rounded-lg p-4 bg-card">
                      <div className="flex items-center justify-between mb-3 pb-3 border-b">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-lg px-3 py-1">
                            {groupNumber ? `Gruppo #${groupNumber}` : 'Senza Gruppo'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            ({groupParticipants.length} {groupParticipants.length === 1 ? 'persona' : 'persone'})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-primary">
                            Totale: €{groupTotal.toFixed(2)}
                          </span>
                          <p className="text-sm font-medium text-green-600">
                            Acconti: €{groupDeposit.toFixed(2)}
                          </p>
                          {groupRemaining > 0 && (
                            <p className="text-sm font-bold text-red-600">
                              Da pagare: €{groupRemaining.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {groupParticipants.map((participant) => {
                          const deposit = getParticipantDeposit(participant.id);
                          const participantPrice = getParticipantPrice(participant);
                          const remaining = participantPrice - deposit;
                          const cleanNotes = participant.notes?.replace(/Camera:\s*\w+\s*\|?\s*/g, '').trim();
                          const hasDiscount = participant.discount_type && participant.discount_amount && participant.discount_amount > 0;
                          return (
                            <div
                              key={participant.id}
                              className="flex items-center justify-between cursor-pointer hover:bg-accent/50 p-3 rounded-md"
                              onClick={() => (isAdmin || isAgent) && handleEditParticipant(participant)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{formatNameSurnameFirst(participant.full_name)}</p>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {participant.date_of_birth && (
                                    <span>Nato/a il {format(new Date(participant.date_of_birth), "dd/MM/yyyy")}</span>
                                  )}
                                </div>
                                {cleanNotes && (
                                  <p className="text-xs mt-1 text-orange-600 italic bg-orange-50 dark:bg-orange-950/30 px-2 py-1 rounded inline-block">
                                    📝 {cleanNotes}
                                  </p>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0 ml-4">
                                <p className="text-sm font-bold">
                                  €{participantPrice.toFixed(2)}
                                  {hasDiscount && (
                                    <span className="ml-1 text-xs text-green-600">(scontato)</span>
                                  )}
                                </p>
                                <p className="text-sm font-medium text-green-600">
                                  Acconto: €{deposit.toFixed(2)}
                                </p>
                                {remaining > 0 && (
                                  <p className="text-sm font-bold text-red-600">
                                    Saldo: €{remaining.toFixed(2)}
                                  </p>
                                )}
                                                {participant.phone && (
                                                  <p className="text-sm text-muted-foreground mt-1">{participant.phone}</p>
                                                )}
                                                <ParticipantDocUpload participantId={participant.id} participantName={participant.full_name} dateOfBirth={participant.date_of_birth} />
                                              </div>
                                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
                          const groupTotal = group.reduce((sum, p) => sum + getParticipantPrice(p), 0);
                          const groupDeposit = group.reduce((sum, p) => sum + getParticipantDeposit(p.id), 0);
                          const groupRemaining = groupTotal - groupDeposit;
                          return (
                            <div
                              key={groupIndex}
                              className="border rounded-lg p-4 bg-card hover:bg-accent/30 transition-colors"
                            >
                              <div className="space-y-3">
                                {group.map((participant, idx) => {
                                  const deposit = getParticipantDeposit(participant.id);
                                  const participantPrice = getParticipantPrice(participant);
                                  const remaining = participantPrice - deposit;
                                  const cleanNotes = participant.notes?.replace(/Camera:\s*\w+\s*\|?\s*/g, '').trim();
                                  const hasDiscount = participant.discount_type && participant.discount_amount && participant.discount_amount > 0;
                                  return (
                                    <div
                                      key={participant.id}
                                      className="flex items-center justify-between cursor-pointer hover:bg-accent/50 p-3 rounded-md -mx-3"
                                      onClick={() => (isAdmin || isAgent) && handleEditParticipant(participant)}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs">
                                            {idx + 1}
                                          </Badge>
                                          <p className="font-medium">{formatNameSurnameFirst(participant.full_name)}</p>
                                          {participant.group_number && (
                                            <Badge variant="secondary" className="text-xs">
                                              Gr. #{participant.group_number}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1 ml-8">
                                          {participant.date_of_birth && (
                                            <span>Nato/a il {format(new Date(participant.date_of_birth), "dd/MM/yyyy")}</span>
                                          )}
                                          {participant.place_of_birth && (
                                            <span> a {participant.place_of_birth}</span>
                                          )}
                                        </div>
                                        {cleanNotes && (
                                          <p className="text-xs mt-1 ml-8 text-orange-600 italic bg-orange-50 dark:bg-orange-950/30 px-2 py-1 rounded inline-block">
                                            📝 {cleanNotes}
                                          </p>
                                        )}
                                      </div>
                                      <div className="text-right flex-shrink-0 ml-4">
                                        <p className="text-sm font-bold">
                                          €{participantPrice.toFixed(2)}
                                          {hasDiscount && (
                                            <span className="ml-1 text-xs text-green-600">(scontato)</span>
                                          )}
                                        </p>
                                        <p className="text-sm font-medium text-green-600">
                                          Acconto: €{deposit.toFixed(2)}
                                        </p>
                                        {remaining > 0 && (
                                          <p className="text-sm font-bold text-red-600">
                                            Saldo: €{remaining.toFixed(2)}
                                          </p>
                                        )}
                                                        {participant.phone && (
                                                          <p className="text-sm text-muted-foreground mt-1">{participant.phone}</p>
                                                        )}
                                                        <ParticipantDocUpload participantId={participant.id} participantName={participant.full_name} dateOfBirth={participant.date_of_birth} />
                                                      </div>
                                                    </div>
                                  );
                                })}
                              </div>
                              <div className="mt-3 pt-3 border-t flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">
                                  Totale Camera ({group.length} {group.length === 1 ? 'persona' : 'persone'})
                                </span>
                                <div className="text-right">
                                  <span className="text-lg font-bold text-primary">
                                    €{groupTotal.toFixed(2)}
                                  </span>
                                  <p className="text-sm font-medium text-green-600">
                                    Acconti: €{groupDeposit.toFixed(2)}
                                  </p>
                                  {groupRemaining > 0 && (
                                    <p className="text-sm font-bold text-red-600">
                                      Da pagare: €{groupRemaining.toFixed(2)}
                                    </p>
                                  )}
                                </div>
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
                {getFilteredAndSortedParticipants().map((participant) => {
                  const deposit = getParticipantDeposit(participant.id);
                  const participantPrice = getParticipantPrice(participant);
                  const remaining = participantPrice - deposit;
                  const cleanNotes = participant.notes?.replace(/Camera:\s*\w+\s*\|?\s*/g, '').trim();
                  const hasDiscount = participant.discount_type && participant.discount_amount && participant.discount_amount > 0;
                  return (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => (isAdmin || isAgent) && handleEditParticipant(participant)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{formatNameSurnameFirst(participant.full_name)}</p>
                          {participant.group_number && (
                            <Badge variant="secondary" className="text-xs">
                              Gruppo #{participant.group_number}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {participant.date_of_birth && (
                            <span>Nato/a il {format(new Date(participant.date_of_birth), "dd/MM/yyyy")}</span>
                          )}
                          {participant.place_of_birth && (
                            <span> a {participant.place_of_birth}</span>
                          )}
                        </div>
                        {cleanNotes && (
                          <p className="text-xs mt-2 text-orange-600 italic bg-orange-50 dark:bg-orange-950/30 px-2 py-1 rounded inline-block">
                            📝 {cleanNotes}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-sm font-bold">
                          €{participantPrice.toFixed(2)}
                          {hasDiscount && (
                            <span className="ml-1 text-xs text-green-600">(scontato)</span>
                          )}
                        </p>
                        <div className="text-sm font-medium text-green-600">
                          Acconto: €{deposit.toFixed(2)}
                        </div>
                        {remaining > 0 && (
                          <p className="text-sm font-bold text-red-600">
                            Saldo: €{remaining.toFixed(2)}
                          </p>
                        )}
                        {participant.phone && (
                          <p className="text-sm text-muted-foreground mt-1">{participant.phone}</p>
                        )}
                        <ParticipantDocUpload participantId={participant.id} participantName={participant.full_name} dateOfBirth={participant.date_of_birth} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AddParticipantDialog
        tripId={id!}
        tripType={trip?.trip_type}
        open={addParticipantOpen}
        onOpenChange={setAddParticipantOpen}
        onSuccess={loadTripDetails}
      />

      <EditParticipantDialog
        participant={selectedParticipant}
        tripPrice={trip?.price || 0}
        depositType={trip?.deposit_type || "fixed"}
        depositAmount={trip?.deposit_amount || 0}
        singleRoomSupplement={trip?.single_room_supplement || 0}
        isSingleRoom={selectedParticipant?.notes?.includes("Camera: singola") || false}
        open={editParticipantOpen}
        onOpenChange={setEditParticipantOpen}
        onSuccess={loadTripDetails}
        tripTitle={trip?.title || ""}
        tripDestination={trip?.destination || ""}
        tripDepartureDate={trip?.departure_date || ""}
        tripReturnDate={trip?.return_date || ""}
      />
    </div>
  );
}
