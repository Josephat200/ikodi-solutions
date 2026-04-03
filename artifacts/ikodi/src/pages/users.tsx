import { useState } from "react";
import { useListUsers, useCreateUser, useUpdateUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Redirect } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Edit2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function UsersPage() {
  const { user } = useAuth();
  if (user && user.role !== "super_admin") return <Redirect to="/" />;

  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({ username: "", password: "", fullName: "", email: "", role: "secretary" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useListUsers({});
  const create = useCreateUser({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }); setShowAdd(false); setForm({ username: "", password: "", fullName: "", email: "", role: "secretary" }); toast({ title: "User created" }); } } });
  const update = useUpdateUser({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }); setEditUser(null); toast({ title: "User updated" }); } } });

  const roleBadge = (role: string) => {
    if (role === "super_admin") return <Badge className="bg-purple-600 text-white">Super Admin</Badge>;
    if (role === "admin") return <Badge className="bg-primary text-primary-foreground">Admin</Badge>;
    return <Badge variant="outline">Secretary</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">System Users</h1><p className="text-muted-foreground text-sm mt-1">Manage staff accounts and permissions</p></div>
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add User</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : !users?.length ? (
            <div className="text-center py-12 text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No users found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Username</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Last Login</th>
                  <th className="py-3 px-4"></th>
                </tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{u.fullName}</td>
                      <td className="py-3 px-4 font-mono text-sm text-muted-foreground">{u.username}</td>
                      <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{u.email ?? "—"}</td>
                      <td className="py-3 px-4">{roleBadge(u.role)}</td>
                      <td className="py-3 px-4"><Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Active" : "Inactive"}</Badge></td>
                      <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground text-xs">{formatDate(u.lastLogin)}</td>
                      <td className="py-3 px-4"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditUser(u)}><Edit2 className="h-4 w-4" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create User Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Full Name *</Label><Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Jane Doe" /></div>
            <div className="space-y-1.5"><Label>Username *</Label><Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="janedoe" /></div>
            <div className="space-y-1.5"><Label>Password *</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@ikodi.org" /></div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="secretary">Secretary</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="super_admin">Super Admin</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button disabled={!form.username || !form.password || !form.fullName || create.isPending} onClick={() => create.mutate({ data: { username: form.username, password: form.password, fullName: form.fullName, email: form.email || null, role: form.role as any } })}>
              {create.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={v => !v && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User: {editUser?.fullName}</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={editUser.role} onValueChange={v => setEditUser((u: any) => ({ ...u, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="secretary">Secretary</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="super_admin">Super Admin</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editUser.isActive ? "active" : "inactive"} onValueChange={v => setEditUser((u: any) => ({ ...u, isActive: v === "active" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button disabled={update.isPending} onClick={() => update.mutate({ id: editUser.id, data: { role: editUser.role, isActive: editUser.isActive } })}>
              {update.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
