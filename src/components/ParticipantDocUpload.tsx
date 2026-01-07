import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, Download, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/use-user-role";
import { PdfViewer } from "./PdfViewer";

interface ParticipantDocUploadProps {
  participantId: string;
  participantName: string;
  dateOfBirth?: string | null;
}

interface DocFile {
  name: string;
  created_at: string;
}

// Genera un ID univoco basato sul nome della persona (normalizzato)
const getPersonKey = (name: string, dateOfBirth?: string | null): string => {
  const normalizedName = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // rimuove accenti
    .replace(/[^a-z0-9]/g, "_") // sostituisce caratteri speciali
    .replace(/_+/g, "_") // rimuove underscore multipli
    .trim();
  
  // Aggiungi data di nascita se disponibile per maggiore univocità
  const birthSuffix = dateOfBirth ? `_${dateOfBirth.replace(/-/g, "")}` : "";
  
  return `${normalizedName}${birthSuffix}`;
};

export function ParticipantDocUpload({ participantId, participantName, dateOfBirth }: ParticipantDocUploadProps) {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");
  const { isAdmin, isAgent } = useUserRole();
  
  // Usa la chiave persona invece dell'ID partecipante
  const personKey = getPersonKey(participantName, dateOfBirth);

  useEffect(() => {
    loadFiles();
  }, [personKey]);

  const loadFiles = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("participant-docs")
        .list(personKey, { sortBy: { column: "created_at", order: "desc" } });

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
      const filePath = `${personKey}/${fileName}`;

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
        .download(`${personKey}/${fileName}`);

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
        .remove([`${personKey}/${fileName}`]);

      if (error) throw error;

      toast.success("Documento eliminato");
      loadFiles();
    } catch (error) {
      console.error("Errore eliminazione:", error);
      toast.error("Errore nell'eliminazione");
    }
  };

  const handlePreview = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("participant-docs")
        .download(`${personKey}/${fileName}`);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setPreviewUrl(url);
      setPreviewFileName(formatFileName(fileName));
    } catch (error) {
      console.error("Errore preview:", error);
      toast.error("Errore nell'apertura del documento");
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewFileName("");
  };

  const formatFileName = (name: string) => {
    return name.replace(/^\d+_/, "");
  };

  return (
    <>
    <div className="space-y-2">
      {(isAdmin || isAgent) && (
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleUpload}
            className="hidden"
            id={`doc-upload-${participantId}`}
            disabled={uploading}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1 h-7 text-xs"
            disabled={uploading}
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById(`doc-upload-${participantId}`)?.click();
            }}
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            Doc. Identità
          </Button>
        </div>
      )}

      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : files.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nessun documento caricato</p>
      ) : (
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
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreview(file.name);
                }}
                title="Visualizza"
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(file.name);
                }}
                title="Scarica"
              >
                <Download className="h-3 w-3" />
              </Button>
              {(isAdmin || isAgent) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file.name);
                  }}
                  title="Elimina"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* PDF Preview */}
    {previewUrl && (
      <PdfViewer
        url={previewUrl}
        fileName={previewFileName}
        onClose={closePreview}
      />
    )}
    </>
  );
}
