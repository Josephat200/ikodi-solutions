import { useState } from "react";
import { useListSponsors, useCreateSponsor, useDeleteSponsor, useUpdateSponsor, getListSponsorsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Eye, Trash2, Heart, Pencil } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { canManageSponsors } from "@/lib/rbac";

export default function Sponsors() {
  const { user } = useAuth();
  const canEditSponsors = canManageSponsors(user?.role);

  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingSponsorId, setEditingSponsorId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", type: "individual", email: "", phone: "", address: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sponsors, isLoading } = useListSponsors({ search: search || undefined });
  const createSponsor = useCreateSponsor({ mutation: {
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getListSponsorsQueryKey() });
      setShowAdd(false);
      setForm({ name: "", type: "individual", email: "", phone: "", address: "" });
      toast({ title: "Sponsor added successfully", description: `${data.name} was created.` });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || error?.message || "Failed to add sponsor";
      toast({ title: "Could not add sponsor", description: String(message), variant: "destructive" });
    },
  } });
  const deleteSponsor = useDeleteSponsor({ mutation: {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListSponsorsQueryKey() });
      toast({ title: "Sponsor removed" });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || error?.message || "Failed to delete sponsor";
      toast({ title: "Could not delete sponsor", description: String(message), variant: "destructive" });
    },
  } });
  const updateSponsor = useUpdateSponsor({ mutation: {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListSponsorsQueryKey() });
      setShowEdit(false);
      setEditingSponsorId(null);
      setForm({ name: "", type: "individual", email: "", phone: "", address: "" });
      toast({ title: "Sponsor updated" });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || error?.message || "Failed to update sponsor";
      toast({ title: "Could not update sponsor", description: String(message), variant: "destructive" });
    },
  } });

  const openEditDialog = (sponsor: any) => {
    setEditingSponsorId(sponsor.id);
    setForm({
      name: sponsor.name ?? "",
      type: sponsor.type ?? "individual",
      email: sponsor.email ?? "",
      phone: sponsor.phone ?? "",
      address: sponsor.address ?? "",
    });
    setShowEdit(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sponsors</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage sponsor and donor records</p>
        </div>
        {canEditSponsors && <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add Sponsor</Button>}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search sponsors..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : !sponsors?.length ? (
            <div className="text-center py-12 text-muted-foreground"><Heart className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No sponsors found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">Contact</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Total Contributed</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Active Students</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Actions</th>
                </tr></thead>
                <tbody>
                  {Array.isArray(sponsors) && sponsors.map(s => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium">{s.name}</td>
                      <td className="py-3 px-4"><Badge variant="outline" className="capitalize">{s.type}</Badge></td>
                      <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{s.phone ?? s.email ?? "—"}</td>
                      <td className="py-3 px-4 hidden lg:table-cell font-medium text-primary">{formatCurrency(s.totalContributed)}</td>
                      <td className="py-3 px-4 hidden lg:table-cell">{s.activeStudents}</td>
                      <td className="py-3 px-4"><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge></td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/sponsors/${s.id}`}><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button></Link>
                          {canEditSponsors && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(s)}><Pencil className="h-4 w-4" /></Button>}
                          {canEditSponsors && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { if (confirm("Remove this sponsor?")) deleteSponsor.mutate({ id: s.id }); }}><Trash2 className="h-4 w-4" /></Button>}
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

      <Dialog open={showAdd && canEditSponsors} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Sponsor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Sponsor name" /></div>
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="individual">Individual</SelectItem><SelectItem value="organization">Organization</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+254..." /></div>
            <div className="space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="City, Region" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button disabled={!form.name || createSponsor.isPending} onClick={() => createSponsor.mutate({ data: { name: form.name, type: form.type as any, email: form.email || null, phone: form.phone || null, address: form.address || null } })}>
              {createSponsor.isPending ? "Adding..." : "Add Sponsor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit && canEditSponsors} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Sponsor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Sponsor name" /></div>
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="individual">Individual</SelectItem><SelectItem value="organization">Organization</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+254..." /></div>
            <div className="space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="City, Region" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button
              disabled={!editingSponsorId || !form.name || updateSponsor.isPending}
              onClick={() => updateSponsor.mutate({
                id: editingSponsorId!,
                data: {
                  name: form.name,
                  type: form.type as any,
                  email: form.email || null,
                  phone: form.phone || null,
                  address: form.address || null,
                },
              })}
            >
              {updateSponsor.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
