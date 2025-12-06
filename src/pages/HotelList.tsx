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
}

interface Participant {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  place_of_birth: string | null;
  notes: string | null;
  created_at: string;
  group_number: number | null;
}

export default function HotelList() {
  const { id } = useParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const { data: tripData } = await supabase
        .from("trips")
        .select("id, title, destination, departure_date, return_date")
        .eq("id", id)
        .maybeSingle();

      if (tripData) setTrip(tripData);

      const { data: participantsData } = await supabase
        .from("participants")
        .select("*")
        .eq("trip_id", id)
        .order("full_name");

      setParticipants(participantsData || []);
    } catch (error) {
      console.error("Errore:", error);
    } finally {
      setLoading(false);
    }
  };

  // Estrae la tipologia di camera dalle note
  const getRoomType = (participant: Participant) => {
    if (!participant.notes) return "altro";
    if (participant.notes.includes("Camera: singola")) return "singola";
    if (participant.notes.includes("Camera: doppia")) return "doppia";
    if (participant.notes.includes("Camera: matrimoniale")) return "matrimoniale";
    if (participant.notes.includes("Camera: tripla")) return "tripla";
    if (participant.notes.includes("Camera: quadrupla")) return "quadrupla";
    return "altro";
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

  const getParticipantsByRoom = () => {
    const byRoom: Record<string, Participant[][]> = {
      singola: [],
      doppia: [],
      matrimoniale: [],
      tripla: [],
      quadrupla: [],
    };

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

    // Dividi ogni gruppo per capacità camera e assegna alla tipologia corretta
    Object.entries(byGroupAndType).forEach(([key, groupParticipants]) => {
      const [, roomType] = key.split('__');
      const capacity = getRoomCapacity(roomType);
      const sortedParticipants = groupParticipants.sort((a, b) => a.full_name.localeCompare(b.full_name));
      
      // Dividi in chunk per capacità camera
      for (let i = 0; i < sortedParticipants.length; i += capacity) {
        const chunk = sortedParticipants.slice(i, i + capacity);
        if (byRoom[roomType]) {
          byRoom[roomType].push(chunk);
        }
      }
    });

    return byRoom;
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
  const roomTypes = [
    { key: "singola", label: "Camere Singole" },
    { key: "doppia", label: "Camere Doppie" },
    { key: "matrimoniale", label: "Camere Matrimoniali" },
    { key: "tripla", label: "Camere Triple" },
    { key: "quadrupla", label: "Camere Quadruple" },
  ] as const;

  return (
    <div className="p-8 max-w-4xl mx-auto print:p-4">
      <style>{`
        @media print {
          body { font-size: 12px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">{trip.title}</h1>
        <p className="text-lg text-muted-foreground">{trip.destination}</p>
        <p className="text-sm text-muted-foreground">
          {format(new Date(trip.departure_date), "dd MMMM yyyy", { locale: it })} -{" "}
          {format(new Date(trip.return_date), "dd MMMM yyyy", { locale: it })}
        </p>
        <h2 className="text-xl font-semibold mt-4">LISTA HOTEL</h2>
      </div>

      <button
        onClick={() => window.print()}
        className="no-print mb-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Stampa Lista
      </button>

      {roomTypes.map(({ key, label }) => {
        const rooms = roomGroups[key];
        if (rooms.length === 0) return null;

        return (
          <div key={key} className="mb-6">
            <h3 className="text-lg font-semibold border-b pb-2 mb-3">{label} ({rooms.length})</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-2 text-left text-sm">Camera</th>
                  <th className="border p-2 text-left text-sm">Nominativo</th>
                  <th className="border p-2 text-left text-sm">Data Nascita</th>
                  <th className="border p-2 text-left text-sm">Luogo Nascita</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((group, roomIdx) => (
                  group.map((p, idx) => (
                    <tr key={p.id} className={roomIdx % 2 === 0 ? "bg-white" : "bg-muted/30"}>
                      {idx === 0 && (
                        <td className="border p-2 text-sm font-medium" rowSpan={group.length}>
                          {roomIdx + 1}
                        </td>
                      )}
                      <td className="border p-2 text-sm">{p.full_name}</td>
                      <td className="border p-2 text-sm">
                        {p.date_of_birth ? format(new Date(p.date_of_birth), "dd/MM/yyyy") : "-"}
                      </td>
                      <td className="border p-2 text-sm">{p.place_of_birth || "-"}</td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <div className="mt-8 pt-4 border-t text-sm text-muted-foreground">
        <p>Totale partecipanti: {participants.length}</p>
        <p>Data generazione: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: it })}</p>
      </div>
    </div>
  );
}
