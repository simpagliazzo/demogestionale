import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface EditCarrierDialogProps {
  carrier: Carrier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditCarrierDialog({
  carrier,
  open,
  onOpenChange,
  onSuccess,
}: EditCarrierDialogProps) {
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
    if (carrier) {
      reset({
        name: carrier.name,
        email: carrier.email || "",
        phone: carrier.phone || "",
        contact_person: carrier.contact_person || "",
        notes: carrier.notes || "",
      });
    }
  }, [carrier, reset]);

  const onSubmit = async (values: z.infer<typeof carrierSchema>) => {
    if (!carrier) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("bus_carriers")
        .update({
          name: values.name,
          email: values.email || null,
          phone: values.phone || null,
          contact_person: values.contact_person || null,
          notes: values.notes || null,
        })
        .eq("id", carrier.id);

      if (error) throw error;

      toast.success("Vettore aggiornato con successo");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore durante l'aggiornamento del vettore");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!carrier) return;
    
    if (!confirm("Sei sicuro di voler eliminare questo vettore?")) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("bus_carriers")
        .delete()
        .eq("id", carrier.id);

      if (error) throw error;

      toast.success("Vettore eliminato con successo");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore durante l'eliminazione del vettore");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifica Vettore</DialogTitle>
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

          <div className="flex justify-between gap-3 pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              Elimina
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvataggio..." : "Salva Modifiche"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
