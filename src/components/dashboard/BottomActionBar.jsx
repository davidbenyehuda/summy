import React from "react";
import { Presentation, Video, FileDown, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACTIONS = [
  { label: "יצוא PDF", icon: FileDown, variant: "default" },
];

export default function BottomActionBar() {
  return (
    <div className="sticky bottom-0 z-10 border-t border-border bg-card/95 backdrop-blur-md px-4 py-3 shrink-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground hidden lg:block whitespace-nowrap">יצא את חומרי הלמידה שלך</p>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant={action.variant}
                className={`flex-1 lg:flex-none gap-1.5 text-xs h-9 px-3 font-medium ${
                  action.variant === "default"
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20"
                    : "border-border hover:bg-muted"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}