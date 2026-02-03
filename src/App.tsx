import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CompanySelectorProvider } from "@/hooks/useCompanySelector";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Exceptions from "./pages/Exceptions";
import Reports from "./pages/Reports";
import BotRuns from "./pages/BotRuns";
import Emails from "./pages/Emails";
import Bots from "./pages/Bots";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CompanySelectorProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/exceptions" element={<Exceptions />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/bot-runs" element={<BotRuns />} />
              <Route path="/emails" element={<Emails />} />
              <Route path="/bots" element={<Bots />} />
              <Route path="/settings" element={<Settings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CompanySelectorProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
