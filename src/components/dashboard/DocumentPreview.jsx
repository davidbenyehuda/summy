import React, { useState, useRef } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import db from "@/api/client";
import { formatResearchSummary } from "./ResearchItemsList";

function formatAnalysisSummary(output) {
  const { text_page, further_research, short_explanation } = output;
  return [
    `${text_page.heading}\n${text_page.body}`,
    `${further_research.heading}\n${formatResearchSummary(further_research)}`,
    `סיכום קצר\n${short_explanation}`,
  ].join("\n\n");
}

function isImageFile(file) {
  return (
    file?.type?.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp)$/i.test(file?.name || "")
  );
}

export default function DocumentPreview({ onAnalyzed }) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [imageUploaded, setImageUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setImageUploaded(false);

    try {
      const upload = await db.integrations.Core.UploadDocument({ file });
      const result = await db.integrations.Core.ExtractDocument({
        file_url: upload.file_url,
      });

      if (result?.status === "success" && result.output) {
        const isImage = isImageFile(file);
        setImageUploaded(isImage);
        setUploadedFile(isImage ? null : file);
        onAnalyzed?.({ ...result, file, isImage });

        const me = await db.auth.me().catch(() => null);
        if (me) {
          await db.entities.SummaryHistory.create({
            user_id: me.id,
            file_name: file.name,
            file_url: result.file_url,
            result_url: result.result_url,
            title: result.title,
            summary_text: formatAnalysisSummary(result.output),
          });
        }
      }
    } catch (err) {
      console.error(err);
      const message =
        err.status === 401
          ? "יש להתחבר לפני העלאת מסמך."
          : err.message || "העלאת הקובץ נכשלה. נסה שוב.";
      setError(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="shrink-0">
      <div className="border border-dashed border-border rounded-xl p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.md,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => !uploading && fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              מעבד מסמך...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              העלאת מסמך
            </>
          )}
        </button>

        {uploadedFile && !isImageFile(uploadedFile) && (
          <p className="text-xs mt-2 text-muted-foreground flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            {uploadedFile.name}
          </p>
        )}

        {imageUploaded && !uploading && (
          <p className="text-xs mt-2 text-muted-foreground">התמונה הועלתה לצ&apos;אט</p>
        )}

        {error && <p className="text-xs mt-2 text-destructive">{error}</p>}
      </div>
    </div>
  );
}
