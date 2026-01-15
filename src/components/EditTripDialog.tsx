import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useActivityLog } from "@/hooks/use-activity-log";
import { Pencil, Link as LinkIcon, ExternalLink } from "lucide-react";

interface Guide {
  id: string;
  full_name: string;
  role: string;
}

const tripSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio").max(200, "Massimo 200 caratteri"),
  description: z.string().optional(),
  destination: z.string().min(1, "La destinazione è obbligatoria").max(200, "Massimo 200 caratteri"),
  departure_date: z.string().min(1, "La data di partenza è obbligatoria"),
  return_date: z.string().min(1, "La data di ritorno è obbligatoria"),
  price: z.string().min(1, "Il prezzo è obbligatorio"),
  deposit_type: z.enum(["fixed", "percentage"]),
  deposit_amount: z.string().min(1, "L'acconto è obbligatorio"),
  single_room_supplement: z.string().optional(),
  max_participants: z.string().optional(),
  status: z.enum(["planned", "confirmed", "ongoing", "completed", "cancelled"]),
  trip_type: z.enum(["standard", "day_trip"]),
  companion_name: z.string().optional(),
  guide_name: z.string().optional(),
  flyer_url: z.string().url("Inserisci un URL valido").optional().or(z.literal("")),
}).refine((data) => new Date(data.return_date) >= new Date(data.departure_date), {
  message: "La data di ritorno deve essere successiva alla data di partenza",
  path: ["return_date"],
});

type TripFormValues = z.infer<typeof tripSchema>;

interface Trip {
  id: string;
  title: string;
  description: string | null;
  destination: string;
  departure_date: string;
  return_date: string;
  price: number;
  deposit_type: "fixed" | "percentage";
  deposit_amount: number;
  single_room_supplement: number | null;
  max_participants: number | null;
  status: string;
  trip_type: string;
  companion_name: string | null;
  guide_name: string | null;
  flyer_url: string | null;
}

interface EditTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  trip: Trip;
}

export default function EditTripDialog({ open, onOpenChange, onSuccess, trip }: EditTripDialogProps) {
  const [loading, setLoading] = useState(false);
  const [guides, setGuides] = useState<Guide[]>([]);
  const { logUpdate } = useActivityLog();

  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      title: "",
      description: "",
      destination: "",
      departure_date: "",
      return_date: "",
      price: "",
      deposit_type: "fixed",
      deposit_amount: "",
      single_room_supplement: "",
      max_participants: "",
      status: "planned",
      trip_type: "standard",
      companion_name: "",
      guide_name: "",
      flyer_url: "",
    },
  });

  useEffect(() => {
    if (open) {
      loadGuides();
    }
  }, [open]);

  const loadGuides = async () => {
    const { data } = await supabase
      .from("guides")
      .select("id, full_name, role")
      .order("full_name");
    setGuides(data || []);
  };

  const accompagnatori = guides.filter(g => g.role === "accompagnatore");
  const guideList = guides.filter(g => g.role === "guida");

  useEffect(() => {
    if (trip && open) {
      form.reset({
        title: trip.title,
        description: trip.description || "",
        destination: trip.destination,
        departure_date: trip.departure_date,
        return_date: trip.return_date,
        price: trip.price.toString(),
        deposit_type: trip.deposit_type,
        deposit_amount: trip.deposit_amount.toString(),
        single_room_supplement: trip.single_room_supplement?.toString() || "",
        max_participants: trip.max_participants?.toString() || "",
        status: trip.status as TripFormValues["status"],
        trip_type: (trip.trip_type || "standard") as TripFormValues["trip_type"],
        companion_name: trip.companion_name || "",
        guide_name: trip.guide_name || "",
        flyer_url: trip.flyer_url || "",
      });
    }
  }, [trip, open, form]);

  const depositType = form.watch("deposit_type");
  const tripType = form.watch("trip_type");

  const onSubmit = async (values: TripFormValues) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("trips")
        .update({
          title: values.title,
          description: values.description || null,
          destination: values.destination,
          departure_date: values.departure_date,
          return_date: values.return_date,
          price: parseFloat(values.price),
          deposit_type: values.deposit_type,
          deposit_amount: parseFloat(values.deposit_amount),
          single_room_supplement: values.single_room_supplement ? parseFloat(values.single_room_supplement) : 0,
          max_participants: values.max_participants ? parseInt(values.max_participants) : null,
          status: values.status,
          trip_type: values.trip_type,
          companion_name: values.companion_name || null,
          guide_name: values.guide_name || null,
          flyer_url: values.flyer_url || null,
        })
        .eq("id", trip.id);

      if (error) throw error;

      await logUpdate("trip", trip.id, trip.title, {
        changes: {
          title: values.title,
          destination: values.destination,
          departure_date: values.departure_date,
          return_date: values.return_date,
        }
      });

      toast.success("Viaggio modificato con successo!");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Errore modifica viaggio:", error);
      toast.error("Errore durante la modifica del viaggio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Viaggio</DialogTitle>
          <DialogDescription>
            Modifica i dettagli del viaggio
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titolo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Es: Tour della Toscana" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destinazione *</FormLabel>
                  <FormControl>
                    <Input placeholder="Es: Firenze, Siena, Pisa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrivi il viaggio..." 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="departure_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Partenza *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="return_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Ritorno *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prezzo Totale (€) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Tipo Acconto *</FormLabel>
              <FormField
                control={form.control}
                name="deposit_type"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-4 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="fixed" id="edit-fixed" />
                          <Label htmlFor="edit-fixed" className="font-normal cursor-pointer">
                            Importo fisso (€)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="percentage" id="edit-percentage" />
                          <Label htmlFor="edit-percentage" className="font-normal cursor-pointer">
                            Percentuale (%)
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="deposit_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Acconto {depositType === "percentage" ? "(%)" : "(€)"} *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder={depositType === "percentage" ? "Es: 20" : "Es: 200.00"}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Tipo Viaggio *</FormLabel>
              <FormField
                control={form.control}
                name="trip_type"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-4 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="standard" id="edit-standard" />
                          <Label htmlFor="edit-standard" className="font-normal cursor-pointer">
                            Con pernottamento
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="day_trip" id="edit-day_trip" />
                          <Label htmlFor="edit-day_trip" className="font-normal cursor-pointer">
                            Giornaliero (solo bus)
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {tripType === "standard" && (
              <FormField
                control={form.control}
                name="single_room_supplement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplemento Singola (€/notte)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="Es: 20.00 (verrà moltiplicato per le notti)"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="max_participants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Partecipanti</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Lascia vuoto per illimitati" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stato *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona stato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planned">Pianificato</SelectItem>
                        <SelectItem value="confirmed">Confermato</SelectItem>
                        <SelectItem value="ongoing">In Corso</SelectItem>
                        <SelectItem value="completed">Completato</SelectItem>
                        <SelectItem value="cancelled">Annullato</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companion_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accompagnatore</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona accompagnatore" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nessuno</SelectItem>
                        {accompagnatori.map((g) => (
                          <SelectItem key={g.id} value={g.full_name}>
                            {g.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guide_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guida</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona guida" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nessuno</SelectItem>
                        {guideList.map((g) => (
                          <SelectItem key={g.id} value={g.full_name}>
                            {g.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="flyer_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Link Locandina
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input 
                        type="url" 
                        placeholder="https://esempio.com/locandina-viaggio" 
                        {...field} 
                      />
                      {field.value && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => window.open(field.value, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Inserisci l'URL della locandina del viaggio sul tuo sito
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvataggio..." : "Salva Modifiche"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
