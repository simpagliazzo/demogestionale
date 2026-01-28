import { LayoutDashboard, MapPin, Users, DollarSign, Bus, UserCircle, LogOut, Plane, Archive, FileText, AlertTriangle, UserCheck, Settings, ScrollText } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/lib/auth-context";
import { useUserRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const {
    signOut,
    profile
  } = useAuth();
  const {
    isAdmin,
    isAgent,
    isSuperAdmin
  } = useUserRole();
  
  const mainItems = [{
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard
  }, {
    title: "Viaggi",
    url: "/viaggi",
    icon: MapPin
  }, {
    title: "Archivio Viaggi",
    url: "/archivio",
    icon: Archive
  }, {
    title: "Partecipanti",
    url: "/partecipanti",
    icon: Users
  }];
  
  const managementItems = [{
    title: "Pagamenti",
    url: "/pagamenti",
    icon: DollarSign
  }, {
    title: "Accompagnatori e Guide",
    url: "/accompagnatori-guide",
    icon: UserCheck
  }, {
    title: "Posti Bus",
    url: "/bus",
    icon: Bus
  }, {
    title: "Vettori Bus",
    url: "/vettori",
    icon: Bus
  }];
  
  // Voce solo per super admin
  const superAdminItems = [{
    title: "Gestione Contratto",
    url: "/contratto",
    icon: ScrollText
  }];

  const adminItems = [{
    title: "Gestione Utenti",
    url: "/utenti",
    icon: Users
  }, {
    title: "Log Attività",
    url: "/log",
    icon: FileText
  }, {
    title: "Blacklist",
    url: "/blacklist",
    icon: AlertTriangle
  }, {
    title: "Impostazioni",
    url: "/impostazioni",
    icon: Settings
  }];
  
  return <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
            <Plane className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-sidebar-foreground">Gladiatours
Manager</h2>
            <p className="text-xs text-sidebar-foreground/60">Gestionale Viaggi                    © Ischianonsolohotel</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principale</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className="flex items-center gap-3" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isAdmin || isAgent) && <SidebarGroup>
            <SidebarGroupLabel>Gestione</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementItems.map(item => <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className="flex items-center gap-3" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}

        {isAdmin && <SidebarGroup>
            <SidebarGroupLabel>Amministrazione</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map(item => <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className="flex items-center gap-3" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}

        {isSuperAdmin && <SidebarGroup>
            <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superAdminItems.map(item => <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className="flex items-center gap-3" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-3 text-sm text-sidebar-foreground/80">
            <UserCircle className="h-5 w-5" />
            <div className="truncate">
              <p className="font-medium truncate">{profile?.full_name || "Operatore"}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Esci
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>;
}