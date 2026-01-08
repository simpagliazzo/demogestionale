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
import ArchivioViaggi from "./pages/ArchivioViaggi";
import TripDetails from "./pages/TripDetails";
import HotelList from "./pages/HotelList";
import CompanionList from "./pages/CompanionList";
import Partecipanti from "./pages/Partecipanti";
import Pagamenti from "./pages/Pagamenti";
import BusPage from "./pages/Bus";
import Vettori from "./pages/Vettori";
import GestioneUtenti from "./pages/GestioneUtenti";
import LogAttivita from "./pages/LogAttivita";
import Preventivi from "./pages/Preventivi";
import QuotePublic from "./pages/QuotePublic";
import Blacklist from "./pages/Blacklist";
import UploadDocumenti from "./pages/UploadDocumenti";
import ScegliPosto from "./pages/ScegliPosto";
import AccompagnatoriGuide from "./pages/AccompagnatoriGuide";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

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
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/viaggi" element={<Viaggi />} />
              <Route path="/archivio" element={<ArchivioViaggi />} />
              <Route path="/viaggi/:id" element={<TripDetails />} />
              <Route path="/partecipanti" element={<Partecipanti />} />
              <Route path="/pagamenti" element={<Pagamenti />} />
              <Route path="/bus" element={<BusPage />} />
              <Route path="/vettori" element={<Vettori />} />
              <Route path="/utenti" element={<GestioneUtenti />} />
              <Route path="/log" element={<LogAttivita />} />
              <Route path="/preventivi" element={<Preventivi />} />
              <Route path="/blacklist" element={<Blacklist />} />
              <Route path="/accompagnatori-guide" element={<AccompagnatoriGuide />} />
            </Route>
            <Route path="/trips/:id/hotel-list" element={<ProtectedRoute><HotelList /></ProtectedRoute>} />
            <Route path="/trips/:id/companion-list" element={<ProtectedRoute><CompanionList /></ProtectedRoute>} />
            <Route path="/preventivo/:id" element={<QuotePublic />} />
            <Route path="/upload-documenti/:token" element={<UploadDocumenti />} />
            <Route path="/scegli-posto/:token" element={<ScegliPosto />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
