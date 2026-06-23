import React, { useCallback, useEffect, useRef, useState } from "react";
import db from "@/api/client";
import TopNav from "../components/dashboard/TopNav";
import DocumentPreview from "../components/dashboard/DocumentPreview";
import ResearchItemsList from "../components/dashboard/ResearchItemsList";
import BottomActionBar from "../components/dashboard/BottomActionBar";

const DEFAULT_MESSAGES = [
  { role: "assistant", content: "העלה מסמך ואני אנתח אותו עבורך." }
];

export default function Home() {
  const [messages, setMessages] = useState(DEFAULT_MESSAGES);
  const [input, setInput] = useState("");
  const [tab, setTab] = useState("text");
  const [quiz, setQuiz] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [documentTitle, setDocumentTitle] = useState(null);
  const [isImageDocument, setIsImageDocument] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);

  const saveTimerRef = useRef(null);

  const applyHistory = useCallback((history) => {
    setMessages(history.messages?.length ? history.messages : DEFAULT_MESSAGES);
    setAnalysis(history.analysis || null);
    setDocumentTitle(history.documentTitle || null);
    setIsImageDocument(Boolean(history.isImageDocument));
    setQuiz(history.analysis?.quiz || []);
    setQuizAnswers(history.quizAnswers || {});
    setQuizSubmitted(Boolean(history.quizSubmitted));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const authed = await db.auth.isAuthenticated();
        if (!authed || cancelled) {
          setHistoryReady(true);
          return;
        }

        const history = await db.integrations.Chat.getHistory();
        if (!cancelled) {
          applyHistory(history);
        }
      } catch {
        // keep defaults when history cannot be loaded
      } finally {
        if (!cancelled) {
          setHistoryReady(true);
        }
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [applyHistory]);

  const persistHistory = useCallback(
    (overrides = {}) => {
      if (!historyReady) return;

      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          const authed = await db.auth.isAuthenticated();
          if (!authed) return;

          await db.integrations.Chat.saveHistory({
            messages: overrides.messages ?? messages,
            analysis: overrides.analysis ?? analysis,
            documentTitle: overrides.documentTitle ?? documentTitle,
            isImageDocument: overrides.isImageDocument ?? isImageDocument,
            quizAnswers: overrides.quizAnswers ?? quizAnswers,
            quizSubmitted: overrides.quizSubmitted ?? quizSubmitted,
          });
        } catch {
          // ignore save errors to keep chat responsive
        }
      }, 500);
    },
    [
      historyReady,
      messages,
      analysis,
      documentTitle,
      isImageDocument,
      quizAnswers,
      quizSubmitted,
    ]
  );

  useEffect(() => {
    persistHistory();
    return () => clearTimeout(saveTimerRef.current);
  }, [persistHistory]);

  const handleAnalyzed = (result) => {
    const nextAnalysis = result.output;
    const nextIsImage = Boolean(result.isImage);
    const nextDocumentTitle = nextIsImage ? null : result.title;
    const nextQuiz = result.output.quiz || [];

    setAnalysis(nextAnalysis);
    setIsImageDocument(nextIsImage);
    setDocumentTitle(nextDocumentTitle);
    setQuiz(nextQuiz);
    setQuizAnswers({});
    setQuizSubmitted(false);

    let nextMessages;
    if (nextIsImage) {
      nextMessages = [
        ...messages,
        { role: "user", type: "image", imageUrl: result.file_url },
        { role: "assistant", content: "המסמך נותח בהצלחה. אפשר לשאול עליו כאן." }
      ];
    } else {
      nextMessages = [
        ...messages,
        { role: "user", content: `הועלה קובץ: ${result.title}` },
        { role: "assistant", content: "המסמך נותח בהצלחה. אפשר לשאול עליו כאן." }
      ];
    }

    setMessages(nextMessages);
    persistHistory({
      messages: nextMessages,
      analysis: nextAnalysis,
      documentTitle: nextDocumentTitle,
      isImageDocument: nextIsImage,
      quizAnswers: {},
      quizSubmitted: false,
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || !analysis) return;

    const userMessage = input.trim();
    setInput("");
    const withUser = [...messages, { role: "user", content: userMessage }];
    setMessages(withUser);

    try {
      const reply = await db.integrations.Core.InvokeLLM({ prompt: userMessage });
      const withReply = [...withUser, { role: "assistant", content: reply }];
      setMessages(withReply);
      persistHistory({ messages: withReply });
    } catch {
      const withError = [
        ...withUser,
        { role: "assistant", content: "לא הצלחתי לענות כרגע. נסה שוב." }
      ];
      setMessages(withError);
      persistHistory({ messages: withError });
    }
  };

  const clearChat = async () => {
    clearTimeout(saveTimerRef.current);

    setMessages(DEFAULT_MESSAGES);
    setAnalysis(null);
    setDocumentTitle(null);
    setIsImageDocument(false);
    setQuiz([]);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setInput("");

    try {
      const authed = await db.auth.isAuthenticated();
      if (authed) {
        await db.integrations.Chat.clearHistory();
      }
    } catch {
      // local state is already cleared
    }
  };

  const handleSelect = (qIndex, optionIndex) => {
    setQuizAnswers((prev) => {
      const next = { ...prev, [qIndex]: optionIndex };
      persistHistory({ quizAnswers: next });
      return next;
    });
  };

  const submitQuiz = () => {
    setQuizSubmitted(true);
    persistHistory({ quizSubmitted: true });
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
                  {!isImageDocument && (
                    <h1 className="text-3xl font-bold mb-6">
                      {documentTitle || analysis.title}
                    </h1>
                  )}

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
                    <div className="space-y-4">
                      <h2 className="text-lg font-medium">
                        {analysis.further_research.heading}
                      </h2>
                      <ResearchItemsList furtherResearch={analysis.further_research} />
                    </div>
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

          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
            <span className="text-xs text-white/50">צ&apos;אט</span>
            <button
              type="button"
              onClick={clearChat}
              className="text-xs text-white/60 hover:text-white"
            >
              נקה צ&apos;אט
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl text-sm ${
                  m.type === "image"
                    ? "ml-auto p-1"
                    : m.role === "user"
                    ? "ml-auto px-4 py-3 bg-white text-black"
                    : "mr-auto px-4 py-3 bg-white/10"
                }`}
              >
                {m.type === "image" ? (
                  <img
                    src={m.imageUrl}
                    alt=""
                    className="max-w-full max-h-64 rounded-xl object-contain"
                  />
                ) : (
                  m.content
                )}
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
