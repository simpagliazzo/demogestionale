import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Participant {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  place_of_birth: string | null;
  notes: string | null;
  created_at: string;
}

interface Trip {
  title: string;
  destination: string;
  departure_date: string;
  return_date: string;
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
        .select("title, destination, departure_date, return_date")
        .eq("id", id)
        .single();

      const { data: participantsData } = await supabase
        .from("participants")
        .select("*")
        .eq("trip_id", id)
        .order("full_name");

      setTrip(tripData);
      setParticipants(participantsData || []);
    } catch (error) {
      console.error("Errore caricamento dati:", error);
    } finally {
      setLoading(false);
    }
  };

  const getParticipantsByRoom = () => {
    const byRoom: Record<string, Participant[][]> = {
      singola: [],
      doppia: [],
      matrimoniale: [],
      tripla: [],
      quadrupla: [],
    };

    const grouped: Record<string, Participant[]> = {};
    
    participants.forEach(p => {
      let roomType = '';
      if (p.notes?.includes("Camera: singola")) roomType = 'singola';
      else if (p.notes?.includes("Camera: doppia")) roomType = 'doppia';
      else if (p.notes?.includes("Camera: matrimoniale")) roomType = 'matrimoniale';
      else if (p.notes?.includes("Camera: tripla")) roomType = 'tripla';
      else if (p.notes?.includes("Camera: quadrupla")) roomType = 'quadrupla';
      
      if (roomType) {
        const groupKey = `${roomType}-${p.created_at}`;
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        grouped[groupKey].push(p);
      }
    });

    Object.values(grouped).forEach(group => {
      const firstParticipant = group[0];
      if (firstParticipant.notes?.includes("Camera: singola")) byRoom.singola.push(group);
      else if (firstParticipant.notes?.includes("Camera: doppia")) byRoom.doppia.push(group);
      else if (firstParticipant.notes?.includes("Camera: matrimoniale")) byRoom.matrimoniale.push(group);
      else if (firstParticipant.notes?.includes("Camera: tripla")) byRoom.tripla.push(group);
      else if (firstParticipant.notes?.includes("Camera: quadrupla")) byRoom.quadrupla.push(group);
    });

    return byRoom;
  };

  if (loading) {
    return <div className="p-8">Caricamento...</div>;
  }

  const roomLabels: Record<string, string> = {
    singola: "Camere Singole",
    doppia: "Camere Doppie",
    matrimoniale: "Camere Matrimoniali",
    tripla: "Camere Triple",
    quadrupla: "Camere Quadruple",
  };

  return (
    <>
      <style>{`
        @media print {
          body { 
            margin: 0;
            padding: 20px;
            font-size: 11pt;
          }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
        @media screen {
          .print-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
            background: white;
          }
        }
      `}</style>
      
      <div className="print-container">
        <div className="no-print mb-6 flex gap-2">
          <button 
            onClick={() => window.print()} 
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Stampa Lista Hotel
          </button>
          <button 
            onClick={() => window.close()} 
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
          >
            Chiudi
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{trip?.title}</h1>
          <h2 className="text-xl text-muted-foreground mb-4">Lista Hotel</h2>
          <div className="text-sm space-y-1">
            <p><strong>Destinazione:</strong> {trip?.destination}</p>
            <p><strong>Partenza:</strong> {trip?.departure_date && format(new Date(trip.departure_date), "dd MMMM yyyy", { locale: it })}</p>
            <p><strong>Ritorno:</strong> {trip?.return_date && format(new Date(trip.return_date), "dd MMMM yyyy", { locale: it })}</p>
          </div>
        </div>

        {Object.entries(getParticipantsByRoom()).map(([roomType, roomGroups]) => {
          if (roomGroups.length === 0) return null;

          return (
            <div key={roomType} className="mb-8">
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b-2 border-primary">
                {roomLabels[roomType]}
              </h3>
              
              <table className="w-full border-collapse mb-6">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-2 text-left font-semibold">Camera</th>
                    <th className="border border-border p-2 text-left font-semibold">Nome Completo</th>
                    <th className="border border-border p-2 text-left font-semibold">Data di Nascita</th>
                    <th className="border border-border p-2 text-left font-semibold">Luogo di Nascita</th>
                  </tr>
                </thead>
                <tbody>
                  {roomGroups.map((group, groupIndex) => (
                    group.map((participant, idx) => (
                      <tr key={participant.id} className="hover:bg-muted/50">
                        {idx === 0 && (
                          <td 
                            className="border border-border p-2 font-medium align-top" 
                            rowSpan={group.length}
                          >
                            #{groupIndex + 1}
                          </td>
                        )}
                        <td className="border border-border p-2">{participant.full_name}</td>
                        <td className="border border-border p-2">
                          {participant.date_of_birth 
                            ? format(new Date(participant.date_of_birth), "dd/MM/yyyy")
                            : "-"
                          }
                        </td>
                        <td className="border border-border p-2">
                          {participant.place_of_birth || "-"}
                        </td>
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
          <p>Stampato il: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: it })}</p>
        </div>
      </div>
    </>
  );
}
