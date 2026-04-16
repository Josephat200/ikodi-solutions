import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Lock, Settings as SettingsIcon, Users, KeyRound, Copy, Check, Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export default function Settings() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const normalizedRole = user?.role;
  const isSuperAdmin = normalizedRole === "admin";

  const [profileForm, setProfileForm] = useState({ fullName: user?.fullName ?? "", email: user?.email ?? "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [copied, setCopied] = useState(false);

  // Super admin credential management
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCredentialDialog, setShowCredentialDialog] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newStatus, setNewStatus] = useState("active");
  const [resetResult, setResetResult] = useState<{ username?: string; password?: string } | null>(null);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: () => apiFetch("/api/users"),
    enabled: isSuperAdmin,
  });

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

  const handleOpenCredentialDialog = (u: User) => {
    setSelectedUser(u);
    setNewUsername(u.username);
    setNewStatus(u.isActive ? "active" : "inactive");
    setNewPassword("");
    setResetResult(null);
    setShowCredentialDialog(true);
  };

  const updateUserCredentials = useMutation({
    mutationFn: (data: object) =>
      selectedUser ? apiFetch(`/api/users/${selectedUser.id}`, { method: "PUT", body: JSON.stringify(data) }) : Promise.reject(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User credentials updated" });
      setShowCredentialDialog(false);
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const resetUserPassword = useMutation({
    mutationFn: (password?: string) =>
      selectedUser ? apiFetch(`/api/users/${selectedUser.id}/reset-password`, { method: "PUT", body: JSON.stringify({ newPassword: password || undefined }) }) : Promise.reject(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setResetResult(data);
    },
    onError: (e: Error) => toast({ title: "Reset failed", description: e.message, variant: "destructive" }),
  });

  const handleSaveCredentials = () => {
    if (!selectedUser || !newUsername.trim()) {
      toast({ title: "Username cannot be empty", variant: "destructive" });
      return;
    }

    const updates: any = {
      username: newUsername.trim(),
      isActive: newStatus === "active",
    };

    if (newPassword.trim()) {
      resetUserPassword.mutate(newPassword.trim());
    } else {
      updateUserCredentials.mutate(updates);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const roleBadge = (role: string) => {
    if (role === "program_officer") return <Badge className="bg-blue-600 text-white">Program Officer</Badge>;
    if (role === "finance_officer") return <Badge className="bg-emerald-600 text-white">Finance Officer</Badge>;
    if (role === "sponsor_portal") return <Badge className="bg-amber-600 text-white">Sponsor Portal</Badge>;
    if (role === "viewer") return <Badge variant="outline">Viewer / Read-only</Badge>;
    if (role === "admin") return <Badge className="bg-primary text-primary-foreground">Admin</Badge>;
    return <Badge variant="outline">Unknown</Badge>;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and system preferences</p>
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

      {isSuperAdmin && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" />System User Login Control</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Only Super Admins can modify user credentials and access status.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">User</th>
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Username</th>
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground hidden md:table-cell">Status</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Action</th>
                </tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-border/50">
                      <td className="py-2 px-3 font-medium">{u.fullName}</td>
                      <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{u.username}</td>
                      <td className="py-2 px-3 hidden md:table-cell"><Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Active" : "Locked"}</Badge></td>
                      <td className="py-2 px-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => handleOpenCredentialDialog(u)}>
                          <KeyRound className="h-3.5 w-3.5 mr-1" />
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credential Management Dialog */}
      <Dialog open={showCredentialDialog} onOpenChange={v => !v && setShowCredentialDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Manage Login: {selectedUser?.fullName}</DialogTitle></DialogHeader>

          {!resetResult ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="username" />
              </div>

              <div className="space-y-1.5">
                <Label>Account Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Allow login)</SelectItem>
                    <SelectItem value="inactive">Locked (Deny login)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Reset Password (optional)</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPass(p => !p)}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCredentialDialog(false)}>Cancel</Button>
                <Button onClick={handleSaveCredentials} disabled={newPassword ? resetUserPassword.isPending : updateUserCredentials.isPending}>
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              {resetResult.password && (
                <>
                  <p className="text-sm text-muted-foreground">New password was generated:</p>
                  <div className="bg-muted/50 p-4 rounded-lg border border-border font-mono text-center text-lg font-bold text-primary">{resetResult.password}</div>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => copyToClipboard(resetResult.password ?? "")}
                  >
                    {copied ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? "Copied!" : "Copy Password"}
                  </Button>
                </>
              )}
              {!resetResult.password && (
                <p className="text-sm text-muted-foreground">Login credentials updated successfully.</p>
              )}
              <DialogFooter>
                <Button onClick={() => setShowCredentialDialog(false)}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
