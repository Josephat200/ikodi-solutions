import { useState } from "react";
import { useListCommunications, useSendCommunication, getListCommunicationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, MessageSquare } from "lucide-react";
import { formatDate } from "@/lib/utils";

const methodColors: Record<string, string> = {
  sms: "bg-green-100 text-green-800",
  email: "bg-blue-100 text-blue-800",
  phone_call: "bg-orange-100 text-orange-800",
  in_person: "bg-purple-100 text-purple-800",
};

export default function Communications() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ recipientType: "student", recipientId: "", method: "sms", subject: "", message: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comms, isLoading } = useListCommunications({});
  const send = useSendCommunication({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListCommunicationsQueryKey() }); setShowAdd(false); toast({ title: "Communication sent" }); } } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Communications</h1><p className="text-muted-foreground text-sm mt-1">SMS, email and contact history</p></div>
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />New Message</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : !comms?.length ? (
            <div className="text-center py-12 text-muted-foreground"><MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No communications yet</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Recipient</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Method</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">Subject</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Preview</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                </tr></thead>
                <tbody>
                  {comms.map(c => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(c.sentAt)}</td>
                      <td className="py-3 px-4 font-medium">{c.recipientName ?? `${c.recipientType} #${c.recipientId}`}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${methodColors[c.method] ?? "bg-muted text-muted-foreground"}`}>{c.method.replace("_", " ")}</span></td>
                      <td className="py-3 px-4 hidden md:table-cell">{c.subject ?? "—"}</td>
                      <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground max-w-xs truncate">{c.message}</td>
                      <td className="py-3 px-4"><Badge variant={c.status === "sent" || c.status === "delivered" ? "default" : c.status === "failed" ? "destructive" : "secondary"}>{c.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Communication</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Recipient Type *</Label>
                <Select value={form.recipientType} onValueChange={v => setForm(f => ({ ...f, recipientType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="student">Student</SelectItem><SelectItem value="sponsor">Sponsor</SelectItem><SelectItem value="guardian">Guardian</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Recipient ID *</Label>
                <Input type="number" value={form.recipientId} onChange={e => setForm(f => ({ ...f, recipientId: e.target.value }))} placeholder="e.g. 1" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Method *</Label>
              <Select value={form.method} onValueChange={v => setForm(f => ({ ...f, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone_call">Phone Call</SelectItem>
                  <SelectItem value="in_person">In Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Subject</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Subject line" /></div>
            <div className="space-y-1.5"><Label>Message *</Label><Textarea rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Your message here..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button disabled={!form.recipientId || !form.message || send.isPending} onClick={() => send.mutate({ data: { recipientType: form.recipientType as any, recipientId: parseInt(form.recipientId), method: form.method as any, subject: form.subject || null, message: form.message } })}>
              {send.isPending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
