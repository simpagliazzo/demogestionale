import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Bus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

interface BusType {
  id: string;
  name: string;
  rows: number;
  seats_per_row: number;
  total_seats: number;
  description: string | null;
  created_at: string;
}

export default function BusTypes() {
  const [busTypes, setBusTypes] = useState<BusType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<BusType | null>(null);
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: "",
      rows: 13,
      seats_per_row: 4,
      description: "",
    }
  });

  useEffect(() => {
    loadBusTypes();
  }, []);

  const loadBusTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("bus_types")
        .select("*")
        .order("name");

      if (error) throw error;
      setBusTypes(data || []);
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore nel caricamento dei tipi di bus");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: any) => {
    try {
      const total_seats = values.rows * values.seats_per_row;
      
      if (editingType) {
        const { error } = await supabase
          .from("bus_types")
          .update({
            name: values.name,
            rows: values.rows,
            seats_per_row: values.seats_per_row,
            total_seats,
            description: values.description,
          })
          .eq("id", editingType.id);

        if (error) throw error;
        toast.success("Tipo di bus aggiornato");
      } else {
        const { error } = await supabase
          .from("bus_types")
          .insert({
            name: values.name,
            rows: values.rows,
            seats_per_row: values.seats_per_row,
            total_seats,
            description: values.description,
          });

        if (error) throw error;
        toast.success("Tipo di bus creato");
      }

      setDialogOpen(false);
      setEditingType(null);
      reset();
      loadBusTypes();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore nel salvataggio");
    }
  };

  const handleEdit = (busType: BusType) => {
    setEditingType(busType);
    setValue("name", busType.name);
    setValue("rows", busType.rows);
    setValue("seats_per_row", busType.seats_per_row);
    setValue("description", busType.description || "");
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo tipo di bus?")) return;

    try {
      const { error } = await supabase
        .from("bus_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Tipo di bus eliminato");
      loadBusTypes();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore nell'eliminazione");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tipi di Bus</h1>
          <p className="text-muted-foreground">Gestisci le configurazioni dei bus</p>
        </div>
        <Button onClick={() => {
          setEditingType(null);
          reset();
          setDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo Tipo Bus
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {busTypes.map((busType) => (
          <Card key={busType.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bus className="h-5 w-5" />
                {busType.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1 text-sm">
                <p><strong>File:</strong> {busType.rows}</p>
                <p><strong>Posti per fila:</strong> {busType.seats_per_row}</p>
                <p><strong>Totale posti:</strong> <span className="text-lg font-bold text-primary">{busType.total_seats}</span></p>
                {busType.description && (
                  <p className="text-muted-foreground pt-2">{busType.description}</p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(busType)}
                  className="flex-1"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifica
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(busType.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setEditingType(null);
          reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Modifica Tipo Bus" : "Nuovo Tipo Bus"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                {...register("name", { required: "Il nome è obbligatorio" })}
                placeholder="Es. GT Standard (52 posti)"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rows">Numero File <span className="text-destructive">*</span></Label>
                <Input
                  id="rows"
                  type="number"
                  min="1"
                  {...register("rows", { required: true, valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seats_per_row">Posti per Fila <span className="text-destructive">*</span></Label>
                <Input
                  id="seats_per_row"
                  type="number"
                  min="1"
                  {...register("seats_per_row", { required: true, valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Descrizione opzionale del tipo di bus"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingType(null);
                  reset();
                }}
              >
                Annulla
              </Button>
              <Button type="submit">
                {editingType ? "Aggiorna" : "Crea"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}