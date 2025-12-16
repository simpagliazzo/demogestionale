import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  LogIn, 
  LogOut, 
  Plus, 
  Pencil, 
  Trash2, 
  Activity,
  User,
  Calendar,
  RotateCcw
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useUserRole } from "@/hooks/use-user-role";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ParticipantDetails {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  place_of_birth?: string | null;
  notes?: string | null;
  group_number?: number | null;
  discount_type?: string | null;
  discount_amount?: number | null;
}

interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  details: ParticipantDetails | Record<string, unknown> | null;
  user_agent: string | null;
  created_at: string;
  profile?: {
    full_name: string;
  } | null;
}

interface Trip {
  id: string;
  title: string;
  destination: string;
  departure_date: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  login: <LogIn className="h-4 w-4" />,
  logout: <LogOut className="h-4 w-4" />,
  create: <Plus className="h-4 w-4" />,
  update: <Pencil className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
};

const actionColors: Record<string, string> = {
  login: "bg-green-500",
  logout: "bg-gray-500",
  create: "bg-blue-500",
  update: "bg-yellow-500",
  delete: "bg-red-500",
};

const actionLabels: Record<string, string> = {
  login: "Accesso",
  logout: "Uscita",
  create: "Creazione",
  update: "Modifica",
  delete: "Eliminazione",
};

const entityLabels: Record<string, string> = {
  trip: "Viaggio",
  participant: "Partecipante",
  payment: "Pagamento",
  room: "Camera",
  bus_seat: "Posto Bus",
  hotel: "Hotel",
  carrier: "Vettore",
};

export default function LogAttivita() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [isRestoring, setIsRestoring] = useState(false);
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (roleLoading) return;
    if (!isAdmin) {
      navigate("/");
      return;
    }
    loadLogs();
    loadTrips();
  }, [isAdmin, roleLoading, navigate]);

  const loadTrips = async () => {
    const { data } = await supabase
      .from("trips")
      .select("id, title, destination, departure_date")
      .order("departure_date", { ascending: false });
    if (data) setTrips(data);
  };

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select(`
          *,
          profile:profiles(full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      setLogs((data as ActivityLog[]) || []);
    } catch (error) {
      console.error("Errore caricamento log:", error);
    } finally {
      setLoading(false);
    }
  };

  const canRestore = (log: ActivityLog) => {
    return (
      log.action_type === "delete" &&
      log.entity_type === "participant" &&
      log.details &&
      typeof log.details === "object" &&
      "full_name" in log.details
    );
  };

  const openRestoreDialog = (log: ActivityLog) => {
    setSelectedLog(log);
    setSelectedTripId("");
    setRestoreDialogOpen(true);
  };

  const handleRestore = async () => {
    if (!selectedLog || !selectedTripId || !selectedLog.details) return;
    
    setIsRestoring(true);
    try {
      const details = selectedLog.details as ParticipantDetails;
      
      const { error } = await supabase.from("participants").insert({
        full_name: details.full_name,
        email: details.email || null,
        phone: details.phone || null,
        date_of_birth: details.date_of_birth || null,
        place_of_birth: details.place_of_birth || null,
        notes: details.notes || null,
        group_number: details.group_number || null,
        discount_type: details.discount_type || null,
        discount_amount: details.discount_amount || 0,
        trip_id: selectedTripId,
      });

      if (error) throw error;

      toast.success(`Partecipante "${details.full_name}" ripristinato con successo`);
      setRestoreDialogOpen(false);
      setSelectedLog(null);
    } catch (error) {
      console.error("Errore ripristino:", error);
      toast.error("Errore durante il ripristino del partecipante");
    } finally {
      setIsRestoring(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction =
      actionFilter === "all" || log.action_type === actionFilter;

    return matchesSearch && matchesAction;
  });

  // Statistiche
  const todayLogs = logs.filter((log) => {
    const today = new Date().toDateString();
    return new Date(log.created_at).toDateString() === today;
  });

  const loginCount = todayLogs.filter((l) => l.action_type === "login").length;
  const createCount = todayLogs.filter((l) => l.action_type === "create").length;
  const updateCount = todayLogs.filter((l) => l.action_type === "update").length;

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="font-display text-4xl font-bold mb-2">Log Attività</h1>
        <p className="text-muted-foreground">
          Monitora accessi e attività degli operatori
        </p>
      </div>

      {/* Statistiche giornaliere */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Accessi Oggi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loginCount}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Creazioni Oggi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{createCount}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Modifiche Oggi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{updateCount}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Attività Totali</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayLogs.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtri */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per operatore o entità..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo azione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le azioni</SelectItem>
            <SelectItem value="login">Accessi</SelectItem>
            <SelectItem value="logout">Uscite</SelectItem>
            <SelectItem value="create">Creazioni</SelectItem>
            <SelectItem value="update">Modifiche</SelectItem>
            <SelectItem value="delete">Eliminazioni</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista log */}
      <Card>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Activity className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nessun log trovato</h3>
              <p className="text-muted-foreground">
                {searchQuery || actionFilter !== "all"
                  ? "Prova a modificare i filtri"
                  : "Le attività appariranno qui"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 hover:bg-accent/5 transition-colors"
                >
                  <div
                    className={`flex items-center justify-center h-10 w-10 rounded-full ${
                      actionColors[log.action_type] || "bg-gray-500"
                    } text-white shrink-0`}
                  >
                    {actionIcons[log.action_type] || <Activity className="h-4 w-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {log.profile?.full_name || "Utente sconosciuto"}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {actionLabels[log.action_type] || log.action_type}
                      </Badge>
                      {log.entity_type && (
                        <Badge variant="outline" className="text-xs">
                          {entityLabels[log.entity_type] || log.entity_type}
                        </Badge>
                      )}
                    </div>

                    {log.entity_name && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {log.entity_name}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(log.created_at), "dd MMM yyyy, HH:mm", {
                          locale: it,
                        })}
                      </span>
                      {log.user_agent && (
                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                          <User className="h-3 w-3" />
                          {log.user_agent.includes("Mobile") ? "Mobile" : "Desktop"}
                        </span>
                      )}
                    </div>
                  </div>

                  {canRestore(log) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRestoreDialog(log)}
                      className="shrink-0"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Ripristina
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Ripristino Partecipante */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ripristina Partecipante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Stai per ripristinare il partecipante <strong>{selectedLog?.entity_name}</strong>.
              Seleziona il viaggio a cui assegnarlo:
            </p>
            <div className="space-y-2">
              <Label htmlFor="trip-select">Viaggio</Label>
              <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                <SelectTrigger id="trip-select">
                  <SelectValue placeholder="Seleziona un viaggio..." />
                </SelectTrigger>
                <SelectContent>
                  {trips.map((trip) => (
                    <SelectItem key={trip.id} value={trip.id}>
                      {trip.title} - {trip.destination} ({format(new Date(trip.departure_date), "dd/MM/yyyy")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleRestore} disabled={!selectedTripId || isRestoring}>
              {isRestoring ? "Ripristino..." : "Ripristina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
