import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface Hotel {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  check_in_date: string;
  check_out_date: string;
}

interface EditHotelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotel: Hotel | null;
  onSuccess: () => void;
}

export function EditHotelDialog({ open, onOpenChange, hotel, onSuccess }: EditHotelDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    check_in_date: "",
    check_out_date: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hotel) {
      setFormData({
        name: hotel.name,
        address: hotel.address || "",
        phone: hotel.phone || "",
        email: hotel.email || "",
        check_in_date: hotel.check_in_date,
        check_out_date: hotel.check_out_date,
      });
    }
  }, [hotel]);

  const handleSave = async () => {
    if (!hotel || !formData.name) {
      toast.error("Il nome dell'hotel è obbligatorio");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("hotels")
        .update({
          name: formData.name,
          address: formData.address || null,
          phone: formData.phone || null,
          email: formData.email || null,
          check_in_date: formData.check_in_date,
          check_out_date: formData.check_out_date,
        })
        .eq("id", hotel.id);

      if (error) throw error;

      // Aggiorna anche la rubrica se esiste un hotel con lo stesso nome
      await updateHotelRegistry();

      toast.success("Hotel aggiornato con successo");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Errore aggiornamento hotel:", error);
      toast.error("Errore nell'aggiornamento dell'hotel");
    } finally {
      setLoading(false);
    }
  };

  const updateHotelRegistry = async () => {
    if (!hotel) return;

    try {
      // Cerca se esiste già in rubrica con lo stesso nome originale
      const { data: existing } = await supabase
        .from("hotel_registry")
        .select("id")
        .eq("name", hotel.name)
        .maybeSingle();

      if (existing) {
        // Aggiorna l'hotel esistente in rubrica
        await supabase
          .from("hotel_registry")
          .update({
            name: formData.name,
            address: formData.address || null,
            phone: formData.phone || null,
            email: formData.email || null,
          })
          .eq("id", existing.id);
      }
    } catch (error) {
      console.error("Errore aggiornamento rubrica hotel:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Modifica Hotel</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome hotel"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="address" className="text-xs">Indirizzo</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Indirizzo"
              className="h-8 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="phone" className="text-xs">Telefono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Telefono"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="check_in" className="text-xs">Check-in</Label>
              <Input
                id="check_in"
                type="date"
                value={formData.check_in_date}
                onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="check_out" className="text-xs">Check-out</Label>
              <Input
                id="check_out"
                type="date"
                value={formData.check_out_date}
                onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button size="sm" onClick={handleSave} disabled={loading} className="gap-1.5">
              <Save className="h-3 w-3" />
              Salva
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
