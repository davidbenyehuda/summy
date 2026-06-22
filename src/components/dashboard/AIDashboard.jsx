import React, { useState } from "react";
import { Lightbulb, Sparkles, GitBranch, BrainCircuit, Trophy } from "lucide-react";
import AITabContent from "./AITabContent";
import GameTab from "./GameTab";

const TABS = [
  { id: "simple", label: "הסבר פשוט", icon: Lightbulb },
  { id: "analogy", label: "אנלוגיה", icon: Sparkles },
  { id: "visual", label: "מבנה ויזואלי", icon: GitBranch },
  { id: "game", label: "משחק", icon: Trophy },
];

export default function AIDashboard() {
  const [activeTab, setActiveTab] = useState("simple");

  return (
    <div className="flex flex-col h-full bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <BrainCircuit className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground font-heading leading-tight">עוזר למידה AI</h2>
            <p className="text-xs text-muted-foreground">מופעל על ידי AI אדפטיבי</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/60 rounded-lg p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? tab.id === "game"
                      ? "bg-yellow-100 text-yellow-700 shadow-sm"
                      : "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline sm:hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "game" ? <GameTab /> : <AITabContent activeTab={activeTab} />}
    </div>
  );
}