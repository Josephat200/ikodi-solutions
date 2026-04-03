import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { HeartHandshake, Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { user, setUser } = useAuth();
  const login = useLogin();
  const { toast } = useToast();

  if (user) {
    return <Redirect to="/" />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    login.mutate({
      data: { username, password }
    }, {
      onSuccess: (data) => {
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
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary p-4 rounded-2xl shadow-lg mb-4 text-primary-foreground">
            <HeartHandshake className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-bold text-foreground text-center">IKODI</h1>
          <p className="text-muted-foreground mt-2 text-center">Student Sponsorship Management System</p>
        </div>

        <Card className="border-border shadow-xl">
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
              <CardDescription>
                Enter your credentials to access the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  placeholder="admin" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={login.isPending}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={login.isPending}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={login.isPending || !username || !password}
              >
                {login.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign In
              </Button>
              
              <div className="bg-muted/50 p-3 rounded-md border border-border flex items-start gap-3 text-sm text-muted-foreground w-full">
                <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                <p>Use your system-generated credentials provided by the IT administrator.</p>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
