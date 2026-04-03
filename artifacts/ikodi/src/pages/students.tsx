import { useState } from "react";
import { useListStudents, useCreateStudent, useListSchools, useDeleteStudent, getListStudentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Eye, Trash2, Users } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency, formatDate } from "@/lib/utils";

const sponsorshipBadge = (status: string) => {
  if (status === "sponsored") return <Badge className="bg-primary text-primary-foreground">Sponsored</Badge>;
  if (status === "partial") return <Badge className="bg-orange-500 text-white">Partial</Badge>;
  return <Badge variant="destructive">Unsponsored</Badge>;
};

export default function Students() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", gender: "", phone: "", email: "", schoolId: "", course: "", currentLevel: "", currentTerm: "", totalFees: "", guardianName: "", guardianPhone: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params: any = {};
  if (search) params.search = search;
  if (filterStatus !== "all") params.sponsorshipStatus = filterStatus;

  const { data: students, isLoading } = useListStudents(params);
  const { data: schools } = useListSchools({});
  const createStudent = useCreateStudent({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }); setShowAdd(false); setForm({ firstName: "", lastName: "", gender: "", phone: "", email: "", schoolId: "", course: "", currentLevel: "", currentTerm: "", totalFees: "", guardianName: "", guardianPhone: "" }); toast({ title: "Student added successfully" }); } } });
  const deleteStudent = useDeleteStudent({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }); toast({ title: "Student deleted" }); } } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage student records and enrollment</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add Student</Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or admission..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="sponsored">Sponsored</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="unsponsored">Unsponsored</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : !students?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No students found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Admission No.</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">School</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Level</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Sponsorship</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Balance</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{s.admissionNumber}</td>
                      <td className="py-3 px-4 font-medium">{s.firstName} {s.lastName}</td>
                      <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{s.schoolName ?? "—"}</td>
                      <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{s.currentLevel ?? "—"}</td>
                      <td className="py-3 px-4">{sponsorshipBadge(s.sponsorshipStatus)}</td>
                      <td className="py-3 px-4 hidden lg:table-cell text-destructive font-medium">{s.balance != null ? formatCurrency(s.balance) : "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/students/${s.id}`}><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button></Link>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { if (confirm("Delete this student?")) deleteStudent.mutate({ id: s.id }); }}><Trash2 className="h-4 w-4" /></Button>
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

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Student</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First name" />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last name" />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+254..." />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="student@email.com" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>School</Label>
              <Select value={form.schoolId} onValueChange={v => setForm(f => ({ ...f, schoolId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                <SelectContent>
                  {schools?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Current Level</Label>
              <Input value={form.currentLevel} onChange={e => setForm(f => ({ ...f, currentLevel: e.target.value }))} placeholder="Form 4, Year 2..." />
            </div>
            <div className="space-y-1.5">
              <Label>Current Term</Label>
              <Input value={form.currentTerm} onChange={e => setForm(f => ({ ...f, currentTerm: e.target.value }))} placeholder="Term 1 2026" />
            </div>
            <div className="space-y-1.5">
              <Label>Course</Label>
              <Input value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))} placeholder="e.g. B.Com" />
            </div>
            <div className="space-y-1.5">
              <Label>Total Fees (KES)</Label>
              <Input type="number" value={form.totalFees} onChange={e => setForm(f => ({ ...f, totalFees: e.target.value }))} placeholder="85000" />
            </div>
            <div className="col-span-2 pt-2 border-t border-border">
              <p className="text-sm font-semibold mb-3">Guardian Information</p>
            </div>
            <div className="space-y-1.5">
              <Label>Guardian Name</Label>
              <Input value={form.guardianName} onChange={e => setForm(f => ({ ...f, guardianName: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label>Guardian Phone</Label>
              <Input value={form.guardianPhone} onChange={e => setForm(f => ({ ...f, guardianPhone: e.target.value }))} placeholder="+254..." />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button disabled={!form.firstName || !form.lastName || createStudent.isPending} onClick={() => createStudent.mutate({ data: { firstName: form.firstName, lastName: form.lastName, gender: form.gender as any || null, phone: form.phone || null, email: form.email || null, schoolId: form.schoolId ? parseInt(form.schoolId) : null, course: form.course || null, currentLevel: form.currentLevel || null, currentTerm: form.currentTerm || null, totalFees: form.totalFees ? parseFloat(form.totalFees) : null, guardianName: form.guardianName || null, guardianPhone: form.guardianPhone || null, status: "active" } })}>
              {createStudent.isPending ? "Adding..." : "Add Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
