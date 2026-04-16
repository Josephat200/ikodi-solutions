import { useState } from "react";
import { useListSchools, useCreateSchool, useUpdateSchool, getListSchoolsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, School } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { canManageSchools } from "@/lib/rbac";

const categoryColor: Record<string, string> = {
  primary_school: "bg-green-100 text-green-800",
  high_school: "bg-blue-100 text-blue-800",
  college: "bg-orange-100 text-orange-800",
  university: "bg-purple-100 text-purple-800",
  primary: "bg-green-100 text-green-800",
  secondary: "bg-blue-100 text-blue-800",
  higher_learning: "bg-orange-100 text-orange-800",
};

const categoryLabel: Record<string, string> = {
  primary_school: "Primary School",
  high_school: "High School",
  college: "College",
  university: "University",
  primary: "Primary School",
  secondary: "High School",
  higher_learning: "College",
};

export default function Schools() {
  const { user } = useAuth();
  const canEditSchools = canManageSchools(user?.role);

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingSchoolId, setEditingSchoolId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", category: "primary_school", location: "", contactPhone: "", contactEmail: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schools, isLoading } = useListSchools({});
  const create = useCreateSchool({ mutation: {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListSchoolsQueryKey() });
      setShowAdd(false);
      setForm({ name: "", category: "primary_school", location: "", contactPhone: "", contactEmail: "" });
      toast({ title: "School added" });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || error?.message || "Failed to add school";
      toast({ title: "Could not add school", description: String(message), variant: "destructive" });
    },
  } });
  const update = useUpdateSchool({ mutation: {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListSchoolsQueryKey() });
      setShowEdit(false);
      setEditingSchoolId(null);
      setForm({ name: "", category: "primary_school", location: "", contactPhone: "", contactEmail: "" });
      toast({ title: "School updated" });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || error?.message || "Failed to update school";
      toast({ title: "Could not update school", description: String(message), variant: "destructive" });
    },
  } });

  const openEditDialog = (school: any) => {
    setEditingSchoolId(school.id);
    setForm({
      name: school.name ?? "",
      category: school.category ?? "primary_school",
      location: school.location ?? "",
      contactPhone: school.contactPhone ?? "",
      contactEmail: school.contactEmail ?? "",
    });
    setShowEdit(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Schools</h1><p className="text-muted-foreground text-sm mt-1">School directory management</p></div>
        {canEditSchools && <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add School</Button>}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : !schools?.length ? (
            <div className="text-center py-12 text-muted-foreground"><School className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No schools registered</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">School Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Location</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">Contact</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Actions</th>
                </tr></thead>
                <tbody>
                  {Array.isArray(schools) && schools.map(s => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{s.name}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor[s.category] ?? "bg-muted text-muted-foreground"}`}>{categoryLabel[s.category] ?? s.category}</span></td>
                      <td className="py-3 px-4 text-muted-foreground">{s.location}</td>
                      <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{s.contactPhone ?? s.contactEmail ?? "—"}</td>
                      <td className="py-3 px-4">
                        {canEditSchools ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
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

      <Dialog open={showAdd && canEditSchools} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add School</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>School Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="School name" /></div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="primary_school">Primary School</SelectItem><SelectItem value="high_school">High School</SelectItem><SelectItem value="college">College</SelectItem><SelectItem value="university">University</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Location *</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="City, Region" /></div>
            <div className="space-y-1.5"><Label>Contact Phone</Label><Input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+254..." /></div>
            <div className="space-y-1.5"><Label>Contact Email</Label><Input value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="info@school.ac.ke" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button disabled={!form.name || !form.location || create.isPending} onClick={() => create.mutate({ data: { name: form.name, category: form.category as any, location: form.location, contactPhone: form.contactPhone || undefined, contactEmail: form.contactEmail || undefined } })}>
              {create.isPending ? "Adding..." : "Add School"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit && canEditSchools} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit School</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>School Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="School name" /></div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="primary_school">Primary School</SelectItem><SelectItem value="high_school">High School</SelectItem><SelectItem value="college">College</SelectItem><SelectItem value="university">University</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Location *</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="City, Region" /></div>
            <div className="space-y-1.5"><Label>Contact Phone</Label><Input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+254..." /></div>
            <div className="space-y-1.5"><Label>Contact Email</Label><Input value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="info@school.ac.ke" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button
              disabled={!editingSchoolId || !form.name || !form.location || update.isPending}
              onClick={() => update.mutate({
                id: editingSchoolId!,
                data: {
                  name: form.name,
                  category: form.category as any,
                  location: form.location,
                  contactPhone: form.contactPhone || undefined,
                  contactEmail: form.contactEmail || undefined,
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
