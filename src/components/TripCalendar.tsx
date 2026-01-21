import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { format, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Trip {
  id: string;
  title: string;
  destination: string;
  departure_date: string;
  return_date: string;
  max_participants?: number | null;
  participant_count?: number;
}

interface TripCalendarProps {
  trips: Trip[];
  onMonthChange?: (month: Date) => void;
}

export function TripCalendar({ trips, onMonthChange }: TripCalendarProps) {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
    onMonthChange?.(month);
  };

  // Trova viaggi per una data specifica (partenza, ritorno o durante)
  const getTripsForDate = (date: Date) => {
    return trips.filter((trip) => {
      const departure = parseISO(trip.departure_date);
      const returnDate = parseISO(trip.return_date);
      
      return (
        isSameDay(date, departure) ||
        isSameDay(date, returnDate) ||
        isWithinInterval(date, { start: departure, end: returnDate })
      );
    });
  };

  // Verifica se una data ha viaggi
  const hasTrips = (date: Date) => {
    return getTripsForDate(date).length > 0;
  };

  // Verifica se è data di partenza
  const isDepartureDate = (date: Date) => {
    return trips.some((trip) => isSameDay(date, parseISO(trip.departure_date)));
  };

  // Verifica se è data di ritorno
  const isReturnDate = (date: Date) => {
    return trips.some((trip) => isSameDay(date, parseISO(trip.return_date)));
  };

  const tripsForSelectedDate = selectedDate ? getTripsForDate(selectedDate) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📅 Calendario Viaggi
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col lg:flex-row gap-6">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          month={currentMonth}
          onMonthChange={handleMonthChange}
          locale={it}
          className="rounded-md border"
          modifiers={{
            hasTrip: (date) => hasTrips(date),
            departure: (date) => isDepartureDate(date),
            return: (date) => isReturnDate(date),
          }}
          modifiersClassNames={{
            hasTrip: "relative",
            departure: "relative",
            return: "relative",
          }}
          components={{
            DayContent: ({ date }) => {
              const dateHasTrips = hasTrips(date);
              const isDeparture = isDepartureDate(date);
              const isReturn = isReturnDate(date);
              const tripCount = getTripsForDate(date).length;

              return (
                <div className="relative w-full h-full flex items-center justify-center">
                  <span>{date.getDate()}</span>
                  {dateHasTrips && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {isDeparture && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Partenza" />
                      )}
                      {isReturn && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Ritorno" />
                      )}
                      {!isDeparture && !isReturn && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" title="In viaggio" />
                      )}
                      {tripCount > 1 && (
                        <span className="absolute -top-1 -right-2 text-[10px] font-bold text-primary">
                          +{tripCount - 1}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            },
          }}
        />

        <div className="flex-1 min-w-0">
          {selectedDate ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">
                {format(selectedDate, "EEEE d MMMM yyyy", { locale: it })}
              </h3>
              {tripsForSelectedDate.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nessun viaggio in questa data
                </p>
              ) : (
                <div className="space-y-2">
                  {tripsForSelectedDate.map((trip) => {
                    const departure = parseISO(trip.departure_date);
                    const returnDate = parseISO(trip.return_date);
                    const isDeparture = isSameDay(selectedDate, departure);
                    const isReturn = isSameDay(selectedDate, returnDate);

                    return (
                      <div
                        key={trip.id}
                        className="p-3 rounded-lg border bg-card hover:bg-accent/10 transition-colors cursor-pointer"
                        onClick={() => navigate(`/viaggi/${trip.id}`)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{trip.title}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {trip.destination}
                            </p>
                          </div>
                          <div className="shrink-0">
                            {isDeparture && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                Partenza
                              </span>
                            )}
                            {isReturn && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                Ritorno
                              </span>
                            )}
                            {!isDeparture && !isReturn && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                In corso
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {format(departure, "dd/MM")} - {format(returnDate, "dd/MM/yyyy")}
                          </p>
                          {(trip.participant_count !== undefined || trip.max_participants) && (
                            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              👥 {trip.participant_count ?? 0}
                              {trip.max_participants ? ` / ${trip.max_participants}` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <p className="text-muted-foreground">
                Seleziona una data per vedere i viaggi
              </p>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Partenza
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Ritorno
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  In corso
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
