import { useEffect, useState } from "react";
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
import { useAuth } from "@/lib/auth";
import { canSendCommunications } from "@/lib/rbac";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiBaseUrl = configuredApiUrl
  ? configuredApiUrl
  : import.meta.env.DEV
    ? "http://localhost:3001"
    : "";

const channelColors: Record<string, string> = {
  sms: "bg-green-100 text-green-800",
};

export default function Communications() {
  const { user } = useAuth();
  const canCreateCommunications = canSendCommunications(user?.role);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    recipientType: "student",
    recipientId: "",
    channel: "sms",
    subject: "",
    message: "",
    targetStudents: true,
    targetGuardians: true,
    targetSponsors: false,
  });
  const [recipientContact, setRecipientContact] = useState<{ recipientName: string | null; phone: string | null; hasValidSmsPhone: boolean } | null>(null);
  const [preview, setPreview] = useState<{ totalRecipients: number; recipientsWithValidSmsPhone: number; missingValidPhoneCount: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comms, isLoading } = useListCommunications({});
  const send = useSendCommunication({ mutation: {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListCommunicationsQueryKey() });
      setShowAdd(false);
      setForm({
        recipientType: "student",
        recipientId: "",
        channel: "sms",
        subject: "",
        message: "",
        targetStudents: true,
        targetGuardians: true,
        targetSponsors: false,
      });
      setPreview(null);
      setPreviewError(null);
      toast({ title: "Communication sent" });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || error?.message || "Failed to send communication";
      toast({ title: "Could not send communication", description: String(message), variant: "destructive" });
    },
  } });

  useEffect(() => {
    const recipientId = form.recipientId.trim();
    if (!showAdd || !recipientId || form.recipientType === "all") {
      setRecipientContact(null);
      setContactError(null);
      return;
    }

    let cancelled = false;
    setContactLoading(true);
    setContactError(null);

    const contactUrl = `${apiBaseUrl}/api/communications/recipient-contact?recipientType=${encodeURIComponent(form.recipientType)}&recipientId=${encodeURIComponent(recipientId)}`;
    fetch(contactUrl, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || "Could not load recipient contact");
        }
        return response.json();
      })
      .then((contact) => {
        if (cancelled) return;
        setRecipientContact(contact);
      })
      .catch((error: any) => {
        if (cancelled) return;
        setRecipientContact(null);
        setContactError(error?.message || "Could not load recipient contact");
      })
      .finally(() => {
        if (cancelled) return;
        setContactLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.recipientId, form.recipientType, showAdd]);

  useEffect(() => {
    if (!showAdd) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    const recipientId = form.recipientId.trim();
    const isBroadcast = form.recipientType === "all";
    const hasBroadcastTarget = form.targetStudents || form.targetGuardians || form.targetSponsors;
    if ((!isBroadcast && !recipientId) || (isBroadcast && !hasBroadcastTarget)) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);

    const params = new URLSearchParams({
      recipientType: form.recipientType,
      channel: form.channel,
    });
    if (!isBroadcast) {
      params.set("recipientId", recipientId);
    } else {
      params.set("targetStudents", String(form.targetStudents));
      params.set("targetGuardians", String(form.targetGuardians));
      params.set("targetSponsors", String(form.targetSponsors));
    }

    fetch(`${apiBaseUrl}/api/communications/preview?${params.toString()}`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || "Could not load recipient preview");
        }
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        setPreview({
          totalRecipients: Number(data.totalRecipients ?? 0),
          recipientsWithValidSmsPhone: Number(data.recipientsWithValidSmsPhone ?? 0),
          missingValidPhoneCount: Number(data.missingValidPhoneCount ?? 0),
        });
      })
      .catch((error: any) => {
        if (cancelled) return;
        setPreview(null);
        setPreviewError(error?.message || "Could not load recipient preview");
      })
      .finally(() => {
        if (cancelled) return;
        setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    form.channel,
    form.recipientId,
    form.recipientType,
    form.targetGuardians,
    form.targetSponsors,
    form.targetStudents,
    showAdd,
  ]);

  const isBroadcast = form.recipientType === "all";
  const hasBroadcastTarget = form.targetStudents || form.targetGuardians || form.targetSponsors;
  const smsRequiresPhone = form.channel === "sms";
  const smsContactValid = form.recipientType === "all" ? false : Boolean(recipientContact?.hasValidSmsPhone);
  const canSubmit = Boolean(
    (isBroadcast ? hasBroadcastTarget : form.recipientId) &&
      form.message &&
      !send.isPending &&
      (!smsRequiresPhone || isBroadcast || smsContactValid),
  );

  return (
    <div className="space-y-6 notifications-watermark">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Communications</h1><p className="text-muted-foreground text-sm mt-1">SMS and contact history</p></div>
        {canCreateCommunications && <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />New Message</Button>}
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
                  {Array.isArray(comms) && comms.map(c => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(c.sentAt)}</td>
                      <td className="py-3 px-4 font-medium">{c.recipientName ?? `${c.recipientType} #${c.recipientId}`}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${channelColors[c.channel] ?? "bg-muted text-muted-foreground"}`}>{c.channel}</span></td>
                      <td className="py-3 px-4 hidden md:table-cell">{c.subject ?? "—"}</td>
                      <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground max-w-xs truncate">{c.message}</td>
                      <td className="py-3 px-4"><Badge variant={c.status === "sent" ? "default" : c.status === "failed" ? "destructive" : "secondary"}>{c.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd && canCreateCommunications} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Communication</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Recipient Type *</Label>
                <Select value={form.recipientType} onValueChange={v => setForm(f => ({ ...f, recipientType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="sponsor">Sponsor</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="all">All (Choose Groups)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!isBroadcast ? (
                <div className="space-y-1.5">
                  <Label>Recipient ID *</Label>
                  <Input type="number" value={form.recipientId} onChange={e => setForm(f => ({ ...f, recipientId: e.target.value }))} placeholder="e.g. 1" />
                </div>
              ) : (
                <div className="space-y-1.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                  <p className="font-medium text-foreground mb-2">Broadcast Target Groups *</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.targetStudents}
                      onChange={(e) => setForm((f) => ({ ...f, targetStudents: e.target.checked }))}
                    />
                    <span>Students</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.targetGuardians}
                      onChange={(e) => setForm((f) => ({ ...f, targetGuardians: e.target.checked }))}
                    />
                    <span>Guardians</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.targetSponsors}
                      onChange={(e) => setForm((f) => ({ ...f, targetSponsors: e.target.checked }))}
                    />
                    <span>Sponsors</span>
                  </label>
                  {!hasBroadcastTarget ? <p className="text-destructive mt-1">Select at least one group.</p> : null}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Method *</Label>
              <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.recipientType !== "all" && form.recipientId ? (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
                {contactLoading ? <p>Resolving recipient contact...</p> : null}
                {!contactLoading && contactError ? <p className="text-destructive">{contactError}</p> : null}
                {!contactLoading && !contactError && recipientContact ? (
                  <>
                    <p>Recipient: {recipientContact.recipientName || "Unknown"}</p>
                    <p>Phone: {recipientContact.phone || "Not set"}</p>
                    {smsRequiresPhone && !recipientContact.hasValidSmsPhone ? (
                      <p className="text-destructive">A valid phone number is required to send SMS.</p>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Pre-send Preview</p>
              {previewLoading ? <p>Calculating target coverage...</p> : null}
              {!previewLoading && previewError ? <p className="text-destructive">{previewError}</p> : null}
              {!previewLoading && !previewError && preview ? (
                <>
                  <p>Recipients targeted: {preview.totalRecipients}</p>
                  {form.channel === "sms" ? (
                    <>
                      <p>With valid phone: {preview.recipientsWithValidSmsPhone}</p>
                      <p>Missing valid phone: {preview.missingValidPhoneCount}</p>
                    </>
                  ) : null}
                </>
              ) : null}
              {!previewLoading && !previewError && !preview ? <p>Set recipient details to preview coverage.</p> : null}
            </div>
            <div className="space-y-1.5"><Label>Subject</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Subject line" /></div>
            <div className="space-y-1.5"><Label>Message *</Label><Textarea rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Your message here..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              disabled={!canSubmit}
              onClick={() => {
                const payload: any = {
                  recipientType: form.recipientType,
                  channel: form.channel,
                  subject: form.subject || null,
                  message: form.message,
                };
                if (isBroadcast) {
                  payload.recipientId = null;
                  payload.targetStudents = form.targetStudents;
                  payload.targetGuardians = form.targetGuardians;
                  payload.targetSponsors = form.targetSponsors;
                } else {
                  payload.recipientId = parseInt(form.recipientId);
                }
                send.mutate({ data: payload });
              }}
            >
              {send.isPending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
