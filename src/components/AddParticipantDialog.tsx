import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import ParticipantAutocomplete from "@/components/ParticipantAutocomplete";
import { ExistingParticipant } from "@/hooks/use-participant-search";
import { useActivityLog } from "@/hooks/use-activity-log";
import { AlertTriangle, Baby, UtensilsCrossed } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { formatNameSurnameFirst } from "@/lib/format-utils";
const participantSchema = z.object({
  cognome: z.string().min(1, "Il cognome è obbligatorio"),
  nome: z.string().min(1, "Il nome è obbligatorio"),
  date_of_birth: z.string().optional(),
  place_of_birth: z.string().optional(),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
  is_infant: z.boolean().optional(),
  has_restaurant: z.boolean().optional(),
});

const formSchema = z.object({
  participants: z.array(participantSchema).min(1, "Aggiungi almeno un partecipante"),
  room_type: z.enum(["singola", "doppia", "matrimoniale", "tripla", "quadrupla", "nessuna"]),
  group_number: z.string().optional(),
  customNumParticipants: z.number().optional(),
});

interface AddParticipantDialogProps {
  tripId: string;
  tripType?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddParticipantDialog({
  tripId,
  tripType = "standard",
  open,
  onOpenChange,
  onSuccess,
}: AddParticipantDialogProps) {
  const { user } = useAuth();
  const { logCreate } = useActivityLog();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [numParticipants, setNumParticipants] = useState<number | null>(null);
  const [nextGroupNumber, setNextGroupNumber] = useState<number>(1);
  const [useExistingGroup, setUseExistingGroup] = useState<boolean>(false);
  const [blacklistAlert, setBlacklistAlert] = useState<{ names: string[]; reasons: { [key: string]: string | null } } | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<{ names: string[]; pendingData: z.infer<typeof formSchema> | null } | null>(null);

  const isDayTrip = tripType === "day_trip";

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      participants: [{ cognome: "", nome: "", date_of_birth: "", place_of_birth: "", email: "", phone: "", notes: "", is_infant: false, has_restaurant: false }],
      room_type: isDayTrip ? "nessuna" : "doppia",
      group_number: "",
      customNumParticipants: undefined,
    },
  });

  const [customNumInput, setCustomNumInput] = useState<string>("");

  const { fields } = useFieldArray({
    control,
    name: "participants",
  });

  const watchGroupNumber = watch("group_number");

  // Carica il prossimo numero di gruppo disponibile
  useEffect(() => {
    if (open) {
      loadNextGroupNumber();
    }
  }, [open, tripId]);

  const loadNextGroupNumber = async () => {
    try {
      const { data, error } = await supabase
        .from("participants")
        .select("group_number")
        .eq("trip_id", tripId)
        .not("group_number", "is", null)
        .order("group_number", { ascending: false })
        .limit(1);

      if (error) throw error;
      
      const maxGroup = data?.[0]?.group_number || 0;
      setNextGroupNumber(maxGroup + 1);
    } catch (error) {
      console.error("Errore caricamento numero gruppo:", error);
      setNextGroupNumber(1);
    }
  };

  // Converte data da DD/MM/YYYY a YYYY-MM-DD per Supabase
  const convertDateToISO = (dateStr: string | undefined): string | null => {
    if (!dateStr || dateStr.trim() === "") return null;
    
    // Se è già in formato YYYY-MM-DD, ritornalo così
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Converti da DD/MM/YYYY a YYYY-MM-DD
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      // Valida che siano numeri validi
      if (day && month && year && !isNaN(parseInt(day)) && !isNaN(parseInt(month)) && !isNaN(parseInt(year))) {
        return `${year.padStart(4, '20')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    
    return null;
  };

  const processSubmit = async (values: z.infer<typeof formSchema>, skipDuplicateCheck = false) => {
    setIsSubmitting(true);
    try {
      // Verifica se qualche partecipante è in blacklist (case-insensitive con ilike)
      const participantNames = values.participants.map(p => `${p.cognome} ${p.nome}`.trim().toLowerCase());
      
      // Recupera tutta la blacklist per fare un confronto case-insensitive
      const { data: allBlacklist, error: blacklistError } = await supabase
        .from("blacklist")
        .select("full_name, reason");

      if (blacklistError) {
        console.error("Errore verifica blacklist:", blacklistError);
      } else if (allBlacklist && allBlacklist.length > 0) {
        // Trova i nomi che matchano (case-insensitive)
        const matchedBlacklist = allBlacklist.filter(b => 
          participantNames.includes(b.full_name.toLowerCase())
        );
        
        if (matchedBlacklist.length > 0) {
          const matchedNames = values.participants
            .filter(p => matchedBlacklist.some(b => b.full_name.toLowerCase() === `${p.cognome} ${p.nome}`.trim().toLowerCase()))
            .map(p => `${p.cognome} ${p.nome}`);
          
          const reasons: { [key: string]: string | null } = {};
          matchedBlacklist.forEach(b => {
            const originalName = values.participants.find(p => `${p.cognome} ${p.nome}`.trim().toLowerCase() === b.full_name.toLowerCase());
            if (originalName) {
              reasons[`${originalName.cognome} ${originalName.nome}`] = b.reason;
            }
          });
          
          setBlacklistAlert({ names: matchedNames, reasons });
          setIsSubmitting(false);
          return;
        }
      }

      // Verifica duplicati nel viaggio (solo se non stiamo già confermando)
      if (!skipDuplicateCheck) {
        const { data: existingParticipants, error: existingError } = await supabase
          .from("participants")
          .select("full_name")
          .eq("trip_id", tripId);

        if (existingError) {
          console.error("Errore verifica duplicati:", existingError);
        } else if (existingParticipants && existingParticipants.length > 0) {
          // Normalizza i nomi rimuovendo spazi multipli e convertendo in lowercase
          const normalizeString = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
          const existingNames = existingParticipants.map(p => normalizeString(p.full_name));
          
          console.log("Existing names (normalized):", existingNames);
          console.log("New participants:", values.participants.map(p => normalizeString(`${p.cognome} ${p.nome}`)));
          
          const duplicateNames = values.participants
            .filter(p => existingNames.includes(normalizeString(`${p.cognome} ${p.nome}`)))
            .map(p => `${p.cognome} ${p.nome}`);

          console.log("Duplicate names found:", duplicateNames);

          if (duplicateNames.length > 0) {
            setDuplicateAlert({ names: duplicateNames, pendingData: values });
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Determina il numero di gruppo da usare
      let groupNum: number;
      if (useExistingGroup && values.group_number) {
        groupNum = parseInt(values.group_number);
      } else {
        groupNum = nextGroupNumber;
      }

      // Inserisci tutti i partecipanti con lo stesso group_number
      const participantsToInsert = values.participants.map(p => ({
        trip_id: tripId,
        full_name: `${p.cognome} ${p.nome}`.trim(),
        date_of_birth: convertDateToISO(p.date_of_birth),
        place_of_birth: p.place_of_birth || null,
        email: p.email || null,
        phone: p.phone || null,
        notes: isDayTrip 
          ? null
          : `Camera: ${values.room_type}`,
        notes_companion: p.notes || null,
        group_number: groupNum,
        created_by: user?.id || null,
        is_infant: p.is_infant || false,
        has_restaurant: p.has_restaurant || false,
      }));

      const { data: insertedData, error } = await supabase.from("participants").insert(participantsToInsert).select();

      if (error) throw error;

      // Log activity for each participant added
      for (const participant of insertedData || []) {
        await logCreate("participant", participant.id, participant.full_name, {
          trip_id: tripId,
          group_number: groupNum,
          room_type: values.room_type,
        });
      }

      toast.success(`${values.participants.length} partecipante/i aggiunto/i con successo (Gruppo #${groupNum})`);
      reset();
      setNumParticipants(null);
      setUseExistingGroup(false);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore durante l'aggiunta dei partecipanti");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Wrapper per handleSubmit (senza skipDuplicateCheck)
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await processSubmit(values, false);
  };

  // Handler per confermare l'inserimento nonostante i duplicati
  const handleConfirmDuplicate = async () => {
    if (duplicateAlert?.pendingData) {
      setDuplicateAlert(null);
      await processSubmit(duplicateAlert.pendingData, true);
    }
  };

  const handleNumParticipantsSelect = (num: number) => {
    setNumParticipants(num);
    const newParticipants = Array(num).fill(null).map(() => ({
      cognome: "",
      nome: "", 
      date_of_birth: "", 
      place_of_birth: "", 
      email: "", 
      phone: "", 
      notes: "",
      is_infant: false,
      has_restaurant: false,
    }));
    reset({
      participants: newParticipants,
      room_type: isDayTrip ? "nessuna" : "doppia",
      group_number: "",
    });
  };

  const handleCustomNumConfirm = () => {
    const num = parseInt(customNumInput);
    if (num > 0 && num <= 100) {
      handleNumParticipantsSelect(num);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        setNumParticipants(null);
        setUseExistingGroup(false);
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aggiungi Partecipanti</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isDayTrip 
              ? "Aggiungi partecipanti per questo viaggio giornaliero"
              : "Seleziona il numero di partecipanti che condivideranno la stessa camera"
            }
          </p>
        </DialogHeader>

        {numParticipants === null ? (
          <div className="space-y-4 py-8">
            <Label className="text-center block text-lg">Quanti partecipanti vuoi aggiungere?</Label>
            {isDayTrip ? (
              // Per viaggi giornalieri: input numerico libero
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((num) => (
                    <Button
                      key={num}
                      type="button"
                      variant="outline"
                      className="h-20 text-2xl font-bold"
                      onClick={() => handleNumParticipantsSelect(num)}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
                <div className="border-t pt-4">
                  <Label className="text-center block text-sm text-muted-foreground mb-2">
                    Oppure inserisci un numero personalizzato
                  </Label>
                  <div className="flex gap-2 justify-center items-center">
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="Es: 20"
                      value={customNumInput}
                      onChange={(e) => setCustomNumInput(e.target.value)}
                      className="w-24 text-center"
                    />
                    <Button
                      type="button"
                      onClick={handleCustomNumConfirm}
                      disabled={!customNumInput || parseInt(customNumInput) < 1}
                    >
                      Conferma
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              // Per viaggi con hotel: max 4 partecipanti (come prima)
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((num) => (
                  <Button
                    key={num}
                    type="button"
                    variant="outline"
                    className="h-24 text-2xl font-bold"
                    onClick={() => handleNumParticipantsSelect(num)}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Sezione Numero Gruppo */}
            <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Numero Gruppo Prenotazione</Label>
                  <p className="text-sm text-muted-foreground">
                    Identifica chi viaggia insieme (amici, famiglia)
                  </p>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  #{useExistingGroup && watchGroupNumber ? watchGroupNumber : nextGroupNumber}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant={!useExistingGroup ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setUseExistingGroup(false);
                    setValue("group_number", "");
                  }}
                >
                  Nuovo gruppo (#{nextGroupNumber})
                </Button>
                <Button
                  type="button"
                  variant={useExistingGroup ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseExistingGroup(true)}
                >
                  Aggiungi a gruppo esistente
                </Button>
              </div>

              {useExistingGroup && (
                <div className="space-y-2">
                  <Label htmlFor="group_number">Inserisci numero gruppo esistente</Label>
                  <Input
                    type="number"
                    min="1"
                    {...register("group_number")}
                    placeholder="Es: 1, 2, 3..."
                    className="max-w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Usa lo stesso numero di un gruppo già esistente per collegarli
                  </p>
                </div>
              )}
            </div>

            {!isDayTrip && (
              <div className="space-y-2">
                <Label>Tipologia Camera <span className="text-destructive">*</span></Label>
                <Controller
                  name="room_type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipologia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="singola">Singola</SelectItem>
                        <SelectItem value="doppia">Doppia</SelectItem>
                        <SelectItem value="matrimoniale">Matrimoniale</SelectItem>
                        <SelectItem value="tripla">Tripla</SelectItem>
                        <SelectItem value="quadrupla">Quadrupla</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            <div className="space-y-4">
              <Label className="text-base font-semibold">Partecipanti ({fields.length})</Label>

              {fields.map((field, index) => {
                const handleParticipantSelect = (participant: ExistingParticipant) => {
                  // Splitta il full_name in cognome e nome (assume PRIMO = cognome)
                  const nameParts = participant.full_name.trim().split(/\s+/);
                  if (nameParts.length >= 2) {
                    const cognome = nameParts[0];
                    const nome = nameParts.slice(1).join(' ');
                    setValue(`participants.${index}.cognome`, cognome);
                    setValue(`participants.${index}.nome`, nome);
                  } else {
                    setValue(`participants.${index}.cognome`, participant.full_name);
                    setValue(`participants.${index}.nome`, "");
                  }
                  if (participant.date_of_birth) {
                    const dateStr = participant.date_of_birth;
                    if (dateStr.includes("-")) {
                      const parts = dateStr.split("-");
                      setValue(`participants.${index}.date_of_birth`, `${parts[2]}/${parts[1]}/${parts[0]}`);
                    } else {
                      setValue(`participants.${index}.date_of_birth`, dateStr);
                    }
                  }
                  if (participant.place_of_birth) {
                    setValue(`participants.${index}.place_of_birth`, participant.place_of_birth);
                  }
                  if (participant.email) {
                    setValue(`participants.${index}.email`, participant.email);
                  }
                  if (participant.phone) {
                    setValue(`participants.${index}.phone`, participant.phone);
                  }
                  toast.success(`Dati di ${formatNameSurnameFirst(participant.full_name)} compilati automaticamente`);
                };

                return (
                <div key={field.id} className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium">Partecipante {index + 1}</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`participants.${index}.cognome`}>
                      Cognome <span className="text-destructive">*</span>
                    </Label>
                    <Controller
                      name={`participants.${index}.cognome`}
                      control={control}
                      render={({ field: inputField }) => (
                        <ParticipantAutocomplete
                          value={inputField.value}
                          onChange={inputField.onChange}
                          onSelect={handleParticipantSelect}
                          placeholder="Cognome..."
                        />
                      )}
                    />
                    {errors.participants?.[index]?.cognome && (
                      <p className="text-sm text-destructive">{errors.participants[index]?.cognome?.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`participants.${index}.nome`}>
                      Nome <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      {...register(`participants.${index}.nome`)}
                      placeholder="Nome..."
                    />
                    {errors.participants?.[index]?.nome && (
                      <p className="text-sm text-destructive">{errors.participants[index]?.nome?.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`participants.${index}.date_of_birth`}>Data di Nascita (gg/mm/aaaa)</Label>
                    <Input
                      {...register(`participants.${index}.date_of_birth`)}
                      placeholder="01/01/1990"
                      type="text"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`participants.${index}.place_of_birth`}>Luogo di Nascita</Label>
                    <Input
                      {...register(`participants.${index}.place_of_birth`)}
                      placeholder="Roma"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`participants.${index}.email`}>Email</Label>
                    <Input
                      {...register(`participants.${index}.email`)}
                      type="email"
                      placeholder="mario.rossi@email.com"
                    />
                    {errors.participants?.[index]?.email && (
                      <p className="text-sm text-destructive">{errors.participants[index]?.email?.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`participants.${index}.phone`}>Telefono</Label>
                    <Input
                      {...register(`participants.${index}.phone`)}
                      placeholder="+39 333 1234567"
                    />
                  </div>
                </div>

                  <div className="flex items-start space-x-3 p-3 rounded-md border bg-blue-50/50">
                    <Controller
                      name={`participants.${index}.is_infant`}
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id={`participants.${index}.is_infant`}
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor={`participants.${index}.is_infant`} className="flex items-center gap-2 cursor-pointer">
                        <Baby className="h-4 w-4 text-blue-500" />
                        È un Infant
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        L'infant non paga e dorme nel letto con i genitori
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-md border bg-amber-50/50">
                    <Controller
                      name={`participants.${index}.has_restaurant`}
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id={`participants.${index}.has_restaurant`}
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor={`participants.${index}.has_restaurant`} className="flex items-center gap-2 cursor-pointer">
                        <UtensilsCrossed className="h-4 w-4 text-amber-600" />
                        Prenotazione Ristorante
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Seleziona se il partecipante ha prenotato il ristorante
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`participants.${index}.notes`}>Note (Viaggia con...)</Label>
                    <Textarea
                      {...register(`participants.${index}.notes`)}
                      placeholder="Es. Viaggia con amici, preferisce posti vicini sul bus"
                      rows={2}
                    />
                  </div>
                </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNumParticipants(null)}
                disabled={isSubmitting}
              >
                Indietro
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvataggio..." : `Aggiungi ${fields.length} Partecipante/i`}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>

      {/* Alert dialog per blacklist */}
      <AlertDialog open={!!blacklistAlert} onOpenChange={(open) => !open && setBlacklistAlert(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              ATTENZIONE - BLACKLIST
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <p className="text-base font-medium text-foreground">
                  Impossibile procedere con l'iscrizione!
                </p>
                {blacklistAlert?.names.map((name) => (
                  <div key={name} className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="font-semibold text-destructive">{name}</p>
                    {blacklistAlert.reasons[name] && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium">Motivazione:</span> {blacklistAlert.reasons[name]}
                      </p>
                    )}
                    {!blacklistAlert.reasons[name] && (
                      <p className="text-sm text-muted-foreground mt-1 italic">
                        Nessuna motivazione specificata
                      </p>
                    )}
                  </div>
                ))}
                <p className="text-sm text-muted-foreground">
                  Questo nominativo è stato inserito nella blacklist e non può prenotare.
                  Solo un amministratore può rimuoverlo dalla blacklist.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Chiudi</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  I seguenti nominativi risultano già iscritti a questo viaggio:
                </p>
                {duplicateAlert?.names.map((name) => (
                  <div key={name} className="p-3 bg-amber-50 border border-amber-300 rounded-lg">
                    <p className="font-semibold text-amber-700">{name}</p>
                  </div>
                ))}
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
    </Dialog>
  );
}