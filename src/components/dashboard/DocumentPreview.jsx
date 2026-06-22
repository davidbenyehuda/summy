import React, { useState, useRef } from "react";
import db from "@/api/client";

export default function DocumentPreview() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractedContent, setExtractedContent] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });

      setUploadedFile(file);

      const result = await db.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  heading: { type: "string" },
                  body: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result?.status === "success") {
        setExtractedContent(result.output.sections);
      }
    } catch (err) {
      console.error(err);
    }

    setUploading(false);
  };

  return (
    <div className="h-full flex flex-col gap-3">

      {/* Upload box */}
      <div className="border border-dashed border-border p-3 rounded-lg">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2 bg-blue-600 text-white rounded-md"
        >
          {uploading ? "Uploading..." : "Upload Document"}
        </button>

        {uploadedFile && (
          <p className="text-xs mt-2 text-muted-foreground">
            {uploadedFile.name}
          </p>
        )}
      </div>

      {/* Document preview */}
      <div className="flex-1 overflow-y-auto border border-border rounded-lg p-3 bg-card">
        {!extractedContent && (
          <p className="text-sm text-muted-foreground">
            No document uploaded yet
          </p>
        )}

        {extractedContent?.map((section, i) => (
          <div key={i} className="mb-4">
            <h3 className="font-semibold text-sm mb-1">
              {section.heading}
            </h3>
            <p className="text-xs text-muted-foreground">
              {section.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}