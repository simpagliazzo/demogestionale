import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { formatNameSurnameFirst, calculateDiscountedPrice } from "@/lib/format-utils";

interface Participant {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  place_of_birth: string | null;
  email: string | null;
  phone: string | null;
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

interface Trip {
  title: string;
  destination: string;
  departure_date: string;
  return_date: string;
  price: number;
  deposit_amount: number;
  deposit_type: "fixed" | "percentage";
  companion_name: string | null;
  single_room_supplement: number | null;
}

interface Hotel {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
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

export default function CompanionList() {
  const { id } = useParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [payments, setPayments] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [groupByGroupNumber, setGroupByGroupNumber] = useState(false);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [tripGuides, setTripGuides] = useState<TripGuide[]>([]);

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
        .select("id, full_name, date_of_birth, place_of_birth, email, phone, notes, notes_companion, created_at, group_number, discount_type, discount_amount")
        .eq("trip_id", id)
        .order("group_number", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

      // Carica hotel
      const { data: hotelsData } = await supabase
        .from("hotels")
        .select("id, name, address, phone")
        .eq("trip_id", id);

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

      setTrip(tripData);
      setParticipants(participantsData || []);
      setHotels(hotelsData || []);
      setTripGuides((tripGuidesData || []).map((tg: any) => ({
        id: tg.id,
        guide: tg.guides
      })));

      if (participantsData) {
        const participantIds = participantsData.map(p => p.id);
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

  // Raggruppa partecipanti per numero gruppo prenotazione
  const getParticipantsByGroupNumber = () => {
    const byGroupNumber: Record<string, Participant[]> = {};
    
    participants.forEach(p => {
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

  const calculateExpectedDeposit = () => {
    if (!trip) return 0;
    if (trip.deposit_type === "percentage") {
      return (trip.price * trip.deposit_amount) / 100;
    }
    return trip.deposit_amount;
  };

  // Calcola il prezzo effettivo per un partecipante (con sconto e supplemento singola)
  const getParticipantPrice = (participant: Participant) => {
    const basePrice = trip?.price || 0;
    const discountedPrice = calculateDiscountedPrice(basePrice, participant.discount_type, participant.discount_amount);
    const isSingle = participant.notes?.includes("Camera: singola");
    const supplement = isSingle ? (trip?.single_room_supplement || 0) : 0;
    return discountedPrice + supplement;
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
        <div className="no-print mb-6 flex gap-2 flex-wrap">
          <button 
            onClick={() => window.print()} 
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Stampa Lista Accompagnatore
          </button>
          <button 
            onClick={() => setGroupByGroupNumber(false)} 
            className={`px-4 py-2 rounded-lg ${!groupByGroupNumber ? 'bg-primary text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
          >
            Per Camera
          </button>
          <button 
            onClick={() => setGroupByGroupNumber(true)} 
            className={`px-4 py-2 rounded-lg ${groupByGroupNumber ? 'bg-primary text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
          >
            Per Gruppo Prenotazione
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
          <h2 className="text-xl text-muted-foreground mb-4">
            Lista Accompagnatore {groupByGroupNumber ? "(per Gruppo Prenotazione)" : "(per Camera)"}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Destinazione:</strong> {trip?.destination}</p>
              <p><strong>Partenza:</strong> {trip?.departure_date && format(new Date(trip.departure_date), "dd MMMM yyyy", { locale: it })}</p>
              <p><strong>Ritorno:</strong> {trip?.return_date && format(new Date(trip.return_date), "dd MMMM yyyy", { locale: it })}</p>
            </div>
            <div>
              <p><strong>Accompagnatore:</strong> {trip?.companion_name || "Non assegnato"}</p>
              {tripGuides.length > 0 && (
                <div className="mt-1">
                  <strong>Guide:</strong>
                  {tripGuides.map((tg, index) => (
                    <span key={tg.id}>
                      {index > 0 && ", "}
                      {tg.guide?.full_name}
                      {tg.guide?.phone && ` (Tel: ${tg.guide.phone})`}
                    </span>
                  ))}
                </div>
              )}
              <p><strong>Prezzo:</strong> €{trip?.price.toLocaleString("it-IT")}</p>
              <p><strong>Acconto previsto:</strong> €{expectedDeposit.toFixed(2)}</p>
            </div>
          </div>

          {/* Hotel del viaggio */}
          {hotels.length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <p className="font-semibold mb-2">Hotel:</p>
              <div className="grid grid-cols-2 gap-2">
                {hotels.map((hotel) => (
                  <div key={hotel.id} className="text-sm">
                    <span className="font-medium">{hotel.name}</span>
                    {hotel.address && <span className="text-muted-foreground"> - {hotel.address}</span>}
                    {hotel.phone && <span className="text-muted-foreground"> - Tel: {hotel.phone}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {groupByGroupNumber ? (
          // Vista raggruppata per numero di gruppo prenotazione
          <div className="space-y-6">
            {getParticipantsByGroupNumber().map(({ groupNumber, participants: groupParticipants }) => (
              <div key={groupNumber ?? 'no-group'} className="mb-6">
                <h3 className="text-base font-semibold mb-3 pb-1 border-b-2 border-primary">
                  {groupNumber ? `Gruppo Prenotazione #${groupNumber}` : 'Senza Gruppo'} 
                  <span className="font-normal text-sm text-muted-foreground ml-2">
                    ({groupParticipants.length} {groupParticipants.length === 1 ? 'persona' : 'persone'})
                  </span>
                </h3>
                
                <table className="w-full border-collapse mb-4 text-xs">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border p-1.5 text-left font-semibold">Nome</th>
                      <th className="border border-border p-1.5 text-left font-semibold">Data Nascita</th>
                      <th className="border border-border p-1.5 text-left font-semibold">Luogo Nascita</th>
                      <th className="border border-border p-1.5 text-left font-semibold">Telefono</th>
                      <th className="border border-border p-1.5 text-center font-semibold">Camera</th>
                      <th className="border border-border p-1.5 text-right font-semibold">Prezzo</th>
                      <th className="border border-border p-1.5 text-right font-semibold">Versato</th>
                      <th className="border border-border p-1.5 text-right font-semibold">Da Versare</th>
                      <th className="border border-border p-1.5 text-left font-semibold">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupParticipants.map((participant) => {
                      const paid = payments[participant.id] || 0;
                      const participantPrice = getParticipantPrice(participant);
                      const remaining = participantPrice - paid;
                      
                      // Estrai tipo camera dalle note
                      let roomType = '-';
                      if (participant.notes?.includes("Camera: singola")) roomType = 'S';
                      else if (participant.notes?.includes("Camera: doppia")) roomType = 'D';
                      else if (participant.notes?.includes("Camera: matrimoniale")) roomType = 'M';
                      else if (participant.notes?.includes("Camera: tripla")) roomType = 'T';
                      else if (participant.notes?.includes("Camera: quadrupla")) roomType = 'Q';
                      
                      return (
                        <tr key={participant.id} className="hover:bg-muted/50">
                          <td className="border border-border p-1.5">{formatNameSurnameFirst(participant.full_name)}</td>
                          <td className="border border-border p-1.5 whitespace-nowrap">
                            {participant.date_of_birth 
                              ? format(new Date(participant.date_of_birth), "dd/MM/yyyy")
                              : "-"
                            }
                          </td>
                          <td className="border border-border p-1.5">
                            {participant.place_of_birth || "-"}
                          </td>
                          <td className="border border-border p-1.5">
                            {participant.phone || "-"}
                          </td>
                          <td className="border border-border p-1.5 text-center font-medium">
                            {roomType}
                          </td>
                          <td className="border border-border p-1.5 text-right whitespace-nowrap">
                            €{participantPrice.toFixed(2)}
                            {participant.discount_type && participant.discount_amount && participant.discount_amount > 0 && (
                              <span className="text-xs text-orange-600 ml-1">(scontato)</span>
                            )}
                          </td>
                          <td className="border border-border p-1.5 text-right whitespace-nowrap">
                            €{paid.toFixed(2)}
                          </td>
                          <td className={`border border-border p-1.5 text-right font-semibold whitespace-nowrap ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            €{remaining.toFixed(2)}
                          </td>
                          <td className="border border-border p-1.5 text-xs text-muted-foreground">
                            {participant.notes_companion || "-"}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Riga totale gruppo */}
                    <tr className="bg-muted/70 font-semibold">
                      <td colSpan={5} className="border border-border p-1.5 text-right">
                        Totale Gruppo:
                      </td>
                      <td className="border border-border p-1.5 text-right whitespace-nowrap">
                        €{groupParticipants.reduce((sum, p) => sum + getParticipantPrice(p), 0).toFixed(2)}
                      </td>
                      <td className="border border-border p-1.5 text-right whitespace-nowrap text-green-600">
                        €{groupParticipants.reduce((sum, p) => sum + (payments[p.id] || 0), 0).toFixed(2)}
                      </td>
                      <td className="border border-border p-1.5 text-right whitespace-nowrap text-orange-600">
                        €{(groupParticipants.reduce((sum, p) => sum + getParticipantPrice(p), 0) - groupParticipants.reduce((sum, p) => sum + (payments[p.id] || 0), 0)).toFixed(2)}
                      </td>
                      <td className="border border-border p-1.5"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : (
          // Vista raggruppata per tipo camera (originale)
          Object.entries(getParticipantsByRoom()).map(([roomType, roomGroups]) => {
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
                      <th className="border border-border p-1.5 text-left font-semibold">Nome</th>
                      <th className="border border-border p-1.5 text-left font-semibold">Data Nascita</th>
                      <th className="border border-border p-1.5 text-left font-semibold">Luogo Nascita</th>
                      <th className="border border-border p-1.5 text-left font-semibold">Telefono</th>
                      <th className="border border-border p-1.5 text-center font-semibold">Gr.</th>
                      <th className="border border-border p-1.5 text-right font-semibold">Prezzo</th>
                      <th className="border border-border p-1.5 text-right font-semibold">Versato</th>
                      <th className="border border-border p-1.5 text-right font-semibold">Da Versare</th>
                      <th className="border border-border p-1.5 text-left font-semibold">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomGroups.map((group, groupIndex) => (
                      group.map((participant, idx) => {
                        const paid = payments[participant.id] || 0;
                        const participantPrice = getParticipantPrice(participant);
                        const remaining = participantPrice - paid;
                        
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
                            <td className="border border-border p-1.5">{formatNameSurnameFirst(participant.full_name)}</td>
                            <td className="border border-border p-1.5 whitespace-nowrap">
                              {participant.date_of_birth 
                                ? format(new Date(participant.date_of_birth), "dd/MM/yyyy")
                                : "-"
                              }
                            </td>
                            <td className="border border-border p-1.5">
                              {participant.place_of_birth || "-"}
                            </td>
                            <td className="border border-border p-1.5">
                              {participant.phone || "-"}
                            </td>
                            <td className="border border-border p-1.5 text-center font-medium">
                              {participant.group_number || "-"}
                            </td>
                            <td className="border border-border p-1.5 text-right whitespace-nowrap">
                              €{participantPrice.toFixed(2)}
                              {participant.discount_type && participant.discount_amount && participant.discount_amount > 0 && (
                                <span className="text-xs text-orange-600 ml-1">(scontato)</span>
                              )}
                            </td>
                            <td className="border border-border p-1.5 text-right whitespace-nowrap">
                              €{paid.toFixed(2)}
                            </td>
                            <td className={`border border-border p-1.5 text-right font-semibold whitespace-nowrap ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              €{remaining.toFixed(2)}
                            </td>
                            <td className="border border-border p-1.5 text-xs text-muted-foreground">
                              {participant.notes_companion || "-"}
                            </td>
                          </tr>
                        );
                      })
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        )}

        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-sm font-semibold">
            <div>
              <p>Totale partecipanti: {participants.length}</p>
            </div>
            <div>
              <p>Incasso totale previsto: €{participants.reduce((sum, p) => sum + getParticipantPrice(p), 0).toFixed(2)}</p>
              <p className="text-green-600">Totale versato: €{Object.values(payments).reduce((a, b) => a + b, 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-orange-600">
                Totale da incassare: €{(participants.reduce((sum, p) => sum + getParticipantPrice(p), 0) - Object.values(payments).reduce((a, b) => a + b, 0)).toFixed(2)}
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