import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Pricing from "@/pages/Pricing";
import RequestDemo from "@/pages/RequestDemo";
import AdminDashboard from "@/pages/AdminDashboard";
import AuditLogPage from "@/pages/AuditLog";
import Login from "@/pages/Login";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import Compliance from "@/pages/Compliance";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/request-demo" component={RequestDemo} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/audit-log" component={AuditLogPage} />
      <Route path="/login" component={Login} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/compliance" component={Compliance} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
