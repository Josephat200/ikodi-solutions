import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetStudentQueryKey, useGetStudent } from "@workspace/api-client-react";
import { ArrowLeft, Download, ExternalLink, FileText, Image as ImageIcon, Trash2, Upload, FileArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { canManageStudents } from "@/lib/rbac";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiBaseUrl = configuredApiUrl || (import.meta.env.DEV ? "http://localhost:3001" : "");

function resolveApiPath(pathName: string) {
  return `${apiBaseUrl}${pathName}`;
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType?: string | null) {
  return Boolean(mimeType?.startsWith("image/"));
}

function isPdf(mimeType?: string | null) {
  return mimeType === "application/pdf";
}

export default function StudentResultsPage() {
  const { user } = useAuth();
  const canEdit = canManageStudents(user?.role);
  const [, params] = useRoute("/students/:id/results");
  const id = parseInt(params?.id ?? "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const { data: student, isLoading } = useGetStudent(id, { query: { enabled: !!id } } as any);

  const resultDocuments = useMemo(() => {
    if (!student || !Array.isArray((student as any).resultDocuments)) return [];
    return (student as any).resultDocuments as Array<any>;
  }, [student]);

  const validateSelectedFile = (file: File | null) => {
    if (!file) return "Please choose a file";
    const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.type)) return "Only PDF, JPG, PNG, and WEBP files are allowed";
    if (file.size > 10 * 1024 * 1024) return "File size must be 10MB or less";
    return "";
  };

  const onDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    const error = validateSelectedFile(file);
    if (error) {
      setUploadError(error);
      setUploadFile(null);
      return;
    }
    setUploadError("");
    setUploadFile(file);
    if (file && !uploadTitle.trim()) {
      setUploadTitle(file.name);
    }
  };

  const toBase64Payload = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Failed to read file"));
          return;
        }
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const uploadResult = async () => {
    const error = validateSelectedFile(uploadFile);
    if (error) {
      setUploadError(error);
      return;
    }

    setUploadError("");
    setIsUploading(true);

    try {
      const file = uploadFile as File;
      const fileContentBase64 = await toBase64Payload(file);
      const response = await fetch(resolveApiPath(`/api/students/${id}/results`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: uploadTitle.trim() || file.name,
          description: uploadDescription.trim() || null,
          fileName: file.name,
          mimeType: file.type,
          fileContentBase64,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to upload result");
      }

      queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(id) });
      setUploadFile(null);
      setUploadTitle("");
      setUploadDescription("");
      toast({ title: "Result uploaded", description: "Student result has been uploaded." });
    } catch (err: any) {
      setUploadError(String(err?.message || "Failed to upload result"));
    } finally {
      setIsUploading(false);
    }
  };

  const deleteResult = async (documentId: number) => {
    if (!confirm("Delete this uploaded result document?")) return;
    try {
      const response = await fetch(resolveApiPath(`/api/students/${id}/results/${documentId}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to delete document");
      }
      queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(id) });
      toast({ title: "Deleted", description: "Result document deleted." });
    } catch (err: any) {
      toast({ title: "Delete failed", description: String(err?.message || "Failed to delete"), variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="py-20 text-center text-muted-foreground">Loading student results...</div>;
  }

  if (!student) {
    return <div className="py-20 text-center text-muted-foreground">Student not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/students/${id}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Results</h1>
            <p className="text-sm text-muted-foreground">{student.firstName} {student.lastName} • {student.admissionNumber}</p>
          </div>
        </div>
      </div>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="h-4 w-4" />Upload Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadError && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{uploadError}</div>}
            <div
              className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${isDragOver ? "border-primary bg-primary/5" : "border-border"}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
              onDrop={onDropFile}
            >
              <p className="text-sm font-medium">Drag and drop result file here</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, WEBP up to 10MB</p>
              <div className="mt-3 flex justify-center">
                <Input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="max-w-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    const error = validateSelectedFile(file);
                    if (error) {
                      setUploadError(error);
                      setUploadFile(null);
                      return;
                    }
                    setUploadError("");
                    setUploadFile(file);
                    if (file && !uploadTitle.trim()) setUploadTitle(file.name);
                  }}
                />
              </div>
              {uploadFile && <p className="mt-2 text-xs text-muted-foreground">Selected: {uploadFile.name} ({formatFileSize(uploadFile.size)})</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Term 1 2026 Report Card" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={uploadDescription} onChange={(e) => setUploadDescription(e.target.value)} placeholder="Optional notes" />
              </div>
            </div>

            <div className="flex justify-end">
              <Button disabled={!uploadFile || isUploading} onClick={uploadResult}>
                {isUploading ? "Uploading..." : "Upload Result"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Uploaded Results</CardTitle>
        </CardHeader>
        <CardContent>
          {resultDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No result documents uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resultDocuments.map((doc) => (
                <div key={doc.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start gap-3">
                    <div className="h-20 w-20 rounded-md border border-border overflow-hidden bg-muted/40 flex items-center justify-center">
                      {isImage(doc.mimeType) ? (
                        <img src={resolveApiPath(doc.url)} alt={doc.title} className="h-full w-full object-cover" />
                      ) : isPdf(doc.mimeType) ? (
                        <FileArchive className="h-8 w-8 text-red-600" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{doc.description || "No description"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(doc.createdAt)} • {formatFileSize(doc.fileSize)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <a href={resolveApiPath(doc.url)} target="_blank" rel="noreferrer" className="inline-flex">
                      <Button size="sm" variant="outline"><ExternalLink className="h-3.5 w-3.5 mr-1" />Open</Button>
                    </a>
                    <a href={resolveApiPath(doc.url)} download className="inline-flex">
                      <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5 mr-1" />Download</Button>
                    </a>
                    {canEdit && (
                      <Button size="sm" variant="destructive" onClick={() => deleteResult(doc.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
