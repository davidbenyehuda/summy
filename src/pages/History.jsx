import db from '@/api/client';

import React, { useState, useEffect } from "react";

import TopNav from "@/components/dashboard/TopNav";
import { FileText, Trash2, Clock, ChevronLeft, Lightbulb, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

function HistoryAnalysisView({ output }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-foreground mb-1">{output.text_page.heading}</p>
        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{output.text_page.body}</p>
      </div>
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Lightbulb className="w-3.5 h-3.5 text-primary" />
          <p className="text-xs font-semibold text-foreground">סיכום קצר</p>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">{output.short_explanation}</p>
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Search className="w-3.5 h-3.5 text-primary/70" />
          <p className="text-xs font-semibold text-foreground">{output.further_research.heading}</p>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{output.further_research.body}</p>
      </div>
    </div>
  );
}

export default function History() {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [expandedData, setExpandedData] = useState({});

  useEffect(() => {
    const load = async () => {
      const me = await db.auth.me();
      const results = await db.entities.SummaryHistory.filter({ user_id: me.id }, "-created_date", 50);
      setSummaries(results);
      setLoading(false);
    };
    load();
  }, []);

  const handleDelete = async (id) => {
    await db.entities.SummaryHistory.delete(id);
    setSummaries(prev => prev.filter(s => s.id !== id));
    setExpandedData(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleExpand = async (summary) => {
    if (expanded === summary.id) {
      setExpanded(null);
      return;
    }
    setExpanded(summary.id);
    if (summary.result_url && !expandedData[summary.id]) {
      try {
        const res = await fetch(summary.result_url);
        const data = await res.json();
        if (data?.output) {
          setExpandedData(prev => ({ ...prev, [summary.id]: data.output }));
        }
      } catch {
        // fall back to summary_text
      }
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopNav />
      <div className="flex-1 overflow-y-auto p-5 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground font-heading">היסטוריית סיכומים</h1>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!loading && summaries.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">עוד לא יצרת סיכומים</p>
            <Link to="/">
              <Button className="mt-4 gap-1.5" size="sm">
                התחל לסכם <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {summaries.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{s.title || s.file_name || "סיכום ללא שם"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(s.created_date).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => handleExpand(s)}>
                    <ChevronLeft className={`w-4 h-4 transition-transform ${expanded === s.id ? "rotate-90" : "-rotate-90"}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(s.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {expanded === s.id && (
                <div className="mt-3 pt-3 border-t border-border">
                  {expandedData[s.id] ? (
                    <HistoryAnalysisView output={expandedData[s.id]} />
                  ) : s.summary_text ? (
                    <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {s.summary_text}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}