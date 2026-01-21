import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bus } from "lucide-react";

const busTypeSchema = z.object({
  name: z.string().min(2, "Il nome deve contenere almeno 2 caratteri"),
  length_meters: z.coerce.number().min(6).max(18).default(12),
  rows: z.coerce.number().min(3, "Minimo 3 righe"),
  seats_per_row: z.coerce.number().min(2).max(4).default(4),
  last_row_seats: z.coerce.number().min(3).max(6).default(5),
  has_driver_seat: z.boolean().default(true),
  has_guide_seat: z.boolean().default(true),
  has_front_door: z.boolean().default(true),
  has_rear_door: z.boolean().default(true),
  has_wc: z.boolean().default(false),
  layout_type: z.string().default("gt_standard"),
  description: z.string().optional(),
});

export type BusTypeFormValues = z.infer<typeof busTypeSchema>;

interface BusTypeFormProps {
  onSubmit: (values: BusTypeFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  defaultValues?: Partial<BusTypeFormValues>;
}

// Preset comuni per bus GT
const BUS_PRESETS = [
  { 
    label: "GT Standard 12m (49+1+1)", 
    lengthMeters: 12, 
    rows: 11, 
    lastRowSeats: 5, 
    hasWc: false,
    layoutType: "gt_standard"
  },
  { 
    label: "GT Grande 12m (53+1+1)", 
    lengthMeters: 12, 
    rows: 12, 
    lastRowSeats: 5, 
    hasWc: false,
    layoutType: "gt_standard"
  },
  { 
    label: "GT Large 13m con WC (50+1+1)", 
    lengthMeters: 13.5, 
    rows: 11, 
    lastRowSeats: 5, 
    hasWc: true,
    layoutType: "gt_large"
  },
  { 
    label: "GT 15m (57+1+1)", 
    lengthMeters: 15, 
    rows: 13, 
    lastRowSeats: 5, 
    hasWc: true,
    layoutType: "gt_large"
  },
  { 
    label: "Minibus 8m (28+1)", 
    lengthMeters: 8, 
    rows: 6, 
    lastRowSeats: 4, 
    hasWc: false,
    layoutType: "minibus"
  },
  { 
    label: "Minibus 9m (35+1)", 
    lengthMeters: 9, 
    rows: 8, 
    lastRowSeats: 3, 
    hasWc: false,
    layoutType: "minibus"
  },
];

export default function BusTypeForm({ onSubmit, onCancel, isSubmitting, defaultValues }: BusTypeFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<BusTypeFormValues>({
    resolver: zodResolver(busTypeSchema),
    defaultValues: {
      name: "",
      length_meters: 12,
      rows: 11,
      seats_per_row: 4,
      last_row_seats: 5,
      has_driver_seat: true,
      has_guide_seat: true,
      has_front_door: true,
      has_rear_door: true,
      has_wc: false,
      layout_type: "gt_standard",
      description: "",
      ...defaultValues,
    },
  });

  const watchedRows = watch("rows");
  const watchedSeatsPerRow = watch("seats_per_row");
  const watchedLastRowSeats = watch("last_row_seats");
  const watchedHasWc = watch("has_wc");

  // Calcola posti totali: (righe normali × 4) + ultima fila
  const normalRowSeats = (watchedRows - 1) * watchedSeatsPerRow;
  const calculatedTotalSeats = normalRowSeats + watchedLastRowSeats;

  const applyPreset = (preset: typeof BUS_PRESETS[0]) => {
    setValue("length_meters", preset.lengthMeters);
    setValue("rows", preset.rows);
    setValue("last_row_seats", preset.lastRowSeats);
    setValue("has_wc", preset.hasWc);
    setValue("layout_type", preset.layoutType);
    setValue("has_rear_door", preset.layoutType !== "minibus");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Preset rapidi */}
      <div className="space-y-2">
        <Label className="text-sm">Preset Rapido</Label>
        <Select onValueChange={(value) => {
          const preset = BUS_PRESETS.find(p => p.label === value);
          if (preset) applyPreset(preset);
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Scegli un preset..." />
          </SelectTrigger>
          <SelectContent>
            {BUS_PRESETS.map((preset) => (
              <SelectItem key={preset.label} value={preset.label}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Seleziona un preset e personalizzalo, oppure configura manualmente
        </p>
      </div>

      {/* Nome */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Nome Tipo Bus <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Es. GT Standard 49 posti"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Dimensioni fisiche */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="length_meters">Lunghezza (m)</Label>
          <Input
            id="length_meters"
            type="number"
            step="0.5"
            {...register("length_meters")}
            min={6}
            max={18}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rows">File Posti</Label>
          <Input
            id="rows"
            type="number"
            {...register("rows")}
            min={3}
          />
          {errors.rows && (
            <p className="text-sm text-destructive">{errors.rows.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_row_seats">Ultima Fila</Label>
          <Input
            id="last_row_seats"
            type="number"
            {...register("last_row_seats")}
            min={3}
            max={6}
          />
        </div>
      </div>

      {/* Riepilogo posti */}
      <div className="bg-primary/10 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Posti passeggeri:</p>
            <p className="text-2xl font-bold text-primary">{calculatedTotalSeats}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>{watchedRows - 1} righe × {watchedSeatsPerRow} = {normalRowSeats}</p>
            <p>+ ultima fila da {watchedLastRowSeats}</p>
          </div>
        </div>
      </div>

      {/* Opzioni speciali */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Configurazione</Label>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <span>🚌</span>
              <span className="text-sm">Posto Autista</span>
            </div>
            <Switch
              checked={watch("has_driver_seat")}
              onCheckedChange={(checked) => setValue("has_driver_seat", checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <span>👤</span>
              <span className="text-sm">Posto Guida</span>
            </div>
            <Switch
              checked={watch("has_guide_seat")}
              onCheckedChange={(checked) => setValue("has_guide_seat", checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <span>🚪</span>
              <span className="text-sm">Porta Anteriore</span>
            </div>
            <Switch
              checked={watch("has_front_door")}
              onCheckedChange={(checked) => setValue("has_front_door", checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <span>🚪</span>
              <span className="text-sm">Porta Centrale</span>
            </div>
            <Switch
              checked={watch("has_rear_door")}
              onCheckedChange={(checked) => setValue("has_rear_door", checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg col-span-2">
            <div className="flex items-center gap-2">
              <span>🚻</span>
              <span className="text-sm">WC a bordo</span>
            </div>
            <Switch
              checked={watchedHasWc}
              onCheckedChange={(checked) => setValue("has_wc", checked)}
            />
          </div>
        </div>
      </div>

      {/* Descrizione */}
      <div className="space-y-2">
        <Label htmlFor="description">Descrizione (opzionale)</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Es. Bus gran turismo con sedili reclinabili e aria condizionata"
          rows={2}
        />
      </div>

      {/* Bottoni */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Annulla
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Bus className="h-4 w-4 mr-2" />
          {isSubmitting ? "Salvataggio..." : "Salva Tipo Bus"}
        </Button>
      </div>
    </form>
  );
}
