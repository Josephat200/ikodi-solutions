import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getDefaultPathForRole } from "@/lib/rbac";

const DEMO_USERS = [
  {
    aliases: ["admin", "admin@ikodi.local", "system.administrator@ikodi.local"],
    password: "Admin@123456",
    fullName: "System Administrator",
    role: "admin" as const,
  },
  {
    aliases: ["program.officer@ikodi.local", "program.officer1@ikodi.local"],
    password: "Program@123456",
    fullName: "Program Officer",
    role: "program_officer" as const,
  },
  {
    aliases: ["finance.officer@ikodi.local", "finance.officer2@ikodi.local"],
    password: "Finance@123456",
    fullName: "Finance Officer",
    role: "finance_officer" as const,
  },
  {
    aliases: ["viewer@ikodi.local", "read.only3@ikodi.local"],
    password: "Viewer@123456",
    fullName: "Read Only Viewer",
    role: "viewer" as const,
  },
  {
    aliases: ["sponsorships@krcs.org", "sponsor.portal4@ikodi.local"],
    password: "Sponsor@123456",
    fullName: "Sponsor Portal User",
    role: "sponsor_portal" as const,
  },
] as const;

function buildLocalUser(username: string) {
  const normalizedUsername = username.trim().toLowerCase();
  const account = DEMO_USERS.find((item) =>
    item.aliases.some((alias) => alias.toLowerCase() === normalizedUsername),
  );

  if (!account) return null;

  return {
    id: account.role === "admin" ? 1 : account.role === "program_officer" ? 2 : account.role === "finance_officer" ? 3 : account.role === "viewer" ? 4 : 5,
    username: account.aliases[0],
    fullName: account.fullName,
    email: account.aliases[0],
    role: account.role,
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { user, setUser } = useAuth();
  const login = useLogin();
  const { toast } = useToast();

  if (user) {
    return <Redirect to={getDefaultPathForRole(user.role)} />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    const normalizedUsername = username.trim();
    const normalizedPassword = password.trim();

    login.mutate({
      data: { username: normalizedUsername, password: normalizedPassword }
    }, {
      onSuccess: (data: any) => {
        setUser(data.user);
      },
      onError: () => {
        toast({
          title: "Login Failed",
          description: "Invalid username or password.",
          variant: "destructive"
        });
      }
    });
  };

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

      <div className="relative z-[1] flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8">
      <Card className="w-full max-w-md rounded-2xl border border-zinc-300 bg-card shadow-xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="space-y-2 pb-4">
            <div className="flex items-center gap-4">
              <img src="/ikodi-logo.jpeg" alt="IKODI Logo" className="h-14 w-14 rounded-xl object-cover" />
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">IKODI Portal</p>
                <CardTitle className="text-3xl font-bold leading-none">Sign In</CardTitle>
              </div>
            </div>
            <CardDescription>Enter your credentials to access the system</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Username</Label>
              <Input
                id="username"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={login.isPending}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={login.isPending}
                required
                className="h-11"
              />
            </div>
          </CardContent>

          <CardFooter className="pt-2">
            <Button
              type="submit"
              className="h-11 w-full"
              disabled={login.isPending || !username || !password}
            >
              {login.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign In
            </Button>
          </CardFooter>
        </form>
      </Card>
      </div>
    </>
  );
}
