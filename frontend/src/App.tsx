import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import type { UserRole } from "./contexts/AuthContext";
import { LanguageProvider } from "./i18n";
import { ThemeProvider } from "./contexts/ThemeContext";
import Attendee from "./pages/Attendee";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import OrganizerModule from "./pages/OrganizerModule";

const ORGANIZER_ROLES: UserRole[] = ["organizer", "admin", "staff"];

function RequireAuth({
  roles,
  component: Component,
}: {
  roles?: UserRole[];
  component: React.ComponentType;
}) {
  const { user } = useAuth();
  if (!user) return <Redirect to="/auth" />;
  if (roles && !roles.includes(user.role)) return <Redirect to="/" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={Auth} />
      <Route path="/attendee">
        <RequireAuth component={Attendee} />
      </Route>
      <Route path="/organizer">
        <RequireAuth roles={ORGANIZER_ROLES} component={Home} />
      </Route>
      <Route path="/organizer/:module">
        <RequireAuth roles={ORGANIZER_ROLES} component={OrganizerModule} />
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster position="bottom-right" />
              <Router />
            </TooltipProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
