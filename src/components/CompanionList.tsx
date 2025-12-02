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
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

interface SeatAssignment {
  participant_id: string;
  seat_number: number;
}

interface Payment {
  participant_id: string;
  amount: number;
}

interface Trip {
  title: string;
  destination: string;
  departure_date: string;
  return_date: string;
  price: number;
  deposit_amount: number;
  deposit_type: "fixed" | "percentage";
  companion_name: string | null;
}

export default function CompanionList() {
  const { id } = useParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [payments, setPayments] = useState<Record<string, number>>({});
  const [seatAssignments, setSeatAssignments] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const { data: tripData } = await supabase
        .from("trips")
        .select("*")
        .eq("id", id)
        .single();

      const { data: participantsData } = await supabase
        .from("participants")
        .select("*")
        .eq("trip_id", id)
        .order("full_name");

      setTrip(tripData);
      setParticipants(participantsData || []);

      if (participantsData) {
        const participantIds = participantsData.map(p => p.id);
        
        // Carica pagamenti
        const { data: paymentsData } = await supabase
          .from("payments")
          .select("participant_id, amount")
          .in("participant_id", participantIds);

        const paymentsByParticipant: Record<string, number> = {};
        paymentsData?.forEach((payment: Payment) => {
          paymentsByParticipant[payment.participant_id] = 
            (paymentsByParticipant[payment.participant_id] || 0) + Number(payment.amount);
        });
        setPayments(paymentsByParticipant);

        // Carica assegnazioni posti bus
        const { data: busConfig } = await supabase
          .from("bus_configurations")
          .select("id")
          .eq("trip_id", id)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        if (busConfig) {
          const { data: seatsData } = await supabase
            .from("bus_seat_assignments")
            .select("participant_id, seat_number")
            .eq("bus_config_id", busConfig.id);

          const seatsByParticipant: Record<string, number> = {};
          seatsData?.forEach((seat: SeatAssignment) => {
            seatsByParticipant[seat.participant_id] = seat.seat_number;
          });
          setSeatAssignments(seatsByParticipant);
        }
      }
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
      altro: [],
    };

    const grouped: Record<string, Participant[]> = {};
    
    participants.forEach(p => {
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

  const calculateExpectedDeposit = () => {
    if (!trip) return 0;
    if (trip.deposit_type === "percentage") {
      return (trip.price * trip.deposit_amount) / 100;
    }
    return trip.deposit_amount;
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
    altro: "Senza Camera",
  };

  const expectedDeposit = calculateExpectedDeposit();

  return (
    <>
      <style>{`
        @media print {
          body { 
            margin: 0;
            padding: 15px;
            font-size: 9pt;
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
            max-width: 297mm;
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
            Stampa Lista Accompagnatore
          </button>
          <button 
            onClick={() => window.close()} 
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
          >
            Chiudi
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{trip?.title}</h1>
          <h2 className="text-xl text-muted-foreground mb-4">Lista Accompagnatore</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Destinazione:</strong> {trip?.destination}</p>
              <p><strong>Partenza:</strong> {trip?.departure_date && format(new Date(trip.departure_date), "dd MMMM yyyy", { locale: it })}</p>
              <p><strong>Ritorno:</strong> {trip?.return_date && format(new Date(trip.return_date), "dd MMMM yyyy", { locale: it })}</p>
            </div>
            <div>
              <p><strong>Accompagnatore:</strong> {trip?.companion_name || "Non assegnato"}</p>
              <p><strong>Prezzo:</strong> €{trip?.price.toLocaleString("it-IT")}</p>
              <p><strong>Acconto previsto:</strong> €{expectedDeposit.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {Object.entries(getParticipantsByRoom()).map(([roomType, roomGroups]) => {
          if (roomGroups.length === 0) return null;

          return (
            <div key={roomType} className="mb-6">
              <h3 className="text-base font-semibold mb-3 pb-1 border-b-2 border-primary">
                {roomLabels[roomType]}
              </h3>
              
              <table className="w-full border-collapse mb-4 text-xs">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-1.5 text-left font-semibold">Camera</th>
                    <th className="border border-border p-1.5 text-center font-semibold">Posto Bus</th>
                    <th className="border border-border p-1.5 text-left font-semibold">Nome</th>
                    <th className="border border-border p-1.5 text-left font-semibold">Data Nascita</th>
                    <th className="border border-border p-1.5 text-left font-semibold">Luogo Nascita</th>
                    <th className="border border-border p-1.5 text-left font-semibold">Email</th>
                    <th className="border border-border p-1.5 text-left font-semibold">Telefono</th>
                    <th className="border border-border p-1.5 text-right font-semibold">Prezzo</th>
                    <th className="border border-border p-1.5 text-right font-semibold">Versato</th>
                    <th className="border border-border p-1.5 text-right font-semibold">Da Versare</th>
                  </tr>
                </thead>
                <tbody>
                  {roomGroups.map((group, groupIndex) => (
                    group.map((participant, idx) => {
                      const paid = payments[participant.id] || 0;
                      const remaining = (trip?.price || 0) - paid;
                      
                      return (
                        <tr key={participant.id} className="hover:bg-muted/50">
                          {idx === 0 && (
                            <td 
                              className="border border-border p-1.5 font-medium align-top text-center" 
                              rowSpan={group.length}
                            >
                              #{groupIndex + 1}
                            </td>
                          )}
                          <td className="border border-border p-1.5 text-center font-semibold">
                            {seatAssignments[participant.id] || "-"}
                          </td>
                          <td className="border border-border p-1.5">{participant.full_name}</td>
                          <td className="border border-border p-1.5 whitespace-nowrap">
                            {participant.date_of_birth 
                              ? format(new Date(participant.date_of_birth), "dd/MM/yyyy")
                              : "-"
                            }
                          </td>
                          <td className="border border-border p-1.5">
                            {participant.place_of_birth || "-"}
                          </td>
                          <td className="border border-border p-1.5 text-xs">
                            {participant.email || "-"}
                          </td>
                          <td className="border border-border p-1.5">
                            {participant.phone || "-"}
                          </td>
                          <td className="border border-border p-1.5 text-right whitespace-nowrap">
                            €{trip?.price.toFixed(2)}
                          </td>
                          <td className="border border-border p-1.5 text-right whitespace-nowrap">
                            €{paid.toFixed(2)}
                          </td>
                          <td className={`border border-border p-1.5 text-right font-semibold whitespace-nowrap ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            €{remaining.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-sm font-semibold">
            <div>
              <p>Totale partecipanti: {participants.length}</p>
            </div>
            <div>
              <p>Incasso totale previsto: €{((trip?.price || 0) * participants.length).toFixed(2)}</p>
              <p className="text-green-600">Totale versato: €{Object.values(payments).reduce((a, b) => a + b, 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-orange-600">
                Totale da incassare: €{(((trip?.price || 0) * participants.length) - Object.values(payments).reduce((a, b) => a + b, 0)).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
          <p>Stampato il: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: it })}</p>
        </div>
      </div>
    </>
  );
}
