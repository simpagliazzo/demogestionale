import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

interface LogActivityParams {
  actionType: "login" | "logout" | "create" | "update" | "delete";
  entityType?: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown>;
}

export function useActivityLog() {
  const { user } = useAuth();

  const logActivity = async ({
    actionType,
    entityType,
    entityId,
    entityName,
    details,
  }: LogActivityParams) => {
    if (!user) return;

    try {
      await supabase.from("activity_logs").insert([{
        user_id: user.id,
        action_type: actionType,
        entity_type: entityType || null,
        entity_id: entityId || null,
        entity_name: entityName || null,
        details: details ? JSON.parse(JSON.stringify(details)) : null,
        user_agent: navigator.userAgent,
      }]);
    } catch (error) {
      console.error("Errore nel logging attività:", error);
    }
  };

  const logLogin = async () => {
    await logActivity({
      actionType: "login",
      details: { timestamp: new Date().toISOString() },
    });
  };

  const logLogout = async () => {
    await logActivity({
      actionType: "logout",
      details: { timestamp: new Date().toISOString() },
    });
  };

  const logCreate = async (
    entityType: string,
    entityId: string,
    entityName: string,
    details?: Record<string, unknown>
  ) => {
    await logActivity({
      actionType: "create",
      entityType,
      entityId,
      entityName,
      details,
    });
  };

  const logUpdate = async (
    entityType: string,
    entityId: string,
    entityName: string,
    details?: Record<string, unknown>
  ) => {
    await logActivity({
      actionType: "update",
      entityType,
      entityId,
      entityName,
      details,
    });
  };

  const logDelete = async (
    entityType: string,
    entityId: string,
    entityName: string
  ) => {
    await logActivity({
      actionType: "delete",
      entityType,
      entityId,
      entityName,
    });
  };

  return {
    logActivity,
    logLogin,
    logLogout,
    logCreate,
    logUpdate,
    logDelete,
  };
}
