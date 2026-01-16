import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X, Users, Hotel, MessageCircle, Loader2, UserPlus, AlertTriangle } from "lucide-react";
import { formatNameSurnameFirst, calculateDiscountedPrice, calculateTotalSingleSupplement } from "@/lib/format-utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { useWhatsAppTemplates, formatPhoneForWhatsApp, openWhatsApp } from "@/hooks/use-whatsapp-templates";

interface Participant {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  place_of_birth: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  group_number: number | null;
  discount_type: string | null;
  discount_amount: number | null;
}

interface ParticipantPayment {
  participant_id: string;
  amount: number;
}

interface EditRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: Participant[];
  roomType: string;
  tripId: string;
  tripTitle: string;
  tripDestination: string;
  tripDepartureDate: string;
  tripReturnDate: string;
  tripPrice: number;
  tripSingleSupplement: number;
  allParticipants: Participant[];
  participantPayments: ParticipantPayment[];
  onSuccess: () => void;
}

const ROOM_TYPES = [
  { value: "singola", label: "Singola", capacity: 1 },
  { value: "doppia", label: "Doppia", capacity: 2 },
  { value: "matrimoniale", label: "Matrimoniale", capacity: 2 },
  { value: "tripla", label: "Tripla", capacity: 3 },
  { value: "quadrupla", label: "Quadrupla", capacity: 4 },
];

const ROOM_LABELS: Record<string, string> = {
  singola: "Camera Singola",
  doppia: "Camera Doppia",
  matrimoniale: "Camera Matrimoniale",
  tripla: "Camera Tripla",
  quadrupla: "Camera Quadrupla",
};

export default function EditRoomDialog({
  open,
  onOpenChange,
  participants,
  roomType,
  tripId,
  tripTitle,
  tripDestination,
  tripDepartureDate,
  tripReturnDate,
  tripPrice,
  tripSingleSupplement,
  allParticipants,
  participantPayments,
  onSuccess,
}: EditRoomDialogProps) {
  const { user } = useAuth();
  const { formatMessage, agencySettings } = useWhatsAppTemplates();
  const [selectedRoomType, setSelectedRoomType] = useState(roomType);
  const [roomParticipants, setRoomParticipants] = useState<Participant[]>(participants);
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [addMode, setAddMode] = useState<"existing" | "new">("existing");
  const [selectedParticipantToAdd, setSelectedParticipantToAdd] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [duplicateAlert, setDuplicateAlert] = useState<{ name: string; pendingInsert: boolean } | null>(null);
  
  // Form per nuovo partecipante
  const [newParticipant, setNewParticipant] = useState({
    cognome: "",
    nome: "",
    date_of_birth: "",
    place_of_birth: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    setSelectedRoomType(roomType);
    setRoomParticipants(participants);
    setAddingParticipant(false);
    setAddMode("existing");
    resetNewParticipantForm();
  }, [participants, roomType, open]);

  const resetNewParticipantForm = () => {
    setNewParticipant({
      cognome: "",
      nome: "",
      date_of_birth: "",
      place_of_birth: "",
      phone: "",
      email: "",
    });
  };

  // Partecipanti disponibili (non in questa camera)
  const availableParticipants = allParticipants.filter(
    (p) => !roomParticipants.find((rp) => rp.id === p.id)
  );

  const handleRemoveParticipant = (participantId: string) => {
    setRoomParticipants((prev) => prev.filter((p) => p.id !== participantId));
  };

  const handleAddExistingParticipant = () => {
    if (!selectedParticipantToAdd) return;
    const participant = allParticipants.find((p) => p.id === selectedParticipantToAdd);
    if (participant) {
      setRoomParticipants((prev) => [...prev, participant]);
      setSelectedParticipantToAdd("");
      setAddingParticipant(false);
    }
  };

  const handleCreateAndAddParticipant = async (skipDuplicateCheck = false) => {
    if (!newParticipant.cognome.trim() || !newParticipant.nome.trim()) {
      toast.error("Cognome e Nome sono obbligatori");
      return;
    }

    setCreatingNew(true);

    try {
      const fullName = `${newParticipant.nome.trim()} ${newParticipant.cognome.trim()}`;
      
      // Verifica duplicati (solo se non stiamo già confermando)
      if (!skipDuplicateCheck) {
        const { data: existingParticipants, error: existingError } = await supabase
          .from("participants")
          .select("full_name")
          .eq("trip_id", tripId);

        if (existingError) {
          console.error("Errore verifica duplicati:", existingError);
        } else if (existingParticipants && existingParticipants.length > 0) {
          const existingNames = existingParticipants.map(p => p.full_name.toLowerCase());
          if (existingNames.includes(fullName.toLowerCase())) {
            setDuplicateAlert({ name: fullName, pendingInsert: true });
            setCreatingNew(false);
            return;
          }
        }
      }
      
      const groupCreatedAt = participants[0]?.created_at || new Date().toISOString();

      // Converti la data dal formato DD/MM/YYYY a YYYY-MM-DD
      let dateOfBirth: string | null = null;
      if (newParticipant.date_of_birth) {
        const parts = newParticipant.date_of_birth.split("/");
        if (parts.length === 3) {
          dateOfBirth = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }

      const { data, error } = await supabase
        .from("participants")
        .insert({
          trip_id: tripId,
          full_name: fullName,
          date_of_birth: dateOfBirth,
          place_of_birth: newParticipant.place_of_birth.trim() || null,
          phone: newParticipant.phone.trim() || null,
          email: newParticipant.email.trim() || null,
          notes: `Camera: ${selectedRoomType}`,
          created_at: groupCreatedAt,
          created_by: user?.id || null,
          group_number: participants[0]?.group_number || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Aggiungi il nuovo partecipante alla lista della camera
      setRoomParticipants((prev) => [...prev, data as Participant]);
      resetNewParticipantForm();
      setAddingParticipant(false);
      setAddMode("existing");
      toast.success(`${fullName} aggiunto alla camera`);
    } catch (error) {
      console.error("Errore creazione partecipante:", error);
      toast.error("Errore nella creazione del partecipante");
    } finally {
      setCreatingNew(false);
    }
  };

  // Handler per confermare l'inserimento nonostante i duplicati
  const handleConfirmDuplicate = async () => {
    setDuplicateAlert(null);
    await handleCreateAndAddParticipant(true);
  };

  const handleSave = async () => {
    if (roomParticipants.length === 0) {
      toast.error("La camera deve avere almeno un partecipante");
      return;
    }

    setSaving(true);

    try {
      // Ottieni il created_at del primo partecipante originale per mantenere il gruppo
      const groupCreatedAt = participants[0]?.created_at;

      // Aggiorna tutti i partecipanti nella camera
      for (const participant of roomParticipants) {
        // Rimuovi eventuale vecchio tipo camera dalle note
        let newNotes = participant.notes?.replace(/Camera:\s*\w+\s*\|?\s*/g, "").trim() || "";
        // Aggiungi il nuovo tipo camera
        newNotes = newNotes
          ? `${newNotes} | Camera: ${selectedRoomType}`
          : `Camera: ${selectedRoomType}`;

        const updateData: any = { notes: newNotes };

        // Se è un partecipante aggiunto, aggiorna anche created_at per metterlo nel gruppo
        if (!participants.find((p) => p.id === participant.id) && groupCreatedAt) {
          updateData.created_at = groupCreatedAt;
        }

        const { error } = await supabase
          .from("participants")
          .update(updateData)
          .eq("id", participant.id);

        if (error) throw error;
      }

      // Rimuovi il tipo camera dai partecipanti rimossi dalla camera
      const removedParticipants = participants.filter(
        (p) => !roomParticipants.find((rp) => rp.id === p.id)
      );

      for (const participant of removedParticipants) {
        const newNotes = participant.notes?.replace(/Camera:\s*\w+\s*\|?\s*/g, "").trim() || null;
        const { error } = await supabase
          .from("participants")
          .update({ notes: newNotes || null })
          .eq("id", participant.id);

        if (error) throw error;
      }

      toast.success("Camera modificata con successo");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Errore salvataggio camera:", error);
      toast.error("Errore nel salvataggio della camera");
    } finally {
      setSaving(false);
    }
  };

  // Genera token per upload documenti
  const generateUploadToken = async (participantId: string): Promise<string | null> => {
    try {
      const { data: existingToken } = await supabase
        .from('upload_tokens')
        .select('token')
        .eq('participant_id', participantId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingToken) return existingToken.token;

      const array = new Uint8Array(24);
      crypto.getRandomValues(array);
      const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase
        .from('upload_tokens')
        .insert({ participant_id: participantId, token });

      if (error) throw error;
      return token;
    } catch (err) {
      console.error('Error generating upload token:', err);
      return null;
    }
  };

  // Genera token per scelta posto bus
  const generateBusSeatToken = async (participantId: string): Promise<string | null> => {
    try {
      const { data: existingToken } = await supabase
        .from('bus_seat_tokens')
        .select('token')
        .eq('participant_id', participantId)
        .eq('trip_id', tripId)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingToken) return existingToken.token;

      const array = new Uint8Array(24);
      crypto.getRandomValues(array);
      const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase
        .from('bus_seat_tokens')
        .insert({ participant_id: participantId, trip_id: tripId, token });

      if (error) throw error;
      return token;
    } catch (err) {
      console.error('Error generating bus seat token:', err);
      return null;
    }
  };

  // Genera token per conferma prenotazione
  const generateConfirmationToken = async (participantId: string): Promise<string | null> => {
    try {
      const { data: existingToken } = await supabase
        .from('booking_confirmation_tokens')
        .select('token')
        .eq('participant_id', participantId)
        .eq('trip_id', tripId)
        .gt('expires_at', new Date().toISOString())
        .is('confirmed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingToken) return existingToken.token;

      const array = new Uint8Array(24);
      crypto.getRandomValues(array);
      const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase
        .from('booking_confirmation_tokens')
        .insert({ participant_id: participantId, trip_id: tripId, token });

      if (error) throw error;
      return token;
    } catch (err) {
      console.error('Error generating confirmation token:', err);
      return null;
    }
  };

  const handleWhatsAppRoom = async () => {
    // Trova un partecipante con telefono
    const participantWithPhone = roomParticipants.find((p) => p.phone);
    if (!participantWithPhone) {
      toast.error("Nessun partecipante con numero di telefono");
      return;
    }

    const phone = formatPhoneForWhatsApp(participantWithPhone.phone);
    if (!phone) {
      toast.error("Numero di telefono non valido");
      return;
    }

    setSendingWhatsApp(true);

    // Impostazioni WhatsApp (default tutti attivi)
    const includeBusSeat = agencySettings?.whatsapp_include_bus_seat ?? true;
    const includeDocUpload = agencySettings?.whatsapp_include_document_upload ?? true;
    const includeConfirmation = agencySettings?.whatsapp_include_confirmation_link ?? true;
    const includeEconomicDetails = agencySettings?.whatsapp_include_economic_details ?? true;

    const departureDate = format(new Date(tripDepartureDate), "d MMMM yyyy", { locale: it });
    const returnDate = format(new Date(tripReturnDate), "d MMMM yyyy", { locale: it });
    const roomLabel = ROOM_LABELS[selectedRoomType] || selectedRoomType;
    const participantNames = roomParticipants.map((p) => `• ${formatNameSurnameFirst(p.full_name)}`).join("\n");

    // Calcola la quota totale della camera e gli acconti versati
    const getParticipantPrice = (participant: Participant) => {
      const basePrice = tripPrice;
      const discountedPrice = calculateDiscountedPrice(basePrice, participant.discount_type, participant.discount_amount);
      const isSingle = participant.notes?.includes("Camera: singola") || selectedRoomType === "singola";
      const dailySupplement = tripSingleSupplement || 0;
      const supplement = isSingle && tripDepartureDate && tripReturnDate
        ? calculateTotalSingleSupplement(dailySupplement, tripDepartureDate, tripReturnDate)
        : 0;
      return discountedPrice + supplement;
    };

    const getParticipantDeposit = (participantId: string) => {
      return participantPayments
        .filter(p => p.participant_id === participantId)
        .reduce((sum, p) => sum + Number(p.amount), 0);
    };

    // Calcola totali per la camera
    const roomTotal = roomParticipants.reduce((sum, p) => sum + getParticipantPrice(p), 0);
    const roomPaid = roomParticipants.reduce((sum, p) => sum + getParticipantDeposit(p.id), 0);
    const roomBalance = roomTotal - roomPaid;

    // Genera i link per il primo partecipante (quello con il telefono)
    let uploadLink = "";
    let busSeatLink = "";
    let confirmationLink = "";

    if (includeDocUpload) {
      const token = await generateUploadToken(participantWithPhone.id);
      if (token) uploadLink = `${window.location.origin}/upload-documenti/${token}`;
    }

    if (includeBusSeat) {
      const token = await generateBusSeatToken(participantWithPhone.id);
      if (token) busSeatLink = `${window.location.origin}/scegli-posto/${token}`;
    }

    if (includeConfirmation) {
      const token = await generateConfirmationToken(participantWithPhone.id);
      if (token) confirmationLink = `${window.location.origin}/conferma-prenotazione/${token}`;
    }

    setSendingWhatsApp(false);

    // Costruisci messaggio completo
    const messageParts = [
      `✅ *CONFERMA PRENOTAZIONE CAMERA*`,
      ``,
      `Gentile Cliente,`,
      ``,
      `Camera confermata per il viaggio "${tripTitle}"!`,
      ``,
      `🏨 *Tipo camera:* ${roomLabel}`,
      `👥 *Occupanti:*`,
      participantNames,
      ``,
      `📅 *Partenza:* ${departureDate}`,
      `📅 *Rientro:* ${returnDate}`,
    ];

    // Aggiungi dettagli economici se abilitati
    if (includeEconomicDetails) {
      messageParts.push(
        ``,
        `💰 *RIEPILOGO ECONOMICO CAMERA*`,
        `Quota totale camera: *€${roomTotal.toFixed(2)}*`,
        `Acconti versati: *€${roomPaid.toFixed(2)}*`,
        `Saldo da versare: *€${roomBalance.toFixed(2)}*`
      );
    }

    // Aggiungi link scelta posto bus se abilitato
    if (busSeatLink) {
      messageParts.push(
        ``,
        `🪑 *SCEGLI IL TUO POSTO SUL BUS*`,
        `Clicca qui per scegliere il tuo posto:`,
        busSeatLink
      );
    }

    // Aggiungi link upload documenti se abilitato
    if (uploadLink) {
      messageParts.push(
        ``,
        `📄 *DOCUMENTO DI IDENTITÀ*`,
        `Per completare la prenotazione, carica una copia del documento:`,
        uploadLink
      );
    }

    // Aggiungi link conferma se abilitato
    if (confirmationLink) {
      messageParts.push(
        ``,
        `✅ *CONFERMA LA TUA PRENOTAZIONE*`,
        `Clicca qui per confermare:`,
        confirmationLink
      );
    }

    // Footer
    messageParts.push(
      ``,
      `Per qualsiasi informazione non esiti a contattarci.`,
      `Grazie per aver scelto i nostri viaggi!`,
      ``,
      agencySettings?.business_name ? `_${agencySettings.business_name}_` : null,
      agencySettings?.phone ? `_Tel. ${agencySettings.phone}_` : null
    );

    const finalMessage = messageParts.filter(Boolean).join("\n");
    openWhatsApp(phone, finalMessage);
  };

  const currentRoomCapacity = ROOM_TYPES.find((r) => r.value === selectedRoomType)?.capacity || 4;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5" />
            Modifica Camera
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {/* Tipo Camera */}
          <div className="space-y-2">
            <Label>Tipologia Camera</Label>
            <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROOM_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label} (max {type.capacity} pers.)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {roomParticipants.length > currentRoomCapacity && (
              <p className="text-xs text-red-600">
                ⚠️ Troppi occupanti per questa tipologia ({roomParticipants.length}/{currentRoomCapacity})
              </p>
            )}
          </div>

          {/* Lista Partecipanti in Camera */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Occupanti ({roomParticipants.length})
            </Label>
            <div className="border rounded-lg divide-y">
              {roomParticipants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{formatNameSurnameFirst(participant.full_name)}</p>
                    {participant.phone && (
                      <p className="text-xs text-muted-foreground">{participant.phone}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemoveParticipant(participant.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {roomParticipants.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nessun occupante
                </div>
              )}
            </div>
          </div>

          {/* Aggiungi Partecipante */}
          <div className="space-y-2">
            {addingParticipant ? (
              <div className="border rounded-lg p-3 space-y-3">
                <Tabs value={addMode} onValueChange={(v) => setAddMode(v as "existing" | "new")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="existing" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      Esistente
                    </TabsTrigger>
                    <TabsTrigger value="new" className="text-xs">
                      <UserPlus className="h-3 w-3 mr-1" />
                      Nuovo
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="existing" className="mt-3">
                    {availableParticipants.length > 0 ? (
                      <div className="space-y-2">
                        <Select
                          value={selectedParticipantToAdd}
                          onValueChange={setSelectedParticipantToAdd}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona partecipante..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableParticipants.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {formatNameSurnameFirst(p.full_name)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={handleAddExistingParticipant}
                            disabled={!selectedParticipantToAdd}
                          >
                            Aggiungi
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAddingParticipant(false);
                              setSelectedParticipantToAdd("");
                            }}
                          >
                            Annulla
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Tutti i partecipanti del viaggio sono già assegnati
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="new" className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Cognome *</Label>
                        <Input
                          value={newParticipant.cognome}
                          onChange={(e) => setNewParticipant({ ...newParticipant, cognome: e.target.value })}
                          placeholder="Rossi"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Nome *</Label>
                        <Input
                          value={newParticipant.nome}
                          onChange={(e) => setNewParticipant({ ...newParticipant, nome: e.target.value })}
                          placeholder="Mario"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Data di Nascita</Label>
                        <Input
                          value={newParticipant.date_of_birth}
                          onChange={(e) => setNewParticipant({ ...newParticipant, date_of_birth: e.target.value })}
                          placeholder="GG/MM/AAAA"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Luogo di Nascita</Label>
                        <Input
                          value={newParticipant.place_of_birth}
                          onChange={(e) => setNewParticipant({ ...newParticipant, place_of_birth: e.target.value })}
                          placeholder="Roma"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Telefono</Label>
                        <Input
                          value={newParticipant.phone}
                          onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
                          placeholder="333 1234567"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Email</Label>
                        <Input
                          value={newParticipant.email}
                          onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                          placeholder="email@esempio.it"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => handleCreateAndAddParticipant(false)}
                        disabled={creatingNew || !newParticipant.cognome.trim() || !newParticipant.nome.trim()}
                      >
                        {creatingNew ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        Crea e Aggiungi
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAddingParticipant(false);
                          resetNewParticipantForm();
                        }}
                      >
                        Annulla
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => setAddingParticipant(true)}
              >
                <Plus className="h-4 w-4" />
                Aggiungi Occupante
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button
            variant="outline"
            className="gap-2 bg-green-600 hover:bg-green-700 text-white border-0"
            onClick={handleWhatsAppRoom}
            disabled={sendingWhatsApp || roomParticipants.length === 0}
          >
            {sendingWhatsApp ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            WhatsApp Camera
          </Button>
          <div className="flex gap-2 flex-1 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salva Modifiche
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Alert dialog per duplicati/omonimia */}
    <AlertDialog open={!!duplicateAlert} onOpenChange={(open) => !open && setDuplicateAlert(null)}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
            ATTENZIONE - POSSIBILE DUPLICATO
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p className="text-base font-medium text-foreground">
                Il seguente nominativo risulta già iscritto a questo viaggio:
              </p>
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg">
                <p className="font-semibold text-amber-700">{duplicateAlert?.name}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Potrebbe trattarsi di un caso di <span className="font-medium">omonimia</span> (persone diverse con lo stesso nome).
                Vuoi procedere comunque con l'inserimento?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={() => setDuplicateAlert(null)}>
            Annulla
          </AlertDialogCancel>
          <Button onClick={handleConfirmDuplicate} className="bg-amber-600 hover:bg-amber-700">
            Conferma inserimento
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
