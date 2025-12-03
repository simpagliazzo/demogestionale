import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebouncedCallback } from "@/hooks/use-debounce";

export interface ExistingParticipant {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  place_of_birth: string | null;
  email: string | null;
  phone: string | null;
}

export function useParticipantSearch() {
  const [suggestions, setSuggestions] = useState<ExistingParticipant[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchParticipants = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search for unique participants by name (get distinct records)
      const { data, error } = await supabase
        .from("participants")
        .select("id, full_name, date_of_birth, place_of_birth, email, phone")
        .ilike("full_name", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Remove duplicates by full_name (keep most recent)
      const uniqueMap = new Map<string, ExistingParticipant>();
      data?.forEach((p) => {
        const key = p.full_name.toLowerCase().trim();
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, p);
        }
      });

      setSuggestions(Array.from(uniqueMap.values()));
    } catch (error) {
      console.error("Errore ricerca partecipanti:", error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const debouncedSearch = useDebouncedCallback(searchParticipants, 300);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isSearching,
    searchParticipants: debouncedSearch,
    clearSuggestions,
  };
}
