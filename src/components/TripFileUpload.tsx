import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Trash2, Download, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/use-user-role";

interface TripFileUploadProps {
  tripId: string;
}

interface TripFile {
  name: string;
  created_at: string;
}

export function TripFileUpload({ tripId }: TripFileUploadProps) {
  const [files, setFiles] = useState<TripFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isAgent } = useUserRole();

  useEffect(() => {
    loadFiles();
  }, [tripId]);

  const loadFiles = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("trip-files")
        .list(tripId, { sortBy: { column: "created_at", order: "desc" } });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error("Errore caricamento file:", error);
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

    // Limite 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Il file non può superare i 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${tripId}/${fileName}`;

      const { error } = await supabase.storage
        .from("trip-files")
        .upload(filePath, file, { contentType: "application/pdf" });

      if (error) throw error;

      toast.success("File caricato con successo");
      loadFiles();
    } catch (error: any) {
      console.error("Errore upload:", error);
      toast.error(error.message || "Errore nel caricamento del file");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDownload = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("trip-files")
        .download(`${tripId}/${fileName}`);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.replace(/^\d+_/, "");
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Errore download:", error);
      toast.error("Errore nel download del file");
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm("Eliminare questo file?")) return;

    try {
      const { error } = await supabase.storage
        .from("trip-files")
        .remove([`${tripId}/${fileName}`]);

      if (error) throw error;

      toast.success("File eliminato");
      loadFiles();
    } catch (error) {
      console.error("Errore eliminazione:", error);
      toast.error("Errore nell'eliminazione del file");
    }
  };

  const handlePreview = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("trip-files")
        .download(`${tripId}/${fileName}`);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      window.open(url, '_blank');
    } catch (error) {
      console.error("Errore preview:", error);
      toast.error("Errore nell'apertura del documento");
    }
  };

  const formatFileName = (name: string) => {
    return name.replace(/^\d+_/, "");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Documenti Viaggio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(isAdmin || isAgent) && (
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleUpload}
              className="hidden"
              id="trip-file-upload"
              disabled={uploading}
            />
            <Button
              variant="outline"
              className="gap-2"
              disabled={uploading}
              onClick={() => document.getElementById("trip-file-upload")?.click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Carica PDF
            </Button>
            <span className="text-xs text-muted-foreground">Max 5MB</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nessun documento caricato
          </p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-red-500 shrink-0" />
                  <span className="text-sm truncate">{formatFileName(file.name)}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePreview(file.name)}
                    title="Visualizza"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(file.name)}
                    title="Scarica"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {(isAdmin || isAgent) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(file.name)}
                      title="Elimina"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
