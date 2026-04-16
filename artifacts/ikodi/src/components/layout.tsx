import { useAuth } from "@/lib/auth";
import { Redirect, useLocation, Link } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  HeartHandshake,
  Wallet, 
  CreditCard, 
  School, 
  MessageSquare, 
  FileText, 
  ShieldAlert, 
  Settings,
  LogOut,
  Menu,
  Printer
} from "lucide-react";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { canAccessPath, getDefaultPathForRole, getRoleNavigation, normalizeRole } from "@/lib/rbac";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, setUser } = useAuth();
  const [location] = useLocation();
  const logout = useLogout();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!canAccessPath(user.role, location)) {
    return <Redirect to={getDefaultPathForRole(user.role)} />;
  }

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setUser(null);
      }
    });
  };

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/students", label: "Students", icon: Users },
    { href: "/sponsors", label: "Sponsors", icon: HeartHandshake },
    { href: "/sponsorships", label: "Sponsorships", icon: Wallet },
    { href: "/payments", label: "Payments", icon: CreditCard },
    { href: "/schools", label: "Schools", icon: School },
    { href: "/communications", label: "Communications", icon: MessageSquare },
    { href: "/reports", label: "Reports", icon: FileText },
  ];

  const adminItems = [
    { href: "/audit-logs", label: "Audit Logs", icon: ShieldAlert },
    { href: "/users", label: "Users", icon: Users },
  ];

  const normalizedRole = normalizeRole(user.role);
  const visibleNav = getRoleNavigation(user.role);
  const canViewAudit = normalizedRole === "admin";
  const canManageUsers = normalizedRole === "admin";

  const closeSidebar = () => setSidebarOpen(false);
  const handlePrint = () => window.print();

  return (
    <>
      <div className="global-watermark" aria-hidden="true">
        <div className="global-watermark-pattern"></div>
        <div className="global-watermark-cover">
          <div className="global-watermark-cover-stamp">
            <img src="/ikodi-logo.jpeg" alt="IKODI" />
            <span>IKODI I AM WITH YOU</span>
          </div>
        </div>
        <div className="global-watermark-row row-a"><img src="/ikodi-logo.jpeg" alt="IKODI" /><span>IKODI I AM WITH YOU</span></div>
        <div className="global-watermark-row row-b"><img src="/ikodi-logo.jpeg" alt="IKODI" /><span>IKODI I AM WITH YOU</span></div>
        <div className="global-watermark-row row-c"><img src="/ikodi-logo.jpeg" alt="IKODI" /><span>IKODI I AM WITH YOU</span></div>
      </div>

      <div className="min-h-screen bg-background flex flex-col md:flex-row app-shell relative z-[1]">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-primary text-primary-foreground no-print">
        <div className="flex items-center gap-2 font-bold text-xl">
          <img src="/ikodi-logo.jpeg" alt="IKODI Logo" className="h-8 w-8 rounded" />
          <span>IKODI</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-primary-foreground hover:text-primary-foreground/80 hover:bg-primary/90">
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`${sidebarOpen ? "block" : "hidden"} md:block w-full md:w-64 bg-card border-r border-border shrink-0 flex flex-col fixed md:sticky top-0 h-screen z-40 no-print app-shell-sidebar`}>
        <div className="p-6 hidden md:flex items-center gap-3">
          <img src="/ikodi-logo.jpeg" alt="IKODI Logo" className="h-12 w-12 rounded-lg" />
          <div>
            <h1 className="font-bold text-xl text-primary tracking-tight">IKODI</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sponsorship Sys</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-4 md:hidden">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Navigation</p>
          </div>
          <nav className="space-y-1 px-3">
            {navItems.filter((item) => visibleNav.includes(item.href)).map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <div 
                    onClick={closeSidebar}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                    {item.label}
                  </div>
                </Link>
              );
            })}

            {(canViewAudit || canManageUsers) && (
              <>
                <div className="pt-6 pb-2 px-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Administration</p>
                </div>
                {adminItems
                  .filter((item) => (item.href === "/audit-logs" ? canViewAudit : canManageUsers))
                  .map((item) => {
                  const isActive = location === item.href || location.startsWith(item.href);
                  return (
                    <Link key={item.href} href={item.href}>
                      <div 
                        onClick={closeSidebar}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                          isActive 
                            ? "bg-primary/10 text-primary" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                        {item.label}
                      </div>
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user.fullName || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user.role || "unknown"}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Link href="/settings">
              <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={closeSidebar}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
            <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 app-shell-main">
        <div className="no-print px-4 md:px-8 pt-4 md:pt-6 flex justify-end">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Page
          </Button>
        </div>

        <div className="print-only page-header-print hidden">
          <div className="flex items-center gap-3 mb-2">
            <img src="/ikodi-logo.jpeg" alt="IKODI Logo" className="h-16 w-16 rounded" />
            <div>
              <h1 className="text-2xl font-bold text-[#0F766E]">IKODI</h1>
              <p className="text-sm text-gray-600">Student Sponsorship Management System</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">Printed on: {new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto app-shell-content">
          {children}
        </main>

        <footer className="no-print border-t border-border bg-card/70 px-4 py-3 text-center text-xs text-muted-foreground md:px-8">
          Copyright © 2026 IKODI. Powered by, GJT Solutions Limited
        </footer>

        <div className="print-only page-footer-print hidden">
          <p>IKODI All rights reserved {new Date().getFullYear()}.</p>
        </div>
      </div>
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden no-print" 
          onClick={closeSidebar}
        />
      )}
      </div>
    </>
  );
}
