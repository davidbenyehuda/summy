const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, GraduationCap, BookOpen, Target, Clock, Loader2, Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import TopNav from "@/components/dashboard/TopNav";

const GRADE_LABELS = {
  grade_1_3: "כיתות א'–ג'", grade_4_6: "כיתות ד'–ו'", grade_7_9: "כיתות ז'–ט'",
  grade_10_12: "כיתות י'–י\"ב", university: "אוניברסיטה", postgrad: "תואר שני / דוקטורט",
};
const STUDY_LEVEL_LABELS = {
  elementary: "בסיסי", middle_school: "חטיבת ביניים", high_school: "תיכון",
  undergraduate: "תואר ראשון", graduate: "תואר שני", self_learner: "לומד עצמאי",
};
const LEARNING_STYLE_LABELS = {
  visual: "ויזואלי 🎨", reading_writing: "קריאה וכתיבה ✍️", auditory: "שמיעתי 🎧", kinesthetic: "חוויתי ⚡",
};
const LEARNING_GOAL_LABELS = {
  exam_prep: "הכנה לבחינות 📝", deeper_understanding: "הבנה עמוקה 🧠",
  homework_help: "עזרה בשיעורי בית ✏️", curiosity: "סקרנות 🔭", career_growth: "התפתחות מקצועית 🚀",
};
const WEEKLY_HOURS_LABELS = {
  less_than_5: "פחות מ-5 שעות", "5_to_10": "5–10 שעות", "10_to_20": "10–20 שעות", more_than_20: "יותר מ-20 שעות",
};
const SUBJECT_LABELS = {
  math: "מתמטיקה 🔢", science: "מדעים 🔬", history: "היסטוריה 🏛️", literature: "ספרות 📖",
  programming: "תכנות 💻", languages: "שפות 🗣️", art: "אמנות ומוזיקה 🎨", economics: "כלכלה 📊",
};
const GENDER_LABELS = { male: "זכר", female: "נקבה", non_binary: "לא בינארי", prefer_not_to_say: "לא מציין/ת" };

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    const load = async () => {
      const me = await db.auth.me();
      setUser(me);
      setEditName(me.full_name || "");
      const profiles = await db.entities.StudentProfile.filter({ user_id: me.id });
      if (profiles.length > 0) setProfile(profiles[0]);
      setLoading(false);
    };
    load();
  }, []);

  const handleSaveName = async () => {
    setSaving(true);
    await db.auth.updateMe({ full_name: editName });
    if (profile) await db.entities.StudentProfile.update(profile.id, { full_name: editName });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <TopNav />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopNav />
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowRight className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-foreground font-heading">הפרופיל שלי</h1>
          </div>

          {/* Identity card */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg font-heading">{user?.full_name || "תלמיד"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-sm">שם מלא</Label>
              <div className="flex gap-2">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 h-10" placeholder="השם שלך" />
                <Button onClick={handleSaveName} disabled={saving} className="h-10 gap-1.5 px-4">
                  {saved ? <><Check className="w-4 h-4" /> נשמר</> : saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "שמור"}
                </Button>
              </div>
            </div>
          </div>

          {!profile ? (
            <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
              <p className="text-muted-foreground text-sm">לא נמצא פרופיל לימודי. השלם את תהליך ההרשמה.</p>
              <Link to="/register">
                <Button variant="outline">השלם פרופיל</Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Academic Info */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground font-heading">פרטים אקדמיים</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="מגדר" value={GENDER_LABELS[profile.gender] || "—"} />
                  <InfoRow label="כיתה" value={GRADE_LABELS[profile.grade] || "—"} />
                  <InfoRow label="רמת לימוד" value={STUDY_LEVEL_LABELS[profile.study_level] || "—"} />
                  <InfoRow label="שעות שבועיות" value={WEEKLY_HOURS_LABELS[profile.weekly_study_hours] || "—"} />
                </div>
              </div>

              {/* Learning Style */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground font-heading">סגנון למידה</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="סגנון" value={LEARNING_STYLE_LABELS[profile.learning_style] || "—"} />
                  <InfoRow label="מטרת הלמידה" value={LEARNING_GOAL_LABELS[profile.learning_goal] || "—"} />
                </div>
              </div>

              {/* Subjects */}
              {profile.subjects?.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground font-heading">מקצועות</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.subjects.map(s => (
                      <span key={s} className="bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full">
                        {SUBJECT_LABELS[s] || s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}