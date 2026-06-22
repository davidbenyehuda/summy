const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, ChevronLeft } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await db.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "אימייל או סיסמה שגויים");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-foreground font-heading mb-1">ברוכים השבים</h1>
      <p className="text-sm text-muted-foreground mb-6">התחבר כדי להמשיך את מסע הלמידה שלך</p>

      {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm">כתובת אימייל</Label>
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="email" autoComplete="email" autoFocus placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} className="pr-10 h-11" required />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm">סיסמה</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">שכחת סיסמה?</Link>
          </div>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" autoComplete="current-password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10 h-11" required />
          </div>
        </div>

        <Button type="submit" className="w-full h-11 font-medium gap-2" disabled={loading}>
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />מתחבר...</>
            : <>התחברות <ChevronLeft className="w-4 h-4" /></>}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-5">
        עדיין אין לך חשבון?{" "}
        <Link to="/register" className="text-primary font-medium hover:underline">הרשמה חינם</Link>
      </p>
    </AuthShell>
  );
}