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
import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useActivityLog } from "@/hooks/use-activity-log";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

interface DeleteTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripTitle: string;
}

export function DeleteTripDialog({
  open,
  onOpenChange,
  tripId,
  tripTitle,
}: DeleteTripDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();
  const { logDelete } = useActivityLog();
  const { user } = useAuth();

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPassword("");
      setPasswordError("");
    }
    onOpenChange(isOpen);
  };

  const verifyPassword = async (): Promise<boolean> => {
    if (!user?.email) {
      setPasswordError("Errore: utente non autenticato");
      return false;
    }

    setVerifying(true);
    setPasswordError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (error) {
        setPasswordError("Password non corretta");
        return false;
      }

      return true;
    } catch (error) {
      setPasswordError("Errore durante la verifica della password");
      return false;
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async () => {
    if (!password.trim()) {
      setPasswordError("Inserisci la tua password per confermare");
      return;
    }

    const isValid = await verifyPassword();
    if (!isValid) return;

    setDeleting(true);
    try {
      // Prima eliminiamo i dati correlati che non devono essere mantenuti
      // (gli assegnamenti camere, assegnamenti bus, hotel, rooms)
      
      // Elimina assegnamenti posti bus
      const { data: busConfigs } = await supabase
        .from("bus_configurations")
        .select("id")
        .eq("trip_id", tripId);

      if (busConfigs && busConfigs.length > 0) {
        const configIds = busConfigs.map(c => c.id);
        await supabase
          .from("bus_seat_assignments")
          .delete()
          .in("bus_config_id", configIds);
        
        await supabase
          .from("bus_configurations")
          .delete()
          .eq("trip_id", tripId);
      }

      // Elimina assegnamenti camere
      const { data: hotels } = await supabase
        .from("hotels")
        .select("id")
        .eq("trip_id", tripId);

      if (hotels && hotels.length > 0) {
        const hotelIds = hotels.map(h => h.id);
        
        const { data: rooms } = await supabase
          .from("rooms")
          .select("id")
          .in("hotel_id", hotelIds);

        if (rooms && rooms.length > 0) {
          const roomIds = rooms.map(r => r.id);
          await supabase
            .from("room_assignments")
            .delete()
            .in("room_id", roomIds);
          
          await supabase
            .from("rooms")
            .delete()
            .in("hotel_id", hotelIds);
        }

        await supabase
          .from("hotels")
          .delete()
          .eq("trip_id", tripId);
      }

      // Ora elimina il viaggio (i partecipanti avranno trip_id = NULL grazie a ON DELETE SET NULL)
      const { error } = await supabase
        .from("trips")
        .delete()
        .eq("id", tripId);

      if (error) throw error;

      await logDelete("trip", tripId, tripTitle, { title: tripTitle });

      toast.success("Viaggio eliminato con successo. I partecipanti sono stati mantenuti nel database.");
      navigate("/viaggi");
    } catch (error) {
      console.error("Errore eliminazione viaggio:", error);
      toast.error("Errore nell'eliminazione del viaggio");
    } finally {
      setDeleting(false);
      handleOpenChange(false);
    }
  };

  const isProcessing = deleting || verifying;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare il viaggio?</AlertDialogTitle>
          <AlertDialogDescription>
            Stai per eliminare il viaggio <strong>"{tripTitle}"</strong>.
            <br /><br />
            <span className="text-amber-600 font-medium">
              I partecipanti saranno mantenuti nel database ma non saranno più associati a questo viaggio.
            </span>
            <br /><br />
            Questa azione non può essere annullata.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4 space-y-3">
          <Label htmlFor="confirm-password" className="flex items-center gap-2 text-sm font-medium">
            <Lock className="h-4 w-4" />
            Conferma con la tua password
          </Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="Inserisci la tua password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError("");
            }}
            disabled={isProcessing}
            className={passwordError ? "border-destructive" : ""}
          />
          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isProcessing || !password.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Elimina Viaggio
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}