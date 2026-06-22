import React from "react";
import { Check } from "lucide-react";

export function OptionCard({ value, label, icon: Icon, emoji, selected, onClick, description }) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all duration-150 ${
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
      }`}
    >
      {emoji && (
        <span className="text-xl shrink-0 w-8 text-center">{emoji}</span>
      )}
      {Icon && (
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selected ? "bg-primary/10" : "bg-muted"}`}>
          <Icon className={`w-4 h-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-tight ${selected ? "text-primary" : "text-foreground"}`}>{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>}
      </div>
      {selected && (
        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

export function MultiSelectGrid({ options, selected, onChange }) {
  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all duration-150 ${
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <span className="text-base">{opt.emoji}</span>
            <span className={`text-xs font-medium leading-tight ${isSelected ? "text-primary" : "text-foreground"}`}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}