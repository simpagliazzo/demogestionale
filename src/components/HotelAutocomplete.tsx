import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface HotelRegistry {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
}

interface HotelAutocompleteProps {
  onSelect: (hotel: HotelRegistry | null) => void;
  onAddNew: () => void;
  selectedHotel?: HotelRegistry | null;
}

export function HotelAutocomplete({ onSelect, onAddNew, selectedHotel }: HotelAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [hotels, setHotels] = useState<HotelRegistry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    loadHotels();
  }, []);

  const loadHotels = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("hotel_registry")
        .select("*")
        .order("name");

      if (error) throw error;
      setHotels(data || []);
    } catch (error) {
      console.error("Errore caricamento hotel:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHotels = hotels.filter(hotel =>
    hotel.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    hotel.city?.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal"
        >
          {selectedHotel ? (
            <span className="truncate">
              {selectedHotel.name}
              {selectedHotel.city && <span className="text-muted-foreground ml-1">({selectedHotel.city})</span>}
            </span>
          ) : (
            <span className="text-muted-foreground">Seleziona dalla rubrica o inserisci nuovo...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Cerca hotel..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-2 text-center">
                <p className="text-sm text-muted-foreground mb-2">Nessun hotel trovato</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    onAddNew();
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi nuovo hotel
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  onAddNew();
                }}
                className="text-primary cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-2" />
                Inserisci manualmente
              </CommandItem>
              {filteredHotels.map((hotel) => (
                <CommandItem
                  key={hotel.id}
                  value={hotel.name}
                  onSelect={() => {
                    onSelect(hotel);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedHotel?.id === hotel.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{hotel.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[hotel.city, hotel.address].filter(Boolean).join(" - ")}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
