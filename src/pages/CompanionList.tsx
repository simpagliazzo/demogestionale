import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { formatNameSurnameFirst, calculateDiscountedPrice, calculateTotalSingleSupplement } from "@/lib/format-utils";

interface Trip {
  id: string;
  title: string;
  destination: string;
  departure_date: string;
  return_date: string;
  price: number;
  companion_name: string | null;
  single_room_supplement: number;
}

interface Guide {
  id: string;
  full_name: string;
  phone: string | null;
}

interface TripGuide {
  id: string;
  guide?: Guide;
}

interface TripCompanion {
  id: string;
  guide?: Guide;
}

interface Participant {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  place_of_birth: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  notes_companion: string | null;
  created_at: string;
  group_number: number | null;
  discount_type: string | null;
  discount_amount: number | null;
}

interface Payment {
  participant_id: string;
  amount: number;
}

interface SeatAssignment {
  participant_id: string;
  seat_number: number;
}

export default function CompanionList() {
  const { id } = useParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [seatAssignments, setSeatAssignments] = useState<SeatAssignment[]>([]);
  const [tripGuides, setTripGuides] = useState<TripGuide[]>([]);
  const [tripCompanions, setTripCompanions] = useState<TripCompanion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const { data: tripData } = await supabase
        .from("trips")
        .select("id, title, destination, departure_date, return_date, price, companion_name, single_room_supplement")
        .eq("id", id)
        .maybeSingle();

      if (tripData) setTrip(tripData);

      const { data: participantsData } = await supabase
        .from("participants")
        .select("*")
        .eq("trip_id", id)
        .order("full_name");

      setParticipants(participantsData || []);

      if (participantsData && participantsData.length > 0) {
        const participantIds = participantsData.map((p) => p.id);
        const { data: paymentsData } = await supabase
          .from("payments")
          .select("participant_id, amount")
          .in("participant_id", participantIds);

        setPayments(paymentsData || []);
      }

      // Fetch bus seat assignments for this trip
      const { data: busConfigData } = await supabase
        .from("bus_configurations")
        .select("id")
        .eq("trip_id", id)
        .maybeSingle();

      if (busConfigData) {
        const { data: seatsData } = await supabase
          .from("bus_seat_assignments")
          .select("participant_id, seat_number")
          .eq("bus_config_id", busConfigData.id);

        setSeatAssignments(seatsData || []);
      }

      // Carica guide del viaggio
      const { data: tripGuidesData } = await supabase
        .from("trip_guides")
        .select(`
          id,
          guides:guide_id (
            id,
            full_name,
            phone
          )
        `)
        .eq("trip_id", id);

      setTripGuides((tripGuidesData || []).map((tg: any) => ({
        id: tg.id,
        guide: tg.guides
      })));

      // Carica accompagnatori del viaggio
      const { data: tripCompanionsData } = await supabase
        .from("trip_companions")
        .select(`
          id,
          guides:guide_id (
            id,
            full_name,
            phone
          )
        `)
        .eq("trip_id", id);

      setTripCompanions((tripCompanionsData || []).map((tc: any) => ({
        id: tc.id,
        guide: tc.guides
      })));
    } catch (error) {
      console.error("Errore:", error);
    } finally {
      setLoading(false);
    }
  };

  const getParticipantPayments = (participantId: string) => {
    return payments
      .filter((p) => p.participant_id === participantId)
      .reduce((sum, p) => sum + Number(p.amount), 0);
  };

  const getParticipantSeatNumber = (participantId: string) => {
    const assignment = seatAssignments.find((a) => a.participant_id === participantId);
    return assignment ? assignment.seat_number : null;
  };

  const isSingleRoom = (participant: Participant) => {
    return participant.notes?.includes("Camera: singola") || false;
  };

  const getParticipantTotal = (participant: Participant) => {
    const base = trip?.price || 0;
    const discountedPrice = calculateDiscountedPrice(base, participant.discount_type, participant.discount_amount);
    // Il supplemento singola è la tariffa giornaliera * notti
    const dailySupplement = trip?.single_room_supplement || 0;
    const supplement = isSingleRoom(participant) && trip?.departure_date && trip?.return_date
      ? calculateTotalSingleSupplement(dailySupplement, trip.departure_date, trip.return_date)
      : 0;
    return discountedPrice + supplement;
  };

  const hasDiscount = (participant: Participant) => {
    return participant.discount_type && participant.discount_amount && participant.discount_amount > 0;
  };

  const getRoomType = (participant: Participant) => {
    if (participant.notes?.includes("Camera: singola")) return 'singola';
    if (participant.notes?.includes("Camera: doppia")) return 'doppia';
    if (participant.notes?.includes("Camera: matrimoniale")) return 'matrimoniale';
    if (participant.notes?.includes("Camera: tripla")) return 'tripla';
    if (participant.notes?.includes("Camera: quadrupla")) return 'quadrupla';
    return 'altro';
  };

  const getRoomLabel = (roomType: string) => {
    const labels: Record<string, string> = {
      singola: 'Singola',
      doppia: 'Doppia',
      matrimoniale: 'Matrimoniale',
      tripla: 'Tripla',
      quadrupla: 'Quadrupla',
      altro: '-',
    };
    return labels[roomType] || '-';
  };

  // Restituisce le note per l'accompagnatore
  const getDisplayNotes = (participant: Participant) => {
    return participant.notes_companion || '';
  };

  // Capacità per tipologia di camera
  const getRoomCapacity = (roomType: string) => {
    const capacities: Record<string, number> = {
      singola: 1,
      doppia: 2,
      matrimoniale: 2,
      tripla: 3,
      quadrupla: 4,
      altro: 1,
    };
    return capacities[roomType] || 1;
  };

  // Raggruppa partecipanti per camera effettiva
  // Divide in base alla capacità (es. 4 persone in doppia = 2 camere da 2)
  const getParticipantsByRoom = () => {
    // Prima raggruppa per (group_number, roomType)
    const byGroupAndType: Record<string, Participant[]> = {};
    
    participants.forEach((p) => {
      const roomType = getRoomType(p);
      const groupNum = p.group_number?.toString() || `solo-${p.id}`;
      const key = `${groupNum}__${roomType}`;
      
      if (!byGroupAndType[key]) {
        byGroupAndType[key] = [];
      }
      byGroupAndType[key].push(p);
    });

    // Dividi ogni gruppo per capacità camera
    const roomGroups: Array<{
      groupKey: string;
      groupNumber: number | null;
      roomType: string;
      participants: Participant[];
    }> = [];

    Object.entries(byGroupAndType).forEach(([key, groupParticipants]) => {
      const [groupKey, roomType] = key.split('__');
      const capacity = getRoomCapacity(roomType);
      const sortedParticipants = groupParticipants.sort((a, b) => a.full_name.localeCompare(b.full_name));
      
      // Dividi in chunk per capacità camera
      for (let i = 0; i < sortedParticipants.length; i += capacity) {
        const chunk = sortedParticipants.slice(i, i + capacity);
        roomGroups.push({
          groupKey: `${key}_${Math.floor(i / capacity)}`,
          groupNumber: groupKey.startsWith('solo-') ? null : parseInt(groupKey),
          roomType,
          participants: chunk,
        });
      }
    });

    // Ordina per numero gruppo, poi per tipologia camera
    const roomOrder = ['singola', 'doppia', 'matrimoniale', 'tripla', 'quadrupla', 'altro'];
    roomGroups.sort((a, b) => {
      if (a.groupNumber === null && b.groupNumber === null) {
        return roomOrder.indexOf(a.roomType) - roomOrder.indexOf(b.roomType);
      }
      if (a.groupNumber === null) return 1;
      if (b.groupNumber === null) return -1;
      if (a.groupNumber !== b.groupNumber) return a.groupNumber - b.groupNumber;
      return roomOrder.indexOf(a.roomType) - roomOrder.indexOf(b.roomType);
    });

    return roomGroups;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!trip) {
    return <div className="p-8 text-center">Viaggio non trovato</div>;
  }

  const roomGroups = getParticipantsByRoom();
  const totalDue = participants.reduce((sum, p) => sum + getParticipantTotal(p), 0);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalBalance = totalDue - totalPaid;

  return (
    <div className="p-8 max-w-6xl mx-auto print:p-4">
      <style>{`
        @media print {
          body { font-size: 10px; }
          .no-print { display: none !important; }
          table { page-break-inside: auto; width: 100% !important; }
          tr { page-break-inside: avoid; }
          th, td { padding: 4px 6px !important; word-wrap: break-word; }
        }
      `}</style>

      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">{trip.title}</h1>
        <p className="text-lg text-muted-foreground">{trip.destination}</p>
        <p className="text-sm text-muted-foreground">
          {format(new Date(trip.departure_date), "dd MMMM yyyy", { locale: it })} -{" "}
          {format(new Date(trip.return_date), "dd MMMM yyyy", { locale: it })}
        </p>
        {tripCompanions.length > 0 && (
          <p className="text-sm font-medium mt-2">
            Accompagnatori: {tripCompanions.map((tc, index) => (
              <span key={tc.id}>
                {index > 0 && ", "}
                {tc.guide?.full_name ? formatNameSurnameFirst(tc.guide.full_name) : ''}
                {tc.guide?.phone && ` (Tel: ${tc.guide.phone})`}
              </span>
            ))}
          </p>
        )}
        {tripGuides.length > 0 && (
          <p className="text-sm font-medium mt-1">
            Guide: {tripGuides.map((tg, index) => (
              <span key={tg.id}>
                {index > 0 && ", "}
                {tg.guide?.full_name ? formatNameSurnameFirst(tg.guide.full_name) : ''}
                {tg.guide?.phone && ` (Tel: ${tg.guide.phone})`}
              </span>
            ))}
          </p>
        )}
        <h2 className="text-xl font-semibold mt-4">LISTA ACCOMPAGNATORE</h2>
      </div>

      <div className="mb-4 text-sm text-muted-foreground border-b pb-4">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span>Totale partecipanti: <strong>{participants.length}</strong></span>
          <span>Prezzo base viaggio: <strong>€{trip.price.toFixed(2)}</strong></span>
          {trip.single_room_supplement > 0 && (
            <span>Supplemento singola: <strong>€{trip.single_room_supplement.toFixed(2)}</strong></span>
          )}
        </div>
      </div>

      <button
        onClick={() => window.print()}
        className="no-print mb-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Stampa Lista
      </button>

      <table className="w-full border-collapse mb-6" style={{tableLayout: 'fixed'}}>
        <thead>
          <tr className="bg-muted">
            <th className="border p-1 text-left" style={{width: '50px', fontSize: '9px'}}>P. Carico</th>
            <th className="border p-1 text-center" style={{width: '25px', fontSize: '9px'}}>Gr.</th>
            <th className="border p-1 text-left whitespace-nowrap" style={{width: '75px', fontSize: '9px'}}>Camera</th>
            <th className="border p-1 text-left" style={{width: '130px', fontSize: '9px'}}>Nominativo</th>
            <th className="border p-1 text-center" style={{width: '35px', fontSize: '9px'}}>Bus</th>
            <th className="border p-1 text-left whitespace-nowrap" style={{width: '90px', fontSize: '9px'}}>Telefono</th>
            <th className="border p-1 text-left" style={{fontSize: '9px'}}>Note</th>
            <th className="border p-1 text-right whitespace-nowrap" style={{width: '65px', fontSize: '9px'}}>Pagato</th>
            <th className="border p-1 text-right whitespace-nowrap" style={{width: '65px', fontSize: '9px'}}>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {roomGroups.map((group) =>
            group.participants.map((p, idx) => {
              const total = getParticipantTotal(p);
              const paid = getParticipantPayments(p.id);
              const balance = total - paid;
              const seatNumber = getParticipantSeatNumber(p.id);
              const displayNotes = getDisplayNotes(p);
              const isFirstInRoom = idx === 0;

              return (
                <tr key={p.id} className={isFirstInRoom ? "border-t-2 border-foreground/40" : ""}>
                  <td className="border p-1 bg-white" style={{fontSize: '9px'}}>
                    <div className="border-b border-muted-foreground/30 h-4"></div>
                  </td>
                  {isFirstInRoom && (
                    <td
                      className="border p-1 font-bold text-center bg-muted/50"
                      rowSpan={group.participants.length}
                      style={{fontSize: '9px'}}
                    >
                      {group.groupNumber || "-"}
                    </td>
                  )}
                  {isFirstInRoom && (
                    <td
                      className="border p-1 font-semibold text-center bg-muted/30 capitalize whitespace-nowrap"
                      rowSpan={group.participants.length}
                      style={{fontSize: '9px'}}
                    >
                      {getRoomLabel(group.roomType)}
                    </td>
                  )}
                  <td className="border p-1 font-medium" style={{fontSize: '9px'}}>{formatNameSurnameFirst(p.full_name)}</td>
                  <td className="border p-1 text-center font-bold" style={{fontSize: '9px'}}>
                    {seatNumber ? (
                      <span className="bg-primary/20 text-primary px-1 py-0.5 rounded">
                        {seatNumber}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border p-1 whitespace-nowrap" style={{fontSize: '9px'}}>{p.phone || "-"}</td>
                  <td className="border p-1 text-orange-600 italic" style={{fontSize: '9px'}}>
                    {displayNotes || "-"}
                  </td>
                  <td className="border p-1 text-right text-green-600 whitespace-nowrap" style={{fontSize: '9px'}}>€{paid.toFixed(2)}</td>
                  <td className={`border p-1 text-right font-bold whitespace-nowrap ${balance > 0 ? "text-red-600" : "text-green-600"}`} style={{fontSize: '9px'}}>
                    €{balance.toFixed(2)}
                    {hasDiscount(p) && (
                      <span className="ml-1 text-orange-500 text-[10px]">(sconto)</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        <tfoot>
          <tr className="bg-muted font-bold">
            <td colSpan={8} className="border p-2 text-xs text-right">TOTALI:</td>
            <td className="border p-2 text-xs text-right text-green-600">€{totalPaid.toFixed(2)}</td>
            <td className={`border p-2 text-xs text-right ${totalBalance > 0 ? "text-red-600" : "text-green-600"}`}>
              €{totalBalance.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-4 text-xs text-muted-foreground">
        <p>Data generazione: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: it })}</p>
      </div>
    </div>
  );
}