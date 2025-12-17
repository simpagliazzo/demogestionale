import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useUserRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Send, Check, X, Printer } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { CreateQuoteDialog } from "@/components/CreateQuoteDialog";
import { QuoteDetailDialog } from "@/components/QuoteDetailDialog";

interface Quote {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  destination: string;
  departure_date: string | null;
  return_date: string | null;
  num_passengers: number;
  total_price: number;
  status: string;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  draft: "Bozza",
  sent: "Inviato",
  accepted: "Accettato",
  rejected: "Rifiutato",
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function Preventivi() {
  const { user } = useAuth();
  const { isAdmin, isAgent } = useUserRole();
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);

  const canAccess = isAdmin || isAgent;

  useEffect(() => {
    if (canAccess) {
      fetchQuotes();
    }
  }, [canAccess]);

  const fetchQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error("Errore caricamento preventivi:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i preventivi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotes = quotes.filter(
    (quote) =>
      quote.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: quotes.length,
    draft: quotes.filter((q) => q.status === "draft").length,
    sent: quotes.filter((q) => q.status === "sent").length,
    accepted: quotes.filter((q) => q.status === "accepted").length,
  };

  if (!canAccess) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              Non hai i permessi per accedere a questa sezione.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Preventivi Individuali</h1>
          <p className="text-muted-foreground">
            Crea e gestisci preventivi per viaggi individuali
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Preventivo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bozze
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inviati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Accettati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.accepted}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per cliente o destinazione..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quotes List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Caricamento...
        </div>
      ) : filteredQuotes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery
                ? "Nessun preventivo trovato"
                : "Nessun preventivo creato. Clicca su 'Nuovo Preventivo' per iniziare."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredQuotes.map((quote) => (
            <Card
              key={quote.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedQuote(quote.id)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{quote.customer_name}</h3>
                      <Badge className={statusColors[quote.status]}>
                        {statusLabels[quote.status]}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <span className="font-medium">Destinazione:</span>{" "}
                        {quote.destination}
                      </p>
                      {quote.departure_date && (
                        <p>
                          <span className="font-medium">Date:</span>{" "}
                          {format(new Date(quote.departure_date), "d MMM yyyy", {
                            locale: it,
                          })}
                          {quote.return_date &&
                            ` - ${format(
                              new Date(quote.return_date),
                              "d MMM yyyy",
                              { locale: it }
                            )}`}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Passeggeri:</span>{" "}
                        {quote.num_passengers}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      €{quote.total_price.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Creato il{" "}
                      {format(new Date(quote.created_at), "d MMM yyyy", {
                        locale: it,
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateQuoteDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          fetchQuotes();
          setCreateDialogOpen(false);
        }}
      />

      {selectedQuote && (
        <QuoteDetailDialog
          quoteId={selectedQuote}
          open={!!selectedQuote}
          onOpenChange={(open) => !open && setSelectedQuote(null)}
          onUpdate={fetchQuotes}
        />
      )}
    </div>
  );
}
