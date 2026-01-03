import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, AlertTriangle, Trash2, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BlacklistEntry {
  id: string;
  participant_id: string | null;
  full_name: string;
  reason: string | null;
  created_at: string;
  added_by: string | null;
  added_by_profile?: {
    full_name: string;
  } | null;
}

export default function Blacklist() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteEntry, setDeleteEntry] = useState<BlacklistEntry | null>(null);

  useEffect(() => {
    loadBlacklist();
  }, []);

  const loadBlacklist = async () => {
    try {
      const { data, error } = await supabase
        .from("blacklist")
        .select(`
          *,
          added_by_profile:profiles!blacklist_added_by_fkey (
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEntries((data || []) as BlacklistEntry[]);
    } catch (error) {
      console.error("Errore caricamento blacklist:", error);
      toast.error("Errore nel caricamento della blacklist");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!deleteEntry) return;

    try {
      const { error } = await supabase
        .from("blacklist")
        .delete()
        .eq("id", deleteEntry.id);

      if (error) throw error;
      
      toast.success(`${deleteEntry.full_name} rimosso dalla blacklist`);
      setDeleteEntry(null);
      loadBlacklist();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore durante la rimozione dalla blacklist");
    }
  };

  const filteredEntries = entries.filter(entry =>
    entry.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl font-bold mb-2 flex items-center gap-3">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          Blacklist
        </h1>
        <p className="text-muted-foreground">
          Elenco dei nominativi inseriti in blacklist (solo amministratori)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Ricerca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome o motivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">
            Nominativi in Blacklist ({filteredEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery 
                ? "Nessun risultato trovato" 
                : "Nessun nominativo in blacklist"}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="border border-destructive/30 bg-destructive/5 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        {entry.full_name}
                      </h3>
                      
                      {entry.reason && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Motivo:</strong> {entry.reason}
                        </p>
                      )}

                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Inserito il {format(new Date(entry.created_at), "dd MMM yyyy, HH:mm", { locale: it })}
                        </span>
                        {entry.added_by_profile && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            da {entry.added_by_profile.full_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteEntry(entry)}
                      className="shrink-0 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Rimuovi
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteEntry} onOpenChange={() => setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere dalla Blacklist?</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler rimuovere <strong>{deleteEntry?.full_name}</strong> dalla blacklist?
              Questa azione è reversibile (puoi reinserirlo in seguito).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>
              Conferma Rimozione
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
