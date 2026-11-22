import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RequireStaff } from "@/components/RequireStaff";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Staff pages pull in heavy libraries (charts, QR scanner): load them on demand
const Verify = lazy(() => import("./pages/Verify"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminScan = lazy(() => import("./pages/AdminScan"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AgentPerformance = lazy(() => import("./pages/AgentPerformance"));
const AdminTickets = lazy(() => import("./pages/AdminTickets"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/scan" element={<RequireStaff><AdminScan /></RequireStaff>} />
            <Route path="/admin/dashboard" element={<RequireStaff><AdminDashboard /></RequireStaff>} />
            <Route path="/admin/performance" element={<RequireStaff><AgentPerformance /></RequireStaff>} />
            <Route path="/admin/tickets" element={<RequireStaff adminOnly><AdminTickets /></RequireStaff>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
