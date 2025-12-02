import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const tripSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio").max(200, "Massimo 200 caratteri"),
  description: z.string().optional(),
  destination: z.string().min(1, "La destinazione è obbligatoria").max(200, "Massimo 200 caratteri"),
  departure_date: z.string().min(1, "La data di partenza è obbligatoria"),
  return_date: z.string().min(1, "La data di ritorno è obbligatoria"),
  price: z.string().min(1, "Il prezzo è obbligatorio"),
  deposit_type: z.enum(["fixed", "percentage"]),
  deposit_amount: z.string().min(1, "L'acconto è obbligatorio"),
  max_participants: z.string().optional(),
  status: z.enum(["planned", "confirmed", "ongoing", "completed", "cancelled"]),
  bus_type_id: z.string().optional(),
}).refine((data) => new Date(data.return_date) >= new Date(data.departure_date), {
  message: "La data di ritorno deve essere successiva alla data di partenza",
  path: ["return_date"],
});

type TripFormValues = z.infer<typeof tripSchema>;

interface CreateTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateTripDialog({ open, onOpenChange, onSuccess }: CreateTripDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [busTypes, setBusTypes] = useState<{ id: string; name: string; total_seats: number }[]>([]);

  useEffect(() => {
    if (open) {
      loadBusTypes();
    }
  }, [open]);

  const loadBusTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("bus_types")
        .select("id, name, total_seats")
        .order("name");
      
      if (error) throw error;
      setBusTypes(data || []);
    } catch (error) {
      console.error("Errore caricamento tipi bus:", error);
    }
  };

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
      max_participants: "",
      status: "planned",
      bus_type_id: "",
    },
  });

  const depositType = form.watch("deposit_type");

  const onSubmit = async (values: TripFormValues) => {
    if (!user) {
      toast.error("Devi essere autenticato per creare un viaggio");
      return;
    }

    setLoading(true);
    try {
      const { data: tripData, error: tripError } = await supabase.from("trips").insert({
        title: values.title,
        description: values.description || null,
        destination: values.destination,
        departure_date: values.departure_date,
        return_date: values.return_date,
        price: parseFloat(values.price),
        deposit_type: values.deposit_type,
        deposit_amount: parseFloat(values.deposit_amount),
        max_participants: values.max_participants ? parseInt(values.max_participants) : null,
        status: values.status,
        created_by: user.id,
      }).select().single();

      if (tripError) throw tripError;

      // Se è stato selezionato un tipo di bus, crea la configurazione
      if (values.bus_type_id && tripData) {
        const { data: busType } = await supabase
          .from("bus_types")
          .select("*")
          .eq("id", values.bus_type_id)
          .single();

        if (busType) {
          const { error: configError } = await supabase
            .from("bus_configurations")
            .insert({
              trip_id: tripData.id,
              bus_type_id: busType.id,
              rows: busType.rows,
              seats_per_row: busType.seats_per_row,
              total_seats: busType.total_seats,
            });

          if (configError) throw configError;
        }
      }

      toast.success("Viaggio creato con successo!");
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Errore creazione viaggio:", error);
      toast.error("Errore durante la creazione del viaggio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crea Nuovo Viaggio</DialogTitle>
          <DialogDescription>
            Inserisci i dettagli del nuovo viaggio di gruppo
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
                        defaultValue={field.value}
                        className="flex gap-4 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="fixed" id="fixed" />
                          <Label htmlFor="fixed" className="font-normal cursor-pointer">
                            Importo fisso (€)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="percentage" id="percentage" />
                          <Label htmlFor="percentage" className="font-normal cursor-pointer">
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            <FormField
              control={form.control}
              name="bus_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo di Bus</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona il tipo di bus (opzionale)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Nessuno</SelectItem>
                      {busTypes.map((busType) => (
                        <SelectItem key={busType.id} value={busType.id}>
                          {busType.name} - {busType.total_seats} posti
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creazione..." : "Crea Viaggio"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
