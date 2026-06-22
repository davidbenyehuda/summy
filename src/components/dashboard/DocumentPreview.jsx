import db from '@/api/client';

import React, { useState, useRef } from "react";
import { FileText, Upload, X, BookOpen, Lightbulb, Search } from "lucide-react";
import GlossaryTooltip from "./GlossaryTooltip";

const SAMPLE_CONTENT = [
  {
    heading: "1. מבוא לפוטוסינתזה",
    segments: [
      { text: "פוטוסינתזה היא התהליך הביולוגי שבאמצעותו צמחים ירוקים, אצות וחיידקים מסוימים ממירים אנרגיית אור לאנרגיה כימית המאוחסנת ב-" },
      { term: "גלוקוז", text: "גלוקוז" },
      { text: ". תהליך זה חיוני לחיים על פני כדור הארץ, שכן הוא מספק את המקור העיקרי ל-" },
      { term: "חמצן", text: "חמצן" },
      { text: " באטמוספרה ומהווה את בסיס שרשרת המזון." },
    ]
  },
  {
    heading: "2. תגובות התלויות באור",
    segments: [
      { text: "תגובות אלו מתרחשות ב" },
      { term: "ממברנות הת׳ילקואיד", text: "ממברנות הת׳ילקואיד" },
      { text: " של ה" },
      { term: "כלורופלסט", text: "כלורופלסט" },
      { text: ". כאשר אור נקלט על ידי " },
      { term: "כלורופיל", text: "כלורופיל" },
      { text: ", הוא מעורר אלקטרונים שעוברים דרך " },
      { term: "שרשרת העברת אלקטרונים", text: "שרשרת העברת האלקטרונים" },
      { text: ", ומייצרים " },
      { term: "ATP", text: "ATP" },
      { text: " ו-" },
      { term: "NADPH", text: "NADPH" },
      { text: " כמוליכי אנרגיה." },
    ]
  },
  {
    heading: "3. מחזור קלווין (תגובות עצמאיות מאור)",
    segments: [
      { text: "המתרחש ב" },
      { term: "סטרומה", text: "סטרומה" },
      { text: " של הכלורופלסט, " },
      { term: "מחזור קלווין", text: "מחזור קלווין" },
      { text: " משתמש ב-ATP וב-NADPH לקיבוע " },
      { term: "פחמן דו-חמצני", text: "פחמן דו-חמצני (CO₂)" },
      { text: " למולקולות אורגניות. בסופו של דבר מיוצר גלוקוז (C₆H₁₂O₆) שבו הצמח משתמש לאנרגיה וצמיחה." },
    ]
  },
  {
    heading: "4. גורמים המשפיעים על הפוטוסינתזה",
    segments: [
      { text: "קצב הפוטוסינתזה מושפע מגורמים סביבתיים כולל " },
      { term: "עוצמת האור", text: "עוצמת האור" },
      { text: ", " },
      { term: "ריכוז פחמן דו-חמצני", text: "ריכוז פחמן דו-חמצני" },
      { text: ", טמפרטורה וזמינות מים." },
    ]
  }
];

function formatAnalysisSummary(output) {
  const { text_page, further_research, short_explanation } = output;
  return [
    `${text_page.heading}\n${text_page.body}`,
    `${further_research.heading}\n${further_research.body}`,
    `סיכום קצר\n${short_explanation}`,
  ].join("\n\n");
}

function AnalysisView({ output }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground font-display mb-1.5 leading-snug">
          {output.text_page.heading}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {output.text_page.body}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground font-display">
            {output.short_explanation ? "סיכום קצר" : ""}
          </h3>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">
          {output.short_explanation}
        </p>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Search className="w-3.5 h-3.5 text-primary/70" />
          <h3 className="text-sm font-semibold text-foreground font-display leading-snug">
            {output.further_research.heading}
          </h3>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {output.further_research.body}
        </p>
      </div>
    </div>
  );
}

export default function DocumentPreview() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analysisOutput, setAnalysisOutput] = useState(null);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowUploadZone(false);
    setUploading(true);
    try {
      const result = await db.integrations.Core.AnalyzeDocument({ file });
      if (result?.status === "success" && result.output) {
        setUploadedFile({ name: file.name, url: result.file_url });
        setAnalysisOutput(result.output);

        const summaryText = formatAnalysisSummary(result.output);
        const me = await db.auth.me().catch(() => null);
        if (me) {
          await db.entities.SummaryHistory.create({
            user_id: me.id,
            file_name: file.name,
            file_url: result.file_url,
            result_url: result.result_url,
            title: result.title,
            summary_text: summaryText,
          });
        }
      }
    } catch {
      // fallback to sample content
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setUploadedFile(null);
    setAnalysisOutput(null);
    setShowUploadZone(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground font-heading truncate">
            {uploadedFile ? uploadedFile.name : "פוטוסינתזה — ביולוגיה 101"}
          </h2>
        </div>
        {uploadedFile && (
          <button onClick={handleClear} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mr-2">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-4 pt-3 pb-2 shrink-0">
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" className="hidden" onChange={handleFileChange} />
        {!showUploadZone && !uploadedFile ? (
          <button
            onClick={() => setShowUploadZone(true)}
            className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            העלאת קובץ חדש
          </button>
        ) : showUploadZone && !uploadedFile ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Upload className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">{uploading ? "מעבד קובץ..." : "העלאת קובץ לימוד"}</p>
            <p className="text-xs text-muted-foreground text-center">PDF, Word, תמונה — לחץ לבחירה</p>
          </div>
        ) : uploadedFile ? (
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3 h-3 text-primary/60" />
            <p className="text-xs text-primary/70">לחץ על <span className="underline decoration-dotted font-medium">מונחים מסומנים</span> לקבלת הסבר AI</p>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {analysisOutput ? (
          <AnalysisView output={analysisOutput} />
        ) : (
          <div className="space-y-5">
            {SAMPLE_CONTENT.map((section, i) => (
              <div key={i}>
                <h3 className="text-sm font-semibold text-foreground font-display mb-1.5 leading-snug">{section.heading}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {section.segments.map((seg, j) =>
                    seg.term
                      ? <GlossaryTooltip key={j} term={seg.term}>{seg.text}</GlossaryTooltip>
                      : <span key={j}>{seg.text}</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
        <span className="text-xs text-muted-foreground">{uploadedFile ? "הועלה זה עתה" : "הועלה לפני שעתיים"}</span>
        <span className="text-xs font-medium text-primary/70">{uploadedFile ? uploadedFile.name.split('.').pop().toUpperCase() : "PDF • 2.4 MB"}</span>
      </div>
    </div>
  );
}
