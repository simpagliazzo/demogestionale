import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Users, Search } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/use-user-role";

interface Guide {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  notes: string | null;
  created_at: string;
}

export default function AccompagnatoriGuide() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "accompagnatore",
    notes: "",
  });
  const { isAdmin, isAgent } = useUserRole();

  useEffect(() => {
    loadGuides();
  }, []);

  const loadGuides = async () => {
    try {
      const { data, error } = await supabase
        .from("guides")
        .select("*")
        .order("full_name");

      if (error) throw error;
      setGuides(data || []);
    } catch (error) {
      console.error("Errore caricamento guide:", error);
      toast.error("Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (guide?: Guide) => {
    if (guide) {
      setEditingGuide(guide);
      setFormData({
        full_name: guide.full_name,
        email: guide.email || "",
        phone: guide.phone || "",
        role: guide.role,
        notes: guide.notes || "",
      });
    } else {
      setEditingGuide(null);
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        role: "accompagnatore",
        notes: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      toast.error("Il nome è obbligatorio");
      return;
    }

    try {
      if (editingGuide) {
        const { error } = await supabase
          .from("guides")
          .update({
            full_name: formData.full_name,
            email: formData.email || null,
            phone: formData.phone || null,
            role: formData.role,
            notes: formData.notes || null,
          })
          .eq("id", editingGuide.id);

        if (error) throw error;
        toast.success("Modifiche salvate");
      } else {
        const { error } = await supabase
          .from("guides")
          .insert({
            full_name: formData.full_name,
            email: formData.email || null,
            phone: formData.phone || null,
            role: formData.role,
            notes: formData.notes || null,
          });

        if (error) throw error;
        toast.success("Aggiunto con successo");
      }

      setDialogOpen(false);
      loadGuides();
    } catch (error) {
      console.error("Errore salvataggio:", error);
      toast.error("Errore nel salvataggio");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa scheda?")) return;

    try {
      const { error } = await supabase
        .from("guides")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Eliminato con successo");
      loadGuides();
    } catch (error) {
      console.error("Errore eliminazione:", error);
      toast.error("Errore nell'eliminazione");
    }
  };

  const filteredGuides = guides.filter(g =>
    g.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.phone?.includes(searchQuery)
  );

  const accompagnatori = filteredGuides.filter(g => g.role === "accompagnatore");
  const guide = filteredGuides.filter(g => g.role === "guida");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold">Accompagnatori e Guide</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci accompagnatori e guide turistiche
          </p>
        </div>
        {(isAdmin || isAgent) && (
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Aggiungi
          </Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per nome, email o telefono..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Accompagnatori */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Accompagnatori ({accompagnatori.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {accompagnatori.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nessun accompagnatore
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contatti</TableHead>
                    <TableHead className="w-[100px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accompagnatori.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.full_name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {g.email && <div>{g.email}</div>}
                          {g.phone && <div className="text-muted-foreground">{g.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(isAdmin || isAgent) && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(g)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(g.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Guide ({guide.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {guide.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nessuna guida
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contatti</TableHead>
                    <TableHead className="w-[100px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guide.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.full_name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {g.email && <div>{g.email}</div>}
                          {g.phone && <div className="text-muted-foreground">{g.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(isAdmin || isAgent) && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(g)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(g.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog per aggiunta/modifica */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGuide ? "Modifica" : "Nuovo Accompagnatore/Guida"}
            </DialogTitle>
            <DialogDescription>
              Inserisci i dati
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome e Cognome *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Mario Rossi"
              />
            </div>

            <div>
              <Label>Ruolo *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accompagnatore">Accompagnatore</SelectItem>
                  <SelectItem value="guida">Guida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@esempio.it"
              />
            </div>

            <div>
              <Label>Telefono</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+39 123 456 7890"
              />
            </div>

            <div>
              <Label>Note</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Note aggiuntive..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleSave}>
                {editingGuide ? "Salva" : "Aggiungi"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
