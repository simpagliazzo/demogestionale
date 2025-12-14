import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type PermissionType = 
  | "manage_trips"
  | "delete_trips"
  | "manage_participants"
  | "manage_payments"
  | "manage_bus"
  | "manage_carriers"
  | "view_prices"
  | "manage_hotels"
  | "view_activity_logs";

export const PERMISSION_LABELS: Record<PermissionType, string> = {
  manage_trips: "Gestione Viaggi",
  delete_trips: "Eliminazione Viaggi",
  manage_participants: "Gestione Partecipanti",
  manage_payments: "Gestione Pagamenti",
  manage_bus: "Gestione Bus",
  manage_carriers: "Gestione Vettori",
  view_prices: "Visualizza Prezzi",
  manage_hotels: "Gestione Hotel",
  view_activity_logs: "Visualizza Log Attività",
};

export const ALL_PERMISSIONS: PermissionType[] = [
  "manage_trips",
  "delete_trips",
  "manage_participants",
  "manage_payments",
  "manage_bus",
  "manage_carriers",
  "view_prices",
  "manage_hotels",
  "view_activity_logs",
];

export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<PermissionType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        // Prima ottieni il ruolo dell'utente
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (roleError || !roleData) {
          setPermissions([]);
          setLoading(false);
          return;
        }

        // Poi ottieni i permessi per quel ruolo
        const { data: permissionsData, error: permissionsError } = await supabase
          .from("role_permissions")
          .select("permission")
          .eq("role", roleData.role);

        if (permissionsError) {
          console.error("Errore caricamento permessi:", permissionsError);
          setPermissions([]);
        } else {
          setPermissions(permissionsData?.map(p => p.permission as PermissionType) || []);
        }
      } catch (err) {
        console.error("Errore:", err);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  const hasPermission = (permission: PermissionType): boolean => {
    return permissions.includes(permission);
  };

  return { 
    permissions, 
    loading, 
    hasPermission,
    canManageTrips: permissions.includes("manage_trips"),
    canDeleteTrips: permissions.includes("delete_trips"),
    canManageParticipants: permissions.includes("manage_participants"),
    canManagePayments: permissions.includes("manage_payments"),
    canManageBus: permissions.includes("manage_bus"),
    canManageCarriers: permissions.includes("manage_carriers"),
    canViewPrices: permissions.includes("view_prices"),
    canManageHotels: permissions.includes("manage_hotels"),
    canViewActivityLogs: permissions.includes("view_activity_logs"),
  };
};

// Funzione per caricare i permessi di un ruolo specifico
export const getRolePermissions = async (role: "admin" | "agente" | "accompagnatore" | "cliente"): Promise<PermissionType[]> => {
  const { data, error } = await supabase
    .from("role_permissions")
    .select("permission")
    .eq("role", role);

  if (error) {
    console.error("Errore caricamento permessi ruolo:", error);
    return [];
  }

  return data?.map(p => p.permission as PermissionType) || [];
};

// Funzione per aggiornare i permessi di un ruolo
export const updateRolePermissions = async (
  role: "admin" | "agente" | "accompagnatore" | "cliente", 
  permissions: PermissionType[]
): Promise<boolean> => {
  try {
    // Elimina tutti i permessi esistenti per il ruolo
    const { error: deleteError } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role", role);

    if (deleteError) throw deleteError;

    // Inserisci i nuovi permessi
    if (permissions.length > 0) {
      const permissionsToInsert = permissions.map(permission => ({ 
        role: role as "admin" | "agente" | "accompagnatore" | "cliente", 
        permission: permission as "delete_trips" | "manage_bus" | "manage_carriers" | "manage_hotels" | "manage_participants" | "manage_payments" | "manage_trips" | "view_activity_logs" | "view_prices"
      }));
      
      const { error: insertError } = await supabase
        .from("role_permissions")
        .insert(permissionsToInsert);

      if (insertError) throw insertError;
    }

    return true;
  } catch (error) {
    console.error("Errore aggiornamento permessi:", error);
    return false;
  }
};
