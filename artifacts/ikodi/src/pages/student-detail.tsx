import { useRoute, Link } from "wouter";
import { useGetStudent, useGetStudentAcademicRecords, useAddAcademicRecord, useUpdateStudent, useListSchools, getGetStudentAcademicRecordsQueryKey, getGetStudentQueryKey, getListStudentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { ArrowLeft, User, School, BookOpen, DollarSign, Plus, Pencil } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { canManageStudents } from "@/lib/rbac";

export default function StudentDetail() {
  const { user } = useAuth();
  const canEditAcademic = canManageStudents(user?.role);
  const canEditStudent = canManageStudents(user?.role);

  const [, params] = useRoute("/students/:id");
  const id = parseInt(params?.id ?? "0");
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [studentFormError, setStudentFormError] = useState("");
  const [recordForm, setRecordForm] = useState({ term: "", year: new Date().getFullYear().toString(), subject: "", grade: "", gpa: "", remarks: "" });
  const [studentForm, setStudentForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    email: "",
    schoolId: "",
    course: "",
    currentLevel: "",
    currentTerm: "",
    totalFees: "",
    status: "active",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: student, isLoading } = useGetStudent(id, { query: { enabled: !!id } } as any);
  const { data: schools } = useListSchools({});
  const addRecord = useAddAcademicRecord({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetStudentAcademicRecordsQueryKey(id) }); setShowAddRecord(false); toast({ title: "Academic record added" }); } } });
  const updateStudent = useUpdateStudent({
    mutation: {
      onSuccess: (updated) => {
        queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        setShowEditStudent(false);
        setStudentFormError("");
        toast({
          title: "Student updated successfully",
          description: `${updated.firstName} ${updated.lastName} has been updated.`,
        });
      },
      onError: (error: any) => {
        const message = error?.response?.data?.error || error?.message || "Failed to update student";
        toast({
          title: "Could not update student",
          description: String(message),
          variant: "destructive",
        });
      },
    },
  });

  const openEditStudent = () => {
    if (!student) return;
    setStudentForm({
      firstName: student.firstName ?? "",
      lastName: student.lastName ?? "",
      dateOfBirth: student.dateOfBirth ? String(student.dateOfBirth).slice(0, 10) : "",
      gender: student.gender ?? "",
      phone: student.phone ?? "",
      email: student.email ?? "",
      schoolId: student.schoolId ? String(student.schoolId) : "",
      course: student.course ?? "",
      currentLevel: student.currentLevel ?? "",
      currentTerm: student.currentTerm ?? "",
      totalFees: student.totalFees != null ? String(student.totalFees) : "",
      status: student.status ?? "active",
    });
    setStudentFormError("");
    setShowEditStudent(true);
  };

  const validateStudentForm = () => {
    if (!studentForm.firstName.trim()) {
      setStudentFormError("First name is required");
      return false;
    }
    if (!studentForm.lastName.trim()) {
      setStudentFormError("Last name is required");
      return false;
    }
    if (studentForm.totalFees && Number.isNaN(Number(studentForm.totalFees))) {
      setStudentFormError("Total fees must be a valid number");
      return false;
    }
    setStudentFormError("");
    return true;
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!student) return <div className="text-center py-20 text-muted-foreground">Student not found</div>;

  const balance = student.balance ?? 0;
  const paidAmount = student.paidAmount ?? 0;
  const totalFees = student.totalFees ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/students"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">{student.firstName} {student.lastName}</h1>
          <p className="text-muted-foreground text-sm">{student.admissionNumber}</p>
        </div>
        {canEditStudent && (
          <Button variant="outline" className="ml-2" onClick={openEditStudent}>
            <Pencil className="h-4 w-4 mr-2" />Edit Student
          </Button>
        )}
        <div className="ml-auto">
          {student.sponsorshipStatus === "sponsored" && <Badge className="bg-primary text-primary-foreground">Sponsored</Badge>}
          {student.sponsorshipStatus === "partial" && <Badge className="bg-orange-500 text-white">Partially Sponsored</Badge>}
          {student.sponsorshipStatus === "unsponsored" && <Badge variant="destructive">Unsponsored</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Personal Info */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" />Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Gender" value={student.gender ?? "—"} />
            <Row label="Phone" value={student.phone ?? "—"} />
            <Row label="Email" value={student.email ?? "—"} />
            <Row label="Date of Birth" value={formatDate(student.dateOfBirth)} />
            <Row label="Status" value={<Badge variant={student.status === "active" ? "default" : "secondary"}>{student.status}</Badge>} />
          </CardContent>
        </Card>

        {/* School Info */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><School className="h-4 w-4 text-primary" />Academic Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="School" value={student.schoolName ?? "—"} />
            <Row label="Category" value={student.schoolCategory ?? "—"} />
            <Row label="Course" value={student.course ?? "—"} />
            <Row label="Level" value={student.currentLevel ?? "—"} />
            <Row label="Current Term" value={student.currentTerm ?? "—"} />
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />Financial Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Total Fees" value={formatCurrency(totalFees)} />
            <Row label="Paid" value={<span className="text-green-700 font-medium">{formatCurrency(paidAmount)}</span>} />
            <Row label="Balance" value={<span className="text-destructive font-bold">{formatCurrency(balance)}</span>} />
            {totalFees > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Payment progress</span>
                  <span>{Math.round((paidAmount / totalFees) * 100)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, (paidAmount / totalFees) * 100)}%` }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Guardians */}
      {(student as any).guardians?.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Guardian Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.isArray((student as any).guardians) && (student as any).guardians.map((g: any) => (
                <div key={g.id} className="p-4 border border-border rounded-lg text-sm space-y-1">
                  <p className="font-semibold">{g.name}</p>
                  <p className="text-muted-foreground">{g.relationship ?? "—"}</p>
                  <p>{g.phone ?? "—"}</p>
                  <p>{g.email ?? "—"}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Academic Records */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" />Academic Records</CardTitle>
          {canEditAcademic && <Button size="sm" onClick={() => setShowAddRecord(true)}><Plus className="h-4 w-4 mr-1" />Add Record</Button>}
        </CardHeader>
        <CardContent>
          {(student as any).academicRecords?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/40"><th className="text-left py-2 px-3 font-semibold text-muted-foreground">Term</th><th className="text-left py-2 px-3 font-semibold text-muted-foreground">Year</th><th className="text-left py-2 px-3 font-semibold text-muted-foreground">Grade</th><th className="text-left py-2 px-3 font-semibold text-muted-foreground">GPA</th><th className="text-left py-2 px-3 font-semibold text-muted-foreground">Remarks</th></tr></thead>
                <tbody>
                  {Array.isArray((student as any).academicRecords) && (student as any).academicRecords.map((r: any) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-2 px-3">{r.term}</td>
                      <td className="py-2 px-3">{r.year}</td>
                      <td className="py-2 px-3 font-medium">{r.grade ?? "—"}</td>
                      <td className="py-2 px-3">{r.gpa != null ? r.gpa.toFixed(2) : "—"}</td>
                      <td className="py-2 px-3 text-muted-foreground">{r.remarks ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-muted-foreground text-sm">No academic records yet</p>}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      {(student as any).recentPayments?.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/40"><th className="text-left py-2 px-3 font-semibold text-muted-foreground">Date</th><th className="text-left py-2 px-3 font-semibold text-muted-foreground">Amount</th><th className="text-left py-2 px-3 font-semibold text-muted-foreground">Method</th><th className="text-left py-2 px-3 font-semibold text-muted-foreground">Reference</th></tr></thead>
                <tbody>
                  {Array.isArray((student as any).recentPayments) && (student as any).recentPayments.map((p: any) => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-2 px-3">{formatDate(p.paymentDate)}</td>
                      <td className="py-2 px-3 font-medium text-green-700">{formatCurrency(p.amount)}</td>
                      <td className="py-2 px-3 capitalize">{p.paymentMethod?.replace("_", " ")}</td>
                      <td className="py-2 px-3 text-muted-foreground font-mono text-xs">{p.referenceNumber ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showAddRecord && canEditAcademic} onOpenChange={setShowAddRecord}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Academic Record</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Term *</Label><Input value={recordForm.term} onChange={e => setRecordForm(f => ({ ...f, term: e.target.value }))} placeholder="Term 1" /></div>
            <div className="space-y-1.5"><Label>Year *</Label><Input type="number" value={recordForm.year} onChange={e => setRecordForm(f => ({ ...f, year: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Grade</Label><Input value={recordForm.grade} onChange={e => setRecordForm(f => ({ ...f, grade: e.target.value }))} placeholder="A, B+..." /></div>
            <div className="space-y-1.5"><Label>GPA</Label><Input type="number" step="0.1" value={recordForm.gpa} onChange={e => setRecordForm(f => ({ ...f, gpa: e.target.value }))} placeholder="3.5" /></div>
            <div className="col-span-2 space-y-1.5"><Label>Remarks</Label><Input value={recordForm.remarks} onChange={e => setRecordForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Good performance..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRecord(false)}>Cancel</Button>
            <Button disabled={!recordForm.term || !recordForm.year || addRecord.isPending} onClick={() => addRecord.mutate({ id, data: { term: recordForm.term, year: parseInt(recordForm.year), grade: recordForm.grade || null, gpa: recordForm.gpa ? parseFloat(recordForm.gpa) : null, remarks: recordForm.remarks || null } })}>
              {addRecord.isPending ? "Saving..." : "Save Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditStudent && canEditStudent} onOpenChange={(open) => { setShowEditStudent(open); if (!open) setStudentFormError(""); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Student Details</DialogTitle></DialogHeader>
          {studentFormError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/15 px-3 py-2 text-sm text-destructive">
              {studentFormError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={studentForm.firstName} onChange={(e) => { setStudentForm((f) => ({ ...f, firstName: e.target.value })); setStudentFormError(""); }} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input value={studentForm.lastName} onChange={(e) => { setStudentForm((f) => ({ ...f, lastName: e.target.value })); setStudentFormError(""); }} />
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input type="date" value={studentForm.dateOfBirth} onChange={(e) => setStudentForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={studentForm.gender} onValueChange={(value) => setStudentForm((f) => ({ ...f, gender: value }))}>
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
              <Input value={studentForm.phone} onChange={(e) => setStudentForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={studentForm.email} onChange={(e) => setStudentForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>School</Label>
              <Select value={studentForm.schoolId} onValueChange={(value) => setStudentForm((f) => ({ ...f, schoolId: value }))}>
                <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                <SelectContent>
                  {Array.isArray(schools) && schools.map((school) => (
                    <SelectItem key={school.id} value={String(school.id)}>{school.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Current Level</Label>
              <Input value={studentForm.currentLevel} onChange={(e) => setStudentForm((f) => ({ ...f, currentLevel: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Current Term</Label>
              <Input value={studentForm.currentTerm} onChange={(e) => setStudentForm((f) => ({ ...f, currentTerm: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Course</Label>
              <Input value={studentForm.course} onChange={(e) => setStudentForm((f) => ({ ...f, course: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Total Fees (KES)</Label>
              <Input type="number" value={studentForm.totalFees} onChange={(e) => { setStudentForm((f) => ({ ...f, totalFees: e.target.value })); setStudentFormError(""); }} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={studentForm.status} onValueChange={(value) => setStudentForm((f) => ({ ...f, status: value }))}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditStudent(false); setStudentFormError(""); }}>Cancel</Button>
            <Button disabled={!studentForm.firstName || !studentForm.lastName || updateStudent.isPending} onClick={() => {
              if (!validateStudentForm()) return;
              updateStudent.mutate({
                id,
                data: {
                  firstName: studentForm.firstName,
                  lastName: studentForm.lastName,
                  dateOfBirth: studentForm.dateOfBirth || null,
                  gender: (studentForm.gender || null) as any,
                  phone: studentForm.phone || null,
                  email: studentForm.email || null,
                  schoolId: studentForm.schoolId ? Number(studentForm.schoolId) : null,
                  course: studentForm.course || null,
                  currentLevel: studentForm.currentLevel || null,
                  currentTerm: studentForm.currentTerm || null,
                  totalFees: studentForm.totalFees ? Number(studentForm.totalFees) : null,
                  status: studentForm.status as any,
                  guardianName: null,
                  guardianRelationship: null,
                  guardianPhone: null,
                  guardianEmail: null,
                },
              });
            }}>
              {updateStudent.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
