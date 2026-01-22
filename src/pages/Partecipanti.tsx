import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatNameSurnameFirst } from "@/lib/format-utils";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Calendar, Eye, Edit, Ban, UserPlus, Merge, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/use-user-role";
import EditParticipantStandaloneDialog from "@/components/EditParticipantStandaloneDialog";
import AddToBlacklistDialog from "@/components/AddToBlacklistDialog";
import AddParticipantStandaloneDialog from "@/components/AddParticipantStandaloneDialog";
import MergeParticipantsDialog from "@/components/MergeParticipantsDialog";
import { ParticipantDocUpload } from "@/components/ParticipantDocUpload";

interface ParticipantRecord {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  notes: string | null;
  created_at: string;
  trip: {
    id: string;
    title: string;
    destination: string;
    departure_date: string;
    return_date: string;
    status: string;
  } | null;
}

// Grouped participant with all their trips
interface GroupedParticipant {
  // Best record info (most complete data)
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  notes: string | null;
  // All records for this person
  records: ParticipantRecord[];
  // All trips
  trips: {
    participantId: string;
    trip: NonNullable<ParticipantRecord["trip"]>;
  }[];
}

const statusColors = {
  planned: "bg-blue-500",
  confirmed: "bg-green-500",
  ongoing: "bg-orange-500",
  completed: "bg-yellow-500",
  cancelled: "bg-red-500",
};

const statusLabels = {
  planned: "Pianificato",
  confirmed: "Confermato",
  ongoing: "In Corso",
  completed: "Completato",
  cancelled: "Annullato",
};

export default function Partecipanti() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [blacklistedNames, setBlacklistedNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editParticipant, setEditParticipant] = useState<ParticipantRecord | null>(null);
  const [blacklistParticipant, setBlacklistParticipant] = useState<ParticipantRecord | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [mergeParticipants, setMergeParticipants] = useState<ParticipantRecord[]>([]);
  const [expandedParticipants, setExpandedParticipants] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadParticipants();
    loadBlacklist();
  }, []);

  const loadBlacklist = async () => {
    try {
      const { data, error } = await supabase
        .from("blacklist")
        .select("full_name");
      
      if (error) {
        console.error("Errore caricamento blacklist:", error);
        return;
      }
      
      setBlacklistedNames((data || []).map(b => b.full_name.toLowerCase()));
    } catch (error) {
      console.error("Errore caricamento blacklist:", error);
    }
  };

  const isInBlacklist = (name: string) => {
    return blacklistedNames.includes(name.toLowerCase());
  };

  const loadParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from("participants")
        .select(`
          id,
          full_name,
          email,
          phone,
          date_of_birth,
          place_of_birth,
          notes,
          created_at,
          trip:trips (
            id,
            title,
            destination,
            departure_date,
            return_date,
            status
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setParticipants((data || []) as ParticipantRecord[]);
    } catch (error) {
      console.error("Errore caricamento partecipanti:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group participants by normalized name
  const getGroupedParticipants = (): GroupedParticipant[] => {
    const grouped = new Map<string, ParticipantRecord[]>();
    
    participants.forEach(p => {
      const key = p.full_name.toLowerCase().trim();
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(p);
    });

    const result: GroupedParticipant[] = [];
    
    grouped.forEach((records) => {
      // Sort records by created_at DESC (most recent first)
      const sortedRecords = [...records].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Use the most recent record as the "master" record for biographical data
      const mostRecentRecord = sortedRecords[0];

      // Collect all trips
      const trips = records
        .filter(r => r.trip)
        .map(r => ({
          participantId: r.id,
          trip: r.trip!
        }))
        .sort((a, b) => new Date(b.trip.departure_date).getTime() - new Date(a.trip.departure_date).getTime());

      result.push({
        id: mostRecentRecord.id,
        full_name: mostRecentRecord.full_name,
        email: mostRecentRecord.email,
        phone: mostRecentRecord.phone,
        date_of_birth: mostRecentRecord.date_of_birth,
        place_of_birth: mostRecentRecord.place_of_birth,
        notes: mostRecentRecord.notes,
        records,
        trips,
      });
    });

    return result;
  };

  const getFilteredParticipants = () => {
    let grouped = getGroupedParticipants();
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      grouped = grouped.filter(p => 
        p.full_name.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query) ||
        p.phone?.includes(query) ||
        p.trips.some(t => 
          t.trip.title.toLowerCase().includes(query) ||
          t.trip.destination.toLowerCase().includes(query)
        )
      );
    }
    
    // Sort alphabetically by surname
    return grouped.sort((a, b) => {
      const aFormatted = formatNameSurnameFirst(a.full_name);
      const bFormatted = formatNameSurnameFirst(b.full_name);
      return aFormatted.localeCompare(bFormatted, 'it', { sensitivity: 'base' });
    });
  };

  const handleMergeClick = (participant: GroupedParticipant) => {
    if (participant.records.length > 1) {
      setMergeParticipants(participant.records);
    }
  };

  const toggleExpanded = (key: string) => {
    setExpandedParticipants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const getTripStatusCategory = (status: string, departureDate: string) => {
    const now = new Date();
    const departure = new Date(departureDate);
    
    if (status === "completed" || status === "cancelled") {
      return "past";
    }
    if (departure > now) {
      return "future";
    }
    return "current";
  };

  const filteredParticipants = getFilteredParticipants();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">Partecipanti</h1>
          <p className="text-muted-foreground">
            Tutti i partecipanti ai viaggi con ricerca e storico
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Aggiungi Partecipante
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Ricerca Partecipante
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome, email, telefono o viaggio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Risultati ({filteredParticipants.length} persone)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredParticipants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery 
                ? "Nessun partecipante trovato con questi criteri" 
                : "Nessun partecipante registrato"}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredParticipants.map((participant) => {
                const key = participant.full_name.toLowerCase().trim();
                const isExpanded = expandedParticipants.has(key);
                const futureTrips = participant.trips.filter(t => getTripStatusCategory(t.trip.status, t.trip.departure_date) === "future");
                const currentTrips = participant.trips.filter(t => getTripStatusCategory(t.trip.status, t.trip.departure_date) === "current");
                const pastTrips = participant.trips.filter(t => getTripStatusCategory(t.trip.status, t.trip.departure_date) === "past");
                
                // Check if there are records with potentially conflicting biographical data
                // Only show merge button when there are actual discrepancies to resolve
                const hasPotentialDuplicates = participant.records.length > 1 && (() => {
                  // Check for records with different biographical data (possible different people or data to merge)
                  const bioDataSets = participant.records.map(r => ({
                    email: r.email?.toLowerCase().trim() || "",
                    phone: r.phone?.replace(/\s/g, "") || "",
                    dob: r.date_of_birth || "",
                    pob: r.place_of_birth?.toLowerCase().trim() || ""
                  }));
                  
                  // Compare first record with others - if any field differs, might need merge
                  for (let i = 1; i < bioDataSets.length; i++) {
                    const first = bioDataSets[0];
                    const current = bioDataSets[i];
                    
                    // If both have data but it's different, it's a potential duplicate/conflict
                    if ((first.email && current.email && first.email !== current.email) ||
                        (first.phone && current.phone && first.phone !== current.phone) ||
                        (first.dob && current.dob && first.dob !== current.dob) ||
                        (first.pob && current.pob && first.pob !== current.pob)) {
                      return true;
                    }
                  }
                  
                  // Also check for orphan records (records without trips that could be merged)
                  const orphanRecords = participant.records.filter(r => !r.trip);
                  if (orphanRecords.length > 0 && participant.records.length > orphanRecords.length) {
                    return true; // Has orphans that could be cleaned up
                  }
                  
                  return false;
                })();

                return (
                  <div
                    key={key}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{formatNameSurnameFirst(participant.full_name)}</h3>
                          {isInBlacklist(participant.full_name) && (
                            <Badge variant="destructive" className="text-xs font-bold uppercase">
                              Blacklist
                            </Badge>
                          )}
                          {hasPotentialDuplicates && (
                            <Badge 
                              variant="secondary" 
                              className="text-xs cursor-pointer hover:bg-yellow-200"
                              onClick={() => handleMergeClick(participant)}
                              title="Clicca per unificare i dati anagrafici discordanti"
                            >
                              <Merge className="h-3 w-3 mr-1" />
                              Dati da unificare
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {participant.trips.length} viaggi
                          </Badge>
                        </div>
                        
                        {(participant.email || participant.phone) && (
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            {participant.email && <span>✉ {participant.email}</span>}
                            {participant.phone && <span>📞 {participant.phone}</span>}
                          </div>
                        )}

                        {(participant.date_of_birth || participant.place_of_birth) && (
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            {participant.date_of_birth && (
                              <span>
                                Nato il {format(new Date(participant.date_of_birth), "dd/MM/yyyy")}
                              </span>
                            )}
                            {participant.place_of_birth && (
                              <span>a {participant.place_of_birth}</span>
                            )}
                          </div>
                        )}

                        {/* Viaggi Section */}
                        <div className="pt-2 border-t">
                          <button
                            className="flex items-center gap-2 text-sm font-medium text-primary hover:underline w-full text-left"
                            onClick={() => toggleExpanded(key)}
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            {participant.trips.length === 0 
                              ? "Nessun viaggio associato" 
                              : `${participant.trips.length} viaggio/i`}
                          </button>

                          {isExpanded && participant.trips.length > 0 && (
                            <div className="mt-3 space-y-4 pl-6">
                              {/* Future Trips */}
                              {futureTrips.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-green-600 uppercase mb-2">
                                    Da Fare ({futureTrips.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {futureTrips.map(({ participantId, trip }) => (
                                      <div 
                                        key={participantId}
                                        className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-200"
                                      >
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{trip.title}</span>
                                            <Badge className={`${statusColors[trip.status as keyof typeof statusColors]} text-white text-xs`}>
                                              {statusLabels[trip.status as keyof typeof statusLabels]}
                                            </Badge>
                                          </div>
                                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1">
                                              <MapPin className="h-3 w-3" />
                                              {trip.destination}
                                            </span>
                                            <span className="flex items-center gap-1">
                                              <Calendar className="h-3 w-3" />
                                              {format(new Date(trip.departure_date), "dd MMM yyyy", { locale: it })}
                                            </span>
                                          </div>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => navigate(`/viaggi/${trip.id}`)}
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          Vai
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Current Trips */}
                              {currentTrips.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-orange-600 uppercase mb-2">
                                    In Corso ({currentTrips.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {currentTrips.map(({ participantId, trip }) => (
                                      <div 
                                        key={participantId}
                                        className="flex items-center justify-between p-2 rounded-lg bg-orange-50 border border-orange-200"
                                      >
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{trip.title}</span>
                                            <Badge className={`${statusColors[trip.status as keyof typeof statusColors]} text-white text-xs`}>
                                              {statusLabels[trip.status as keyof typeof statusLabels]}
                                            </Badge>
                                          </div>
                                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1">
                                              <MapPin className="h-3 w-3" />
                                              {trip.destination}
                                            </span>
                                            <span className="flex items-center gap-1">
                                              <Calendar className="h-3 w-3" />
                                              {format(new Date(trip.departure_date), "dd MMM yyyy", { locale: it })}
                                            </span>
                                          </div>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => navigate(`/viaggi/${trip.id}`)}
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          Vai
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Past Trips */}
                              {pastTrips.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                    Storico ({pastTrips.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {pastTrips.map(({ participantId, trip }) => (
                                      <div 
                                        key={participantId}
                                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border"
                                      >
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm text-muted-foreground">{trip.title}</span>
                                            <Badge variant="outline" className="text-xs">
                                              {statusLabels[trip.status as keyof typeof statusLabels]}
                                            </Badge>
                                          </div>
                                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1">
                                              <MapPin className="h-3 w-3" />
                                              {trip.destination}
                                            </span>
                                            <span className="flex items-center gap-1">
                                              <Calendar className="h-3 w-3" />
                                              {format(new Date(trip.departure_date), "dd MMM yyyy", { locale: it })}
                                            </span>
                                          </div>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                          Completato
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {isExpanded && participant.trips.length === 0 && (
                            <div className="mt-2 pl-6">
                              <Badge variant="outline" className="text-muted-foreground">
                                Nessun viaggio associato
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="pt-2">
                          <ParticipantDocUpload participantId={participant.id} participantName={participant.full_name} dateOfBirth={participant.date_of_birth} />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditParticipant(participant.records[0])}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Modifica
                        </Button>

                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBlacklistParticipant(participant.records[0])}
                            className="bg-gray-900 text-white border-gray-900 hover:bg-gray-800 hover:text-white"
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Blacklist
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <EditParticipantStandaloneDialog
        participant={editParticipant}
        open={!!editParticipant}
        onOpenChange={(open) => !open && setEditParticipant(null)}
        onSuccess={loadParticipants}
      />

      <AddToBlacklistDialog
        participant={blacklistParticipant}
        open={!!blacklistParticipant}
        onOpenChange={(open) => !open && setBlacklistParticipant(null)}
        onSuccess={() => {
          loadParticipants();
          loadBlacklist();
        }}
      />

      <AddParticipantStandaloneDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={loadParticipants}
      />

      <MergeParticipantsDialog
        participants={mergeParticipants}
        open={mergeParticipants.length > 1}
        onOpenChange={(open) => !open && setMergeParticipants([])}
        onSuccess={loadParticipants}
      />
    </div>
  );
}
