import {
  LayoutDashboard,
  MapPin,
  Users,
  DollarSign,
  Bus,
  UserCircle,
  LogOut,
  Plane,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/lib/auth-context";
import { useUserRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { signOut, user } = useAuth();
  const { isAdmin, isAgent } = useUserRole();

  const mainItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Viaggi", url: "/viaggi", icon: MapPin },
    { title: "Partecipanti", url: "/partecipanti", icon: Users },
  ];

  const managementItems = [
    { title: "Pagamenti", url: "/pagamenti", icon: DollarSign, requiresStaff: true },
    { title: "Posti Bus", url: "/bus", icon: Bus, requiresStaff: true },
  ];

  const adminItems = [
    { title: "Vettori Bus", url: "/vettori", icon: Bus, requiresAdmin: true },
    { title: "Gestione Utenti", url: "/utenti", icon: Users, requiresAdmin: true },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
            <Plane className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-sidebar-foreground">
              TravelManager
            </h2>
            <p className="text-xs text-sidebar-foreground/60">Gestionale Viaggi</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principale</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isAdmin || isAgent) && (
          <SidebarGroup>
            <SidebarGroupLabel>Gestione</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Amministrazione</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-3 text-sm text-sidebar-foreground/80">
            <UserCircle className="h-5 w-5" />
            <span className="truncate">{user?.email}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Esci
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
