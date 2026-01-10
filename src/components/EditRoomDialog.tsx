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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X, Users, Hotel, MessageCircle, Loader2, UserPlus } from "lucide-react";
import { formatNameSurnameFirst } from "@/lib/format-utils";
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
  allParticipants: Participant[];
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
  allParticipants,
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

  const handleCreateAndAddParticipant = async () => {
    if (!newParticipant.cognome.trim() || !newParticipant.nome.trim()) {
      toast.error("Cognome e Nome sono obbligatori");
      return;
    }

    setCreatingNew(true);

    try {
      const fullName = `${newParticipant.nome.trim()} ${newParticipant.cognome.trim()}`;
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

    const departureDate = format(new Date(tripDepartureDate), "d MMMM yyyy", { locale: it });
    const returnDate = format(new Date(tripReturnDate), "d MMMM yyyy", { locale: it });
    const roomLabel = ROOM_LABELS[selectedRoomType] || selectedRoomType;
    const participantNames = roomParticipants.map((p) => `• ${formatNameSurnameFirst(p.full_name)}`).join("\n");

    // Usa template dal database
    const message = formatMessage("room_confirmation", {
      TITOLO_VIAGGIO: tripTitle,
      DESTINAZIONE: tripDestination,
      DATA_PARTENZA: departureDate,
      DATA_RITORNO: returnDate,
      TIPO_CAMERA: roomLabel,
      LISTA_OCCUPANTI: participantNames,
    });

    setSendingWhatsApp(false);

    if (message) {
      openWhatsApp(phone, message);
    } else {
      // Fallback se template non trovato
      const messageParts = [
        `✅ *CONFERMA PRENOTAZIONE CAMERA*`,
        ``,
        `Gentili Ospiti,`,
        ``,
        `Siamo lieti di confermare la Vostra sistemazione per il viaggio:`,
        ``,
        `🚌 *${tripTitle}*`,
        `📍 *Destinazione:* ${tripDestination}`,
        `📅 *Partenza:* ${departureDate}`,
        `📅 *Ritorno:* ${returnDate}`,
        ``,
        `🏨 *SISTEMAZIONE*`,
        `*${roomLabel}*`,
        ``,
        `👥 *Occupanti:*`,
        participantNames,
        ``,
        `Grazie per aver scelto i nostri viaggi!`,
        ``,
        `_${agencySettings?.business_name || "Agenzia Viaggi"}_`,
        agencySettings?.phone ? `_Tel. ${agencySettings.phone}_` : null,
      ].filter(Boolean).join("\n");

      openWhatsApp(phone, messageParts);
    }
  };

  const currentRoomCapacity = ROOM_TYPES.find((r) => r.value === selectedRoomType)?.capacity || 4;

  return (
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
                        onClick={handleCreateAndAddParticipant}
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
  );
}
