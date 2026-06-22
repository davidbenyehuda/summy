import db from '@/api/client';

import React, { useState, useRef, useEffect } from "react";

import { Loader2, X, BookOpen } from "lucide-react";

export default function GlossaryTooltip({ term, children }) {
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleClick = async (e) => {
    e.stopPropagation();
    setOpen(true);
    if (explanation) return;
    setLoading(true);
    try {
      const res = await db.integrations.Core.InvokeLLM({
        prompt: `You are a biology teacher. Give a clear, concise 2-sentence explanation of the term "${term}" as used in the context of photosynthesis and plant biology. Keep it simple enough for a high school student.`,
      });
      setExplanation(res);
    } catch {
      setExplanation("Could not load explanation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="relative inline" ref={ref}>
      <button
        onClick={handleClick}
        className="inline text-left underline decoration-dotted decoration-primary/50 text-primary/80 hover:text-primary cursor-pointer font-medium transition-colors"
      >
        {children}
      </button>
      {open && (
        <span className="absolute z-50 left-0 top-full mt-1.5 w-64 bg-primary text-primary-foreground rounded-xl shadow-xl p-3 text-left block"
          style={{ minWidth: "220px" }}>
          <span className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider opacity-70">
              <BookOpen className="w-3 h-3" />
              {term}
            </span>
            <button onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              className="opacity-60 hover:opacity-100 transition-opacity">
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
          {loading
            ? <span className="flex items-center gap-2 text-xs opacity-70"><Loader2 className="w-3 h-3 animate-spin" />Explaining...</span>
            : <span className="text-xs leading-relaxed opacity-90">{explanation}</span>
          }
        </span>
      )}
    </span>
  );
}