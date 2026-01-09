import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { formatNameSurnameFirst } from "@/lib/format-utils";

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
  notes_hotel: string | null;
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

  // Raggruppa partecipanti per numero gruppo e poi per tipologia camera
  const getParticipantsByGroup = () => {
    // groups[groupNumber][roomType] = Participant[]
    const groups: Record<number, Record<string, Participant[]>> = {};
    const noGroup: Participant[] = [];
    
    participants.forEach((p) => {
      if (p.group_number) {
        if (!groups[p.group_number]) {
          groups[p.group_number] = {};
        }
        const roomType = getRoomType(p);
        if (!groups[p.group_number][roomType]) {
          groups[p.group_number][roomType] = [];
        }
        groups[p.group_number][roomType].push(p);
      } else {
        noGroup.push(p);
      }
    });

    // Ordina partecipanti all'interno di ogni camera per cognome
    Object.values(groups).forEach(roomTypes => {
      Object.values(roomTypes).forEach(roomParticipants => {
        roomParticipants.sort((a, b) => {
          const aSurname = a.full_name.split(' ').pop() || '';
          const bSurname = b.full_name.split(' ').pop() || '';
          return aSurname.localeCompare(bSurname, 'it');
        });
      });
    });

    // Ordina partecipanti senza gruppo per cognome
    noGroup.sort((a, b) => {
      const aSurname = a.full_name.split(' ').pop() || '';
      const bSurname = b.full_name.split(' ').pop() || '';
      return aSurname.localeCompare(bSurname, 'it');
    });

    return { groups, noGroup };
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

  const { groups, noGroup } = getParticipantsByGroup();
  const sortedGroupNumbers = Object.keys(groups).map(Number).sort((a, b) => a - b);

  // Conta camere per tipologia
  const roomCounts: Record<string, number> = {};
  sortedGroupNumbers.forEach(groupNum => {
    const roomTypes = groups[groupNum];
    Object.entries(roomTypes).forEach(([roomType, roomParticipants]) => {
      // Conta quante camere di questo tipo nel gruppo (basato sulla capacità)
      const capacity = getRoomCapacity(roomType);
      const numRooms = Math.ceil(roomParticipants.length / capacity);
      roomCounts[roomType] = (roomCounts[roomType] || 0) + numRooms;
    });
  });
  noGroup.forEach(p => {
    const roomType = getRoomType(p);
    roomCounts[roomType] = (roomCounts[roomType] || 0) + 1;
  });

  // Divide i partecipanti in camere singole in base alla capacità
  const splitIntoRooms = (participants: Participant[], roomType: string): Participant[][] => {
    const capacity = getRoomCapacity(roomType);
    const rooms: Participant[][] = [];
    for (let i = 0; i < participants.length; i += capacity) {
      rooms.push(participants.slice(i, i + capacity));
    }
    return rooms;
  };

  // Prepara righe per la tabella: ogni camera separata con i suoi partecipanti
  interface TableRow {
    groupNum: number | null;
    roomType: string;
    participants: Participant[];
    isFirstInGroup: boolean;
    isFirstInRoomType: boolean;
    totalRowsInGroup: number;
    roomsOfThisType: number;
  }
  
  const tableRows: TableRow[] = [];
  
  sortedGroupNumbers.forEach(groupNum => {
    const roomTypes = groups[groupNum];
    
    // Calcola il totale di partecipanti nel gruppo
    let totalParticipantsInGroup = 0;
    Object.values(roomTypes).forEach(parts => {
      totalParticipantsInGroup += parts.length;
    });
    
    let isFirstInGroup = true;
    Object.entries(roomTypes).forEach(([roomType, roomParticipants]) => {
      // Dividi i partecipanti in camere separate
      const rooms = splitIntoRooms(roomParticipants, roomType);
      
      rooms.forEach((roomOccupants, roomIdx) => {
        tableRows.push({
          groupNum,
          roomType,
          participants: roomOccupants,
          isFirstInGroup,
          isFirstInRoomType: roomIdx === 0,
          totalRowsInGroup: totalParticipantsInGroup,
          roomsOfThisType: rooms.length,
        });
        isFirstInGroup = false;
      });
    });
  });

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

      {/* Riepilogo camere */}
      <div className="mb-4 p-3 bg-muted/50 rounded-lg border text-sm">
        <strong>Riepilogo camere:</strong>{' '}
        {Object.entries(roomCounts).map(([type, count], idx) => (
          <span key={type}>
            {idx > 0 && ' | '}
            {getRoomLabel(type)}: <strong>{count}</strong>
          </span>
        ))}
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
            <th className="border p-2 text-center text-sm w-16">Gruppo</th>
            <th className="border p-2 text-left text-sm w-24">Camera</th>
            <th className="border p-2 text-left text-sm">Nominativo</th>
            <th className="border p-2 text-left text-sm w-28">Data Nascita</th>
            <th className="border p-2 text-left text-sm">Luogo Nascita</th>
            <th className="border p-2 text-left text-sm">Note</th>
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row) => {
            const groupNum = row.groupNum!;
            return row.participants.map((p, pIdx) => (
              <tr key={p.id} className={groupNum % 2 === 0 ? "bg-white" : "bg-muted/30"}>
                {row.isFirstInGroup && pIdx === 0 && (
                  <td 
                    className="border p-2 text-sm font-bold text-center bg-primary/10" 
                    rowSpan={row.totalRowsInGroup}
                  >
                    #{groupNum}
                  </td>
                )}
                {pIdx === 0 && (
                  <td 
                    className="border p-2 text-sm font-medium capitalize" 
                    rowSpan={row.participants.length}
                  >
                    {getRoomLabel(row.roomType)}
                  </td>
                )}
                <td className="border p-2 text-sm font-medium">{formatNameSurnameFirst(p.full_name)}</td>
                <td className="border p-2 text-sm">
                  {p.date_of_birth ? format(new Date(p.date_of_birth), "dd/MM/yyyy") : "-"}
                </td>
                <td className="border p-2 text-sm">{p.place_of_birth || "-"}</td>
                <td className="border p-2 text-sm text-muted-foreground">{p.notes_hotel || "-"}</td>
              </tr>
            ));
          })}
          
          {/* Partecipanti senza gruppo */}
          {noGroup.map((p) => (
            <tr key={p.id} className="bg-orange-50">
              <td className="border p-2 text-sm text-center text-muted-foreground">-</td>
              <td className="border p-2 text-sm font-medium capitalize">{getRoomLabel(getRoomType(p))}</td>
              <td className="border p-2 text-sm font-medium">{formatNameSurnameFirst(p.full_name)}</td>
              <td className="border p-2 text-sm">
                {p.date_of_birth ? format(new Date(p.date_of_birth), "dd/MM/yyyy") : "-"}
              </td>
              <td className="border p-2 text-sm">{p.place_of_birth || "-"}</td>
              <td className="border p-2 text-sm text-muted-foreground">{p.notes_hotel || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 pt-4 border-t text-sm text-muted-foreground">
        <p>Totale partecipanti: {participants.length}</p>
        <p>Totale gruppi: {sortedGroupNumbers.length}{noGroup.length > 0 ? ` + ${noGroup.length} senza gruppo` : ''}</p>
        <p>Data generazione: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: it })}</p>
      </div>
    </div>
  );
}
