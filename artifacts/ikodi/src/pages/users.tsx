import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Edit2, KeyRound, Trash2, Eye, EyeOff, Copy, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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

const EMPTY_FORM = { username: "", password: "", fullName: "", email: "", role: "viewer", isActive: true };

function cleanUsername(v: string) { return v.toLowerCase().split("").filter(c => c !== " ").join(""); }

export default function UsersPage() {
  const { user: me } = useAuth();
  const normalizedRole = me?.role;
  if (normalizedRole && normalizedRole !== "admin") return <Redirect to="/" />;

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<User | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [autoGenerateUsername, setAutoGenerateUsername] = useState(true);
  const [editForm, setEditForm] = useState({ username: "", fullName: "", email: "", role: "viewer", isActive: true });
  const [newPassword, setNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [generatedCred, setGeneratedCred] = useState<{ username: string; password: string } | null>(null);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: () => apiFetch("/api/users"),
  });

  const createUser = useMutation({
    mutationFn: (data: object) => apiFetch("/api/users", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowAdd(false);
      if (data?.generatedPassword || data?.generatedUsername) {
        setGeneratedCred({ username: data.username, password: data.generatedPassword ?? "(manually set)" });
      } else {
        toast({ title: "User created successfully" });
      }
      setForm({ ...EMPTY_FORM });
      setAutoGenerateUsername(true);
    },
    onError: (e: Error) => toast({ title: "Failed to create user", description: e.message, variant: "destructive" }),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => apiFetch(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditUser(null);
      toast({ title: "User updated" });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const resetPassword = useMutation({
    mutationFn: ({ id, password }: { id: number; password?: string }) =>
      apiFetch(`/api/users/${id}/reset-password`, { method: "PUT", body: JSON.stringify({ newPassword: password || undefined }) }),
    onSuccess: (data) => {
      setResetTarget(null);
      setNewPassword("");
      if (data?.newPassword) {
        setResetResult(data.newPassword);
      } else {
        toast({ title: "Password reset successfully" });
      }
    },
    onError: (e: Error) => toast({ title: "Reset failed", description: e.message, variant: "destructive" }),
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowDeleteConfirm(null);
      toast({ title: "User deleted" });
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const roleBadge = (role: string) => {
    if (role === "program_officer") return <Badge className="bg-blue-600 text-white text-xs">Program Officer</Badge>;
    if (role === "finance_officer") return <Badge className="bg-emerald-600 text-white text-xs">Finance Officer</Badge>;
    if (role === "sponsor_portal") return <Badge className="bg-amber-600 text-white text-xs">Sponsor Portal</Badge>;
    if (role === "viewer") return <Badge variant="outline" className="text-xs">Viewer</Badge>;
    if (role === "admin") return <Badge className="bg-primary text-primary-foreground text-xs">Admin</Badge>;
    return <Badge variant="outline" className="text-xs">Unknown</Badge>;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditForm({ username: u.username, fullName: u.fullName, email: u.email ?? "", role: u.role, isActive: u.isActive });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Users</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage staff accounts, roles and login credentials</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add User</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: users.length, color: "text-foreground" },
          { label: "Active", value: users.filter(u => u.isActive).length, color: "text-primary" },
          { label: "Admins", value: users.filter(u => u.role === "admin").length, color: "text-blue-600" },
          { label: "Program Officers", value: users.filter(u => u.role === "program_officer").length, color: "text-indigo-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" />All System Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : !users.length ? (
            <div className="text-center py-12 text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No users found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Full Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Username</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Last Login</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">Actions</th>
                </tr></thead>
                <tbody>
                  {Array.isArray(users) && users.map(u => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium">{u.fullName}</td>
                      <td className="py-3 px-4 font-mono text-sm text-muted-foreground">{u.username}</td>
                      <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{u.email ?? "—"}</td>
                      <td className="py-3 px-4">{roleBadge(u.role)}</td>
                      <td className="py-3 px-4"><Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Active" : "Inactive"}</Badge></td>
                      <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground text-xs">{formatDate(u.lastLogin) || "Never"}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit user" onClick={() => openEdit(u)}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-600 hover:bg-amber-50" title="Reset password" onClick={() => setResetTarget(u)}><KeyRound className="h-3.5 w-3.5" /></Button>
                          {u.id !== me?.id && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete user" onClick={() => setShowDeleteConfirm(u)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAdd} onOpenChange={v => { setShowAdd(v); if (!v) setForm({ ...EMPTY_FORM }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create User Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Full Name *</Label><Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Jane Doe" /></div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Username</Label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={autoGenerateUsername} onChange={e => setAutoGenerateUsername(e.target.checked)} />
                  Auto-generate
                </label>
              </div>
              <Input
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: cleanUsername(e.target.value) }))}
                placeholder="janedoe"
                disabled={autoGenerateUsername}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password <span className="text-muted-foreground text-xs">(leave blank to auto-generate)</span></Label>
              <div className="relative">
                <Input type={showPass ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Leave blank to auto-generate" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPass(p => !p)}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@ikodi.org" /></div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="program_officer">Program Officer</SelectItem>
                  <SelectItem value="finance_officer">Finance Officer</SelectItem>
                  <SelectItem value="sponsor_portal">Sponsor (Portal)</SelectItem>
                  <SelectItem value="viewer">Viewer / Read-only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button disabled={!form.fullName || (!autoGenerateUsername && !form.username) || createUser.isPending} onClick={() => createUser.mutate({ username: autoGenerateUsername ? undefined : form.username, password: form.password || undefined, fullName: form.fullName, email: form.email || null, role: form.role })}>
              {createUser.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated Credentials Dialog */}
      <Dialog open={!!generatedCred} onOpenChange={v => !v && setGeneratedCred(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>User Created</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">A password was auto-generated. Share these credentials securely:</p>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2 font-mono text-sm border border-border">
              <div className="flex justify-between"><span className="text-muted-foreground">Username:</span><span className="font-bold">{generatedCred?.username}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Password:</span><span className="font-bold text-primary">{generatedCred?.password}</span></div>
            </div>
            <Button className="w-full" variant="outline" onClick={() => copyToClipboard(`Username: ${generatedCred?.username}\nPassword: ${generatedCred?.password}`)}>
              {copied ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied!" : "Copy to Clipboard"}
            </Button>
          </div>
          <DialogFooter><Button onClick={() => setGeneratedCred(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={v => !v && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit User: {editUser?.fullName}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Full Name *</Label><Input value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Username *</Label><Input value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: cleanUsername(e.target.value) }))} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="program_officer">Program Officer</SelectItem>
                  <SelectItem value="finance_officer">Finance Officer</SelectItem>
                  <SelectItem value="sponsor_portal">Sponsor (Portal)</SelectItem>
                  <SelectItem value="viewer">Viewer / Read-only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Account Status</Label>
              <Select value={editForm.isActive ? "active" : "inactive"} onValueChange={v => setEditForm(f => ({ ...f, isActive: v === "active" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive (Locked)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button disabled={!editForm.username || !editForm.fullName || updateUser.isPending}
              onClick={() => editUser && updateUser.mutate({ id: editUser.id, data: { fullName: editForm.fullName, username: editForm.username, email: editForm.email || null, role: editForm.role, isActive: editForm.isActive } })}>
              {updateUser.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={v => { if (!v) { setResetTarget(null); setNewPassword(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Resetting password for: <strong>{resetTarget?.fullName}</strong> (@{resetTarget?.username})</p>
            <div className="space-y-1.5">
              <Label>New Password <span className="text-muted-foreground text-xs">(leave blank to auto-generate)</span></Label>
              <div className="relative">
                <Input type={showPass ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to auto-generate" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPass(p => !p)}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetTarget(null); setNewPassword(""); }}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" disabled={resetPassword.isPending}
              onClick={() => resetTarget && resetPassword.mutate({ id: resetTarget.id, password: newPassword || undefined })}>
              {resetPassword.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Result Dialog */}
      <Dialog open={!!resetResult} onOpenChange={v => !v && setResetResult(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Password Reset</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">A new password was generated. Share it securely:</p>
            <div className="bg-muted/50 p-4 rounded-lg border border-border font-mono text-center text-lg font-bold text-primary">{resetResult}</div>
            <Button className="w-full" variant="outline" onClick={() => copyToClipboard(resetResult ?? "")}>
              {copied ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied!" : "Copy Password"}
            </Button>
          </div>
          <DialogFooter><Button onClick={() => setResetResult(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={v => !v && setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete User</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to permanently delete <strong>{showDeleteConfirm?.fullName}</strong>? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteUser.isPending} onClick={() => showDeleteConfirm && deleteUser.mutate(showDeleteConfirm.id)}>
              {deleteUser.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
