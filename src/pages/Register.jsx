const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, User, Phone, BookOpen, Heart, ChevronLeft } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthShell from "@/components/auth/AuthShell";

export default function Register() {
  const [phase, setPhase] = useState("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [grade, setGrade] = useState("");
  const [favoriteSubject, setFavoriteSubject] = useState("");
  const [hobbies, setHobbies] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("הסיסמאות אינן תואמות"); return; }
    if (password.length < 6) { setError("הסיסמה חייבת להכיל לפחות 6 תווים"); return; }
    setLoading(true);
    try {
      await db.auth.register({ email, password });
      setPhase("otp");
    } catch (err) {
      setError(err.message || "ההרשמה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await db.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) db.auth.setToken(result.access_token);
      setPhase("profile");
    } catch (err) {
      setError(err.message || "קוד אימות שגוי");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try { await db.auth.resendOtp(email); } catch {}
  };

  const handleFinish = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) { setError("נא להזין שם מלא"); return; }
    setLoading(true);
    try {
      const me = await db.auth.me();
      await db.entities.StudentProfile.create({
        user_id: me.id,
        full_name: fullName.trim(),
        grade,
        subjects: favoriteSubject ? [favoriteSubject] : [],
        learning_goal: hobbies,
        onboarding_complete: true,
      });
      await db.auth.updateMe({ full_name: fullName.trim() });
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "שמירת הפרופיל נכשלה");
    } finally {
      setLoading(false);
    }
  };

  if (phase === "credentials") {
    return (
      <AuthShell step={1} totalSteps={3} stepLabel="יצירת חשבון">
        <h1 className="text-2xl font-bold text-foreground font-heading mb-1">יצירת חשבון חדש</h1>
        <p className="text-sm text-muted-foreground mb-6">הצטרף לסמ"י וסכם מידע בחכמה</p>

        {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">כתובת אימייל</Label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="email" autoComplete="email" autoFocus placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} className="pr-10 h-11" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">סיסמה</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="password" autoComplete="new-password" placeholder="לפחות 6 תווים"
                value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10 h-11" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">אישור סיסמה</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="password" autoComplete="new-password" placeholder="••••••••"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pr-10 h-11" required />
            </div>
          </div>
          <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />יוצר חשבון...</> : "צור חשבון"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-5">
          כבר יש לך חשבון?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">התחברות</Link>
        </p>
      </AuthShell>
    );
  }

  if (phase === "otp") {
    return (
      <AuthShell step={2} totalSteps={3} stepLabel="אימות אימייל">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground font-heading mb-1">בדוק את תיבת הדואר שלך</h1>
        <p className="text-sm text-muted-foreground mb-6">שלחנו קוד בן 6 ספרות ל-<span className="font-medium text-foreground">{email}</span></p>

        {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

        <div className="flex justify-center mb-6">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button className="w-full h-11 font-medium" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />מאמת...</> : "אמת והמשך"}
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-4">
          לא קיבלת?{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">שלח שוב</button>
        </p>
      </AuthShell>
    );
  }

  if (phase === "profile") {
    return (
      <AuthShell step={3} totalSteps={3} stepLabel="פרטים אישיים">
        <h1 className="text-2xl font-bold text-foreground font-heading mb-1">ספר לנו עליך</h1>
        <p className="text-sm text-muted-foreground mb-6">כמה פרטים קטנים כדי להתאים את החוויה עבורך</p>

        {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

        <form onSubmit={handleFinish} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">שם מלא</Label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="שם מלא" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pr-10 h-11" autoFocus required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">טלפון</Label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="tel" placeholder="050-0000000" value={phone} onChange={(e) => setPhone(e.target.value)} className="pr-10 h-11" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">כיתה</Label>
            <div className="relative">
              <BookOpen className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="למשל: י׳2, כיתה ז׳, שנה א׳..." value={grade} onChange={(e) => setGrade(e.target.value)} className="pr-10 h-11" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">מקצוע אהוב</Label>
            <div className="relative">
              <BookOpen className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="מתמטיקה, ביולוגיה, היסטוריה..." value={favoriteSubject} onChange={(e) => setFavoriteSubject(e.target.value)} className="pr-10 h-11" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">תחביבים</Label>
            <div className="relative">
              <Heart className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="קריאה, ספורט, מוזיקה..." value={hobbies} onChange={(e) => setHobbies(e.target.value)} className="pr-10 h-11" />
            </div>
          </div>

          <Button type="submit" className="w-full h-11 font-medium gap-2 mt-2" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />שומר...</> : <>התחל ללמוד! <ChevronLeft className="w-4 h-4" /></>}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-3">
          ניתן לעדכן פרטים בכל עת בפרופיל שלך.
        </p>
      </AuthShell>
    );
  }

  return null;
}