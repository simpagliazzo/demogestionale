import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bus } from "lucide-react";
import BusSeatManager from "@/components/BusSeatManager";

interface Trip {
  id: string;
  title: string;
  destination: string;
  departure_date: string;
}

export default function BusPage() {
  const [selectedTrip, setSelectedTrip] = useState<string>("");

  // Fetch trips
  const { data: trips = [] } = useQuery({
    queryKey: ["trips-for-bus"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, title, destination, departure_date")
        .order("departure_date", { ascending: true });
      if (error) throw error;
      return data as Trip[];
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="font-display text-4xl font-bold">Posti Bus</h1>
        <p className="text-muted-foreground mt-1">
          Assegna i posti sul bus ai partecipanti
        </p>
      </div>

      {/* Trip Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bus className="h-5 w-5" />
            Seleziona Viaggio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTrip} onValueChange={setSelectedTrip}>
            <SelectTrigger className="w-full md:w-[400px]">
              <SelectValue placeholder="Seleziona un viaggio..." />
            </SelectTrigger>
            <SelectContent>
              {trips.map((trip) => (
                <SelectItem key={trip.id} value={trip.id}>
                  {trip.title} - {trip.destination}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Bus Seat Manager Component */}
      {selectedTrip && (
        <BusSeatManager tripId={selectedTrip} />
      )}
    </div>
  );
}
