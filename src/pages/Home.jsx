import React, { useState } from "react";
import db from "@/api/client";
import TopNav from "../components/dashboard/TopNav";
import DocumentPreview from "../components/dashboard/DocumentPreview";
import BottomActionBar from "../components/dashboard/BottomActionBar";

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "העלה מסמך ואשאל אותך שאלות עליו." }
  ]);
  const [input, setInput] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [documentTitle, setDocumentTitle] = useState(null);

  const handleAnalyzed = (result) => {
    setAnalysis(result.output);
    setDocumentTitle(result.title);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: `הועלה קובץ: ${result.title}` },
      { role: "assistant", content: "המסמך נותח בהצלחה. אפשר לשאול עליו כאן." }
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim() || !analysis) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const reply = await db.integrations.Core.InvokeLLM({ prompt: userMessage });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "לא הצלחתי לענות כרגע. נסה שוב." }
      ]);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" dir="rtl">
      <TopNav />

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        <div className="lg:w-[320px] border-b lg:border-b-0 lg:border-l border-border p-3 shrink-0 max-h-[45vh] lg:max-h-none lg:h-auto flex flex-col">
          <DocumentPreview onAnalyzed={handleAnalyzed} />
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          {documentTitle && (
            <div className="px-4 py-2 border-b border-border text-sm font-medium truncate">
              {documentTitle}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[85%] p-3 rounded-xl text-sm ${
                  msg.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "mr-auto bg-muted"
                }`}
              >
                {msg.content}
              </div>
            ))}

            {analysis && (
              <div className="mr-auto max-w-[90%] rounded-xl border border-border bg-card p-4 text-sm space-y-3">
                <div>
                  <h3 className="font-semibold mb-1">{analysis.text_page.heading}</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap text-xs leading-relaxed">
                    {analysis.text_page.body}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <h3 className="font-semibold text-xs mb-1">סיכום קצר</h3>
                  <p className="text-muted-foreground text-xs">{analysis.short_explanation}</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border p-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={analysis ? "שאל על המסמך..." : "העלה מסמך כדי להתחיל..."}
              disabled={!analysis}
              className="flex-1 px-3 py-2 rounded-md border border-border bg-background disabled:opacity-50"
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              disabled={!analysis}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
            >
              שלח
            </button>
          </div>
        </div>
      </div>

      <BottomActionBar />
    </div>
  );
}
