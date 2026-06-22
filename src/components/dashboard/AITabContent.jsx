import React from "react";
import { Lightbulb, Sparkles, GitBranch, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const TABS_DATA = {
  simple: {
    icon: Lightbulb,
    title: "הסבר פשוט",
    content: [
      {
        label: "מה זה פוטוסינתזה?",
        text: "חשבו על פוטוסינתזה כמו על מתכון. הצמחים לוקחים שלושה מרכיבים פשוטים — אור שמש, מים ופחמן דו-חמצני — ומערבבים אותם בתוך העלים שלהם. התוצאה? סוכר למזון וחמצן לנשימה שלנו. זה כמו המטבח של הצמח, המופעל לחלוטין על ידי אור השמש."
      },
      {
        label: "למה זה חשוב?",
        text: "ללא פוטוסינתזה, לא היה חמצן באטמוספרה שלנו ולא היתה שרשרת מזון. כל כריך שאתם אוכלים, כל נשימה שאתם לוקחים — הכל מתחקה לצמח שלוכד אור שמש. זוהי הבסיס של כמעט כל החיים על פני כדור הארץ."
      },
      {
        label: "נקודת המפתח",
        text: "אור שמש + מים + CO₂ → גלוקוז + חמצן. זה הכל. התהליך כולו בשורה אחת. כל השאר הם רק הפרטים המרתקים של האופן שבו הצמחים מבצעים את תעלול הקסם הכימי הזה."
      }
    ]
  },
  analogy: {
    icon: Sparkles,
    title: "אנלוגיה",
    content: [
      {
        label: "המפעל שפועל על אנרגיית שמש",
        text: "דמיינו מפעל שפועל לחלוטין על אנרגיית שמש. הפאנלים הסולאריים על הגג הם כמו כלורופיל — הם לוכדים אנרגיה מהשמש. משאיות המשלוח מביאות חומרי גלם (מים מהשורשים, CO₂ מהאוויר). בתוך המפעל, פועלים (אנזימים) מרכיבים את החומרים האלה למוצר הסופי: חבילות סוכר שמניעות את כל הצמח."
      },
      {
        label: "שתי המשמרות",
        text: "המפעל הזה עובד בשתי משמרות. משמרת היום (תגובות האור) עובדת רק כשהשמש זורחת — היא לוכדת אנרגיה ומאחסנת אותה בסוללות (ATP ו-NADPH). משמרת הלילה (מחזור קלווין) יכולה לעבוד בכל עת — היא משתמשת בסוללות האלה כדי לבנות את הסוכר בפועל. שתי המשמרות הכרחיות."
      },
      {
        label: "תוצר הלוואי",
        text: "זה החלק היפה: תוצר הלוואי של המפעל הוא חמצן. דמיינו אם כל מפעל על פני כדור הארץ היה מנקה את האוויר כתוצר לוואי של ייצור המוצר שלו. זה מה שכל עלה על כל עץ עושה, עכשיו."
      }
    ]
  },
  visual: {
    icon: GitBranch,
    title: "מבנה ויזואלי",
    content: [
      {
        label: "תהליך זרימה",
        isVisual: true,
        steps: [
          { step: "1", label: "ספיגת אור", detail: "כלורופיל לוכד פוטונים" },
          { step: "2", label: "פיצול מים", detail: "H₂O → O₂ + H⁺ + e⁻" },
          { step: "3", label: "אחסון אנרגיה", detail: "מיוצרים ATP ו-NADPH" },
          { step: "4", label: "קיבוע פחמן", detail: "CO₂ → G3P → גלוקוז" }
        ]
      },
      {
        label: "קלט מול פלט",
        isTable: true,
        rows: [
          { input: "אור שמש", output: "גלוקוז (C₆H₁₂O₆)" },
          { input: "מים (H₂O)", output: "חמצן (O₂)" },
          { input: "פחמן דו-חמצני (CO₂)", output: "אנרגיה (ATP)" }
        ]
      }
    ]
  }
};

export default function AITabContent({ activeTab }) {
  const data = TABS_DATA[activeTab];
  const Icon = data.icon;

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-accent/10 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-accent" />
          </div>
          <h3 className="text-sm font-semibold text-foreground font-heading">{data.title}</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5 h-7">
          <RefreshCw className="w-3 h-3" />
          רענן
        </Button>
      </div>

      <div className="space-y-4">
        {data.content.map((block, i) => {
          if (block.isVisual) {
            return (
              <div key={i} className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">{block.label}</p>
                <div className="space-y-0">
                  {block.steps.map((s, j) => (
                    <div key={j} className="flex items-start gap-3 relative">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                          {s.step}
                        </div>
                        {j < block.steps.length - 1 && (
                          <div className="w-px h-8 bg-border" />
                        )}
                      </div>
                      <div className="pb-5">
                        <p className="text-sm font-medium text-foreground leading-tight">{s.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (block.isTable) {
            return (
              <div key={i} className="rounded-lg border border-border overflow-hidden">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-2 bg-muted/30">{block.label}</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">קלט</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">פלט</th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, j) => (
                      <tr key={j} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 text-sm text-foreground">{row.input}</td>
                        <td className="px-4 py-2.5 text-sm text-accent font-medium">{row.output}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          return (
            <div key={i} className="rounded-lg border border-border bg-card p-4 transition-all hover:shadow-sm">
              <p className="text-xs font-medium text-accent uppercase tracking-wider mb-1.5">{block.label}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{block.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}