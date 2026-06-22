import React, { useState } from "react";
import db from "@/api/client";
import TopNav from "../components/dashboard/TopNav";
import DocumentPreview from "../components/dashboard/DocumentPreview";
import BottomActionBar from "../components/dashboard/BottomActionBar";

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "העלה מסמך ואני אנתח אותו עבורך." }
  ]);
  const [input, setInput] = useState("");
  const [tab, setTab] = useState("text");
  const [quiz, setQuiz] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [documentTitle, setDocumentTitle] = useState(null);

  const handleAnalyzed = (result) => {
    setAnalysis(result.output);
    setDocumentTitle(result.title);
    setQuiz(result.output.quiz || []);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: `הועלה קובץ: ${result.title}` },
      { role: "assistant", content: "המסמך נותח בהצלחה. אפשר לשאול עליו כאן." }
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim() || !analysis) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const reply = await db.integrations.Core.InvokeLLM({ prompt: userMessage });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "לא הצלחתי לענות כרגע. נסה שוב." }
      ]);
    }
  };

  const handleSelect = (qIndex, optionIndex) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [qIndex]: optionIndex
    }));
  };

  const submitQuiz = () => {
    setQuizSubmitted(true);
  };

  const hasMultipleChoiceQuiz = quiz.some((q) => q.options?.length);

  const score = hasMultipleChoiceQuiz
    ? quiz.reduce((acc, q, i) => {
        return quizAnswers[i] === q.correct ? acc + 1 : acc;
      }, 0)
    : 0;

  return (
    <div
      className="h-screen flex flex-col bg-[#0b0c10] text-white overflow-hidden"
      dir="rtl"
    >
      <TopNav />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col border-l border-white/10">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0f1117]">
            {[
              { key: "text", label: "מסמך" },
              { key: "research", label: "מחקר נוסף" },
              { key: "summary", label: "תקציר" },
              { key: "quiz", label: "בחן את עצמך" }
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-full text-sm ${
                  tab === t.key
                    ? "bg-white text-black"
                    : "text-white/60 hover:bg-white/10"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-10 py-10">
            <div className="max-w-3xl mx-auto text-right">
              {!analysis ? (
                <div className="text-white/50 text-center py-20">
                  <h1 className="text-2xl font-bold mb-3">העלה מסמך כדי להתחיל</h1>
                  <p className="text-sm">העלה קובץ בפאנל הימני ואנתח אותו עבורך.</p>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold mb-6">
                    {documentTitle || analysis.title}
                  </h1>

                  {tab === "text" && (
                    <>
                      <h2 className="text-lg font-medium mb-3">
                        {analysis.text_page.heading}
                      </h2>
                      <p className="text-white/70 whitespace-pre-wrap">
                        {analysis.text_page.body}
                      </p>
                    </>
                  )}

                  {tab === "research" && (
                    <>
                      <h2 className="text-lg font-medium mb-3">
                        {analysis.further_research.heading}
                      </h2>
                      <p className="text-white/70 whitespace-pre-wrap">
                        {analysis.further_research.body}
                      </p>
                    </>
                  )}

                  {tab === "summary" && (
                    <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                      <h2 className="text-lg mb-2">תקציר</h2>
                      <p className="text-white/70">{analysis.short_explanation}</p>
                    </div>
                  )}

                  {tab === "quiz" && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold">בחן את עצמך</h2>

                      {quiz.length === 0 ? (
                        <div className="text-white/50 text-center py-10">
                          אין שאלות בחן למסמך זה.
                        </div>
                      ) : (
                        <>
                          {quiz.map((q, i) => (
                            <div
                              key={i}
                              className="bg-white/5 p-4 rounded-xl border border-white/10"
                            >
                              <p className="mb-3 font-medium">
                                {i + 1}. {q.question}
                              </p>

                              {q.options?.length > 0 && (
                              <div className="space-y-2">
                                {q.options.map((opt, j) => (
                                  <button
                                    key={j}
                                    onClick={() => handleSelect(i, j)}
                                    className={`w-full text-right px-3 py-2 rounded-lg text-sm border transition ${
                                      quizAnswers[i] === j && quizSubmitted && j === q.correct
                                        ? "bg-green-500 text-black border-green-400"
                                        : quizAnswers[i] === j && quizSubmitted && j !== q.correct
                                        ? "bg-red-500 text-white border-red-400"
                                        : quizSubmitted && j === q.correct
                                        ? "bg-green-500/20 border-green-500 text-white"
                                        : quizAnswers[i] === j
                                        ? "bg-white text-black"
                                        : "border-white/10 hover:bg-white/10"
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                              )}
                            </div>
                          ))}

                          {hasMultipleChoiceQuiz && (
                          <button
                            onClick={submitQuiz}
                            className="bg-white text-black px-5 py-2 rounded-xl"
                          >
                            הגש מבחן
                          </button>
                          )}

                          {hasMultipleChoiceQuiz && quizSubmitted && (
                            <div className="bg-green-500/10 border border-green-500/30 p-5 rounded-xl">
                              <h3 className="text-lg font-semibold mb-2">
                                הציון שלך: {score} / {quiz.length}
                              </h3>

                              <div className="space-y-3 text-sm">
                                {quiz.map((q, i) => (
                                  <div
                                    key={i}
                                    className="border-t border-white/10 pt-2"
                                  >
                                    <p className="font-medium">{q.question}</p>
                                    <p className="text-white/70">
                                      תשובתך: {q.options[quizAnswers[i]] || "לא נבחר"}
                                    </p>
                                    <p className="text-green-400">
                                      תשובה נכונה: {q.options[q.correct]}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="w-[380px] flex flex-col bg-[#0f1117] border-r border-white/10">
          <div className="p-3 border-b border-white/10 shrink-0 max-h-[40vh] overflow-hidden flex flex-col">
            <DocumentPreview onAnalyzed={handleAnalyzed} />
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-white text-black"
                    : "mr-auto bg-white/10"
                }`}
              >
                {m.content}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-white/10 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={analysis ? "שאל על המסמך..." : "העלה מסמך כדי להתחיל..."}
              disabled={!analysis}
              className="flex-1 bg-white/5 px-3 py-2 rounded-lg text-sm disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!analysis}
              className="bg-white text-black px-3 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              שלח
            </button>
          </div>
        </div>
      </div>

      <BottomActionBar />
    </div>
  );
}
