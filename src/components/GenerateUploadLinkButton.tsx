import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Link2, Copy, Check, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface GenerateUploadLinkButtonProps {
  participantId: string;
  participantName: string;
  participantPhone?: string | null;
}

export default function GenerateUploadLinkButton({
  participantId,
  participantName,
  participantPhone,
}: GenerateUploadLinkButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateToken = () => {
    // Genera un token casuale sicuro
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    try {
      // Controlla se esiste già un token valido
      const { data: existingToken } = await supabase
        .from('upload_tokens')
        .select('token, expires_at')
        .eq('participant_id', participantId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let token: string;

      if (existingToken) {
        token = existingToken.token;
      } else {
        // Genera nuovo token
        token = generateToken();
        
        const { error } = await supabase
          .from('upload_tokens')
          .insert({
            participant_id: participantId,
            token,
          });

        if (error) throw error;
      }

      const baseUrl = window.location.origin;
      setLink(`${baseUrl}/upload-documenti/${token}`);
      setOpen(true);
    } catch (err) {
      console.error('Error generating link:', err);
      toast.error('Errore nella generazione del link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Link copiato!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Errore nella copia');
    }
  };

  const handleWhatsApp = () => {
    if (!link || !participantPhone) return;
    
    const cleanPhone = participantPhone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Gentile ${participantName},\n\n` +
      `Per completare la prenotazione, ti chiediamo di caricare una copia del documento di identità.\n\n` +
      `Clicca sul link seguente:\n${link}\n\n` +
      `Grazie,\nGladiatours Viaggi`
    );
    
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${message}`, '_blank');
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerateLink}
        disabled={loading}
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Link2 className="h-4 w-4" />
        )}
        Link Upload Doc
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Upload Documento</DialogTitle>
            <DialogDescription>
              Invia questo link a {participantName} per permettergli di caricare il documento di identità.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Link box */}
            <div className="bg-muted p-3 rounded-lg break-all text-sm">
              {link}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? 'Copiato!' : 'Copia Link'}
              </Button>

              {participantPhone && (
                <Button
                  variant="default"
                  className="flex-1 gap-2"
                  onClick={handleWhatsApp}
                >
                  <Send className="h-4 w-4" />
                  Invia WhatsApp
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Il link scade automaticamente dopo 30 giorni.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
