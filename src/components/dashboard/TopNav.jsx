const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { Bell, User, LogOut, ChevronDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Link } from "react-router-dom";

export default function TopNav() {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    db.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = () => db.auth.logout("/login");

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-5 shrink-0">
      {/* Logo — right side (RTL) */}
      <div className="flex items-center gap-2.5">
        <img src="https://media.db.com/images/public/6a2ef90d221e3790adb700f6/77c33375d_SAMMY.webp" alt="Sammy" className="w-9 h-9 object-contain" />
        <span className="text-sm font-bold text-foreground font-heading tracking-tight">סמ"י - סיכום מידע</span>
      </div>

      {/* Left side actions (RTL) */}
      <div className="flex items-center gap-1">
        <Link to="/history" className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg hover:bg-muted/60 transition-colors text-xs font-medium text-muted-foreground hover:text-foreground">
          <Clock className="w-4 h-4" />
          <span className="hidden sm:inline">היסטוריה</span>
        </Link>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
        </Button>
        <div className="w-px h-5 bg-border mx-1.5" />
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-2 h-8 px-2.5 rounded-lg hover:bg-muted/60 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            {user && <span className="text-xs font-medium text-foreground hidden sm:inline">{user.full_name || user.email}</span>}
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {menuOpen && (
            <div className="absolute left-0 mt-1 w-44 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <Link to="/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted/60 text-foreground transition-colors" onClick={() => setMenuOpen(false)}>
                <User className="w-4 h-4 text-muted-foreground" />
                הפרופיל שלי
              </Link>
              <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted/60 text-destructive transition-colors">
                <LogOut className="w-4 h-4" />
                התנתקות
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}