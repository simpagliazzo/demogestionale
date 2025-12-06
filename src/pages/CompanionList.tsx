import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";

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

interface Participant {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  place_of_birth: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  group_number: number | null;
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
    const supplement = isSingleRoom(participant) ? (trip?.single_room_supplement || 0) : 0;
    return base + supplement;
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

  // Estrae le note rimuovendo la parte della camera
  const getDisplayNotes = (participant: Participant) => {
    if (!participant.notes) return '';
    return participant.notes.replace(/Camera:\s*(singola|doppia|matrimoniale|tripla|quadrupla)\s*/gi, '').trim();
  };

  // Raggruppa partecipanti per gruppo mantenendo ogni camera separata
  // Ordinati per numero gruppo (1, 2, 3...) poi per tipologia camera
  const getParticipantsByRoom = () => {
    // Prima ordina per group_number, poi tipologia camera
    const sorted = [...participants].sort((a, b) => {
      const groupA = a.group_number ?? Infinity;
      const groupB = b.group_number ?? Infinity;
      if (groupA !== groupB) return groupA - groupB;
      
      const roomOrder = ['singola', 'doppia', 'matrimoniale', 'tripla', 'quadrupla', 'altro'];
      return roomOrder.indexOf(getRoomType(a)) - roomOrder.indexOf(getRoomType(b));
    });

    // Ogni partecipante è una riga singola con la sua camera
    return sorted.map((p) => ({
      groupKey: p.id,
      groupNumber: p.group_number,
      roomType: getRoomType(p),
      participants: [p],
    }));
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
          body { font-size: 11px; }
          .no-print { display: none !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">{trip.title}</h1>
        <p className="text-lg text-muted-foreground">{trip.destination}</p>
        <p className="text-sm text-muted-foreground">
          {format(new Date(trip.departure_date), "dd MMMM yyyy", { locale: it })} -{" "}
          {format(new Date(trip.return_date), "dd MMMM yyyy", { locale: it })}
        </p>
        {trip.companion_name && (
          <p className="text-sm font-medium mt-2">Accompagnatore: {trip.companion_name}</p>
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

      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-muted">
            <th className="border p-2 text-left text-xs w-20">P. Carico</th>
            <th className="border p-2 text-center text-xs w-10">Gr.</th>
            <th className="border p-2 text-left text-xs w-20">Camera</th>
            <th className="border p-2 text-left text-xs">Nominativo</th>
            <th className="border p-2 text-center text-xs w-12">Bus</th>
            <th className="border p-2 text-left text-xs w-24">Telefono</th>
            <th className="border p-2 text-left text-xs w-20">Data Nasc.</th>
            <th className="border p-2 text-left text-xs">Luogo Nasc.</th>
            <th className="border p-2 text-left text-xs">Note</th>
            <th className="border p-2 text-right text-xs w-16">Pagato</th>
            <th className="border p-2 text-right text-xs w-16">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {roomGroups.map((group) => {
            const p = group.participants[0];
            const total = getParticipantTotal(p);
            const paid = getParticipantPayments(p.id);
            const balance = total - paid;
            const seatNumber = getParticipantSeatNumber(p.id);
            const displayNotes = getDisplayNotes(p);

            return (
              <tr key={p.id}>
                <td className="border p-2 text-xs bg-white">
                  <div className="border-b border-muted-foreground/30 h-4"></div>
                </td>
                <td className="border p-2 text-xs font-bold text-center bg-muted/50">
                  {group.groupNumber || "-"}
                </td>
                <td className="border p-2 text-xs font-medium text-center bg-muted/30 capitalize">
                  {getRoomLabel(group.roomType)}
                </td>
                <td className="border p-2 text-xs font-medium">{p.full_name}</td>
                <td className="border p-2 text-xs text-center font-bold">
                  {seatNumber ? (
                    <span className="bg-primary/20 text-primary px-2 py-0.5 rounded">
                      {seatNumber}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="border p-2 text-xs">{p.phone || "-"}</td>
                <td className="border p-2 text-xs">
                  {p.date_of_birth ? format(new Date(p.date_of_birth), "dd/MM/yyyy") : "-"}
                </td>
                <td className="border p-2 text-xs">{p.place_of_birth || "-"}</td>
                <td className="border p-2 text-xs text-orange-600 italic max-w-[150px]">
                  {displayNotes || "-"}
                </td>
                <td className="border p-2 text-xs text-right text-green-600">€{paid.toFixed(2)}</td>
                <td className={`border p-2 text-xs text-right font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
                  €{balance.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-muted font-bold">
            <td colSpan={9} className="border p-2 text-xs text-right">TOTALI:</td>
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