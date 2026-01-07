import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/use-user-role";

interface ParticipantDocUploadProps {
  participantId: string;
  participantName: string;
}

interface DocFile {
  name: string;
  created_at: string;
}

export function ParticipantDocUpload({ participantId, participantName }: ParticipantDocUploadProps) {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isAgent } = useUserRole();

  useEffect(() => {
    loadFiles();
  }, [participantId]);

  const loadFiles = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("participant-docs")
        .list(participantId, { sortBy: { column: "created_at", order: "desc" } });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error("Errore caricamento documenti:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verifica che sia un PDF
    if (file.type !== "application/pdf") {
      toast.error("Sono ammessi solo file PDF");
      return;
    }

    // Limite 2MB per documenti identità
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Il file non può superare i 2MB");
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${participantId}/${fileName}`;

      const { error } = await supabase.storage
        .from("participant-docs")
        .upload(filePath, file, { contentType: "application/pdf" });

      if (error) throw error;

      toast.success("Documento caricato");
      loadFiles();
    } catch (error: any) {
      console.error("Errore upload:", error);
      toast.error(error.message || "Errore nel caricamento");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDownload = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("participant-docs")
        .download(`${participantId}/${fileName}`);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.replace(/^\d+_/, "");
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Errore download:", error);
      toast.error("Errore nel download");
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm("Eliminare questo documento?")) return;

    try {
      const { error } = await supabase.storage
        .from("participant-docs")
        .remove([`${participantId}/${fileName}`]);

      if (error) throw error;

      toast.success("Documento eliminato");
      loadFiles();
    } catch (error) {
      console.error("Errore eliminazione:", error);
      toast.error("Errore nell'eliminazione");
    }
  };

  const formatFileName = (name: string) => {
    return name.replace(/^\d+_/, "");
  };

  return (
    <div className="space-y-2">
      {(isAdmin || isAgent) && (
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".pdf"
            onChange={handleUpload}
            className="hidden"
            id={`doc-upload-${participantId}`}
            disabled={uploading}
          />
          <label htmlFor={`doc-upload-${participantId}`}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 cursor-pointer h-7 text-xs"
              asChild
              disabled={uploading}
            >
              <span>
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3" />
                )}
                Doc. Identità
              </span>
            </Button>
          </label>
        </div>
      )}

      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : files.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {files.map((file) => (
            <div
              key={file.name}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted text-xs"
            >
              <FileText className="h-3 w-3 text-red-500" />
              <span className="max-w-[100px] truncate">{formatFileName(file.name)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0"
                onClick={() => handleDownload(file.name)}
              >
                <Download className="h-3 w-3" />
              </Button>
              {(isAdmin || isAgent) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(file.name)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
