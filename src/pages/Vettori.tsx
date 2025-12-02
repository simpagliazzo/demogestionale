import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Building2 } from "lucide-react";
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

const carrierSchema = z.object({
  name: z.string().min(2, "Il nome deve contenere almeno 2 caratteri"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional(),
  contact_person: z.string().optional(),
  notes: z.string().optional(),
});

interface Carrier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  notes: string | null;
}

export default function Vettori() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<z.infer<typeof carrierSchema>>({
    resolver: zodResolver(carrierSchema),
  });

  useEffect(() => {
    loadCarriers();
  }, []);

  const loadCarriers = async () => {
    try {
      const { data, error } = await supabase
        .from("bus_carriers")
        .select("*")
        .order("name");

      if (error) throw error;
      setCarriers(data || []);
    } catch (error) {
      console.error("Errore caricamento vettori:", error);
      toast.error("Errore durante il caricamento dei vettori");
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
      loadCarriers();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore durante l'aggiunta del vettore");
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">Vettori Bus</h1>
          <p className="text-muted-foreground">
            Gestisci le compagnie di trasporto
          </p>
        </div>
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
            <Card key={carrier.id}>
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
    </div>
  );
}
