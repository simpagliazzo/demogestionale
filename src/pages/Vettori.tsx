import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Building2, Pencil, Bus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import EditCarrierDialog from "@/components/EditCarrierDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const carrierSchema = z.object({
  name: z.string().min(2, "Il nome deve contenere almeno 2 caratteri"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional(),
  contact_person: z.string().optional(),
  notes: z.string().optional(),
});

const busTypeSchema = z.object({
  name: z.string().min(2, "Il nome deve contenere almeno 2 caratteri"),
  rows: z.coerce.number().min(1, "Minimo 1 riga"),
  seats_per_row: z.coerce.number().min(1, "Minimo 1 posto per riga"),
  description: z.string().optional(),
});

interface Carrier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  notes: string | null;
}

interface BusType {
  id: string;
  name: string;
  rows: number;
  seats_per_row: number;
  total_seats: number;
  description: string | null;
}

export default function Vettori() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [busTypes, setBusTypes] = useState<BusType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busTypeDialogOpen, setBusTypeDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<z.infer<typeof carrierSchema>>({
    resolver: zodResolver(carrierSchema),
  });

  const {
    register: registerBusType,
    handleSubmit: handleSubmitBusType,
    formState: { errors: busTypeErrors },
    reset: resetBusType,
    watch: watchBusType,
  } = useForm<z.infer<typeof busTypeSchema>>({
    resolver: zodResolver(busTypeSchema),
    defaultValues: {
      rows: 13,
      seats_per_row: 4,
    },
  });

  const watchedRows = watchBusType("rows");
  const watchedSeatsPerRow = watchBusType("seats_per_row");
  const calculatedTotalSeats = (watchedRows || 0) * (watchedSeatsPerRow || 0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [carriersRes, busTypesRes] = await Promise.all([
        supabase.from("bus_carriers").select("*").order("name"),
        supabase.from("bus_types").select("*").order("name"),
      ]);

      if (carriersRes.error) throw carriersRes.error;
      if (busTypesRes.error) throw busTypesRes.error;

      setCarriers(carriersRes.data || []);
      setBusTypes(busTypesRes.data || []);
    } catch (error) {
      console.error("Errore caricamento:", error);
      toast.error("Errore durante il caricamento");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof carrierSchema>) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("bus_carriers").insert({
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
        contact_person: values.contact_person || null,
        notes: values.notes || null,
      });

      if (error) throw error;

      toast.success("Vettore aggiunto con successo");
      reset();
      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore durante l'aggiunta del vettore");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitBusType = async (values: z.infer<typeof busTypeSchema>) => {
    setIsSubmitting(true);
    try {
      const totalSeats = values.rows * values.seats_per_row;
      const { error } = await supabase.from("bus_types").insert({
        name: values.name,
        rows: values.rows,
        seats_per_row: values.seats_per_row,
        total_seats: totalSeats,
        description: values.description || null,
      });

      if (error) throw error;

      toast.success("Tipo bus aggiunto con successo");
      resetBusType();
      setBusTypeDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore durante l'aggiunta del tipo bus");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBusType = async (busType: BusType) => {
    if (!confirm(`Eliminare il tipo bus "${busType.name}"?`)) return;

    try {
      const { error } = await supabase
        .from("bus_types")
        .delete()
        .eq("id", busType.id);

      if (error) throw error;

      toast.success("Tipo bus eliminato");
      loadData();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore durante l'eliminazione");
    }
  };

  const handleEditCarrier = (carrier: Carrier) => {
    setSelectedCarrier(carrier);
    setEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="font-display text-4xl font-bold mb-2">Vettori & Bus</h1>
        <p className="text-muted-foreground">
          Gestisci le compagnie di trasporto e i tipi di bus
        </p>
      </div>

      <Tabs defaultValue="carriers" className="w-full">
        <TabsList>
          <TabsTrigger value="carriers" className="gap-2">
            <Building2 className="h-4 w-4" />
            Vettori
          </TabsTrigger>
          <TabsTrigger value="bus-types" className="gap-2">
            <Bus className="h-4 w-4" />
            Tipi Bus
          </TabsTrigger>
        </TabsList>

        {/* Carriers Tab */}
        <TabsContent value="carriers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuovo Vettore
            </Button>
          </div>

          {carriers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Nessun vettore registrato</p>
                <Button onClick={() => setDialogOpen(true)} variant="outline">
                  Aggiungi il primo vettore
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {carriers.map((carrier) => (
                <Card key={carrier.id} className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => handleEditCarrier(carrier)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {carrier.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {carrier.contact_person && (
                      <div>
                        <p className="text-sm font-medium">Referente</p>
                        <p className="text-sm text-muted-foreground">{carrier.contact_person}</p>
                      </div>
                    )}
                    {carrier.email && (
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">{carrier.email}</p>
                      </div>
                    )}
                    {carrier.phone && (
                      <div>
                        <p className="text-sm font-medium">Telefono</p>
                        <p className="text-sm text-muted-foreground">{carrier.phone}</p>
                      </div>
                    )}
                    {carrier.notes && (
                      <div>
                        <p className="text-sm font-medium">Note</p>
                        <p className="text-sm text-muted-foreground">{carrier.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Bus Types Tab */}
        <TabsContent value="bus-types" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setBusTypeDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuovo Tipo Bus
            </Button>
          </div>

          {busTypes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Bus className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Nessun tipo bus registrato</p>
                <Button onClick={() => setBusTypeDialogOpen(true)} variant="outline">
                  Aggiungi il primo tipo bus
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {busTypes.map((busType) => (
                <Card key={busType.id} className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteBusType(busType)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bus className="h-5 w-5" />
                      {busType.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 px-3 py-1 rounded-full">
                        <span className="text-sm font-bold text-primary">
                          {busType.total_seats} posti
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {busType.rows} righe × {busType.seats_per_row} posti per riga
                    </div>
                    {busType.description && (
                      <p className="text-sm text-muted-foreground">{busType.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Carrier Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aggiungi Vettore</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nome Vettore <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Es. Autolinee Roma"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_person">Referente</Label>
              <Input
                id="contact_person"
                {...register("contact_person")}
                placeholder="Nome del referente"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="info@vettore.it"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="+39 06 12345678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Note</Label>
              <Textarea
                id="notes"
                {...register("notes")}
                placeholder="Informazioni aggiuntive sul vettore"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvataggio..." : "Aggiungi Vettore"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Bus Type Dialog */}
      <Dialog open={busTypeDialogOpen} onOpenChange={setBusTypeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aggiungi Tipo Bus</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitBusType(onSubmitBusType)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="busTypeName">
                Nome Tipo Bus <span className="text-destructive">*</span>
              </Label>
              <Input
                id="busTypeName"
                {...registerBusType("name")}
                placeholder="Es. GT Standard 52 posti"
              />
              {busTypeErrors.name && (
                <p className="text-sm text-destructive">{busTypeErrors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rows">Numero Righe</Label>
                <Input
                  id="rows"
                  type="number"
                  {...registerBusType("rows")}
                  min={1}
                />
                {busTypeErrors.rows && (
                  <p className="text-sm text-destructive">{busTypeErrors.rows.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="seats_per_row">Posti per Riga</Label>
                <Input
                  id="seats_per_row"
                  type="number"
                  {...registerBusType("seats_per_row")}
                  min={1}
                />
                {busTypeErrors.seats_per_row && (
                  <p className="text-sm text-destructive">{busTypeErrors.seats_per_row.message}</p>
                )}
              </div>
            </div>

            <div className="bg-muted p-3 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Posti totali calcolati:</p>
              <p className="text-2xl font-bold text-primary">{calculatedTotalSeats}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="busTypeDescription">Descrizione (opzionale)</Label>
              <Textarea
                id="busTypeDescription"
                {...registerBusType("description")}
                placeholder="Es. Bus grande con corridoio centrale"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBusTypeDialogOpen(false)}
                disabled={isSubmitting}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvataggio..." : "Aggiungi Tipo Bus"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <EditCarrierDialog
        carrier={selectedCarrier}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={loadData}
      />
    </div>
  );
}