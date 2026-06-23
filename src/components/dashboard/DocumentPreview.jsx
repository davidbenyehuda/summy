import React, { useState, useRef } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import db from "@/api/client";

function formatAnalysisSummary(output) {
  const { text_page, further_research, short_explanation } = output;
  return [
    `${text_page.heading}\n${text_page.body}`,
    `${further_research.heading}\n${further_research.body}`,
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
  const [analysisOutput, setAnalysisOutput] = useState(null);
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
        setAnalysisOutput(isImage ? null : result.output);
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
    <div className="h-full flex flex-col gap-3">
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

        {error && <p className="text-xs mt-2 text-destructive">{error}</p>}
      </div>

      {!imageUploaded && (
      <div className="flex-1 overflow-y-auto border border-border rounded-xl p-3 bg-card">
        {!analysisOutput ? (
          <p className="text-sm text-muted-foreground">
            {uploading ? "מנתח את המסמך..." : "עדיין לא הועלה מסמך"}
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-1">{analysisOutput.text_page.heading}</h3>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {analysisOutput.text_page.body}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <h3 className="font-semibold text-xs mb-1">סיכום קצר</h3>
              <p className="text-xs text-muted-foreground">{analysisOutput.short_explanation}</p>
            </div>
            <div>
              <h3 className="font-semibold text-xs mb-1">{analysisOutput.further_research.heading}</h3>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {analysisOutput.further_research.body}
              </p>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
