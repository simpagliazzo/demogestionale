import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Check, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatNameSurnameFirst } from '@/lib/format-utils';

interface TokenData {
  id: string;
  participant_id: string;
  expires_at: string;
  used_at: string | null;
  participant: {
    full_name: string;
    date_of_birth: string | null;
  };
  trip: {
    title: string;
    destination: string;
  };
}

// Funzione per generare la chiave persona (stessa logica di ParticipantDocUpload)
const getPersonKey = (name: string, dateOfBirth?: string | null): string => {
  const normalizedName = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  if (dateOfBirth) {
    return `${normalizedName}_${dateOfBirth}`;
  }
  return normalizedName;
};

export default function UploadDocumenti() {
  const { token } = useParams<{ token: string }>();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadTokenData();
    }
  }, [token]);

  const loadTokenData = async () => {
    try {
      // Prima ottieni i dati del token
      const { data: tokenInfo, error: tokenError } = await supabase
        .from('upload_tokens')
        .select('id, participant_id, expires_at, used_at')
        .eq('token', token)
        .single();

      if (tokenError || !tokenInfo) {
        setError('Link non valido o scaduto');
        setLoading(false);
        return;
      }

      // Controlla scadenza
      if (new Date(tokenInfo.expires_at) < new Date()) {
        setError('Questo link è scaduto. Contatta l\'agenzia per riceverne uno nuovo.');
        setLoading(false);
        return;
      }

      // Ottieni i dati del partecipante
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('full_name, date_of_birth, trip_id')
        .eq('id', tokenInfo.participant_id)
        .single();

      if (participantError || !participant) {
        setError('Partecipante non trovato');
        setLoading(false);
        return;
      }

      // Ottieni i dati del viaggio
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('title, destination')
        .eq('id', participant.trip_id)
        .single();

      if (tripError || !trip) {
        setError('Viaggio non trovato');
        setLoading(false);
        return;
      }

      setTokenData({
        ...tokenInfo,
        participant: {
          full_name: participant.full_name,
          date_of_birth: participant.date_of_birth,
        },
        trip: {
          title: trip.title,
          destination: trip.destination,
        },
      });
    } catch (err) {
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tokenData) return;

    // Verifica tipo file
    if (file.type !== 'application/pdf') {
      toast.error('Per favore carica solo file PDF');
      return;
    }

    // Verifica dimensione (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Il file non può superare i 5MB');
      return;
    }

    setUploading(true);

    try {
      const personKey = getPersonKey(
        tokenData.participant.full_name,
        tokenData.participant.date_of_birth
      );
      
      const timestamp = Date.now();
      const fileName = `${personKey}/${timestamp}_documento_identita.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('participant-docs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Marca il token come usato
      await supabase
        .from('upload_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id);

      setUploadComplete(true);
      toast.success('Documento caricato con successo!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Errore durante il caricamento del documento');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle className="text-destructive">Errore</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Per assistenza contatta:<br />
              <strong>Gladiatours Viaggi</strong><br />
              Tel. 0775 353808<br />
              info@gladiatours.it
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (uploadComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Documento Caricato!</CardTitle>
            <CardDescription>
              Il tuo documento è stato caricato con successo.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Grazie per aver completato l'upload.<br />
              Non è necessario fare altro.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-primary">Gladiatours Viaggi</h1>
            <p className="text-xs text-muted-foreground">di Palmieri Massimo</p>
          </div>
          <CardTitle>Carica Documento di Identità</CardTitle>
          <CardDescription>
            Carica una copia del tuo documento per la prenotazione
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info partecipante */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Partecipante:</span>
            </div>
            <p className="text-lg font-semibold">{tokenData?.participant.full_name ? formatNameSurnameFirst(tokenData.participant.full_name) : ''}</p>
            
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">Viaggio:</p>
              <p className="font-medium">{tokenData?.trip.title}</p>
              <p className="text-sm text-muted-foreground">{tokenData?.trip.destination}</p>
            </div>
          </div>

          {/* Upload area */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
              id="doc-upload"
            />
            <label
              htmlFor="doc-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">Caricamento in corso...</span>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <span className="text-sm font-medium">Clicca per caricare il PDF</span>
                  <span className="text-xs text-muted-foreground">Solo file PDF, max 5MB</span>
                </>
              )}
            </label>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Il documento verrà conservato in modo sicuro secondo le normative sulla privacy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
