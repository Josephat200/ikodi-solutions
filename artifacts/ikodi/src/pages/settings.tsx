import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Settings as SettingsIcon } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiPut(path: string, data: object) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

export default function Settings() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();

  const [profileForm, setProfileForm] = useState({ fullName: user?.fullName ?? "", email: user?.email ?? "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileSave = async () => {
    if (!profileForm.fullName) return;
    setSavingProfile(true);
    try {
      const updated = await apiPut("/api/auth/me/profile", { fullName: profileForm.fullName, email: profileForm.email || null });
      setUser(updated);
      toast({ title: "Profile updated successfully" });
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      await apiPut("/api/auth/me/password", { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password changed successfully" });
    } catch (e: any) {
      toast({ title: "Failed to change password", description: e.message, variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  const roleBadge = (role: string) => {
    if (role === "super_admin") return <Badge className="bg-purple-600 text-white">Super Admin</Badge>;
    if (role === "admin") return <Badge className="bg-primary text-primary-foreground">Admin</Badge>;
    return <Badge variant="outline">Secretary</Badge>;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><SettingsIcon className="h-4 w-4 text-primary" />Account Information</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-border/50"><span className="text-muted-foreground">Username</span><span className="font-mono font-medium">{user?.username}</span></div>
          <div className="flex justify-between items-center py-2 border-b border-border/50"><span className="text-muted-foreground">Role</span>{user && roleBadge(user.role)}</div>
          <div className="flex justify-between items-center py-2"><span className="text-muted-foreground">Status</span><Badge variant="default">Active</Badge></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" />Edit Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input value={profileForm.fullName} onChange={e => setProfileForm(f => ({ ...f, fullName: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Email Address</Label>
            <Input type="email" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} placeholder="you@ikodi.org" />
          </div>
          <Button onClick={handleProfileSave} disabled={!profileForm.fullName || savingProfile}>
            {savingProfile ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4 text-primary" />Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label>Current Password *</Label><Input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>New Password *</Label><Input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Min 8 characters" /></div>
          <div className="space-y-1.5"><Label>Confirm New Password *</Label><Input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} /></div>
          <Button onClick={handlePasswordChange} disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || savingPassword}>
            {savingPassword ? "Changing..." : "Change Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
