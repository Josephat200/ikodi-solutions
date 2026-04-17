import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Students from "@/pages/students";
import StudentDetail from "@/pages/student-detail";
import StudentResultsPage from "@/pages/student-results";
import Sponsors from "@/pages/sponsors";
import SponsorDetail from "@/pages/sponsor-detail";
import Sponsorships from "@/pages/sponsorships";
import Payments from "@/pages/payments";
import Schools from "@/pages/schools";
import Communications from "@/pages/communications";
import Reports from "@/pages/reports";
import AuditLogs from "@/pages/audit-logs";
import Users from "@/pages/users";
import Settings from "@/pages/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function ProtectedRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/students" component={Students} />
        <Route path="/students/:id" component={StudentDetail} />
        <Route path="/students/:id/results" component={StudentResultsPage} />
        <Route path="/sponsors" component={Sponsors} />
        <Route path="/sponsors/:id" component={SponsorDetail} />
        <Route path="/sponsorships" component={Sponsorships} />
        <Route path="/payments" component={Payments} />
        <Route path="/schools" component={Schools} />
        <Route path="/communications" component={Communications} />
        <Route path="/reports" component={Reports} />
        <Route path="/audit-logs" component={AuditLogs} />
        <Route path="/users" component={Users} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Login} />
      <Route component={ProtectedRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
