import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { AlertTriangle, Lock } from "lucide-react";

interface AddToBlacklistDialogProps {
  participant: {
    id: string;
    full_name: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddToBlacklistDialog({
  participant,
  open,
  onOpenChange,
  onSuccess,
}: AddToBlacklistDialogProps) {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participant || !user) return;

    setError("");
    setIsSubmitting(true);

    try {
      // Verifica la password re-autenticando l'utente
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user?.email;
      
      if (!email) {
        setError("Sessione non valida. Riprova ad accedere.");
        setIsSubmitting(false);
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("Password non corretta. Riprova.");
        setIsSubmitting(false);
        return;
      }

      // Password verificata, inserisci nella blacklist
      const { error: insertError } = await supabase
        .from("blacklist")
        .insert({
          participant_id: participant.id,
          full_name: participant.full_name,
          reason: reason || null,
          added_by: user.id,
        });

      if (insertError) throw insertError;

      toast.success(`${participant.full_name} aggiunto alla blacklist`);
      setPassword("");
      setReason("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore durante l'aggiunta alla blacklist");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setReason("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Aggiungi alla Blacklist
          </DialogTitle>
          <DialogDescription>
            Stai per aggiungere <strong>{participant?.full_name}</strong> alla blacklist.
            Questa azione è riservata agli amministratori.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (opzionale)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Inserisci il motivo dell'inserimento in blacklist..."
              rows={3}
            />
          </div>

          <div className="p-4 bg-muted rounded-lg border space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lock className="h-4 w-4" />
              Conferma la tua identità
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">La tua password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci la tua password"
                required
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            <Button 
              type="submit" 
              variant="destructive"
              disabled={isSubmitting || !password}
            >
              {isSubmitting ? "Verifica..." : "Conferma Blacklist"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
