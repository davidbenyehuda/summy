const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React from "react";
const SAMMY_URL = "https://media.db.com/images/public/6a2ef90d221e3790adb700f6/77c33375d_SAMMY.webp";

export default function AuthShell({ children, step, totalSteps, stepLabel }) {
  return (
    <div className="min-h-screen flex bg-background" dir="rtl">
      {/* Right decorative panel (RTL — appears on the right) */}
      <div className="hidden lg:flex lg:w-[42%] bg-primary flex-col justify-between p-10 relative overflow-hidden order-last">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 -translate-x-1/2" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full translate-y-1/2 translate-x-1/2" />
          <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-white rounded-full" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-2.5">
            <img src={SAMMY_URL} alt="Sammy" className="w-12 h-12 object-contain drop-shadow-lg" />
            <span className="text-white font-bold text-lg tracking-tight font-heading">סמ"י - סיכום מידע</span>
          </div>
        </div>

        <div className="relative space-y-6">
          <div>
            <h2 className="text-white text-3xl font-bold font-display leading-tight">
              סכם מידע בחכמה,<br />למד בצורה חדשה.
            </h2>
            <p className="text-white/70 mt-3 text-sm leading-relaxed">
              סמ"י מתאים את עצמו לאיך שאתה לומד — מספק סיכומים, הסברים ותובנות בדיוק עבורך.
            </p>
          </div>

          <div className="space-y-3">
            {[
              "ניתוח מסמכים חכם",
              "הסברים מותאמים לרמת הלימוד",
              "מצגות ותסריטי וידאו מבוססי AI",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                    <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </div>
                <span className="text-white/80 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-white/40 text-xs">
          © 2025 סמ"י - סיכום מידע. כל הזכויות שמורות.
        </div>
      </div>

      {/* Left content (RTL — appears on the left) */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src={SAMMY_URL} alt="Sammy" className="w-9 h-9 object-contain" />
            <span className="font-bold text-foreground font-heading">סמ"י - סיכום מידע</span>
          </div>

          {/* Step indicator */}
          {totalSteps && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stepLabel}</span>
                <span className="text-xs text-muted-foreground">{step} מתוך {totalSteps}</span>
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < step ? "bg-primary" : "bg-border"}`} />
                ))}
              </div>
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}