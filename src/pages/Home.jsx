import React, { useState } from "react";
import TopNav from "../components/dashboard/TopNav";
import DocumentPreview from "../components/dashboard/DocumentPreview";
import AIDashboard from "../components/dashboard/AIDashboard";
import BottomActionBar from "../components/dashboard/BottomActionBar";
import { FileText, BrainCircuit } from "lucide-react";

export default function Home() {
  const [mobileTab, setMobileTab] = useState("doc");

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopNav />

      {/* Mobile tab switcher */}
      <div className="flex lg:hidden border-b border-border bg-card shrink-0">
        <button
          onClick={() => setMobileTab("doc")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            mobileTab === "doc" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          }`}
        >
          <FileText className="w-4 h-4" /> מסמך
        </button>
        <button
          onClick={() => setMobileTab("ai")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            mobileTab === "ai" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          }`}
        >
          <BrainCircuit className="w-4 h-4" /> עוזר AI
        </button>
      </div>

      {/* Split Screen — desktop side by side, mobile tab-switched */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-hidden min-h-0">
        {/* Left Panel — Document Preview */}
        <div className={`flex-1 min-h-0 lg:min-w-0 ${mobileTab === "doc" ? "flex" : "hidden"} lg:flex flex-col`}>
          <DocumentPreview />
        </div>

        {/* Right Panel — AI Dashboard */}
        <div className={`flex-1 min-h-0 lg:min-w-0 ${mobileTab === "ai" ? "flex" : "hidden"} lg:flex flex-col`}>
          <AIDashboard />
        </div>
      </div>

      <BottomActionBar />
    </div>
  );
}