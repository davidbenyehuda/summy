import React from "react";
import { ExternalLink, Sparkles } from "lucide-react";

function getResearchItems(furtherResearch) {
  if (!furtherResearch) return [];
  if (Array.isArray(furtherResearch.items) && furtherResearch.items.length > 0) {
    return furtherResearch.items;
  }
  if (furtherResearch.body) {
    return [{ title: furtherResearch.heading || "מחקר נוסף", text: furtherResearch.body, url: "" }];
  }
  return [];
}

function sortResearchItems(items) {
  return [...items].sort((a, b) => Number(Boolean(b.is_new)) - Number(Boolean(a.is_new)));
}

export function formatResearchSummary(furtherResearch) {
  const items = getResearchItems(furtherResearch);
  if (!items.length) return "";
  return items
    .map((item) => {
      const parts = [];
      if (item.concept) parts.push(`מושג: ${item.concept}`);
      parts.push(item.title, item.text, item.url);
      return parts.filter(Boolean).join("\n");
    })
    .join("\n\n");
}

function ResearchLegend({ isDark }) {
  const base = "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full";
  return (
    <div className="flex flex-wrap gap-2 mb-1">
      <span className={isDark ? `${base} bg-white/10 text-white/70` : `${base} bg-muted text-muted-foreground`}>
        מקור ראשוני
      </span>
      <span
        className={
          isDark
            ? `${base} bg-amber-500/20 text-amber-200 border border-amber-400/30`
            : `${base} bg-amber-100 text-amber-900 border border-amber-300`
        }
      >
        <Sparkles className="w-3 h-3" />
        נוסף מהשיחה
      </span>
    </div>
  );
}

function ResearchCard({ item, index, isDark }) {
  const isNew = Boolean(item.is_new);

  const cardClass = isNew
    ? isDark
      ? "bg-amber-500/10 p-5 rounded-xl border border-amber-400/40"
      : "rounded-lg border border-amber-300 bg-amber-50 p-4"
    : isDark
      ? "bg-white/5 p-5 rounded-xl border border-white/10"
      : "rounded-lg border border-border bg-muted/20 p-4";

  const titleClass = isDark
    ? "text-base font-semibold mb-2"
    : "text-sm font-semibold text-foreground mb-1";

  const textClass = isDark
    ? "text-white/70 text-sm leading-relaxed mb-3"
    : "text-sm text-foreground/80 leading-relaxed mb-2";

  const linkClass = isNew
    ? isDark
      ? "inline-flex items-center gap-1.5 text-sm text-amber-200 hover:text-amber-100 break-all"
      : "inline-flex items-center gap-1.5 text-sm text-amber-800 hover:underline break-all"
    : isDark
      ? "inline-flex items-center gap-1.5 text-sm text-sky-300 hover:text-sky-200 break-all"
      : "inline-flex items-center gap-1.5 text-sm text-primary hover:underline break-all";

  const conceptClass = isNew
    ? isDark
      ? "inline-block text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-100 mb-2"
      : "inline-block text-xs px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 mb-2"
    : isDark
      ? "inline-block text-xs px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-200 mb-2"
      : "inline-block text-xs px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-900 mb-2";

  return (
    <article key={`${item.url || item.title}-${index}`} className={cardClass}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {isNew && (
          <span
            className={
              isDark
                ? "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-400/25 text-amber-100"
                : "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-300 text-amber-950"
            }
          >
            <Sparkles className="w-3 h-3" />
            חדש מהשיחה
          </span>
        )}
        {item.concept && <span className={conceptClass}>מושג למידה: {item.concept}</span>}
      </div>
      <h3 className={titleClass}>{item.title}</h3>
      <p className={textClass}>{item.text}</p>
      {item.url && (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          {item.url}
        </a>
      )}
    </article>
  );
}

export default function ResearchItemsList({ furtherResearch, variant = "dark" }) {
  const items = sortResearchItems(getResearchItems(furtherResearch));
  const isDark = variant === "dark";
  const hasNewItems = items.some((item) => item.is_new);

  if (!items.length) {
    return (
      <p className={isDark ? "text-white/50 text-center py-10" : "text-sm text-muted-foreground"}>
        לא נמצאו מקורות למחקר נוסף.
      </p>
    );
  }

  const originalItems = items.filter((item) => !item.is_new);
  const newItems = items.filter((item) => item.is_new);

  return (
    <div className="space-y-5">
      {hasNewItems && <ResearchLegend isDark={isDark} />}

      {newItems.length > 0 && (
        <section className="space-y-4">
          {originalItems.length > 0 && (
            <h3 className={isDark ? "text-sm font-medium text-amber-200/90" : "text-sm font-medium text-amber-800"}>
              מומלץ לפי השיחה האחרונה
            </h3>
          )}
          {newItems.map((item, index) => (
            <ResearchCard key={`new-${item.url || item.title}-${index}`} item={item} index={index} isDark={isDark} />
          ))}
        </section>
      )}

      {originalItems.length > 0 && (
        <section className="space-y-4">
          {newItems.length > 0 && (
            <h3 className={isDark ? "text-sm font-medium text-white/60" : "text-sm font-medium text-muted-foreground"}>
              מקורות מהניתוח הראשוני
            </h3>
          )}
          {originalItems.map((item, index) => (
            <ResearchCard
              key={`orig-${item.url || item.title}-${index}`}
              item={item}
              index={index}
              isDark={isDark}
            />
          ))}
        </section>
      )}
    </div>
  );
}
