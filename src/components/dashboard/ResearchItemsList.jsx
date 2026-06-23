import React from "react";
import { ExternalLink } from "lucide-react";

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

export function formatResearchSummary(furtherResearch) {
  const items = getResearchItems(furtherResearch);
  if (!items.length) return "";
  return items
    .map((item) => [item.title, item.text, item.url].filter(Boolean).join("\n"))
    .join("\n\n");
}

export default function ResearchItemsList({
  furtherResearch,
  variant = "dark",
}) {
  const items = getResearchItems(furtherResearch);
  const isDark = variant === "dark";

  if (!items.length) {
    return (
      <p className={isDark ? "text-white/50 text-center py-10" : "text-sm text-muted-foreground"}>
        לא נמצאו מקורות למחקר נוסף.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <article
          key={`${item.url || item.title}-${index}`}
          className={
            isDark
              ? "bg-white/5 p-5 rounded-xl border border-white/10"
              : "rounded-lg border border-border bg-muted/20 p-4"
          }
        >
          <h3
            className={
              isDark
                ? "text-base font-semibold mb-2"
                : "text-sm font-semibold text-foreground mb-1"
            }
          >
            {item.title}
          </h3>
          <p
            className={
              isDark
                ? "text-white/70 text-sm leading-relaxed mb-3"
                : "text-sm text-foreground/80 leading-relaxed mb-2"
            }
          >
            {item.text}
          </p>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={
                isDark
                  ? "inline-flex items-center gap-1.5 text-sm text-sky-300 hover:text-sky-200 break-all"
                  : "inline-flex items-center gap-1.5 text-sm text-primary hover:underline break-all"
              }
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              {item.url}
            </a>
          )}
        </article>
      ))}
    </div>
  );
}
