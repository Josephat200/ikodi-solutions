import { useState } from "react";
import { useListSponsorships, useCreateSponsorship, useDeleteSponsorship, useUpdateSponsorship, getListSponsorshipsQueryKey, useListStudents, useListSponsors } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { canManageSponsorships } from "@/lib/rbac";

export default function Sponsorships() {
  const { user } = useAuth();
  const canEditSponsorships = canManageSponsorships(user?.role);

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingSponsorshipId, setEditingSponsorshipId] = useState<number | null>(null);
  const [form, setForm] = useState({ studentId: "", sponsorId: "", coverageType: "full", amount: "", startDate: new Date().toISOString().split("T")[0], term: "" });
  const [editForm, setEditForm] = useState({ coverageType: "full", amount: "", startDate: "", term: "", status: "active" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sponsorships, isLoading } = useListSponsorships({});
  const { data: students } = useListStudents({});
  const { data: sponsors } = useListSponsors({});
  const create = useCreateSponsorship({ mutation: {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListSponsorshipsQueryKey() });
      setShowAdd(false);
      toast({ title: "Sponsorship created" });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || error?.message || "Failed to create sponsorship";
      toast({ title: "Could not create sponsorship", description: String(message), variant: "destructive" });
    },
  } });
  const remove = useDeleteSponsorship({ mutation: {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListSponsorshipsQueryKey() });
      toast({ title: "Sponsorship removed" });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || error?.message || "Failed to delete sponsorship";
      toast({ title: "Could not delete sponsorship", description: String(message), variant: "destructive" });
    },
  } });
  const update = useUpdateSponsorship({ mutation: {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListSponsorshipsQueryKey() });
      setShowEdit(false);
      setEditingSponsorshipId(null);
      toast({ title: "Sponsorship updated" });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || error?.message || "Failed to update sponsorship";
      toast({ title: "Could not update sponsorship", description: String(message), variant: "destructive" });
    },
  } });

  const openEditDialog = (sp: any) => {
    setEditingSponsorshipId(sp.id);
    setEditForm({
      coverageType: sp.coverageType ?? "full",
      amount: String(sp.amount ?? ""),
      startDate: sp.startDate ?? "",
      term: sp.term ?? "",
      status: sp.status ?? "active",
    });
    setShowEdit(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Sponsorships</h1><p className="text-muted-foreground text-sm mt-1">Link sponsors to students</p></div>
        {canEditSponsorships && <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />New Sponsorship</Button>}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : !sponsorships?.length ? (
            <div className="text-center py-12 text-muted-foreground"><Wallet className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No sponsorships yet</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Student</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Sponsor</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">Coverage</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Term</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Start Date</th>
                  <th className="py-3 px-4"></th>
                </tr></thead>
                <tbody>
                  {Array.isArray(sponsorships) && sponsorships.map(sp => (
                    <tr key={sp.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{sp.studentName ?? `#${sp.studentId}`}</td>
                      <td className="py-3 px-4">{sp.sponsorName ?? `#${sp.sponsorId}`}</td>
                      <td className="py-3 px-4 hidden md:table-cell"><Badge variant={sp.coverageType === "full" ? "default" : "outline"} className="capitalize">{sp.coverageType}</Badge></td>
                      <td className="py-3 px-4 font-semibold">{formatCurrency(sp.amount)}</td>
                      <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{sp.term ?? "—"}</td>
                      <td className="py-3 px-4"><Badge variant={sp.status === "active" ? "default" : "secondary"}>{sp.status}</Badge></td>
                      <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{formatDate(sp.startDate)}</td>
                      <td className="py-3 px-4">
                        {canEditSponsorships ? (
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(sp)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Remove this sponsorship?")) remove.mutate({ id: sp.id }); }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd && canEditSponsorships} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Sponsorship</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Student *</Label>
              <Select value={form.studentId} onValueChange={v => setForm(f => ({ ...f, studentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{Array.isArray(students) && students.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName} ({s.admissionNumber})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sponsor *</Label>
              <Select value={form.sponsorId} onValueChange={v => setForm(f => ({ ...f, sponsorId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select sponsor" /></SelectTrigger>
                <SelectContent>{Array.isArray(sponsors) && sponsors.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Coverage Type *</Label>
              <Select value={form.coverageType} onValueChange={v => setForm(f => ({ ...f, coverageType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="full">Full Coverage</SelectItem><SelectItem value="partial">Partial Coverage</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Amount (KES) *</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="85000" /></div>
              <div className="space-y-1.5"><Label>Start Date *</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Term</Label><Input value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))} placeholder="Term 1 2026" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button disabled={!form.studentId || !form.sponsorId || !form.amount || !form.startDate || create.isPending} onClick={() => create.mutate({ data: { studentId: parseInt(form.studentId), sponsorId: parseInt(form.sponsorId), coverageType: form.coverageType as any, amount: parseFloat(form.amount), startDate: form.startDate, term: form.term || null, status: "active" } })}>
              {create.isPending ? "Creating..." : "Create Sponsorship"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit && canEditSponsorships} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Sponsorship</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Coverage Type *</Label>
              <Select value={editForm.coverageType} onValueChange={v => setEditForm(f => ({ ...f, coverageType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="full">Full Coverage</SelectItem><SelectItem value="partial">Partial Coverage</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Amount (KES) *</Label><Input type="number" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} placeholder="85000" /></div>
              <div className="space-y-1.5"><Label>Start Date *</Label><Input type="date" value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Term</Label><Input value={editForm.term} onChange={e => setEditForm(f => ({ ...f, term: e.target.value }))} placeholder="Term 1 2026" /></div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button
              disabled={!editingSponsorshipId || !editForm.amount || !editForm.startDate || update.isPending}
              onClick={() => update.mutate({
                id: editingSponsorshipId!,
                data: {
                  coverageType: editForm.coverageType as any,
                  amount: parseFloat(editForm.amount),
                  startDate: editForm.startDate,
                  status: editForm.status as any,
                },
              })}
            >
              {update.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
