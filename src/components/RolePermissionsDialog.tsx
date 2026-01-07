import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { 
  PermissionType, 
  ALL_PERMISSIONS, 
  PERMISSION_LABELS,
  getRolePermissions,
  updateRolePermissions
} from "@/hooks/use-permissions";
import { UserRole } from "@/hooks/use-user-role";

interface RolePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: UserRole;
  roleName: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Amministratore",
  admin: "Amministratore",
  agente: "Agente",
  accompagnatore: "Accompagnatore",
  cliente: "Cliente",
};

export function RolePermissionsDialog({
  open,
  onOpenChange,
  role,
  roleName,
}: RolePermissionsDialogProps) {
  const [permissions, setPermissions] = useState<PermissionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadPermissions();
    }
  }, [open, role]);

  const loadPermissions = async () => {
    setLoading(true);
    const perms = await getRolePermissions(role);
    setPermissions(perms);
    setLoading(false);
  };

  const togglePermission = (permission: PermissionType) => {
    if (role === "admin" || role === "super_admin") {
      toast.error("I permessi dell'amministratore non possono essere modificati");
      return;
    }
    
    setPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSave = async () => {
    if (role === "admin" || role === "super_admin") {
      toast.error("I permessi dell'amministratore non possono essere modificati");
      return;
    }

    setSaving(true);
    const success = await updateRolePermissions(role, permissions);
    setSaving(false);

    if (success) {
      toast.success(`Permessi per ${roleName} aggiornati con successo`);
      onOpenChange(false);
    } else {
      toast.error("Errore nel salvataggio dei permessi");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Permessi: {roleName}</DialogTitle>
          <DialogDescription>
            {(role === "admin" || role === "super_admin")
              ? "L'amministratore ha tutti i permessi e non può essere modificato."
              : "Seleziona i permessi da assegnare a questo ruolo."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {ALL_PERMISSIONS.map((permission) => (
              <div key={permission} className="flex items-center space-x-3">
                <Checkbox
                  id={permission}
                  checked={permissions.includes(permission)}
                  onCheckedChange={() => togglePermission(permission)}
                  disabled={role === "admin" || role === "super_admin"}
                />
                <Label 
                  htmlFor={permission}
                  className={`cursor-pointer ${(role === "admin" || role === "super_admin") ? "text-muted-foreground" : ""}`}
                >
                  {PERMISSION_LABELS[permission]}
                </Label>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || role === "admin" || role === "super_admin"}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salva Permessi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
