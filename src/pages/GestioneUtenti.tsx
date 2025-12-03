import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, UserRole } from "@/hooks/use-user-role";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Users, Shield, UserCheck, UserX, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface UserWithRole {
  id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  email?: string;
  role: UserRole | null;
  role_id: string | null;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Amministratore",
  agente: "Agente",
  accompagnatore: "Accompagnatore",
  cliente: "Cliente",
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-red-500/10 text-red-700 border-red-200",
  agente: "bg-blue-500/10 text-blue-700 border-blue-200",
  accompagnatore: "bg-green-500/10 text-green-700 border-green-200",
  cliente: "bg-gray-500/10 text-gray-700 border-gray-200",
};

export default function GestioneUtenti() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/");
      return;
    }
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin, roleLoading, navigate]);

  const loadUsers = async () => {
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          full_name: profile.full_name,
          phone: profile.phone,
          created_at: profile.created_at,
          role: userRole?.role as UserRole | null,
          role_id: userRole?.id || null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Errore caricamento utenti:", error);
      toast.error("Errore nel caricamento degli utenti");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole | "none") => {
    setUpdating(userId);
    try {
      const user = users.find((u) => u.id === userId);
      
      if (newRole === "none") {
        // Remove role
        if (user?.role_id) {
          const { error } = await supabase
            .from("user_roles")
            .delete()
            .eq("id", user.role_id);
          if (error) throw error;
        }
      } else if (user?.role_id) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("id", user.role_id);
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole });
        if (error) throw error;
      }

      toast.success("Ruolo aggiornato con successo");
      loadUsers();
    } catch (error) {
      console.error("Errore aggiornamento ruolo:", error);
      toast.error("Errore nell'aggiornamento del ruolo");
    } finally {
      setUpdating(null);
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const usersWithRole = users.filter((u) => u.role);
  const usersWithoutRole = users.filter((u) => !u.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Gestione Utenti
        </h1>
        <p className="text-muted-foreground mt-1">
          Autorizza e gestisci gli accessi degli utenti registrati
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Utenti</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Autorizzati</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{usersWithRole.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Attesa</CardTitle>
            <UserX className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{usersWithoutRole.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users without role (pending) */}
      {usersWithoutRole.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <Shield className="h-5 w-5" />
              Utenti in Attesa di Autorizzazione ({usersWithoutRole.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead>Registrato il</TableHead>
                  <TableHead>Azione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersWithoutRole.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.phone || "-"}</TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), "dd MMM yyyy", { locale: it })}
                    </TableCell>
                    <TableCell>
                      <Select
                        onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                        disabled={updating === user.id}
                      >
                        <SelectTrigger className="w-[180px]">
                          {updating === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SelectValue placeholder="Assegna ruolo..." />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Amministratore</SelectItem>
                          <SelectItem value="agente">Agente</SelectItem>
                          <SelectItem value="accompagnatore">Accompagnatore</SelectItem>
                          <SelectItem value="cliente">Cliente</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All users */}
      <Card>
        <CardHeader>
          <CardTitle>Tutti gli Utenti</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead>Ruolo Attuale</TableHead>
                <TableHead>Registrato il</TableHead>
                <TableHead>Modifica Ruolo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.phone || "-"}</TableCell>
                  <TableCell>
                    {user.role ? (
                      <Badge variant="outline" className={ROLE_COLORS[user.role]}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                        Non autorizzato
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.created_at), "dd MMM yyyy", { locale: it })}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role || "none"}
                      onValueChange={(value) => handleRoleChange(user.id, value as UserRole | "none")}
                      disabled={updating === user.id}
                    >
                      <SelectTrigger className="w-[180px]">
                        {updating === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nessun ruolo</SelectItem>
                        <SelectItem value="admin">Amministratore</SelectItem>
                        <SelectItem value="agente">Agente</SelectItem>
                        <SelectItem value="accompagnatore">Accompagnatore</SelectItem>
                        <SelectItem value="cliente">Cliente</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
