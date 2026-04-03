import { useRoute, Link } from "wouter";
import { useGetStudent, useGetStudentAcademicRecords, useAddAcademicRecord, getGetStudentAcademicRecordsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { ArrowLeft, User, School, BookOpen, DollarSign, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function StudentDetail() {
  const [, params] = useRoute("/students/:id");
  const id = parseInt(params?.id ?? "0");
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [recordForm, setRecordForm] = useState({ term: "", year: new Date().getFullYear().toString(), subject: "", grade: "", gpa: "", remarks: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: student, isLoading } = useGetStudent(id, { query: { enabled: !!id } });
  const addRecord = useAddAcademicRecord({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetStudentAcademicRecordsQueryKey(id) }); setShowAddRecord(false); toast({ title: "Academic record added" }); } } });

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
              {(student as any).guardians.map((g: any) => (
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
          <Button size="sm" onClick={() => setShowAddRecord(true)}><Plus className="h-4 w-4 mr-1" />Add Record</Button>
        </CardHeader>
        <CardContent>
          {(student as any).academicRecords?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/40"><th className="text-left py-2 px-3 font-semibold text-muted-foreground">Term</th><th className="text-left py-2 px-3 font-semibold text-muted-foreground">Year</th><th className="text-left py-2 px-3 font-semibold text-muted-foreground">Grade</th><th className="text-left py-2 px-3 font-semibold text-muted-foreground">GPA</th><th className="text-left py-2 px-3 font-semibold text-muted-foreground">Remarks</th></tr></thead>
                <tbody>
                  {(student as any).academicRecords.map((r: any) => (
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
                  {(student as any).recentPayments.map((p: any) => (
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

      <Dialog open={showAddRecord} onOpenChange={setShowAddRecord}>
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
