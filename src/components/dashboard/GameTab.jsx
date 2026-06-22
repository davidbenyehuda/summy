import React, { useState } from "react";
import { Trophy, RotateCcw, ChevronRight, CheckCircle, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const QUESTIONS = [
  {
    q: "היכן מתרחשות התגובות התלויות באור?",
    options: ["סטרומה", "ממברנות הת'ילקואיד", "דופן התא", "מיטוכונדריה"],
    answer: 1,
  },
  {
    q: "מה המוצר העיקרי של מחזור קלווין?",
    options: ["ATP", "חמצן", "גלוקוז", "NADPH"],
    answer: 2,
  },
  {
    q: "איזה פיגמנט אחראי בעיקר לספיגת אור?",
    options: ["מלנין", "קרוטן", "המוגלובין", "כלורופיל"],
    answer: 3,
  },
  {
    q: "איזו מולקולה מתפצלת במהלך תגובות האור לשחרור חמצן?",
    options: ["CO₂", "גלוקוז", "H₂O", "ATP"],
    answer: 2,
  },
  {
    q: "איזה גז הצמח סופג במהלך הפוטוסינתזה?",
    options: ["חמצן", "חנקן", "פחמן דו-חמצני", "מימן"],
    answer: 2,
  },
];

export default function GameTab() {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);

  const q = QUESTIONS[current];

  const handleAnswer = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === q.answer;
    if (correct) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    if (current + 1 >= QUESTIONS.length) {
      setDone(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
    }
  };

  const handleReset = () => {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setDone(false);
    setStreak(0);
  };

  if (done) {
    const pct = Math.round((score / QUESTIONS.length) * 100);
    return (
      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
          <Trophy className="w-8 h-8 text-yellow-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground font-heading">!החידון הסתיים</h3>
          <p className="text-muted-foreground text-sm mt-1">קיבלת <span className="font-semibold text-foreground">{score} / {QUESTIONS.length}</span></p>
        </div>
        <div className="w-full max-w-xs bg-muted rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-700 ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-2xl font-bold text-foreground">{pct}%</p>
        <p className="text-xs text-muted-foreground">
          {pct === 100 ? "🎉 ציון מושלם!" : pct >= 80 ? "🌟 כל הכבוד!" : pct >= 50 ? "📚 המשיכו ללמוד!" : "💪 חזרו על החומר ונסו שוב!"}
        </p>
        <Button onClick={handleReset} className="gap-2 mt-2">
          <RotateCcw className="w-4 h-4" /> שחק שוב
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-yellow-100 flex items-center justify-center">
            <Trophy className="w-3.5 h-3.5 text-yellow-600" />
          </div>
          <span className="text-sm font-semibold text-foreground font-heading">משחק ידע</span>
        </div>
        <div className="flex items-center gap-3">
          {streak >= 2 && (
            <span className="flex items-center gap-1 text-xs font-medium text-orange-500">
              <Zap className="w-3.5 h-3.5" /> {streak} ברצף!
            </span>
          )}
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {current + 1} / {QUESTIONS.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((current) / QUESTIONS.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-4">
        <p className="text-sm font-semibold text-foreground leading-snug">{q.q}</p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = i === q.answer;
          const revealed = selected !== null;

          let cls = "border-border bg-card hover:border-primary/40 hover:bg-muted/40 cursor-pointer";
          if (revealed && isCorrect) cls = "border-green-500 bg-green-50 cursor-default";
          else if (revealed && isSelected && !isCorrect) cls = "border-red-400 bg-red-50 cursor-default";
          else if (revealed) cls = "border-border bg-card opacity-50 cursor-default";

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={revealed}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all duration-150 ${cls}`}
            >
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                revealed && isCorrect ? "border-green-500 text-green-600" :
                revealed && isSelected ? "border-red-400 text-red-500" :
                "border-border text-muted-foreground"
              }`}>
                {revealed && isCorrect ? <CheckCircle className="w-4 h-4" /> :
                 revealed && isSelected && !isCorrect ? <XCircle className="w-4 h-4" /> :
                 String.fromCharCode(65 + i)}
              </span>
              <span className={`text-sm font-medium ${
                revealed && isCorrect ? "text-green-700" :
                revealed && isSelected && !isCorrect ? "text-red-600" :
                "text-foreground"
              }`}>{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Feedback + Next */}
      {selected !== null && (
        <div className="space-y-3">
          <div className={`rounded-lg px-4 py-3 text-sm ${selected === q.answer ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {selected === q.answer ? "✅ נכון! כל הכבוד." : `❌ לא בדיוק. התשובה הנכונה היא: "${q.options[q.answer]}"`}
          </div>
          <Button onClick={handleNext} className="w-full gap-2 h-10">
            {current + 1 >= QUESTIONS.length ? "ראה תוצאות" : "שאלה הבאה"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}