import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Viaggi from "./pages/Viaggi";
import TripDetails from "./pages/TripDetails";
import Partecipanti from "./pages/Partecipanti";
import Vettori from "./pages/Vettori";
import BusTypes from "./pages/BusTypes";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import HotelList from "./components/HotelList";
import CompanionList from "./components/CompanionList";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/viaggi/:id/hotel-list" element={<ProtectedRoute><HotelList /></ProtectedRoute>} />
            <Route path="/viaggi/:id/companion-list" element={<ProtectedRoute><CompanionList /></ProtectedRoute>} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/viaggi" element={<Viaggi />} />
              <Route path="/viaggi/:id" element={<TripDetails />} />
              <Route path="/partecipanti" element={<Partecipanti />} />
              <Route path="/vettori" element={<Vettori />} />
              <Route path="/tipi-bus" element={<BusTypes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
