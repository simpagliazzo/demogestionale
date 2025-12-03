import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useParticipantSearch, ExistingParticipant } from "@/hooks/use-participant-search";
import { User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ParticipantAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (participant: ExistingParticipant) => void;
  placeholder?: string;
  className?: string;
}

export default function ParticipantAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Mario Rossi",
  className,
}: ParticipantAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { suggestions, isSearching, searchParticipants, clearSuggestions } = useParticipantSearch();

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    searchParticipants(newValue);
    setShowSuggestions(true);
  };

  const handleSelect = (participant: ExistingParticipant) => {
    onChange(participant.full_name);
    onSelect(participant);
    setShowSuggestions(false);
    clearSuggestions();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    // If already in DD/MM/YYYY format, return as is
    if (dateStr.includes("/")) return dateStr;
    // Convert from YYYY-MM-DD to DD/MM/YYYY
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <Input
        value={value}
        onChange={handleInputChange}
        onFocus={() => {
          if (suggestions.length > 0) setShowSuggestions(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      
      {showSuggestions && (suggestions.length > 0 || isSearching) && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ricerca...
            </div>
          ) : (
            <>
              <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border bg-muted/50">
                Clienti trovati - clicca per compilare
              </div>
              {suggestions.map((participant) => (
                <button
                  key={participant.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b border-border last:border-0"
                  onClick={() => handleSelect(participant)}
                >
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{participant.full_name}</div>
                      <div className="text-xs text-muted-foreground space-x-2">
                        {participant.date_of_birth && (
                          <span>Nato: {formatDate(participant.date_of_birth)}</span>
                        )}
                        {participant.place_of_birth && (
                          <span>• {participant.place_of_birth}</span>
                        )}
                      </div>
                      {participant.phone && (
                        <div className="text-xs text-muted-foreground">Tel: {participant.phone}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
