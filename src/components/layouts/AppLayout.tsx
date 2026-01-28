import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ContractExpiryBanner } from "@/components/ContractExpiryBanner";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="container py-6 px-8">
            <ContractExpiryBanner />
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
