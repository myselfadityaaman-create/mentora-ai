import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  generateQuiz,
  generateQuizFromDocument,
  submitQuiz,
  listQuizzes,
  getQuiz,
  getAIStatus,
  saveAIKey,
  listDocuments,
  recommendAdaptiveDifficulty,
  startAdaptiveQuiz,
  submitAdaptiveAnswer,
  getAdaptiveQuiz,
} from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoadingSpinner from "../components/LoadingSpinner";

const LANGUAGES = [
  "English",
  "Hindi",
  "Spanish",
  "French",
  "German",
  "Mandarin",
  "Japanese",
];

const SUBJECTS = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Economics",
];

const DIFFICULTY_CONFIG = {
  beginner: {
    label: "Beginner",
    color: "emerald",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    weight: "1.0x",
  },
  intermediate: {
    label: "Intermediate",
    color: "amber",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    weight: "1.5x",
  },
  advanced: {
    label: "Advanced",
    color: "purple",
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    weight: "2.0x",
  },
};

function Quiz() {
  const [searchParams] = useSearchParams();
  const initialDocId = searchParams.get("doc") || "";

  const [tab, setTab] = useState("new"); // "new" | "active" | "adaptive" | "adaptive_summary" | "history" | "review"
  const [quizMode, setQuizMode] = useState("adaptive"); // "adaptive" | "topic" | "document"
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(initialDocId);

  const [subject, setSubject] = useState("Computer Science");
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("English");
  const [numQuestions, setNumQuestions] = useState(5);
  const [initialDifficulty, setInitialDifficulty] = useState("intermediate");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Standard active quiz state
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);

  // Adaptive active quiz state
  const [adaptiveQuiz, setAdaptiveQuiz] = useState(null);
  const [adaptiveQuestion, setAdaptiveQuestion] = useState(null);
  const [adaptiveSelectedOption, setAdaptiveSelectedOption] = useState(null);
  const [adaptiveTimer, setAdaptiveTimer] = useState(0);
  const [adaptiveFeedback, setAdaptiveFeedback] = useState(null);
  const [adaptiveSummary, setAdaptiveSummary] = useState(null);
  const [submittingAdaptiveAnswer, setSubmittingAdaptiveAnswer] = useState(false);
  const [difficultyRecommendation, setDifficultyRecommendation] = useState(null);
  const [detectingDifficulty, setDetectingDifficulty] = useState(false);

  // History state
  const [quizHistory, setQuizHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [reviewQuiz, setReviewQuiz] = useState(null);

  // AI Configuration Modal state
  const [aiStatus, setAiStatus] = useState({ configured: false, model: "gemini-3.8-flash" });
  const [selectedModel, setSelectedModel] = useState("gemini-3.8-flash");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [keyModalError, setKeyModalError] = useState("");
  const [keyModalSuccess, setKeyModalSuccess] = useState("");

  const timerRef = useRef(null);

  // Per-question timer for Adaptive Quiz
  useEffect(() => {
    if (tab === "adaptive" && !adaptiveFeedback && !adaptiveSummary) {
      timerRef.current = setInterval(() => {
        setAdaptiveTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tab, adaptiveFeedback, adaptiveSummary]);

  useEffect(() => {
    async function checkStatus() {
      try {
        const s = await getAIStatus();
        setAiStatus(s);
        if (s.model) setSelectedModel(s.model);
      } catch {
        // AI status check failed
      }
    }
    checkStatus();
  }, []);

  // Fetch documents for RAG document quizzes
  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await listDocuments();
        setDocuments(res.documents || []);
      } catch {
        // Document fetch error
      }
    }
    fetchDocs();
  }, []);

  // Sync document ID from URL query params
  useEffect(() => {
    const docParam = searchParams.get("doc");
    if (docParam) {
      setSelectedDocId(docParam);
      setQuizMode("document");
    }
  }, [searchParams]);

  const handleSaveAPIKey = async (e) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      setKeyModalError("Please enter your Google Gemini API key.");
      return;
    }

    setSavingKey(true);
    setKeyModalError("");
    setKeyModalSuccess("");

    try {
      const res = await saveAIKey(apiKeyInput.trim(), selectedModel);
      setKeyModalSuccess("Key verified & saved! Quiz generator is now active.");
      setAiStatus({ configured: true, model: res.model });
      setTimeout(() => {
        setShowKeyModal(false);
        setKeyModalSuccess("");
        setApiKeyInput("");
      }, 1500);
    } catch (err) {
      setKeyModalError(err.message || "Failed to verify API key with Google Gemini.");
    } finally {
      setSavingKey(false);
    }
  };

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await listQuizzes();
      setQuizHistory(data.quizzes || []);
    } catch {
      // Quiz history retrieval failed
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleOpenHistory = () => {
    setTab("history");
    setError(null);
    fetchHistory();
  };

  // Recommend difficulty handler for Adaptive mode
  const handleDetectDifficulty = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic first to assess your performance baseline.");
      return;
    }
    setError(null);
    setDetectingDifficulty(true);
    try {
      const rec = await recommendAdaptiveDifficulty(subject, topic.trim());
      setDifficultyRecommendation(rec);
      if (rec.recommended_difficulty) {
        setInitialDifficulty(rec.recommended_difficulty);
      }
    } catch (err) {
      setError(err.message || "Failed to recommend initial difficulty.");
    } finally {
      setDetectingDifficulty(false);
    }
  };

  // Generate / Start Quiz handler
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (quizMode !== "document" && !topic.trim()) {
      setError("Please specify a topic or chapter for the quiz.");
      return;
    }
    if (quizMode === "document" && !selectedDocId) {
      setError("Please select an uploaded study document.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (quizMode === "adaptive") {
        // Start Adaptive Quiz
        const startRes = await startAdaptiveQuiz(
          subject,
          topic.trim(),
          initialDifficulty,
          numQuestions,
          language
        );
        setAdaptiveQuiz({
          quiz_id: startRes.quiz_id,
          subject: startRes.subject,
          topic: startRes.topic,
          total_questions: startRes.total_questions,
          current_difficulty: startRes.current_difficulty,
        });
        setAdaptiveQuestion(startRes.question);
        setAdaptiveSelectedOption(null);
        setAdaptiveFeedback(null);
        setAdaptiveSummary(null);
        setAdaptiveTimer(0);
        setTab("adaptive");
      } else if (quizMode === "document") {
        // Standard Document RAG Quiz
        const data = await generateQuizFromDocument(selectedDocId, numQuestions, language);
        setActiveQuiz(data);
        setSelectedAnswers({});
        setQuizResult(null);
        setTab("active");
      } else {
        // Standard Topic Quiz
        const data = await generateQuiz(subject, topic.trim(), language, numQuestions);
        setActiveQuiz(data);
        setSelectedAnswers({});
        setQuizResult(null);
        setTab("active");
      }
    } catch (err) {
      setError(err.message || "Failed to initialize quiz. Check your AI key or connection.");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Standard Quiz Handlers
  // --------------------------------------------------
  const handleSelectOption = (questionIdx, optionIdx) => {
    if (quizResult) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIdx]: optionIdx,
    }));
  };

  const handleSubmitStandardQuiz = async () => {
    const total = activeQuiz.questions.length;
    const answeredCount = Object.keys(selectedAnswers).length;

    if (answeredCount < total) {
      if (!confirm(`You have answered ${answeredCount} of ${total} questions. Submit anyway?`)) {
        return;
      }
    }

    const answersArray = activeQuiz.questions.map((_, idx) =>
      selectedAnswers[idx] !== undefined ? selectedAnswers[idx] : -1
    );

    setLoading(true);
    setError(null);
    try {
      const res = await submitQuiz(activeQuiz.quiz_id, answersArray);
      setQuizResult(res);
    } catch (err) {
      setError(err.message || "Failed to submit quiz.");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Adaptive Quiz Handlers
  // --------------------------------------------------
  const handleSelectAdaptiveOption = (optionIdx) => {
    if (adaptiveFeedback || submittingAdaptiveAnswer) return;
    setAdaptiveSelectedOption(optionIdx);
  };

  const handleSubmitAdaptiveAnswer = async () => {
    if (adaptiveSelectedOption === null || adaptiveSelectedOption === undefined) {
      setError("Please select an answer before proceeding.");
      return;
    }
    setError(null);
    setSubmittingAdaptiveAnswer(true);

    try {
      const res = await submitAdaptiveAnswer(
        adaptiveQuiz.quiz_id,
        adaptiveSelectedOption,
        adaptiveTimer
      );

      setAdaptiveFeedback({
        is_correct: res.is_correct,
        correct_index: res.correct_index,
        explanation: res.explanation,
        earned_points: res.earned_points,
        total_score_points: res.total_score_points,
        accuracy_percentage: res.accuracy_percentage,
        previous_difficulty: res.previous_difficulty,
        next_difficulty: res.next_difficulty,
        difficulty_changed: res.difficulty_changed,
        direction: res.direction,
        question_number: res.question_number,
        total_questions: res.total_questions,
      });

      if (res.completed) {
        setAdaptiveSummary(res.final_summary);
      } else {
        // Store next question to load on user click
        setAdaptiveQuiz((prev) => ({
          ...prev,
          next_question_pending: res.next_question,
          current_difficulty: res.next_difficulty,
        }));
      }
    } catch (err) {
      setError(err.message || "Failed to submit adaptive answer.");
    } finally {
      setSubmittingAdaptiveAnswer(false);
    }
  };

  const handleNextAdaptiveQuestion = () => {
    if (adaptiveSummary) {
      setTab("adaptive_summary");
      return;
    }

    if (adaptiveQuiz?.next_question_pending) {
      setAdaptiveQuestion(adaptiveQuiz.next_question_pending);
      setAdaptiveQuiz((prev) => ({
        ...prev,
        next_question_pending: null,
      }));
      setAdaptiveSelectedOption(null);
      setAdaptiveFeedback(null);
      setAdaptiveTimer(0);
    }
  };

  const handleViewQuizReview = async (quizId) => {
    setLoading(true);
    try {
      const data = await getQuiz(quizId);
      setReviewQuiz(data);
      setTab("review");
    } catch {
      alert("Failed to load quiz details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 flex-1 w-full">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => {
                setTab("new");
                setError(null);
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                tab === "new"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Assessments
            </button>

            {tab === "adaptive" && (
              <button
                onClick={() => setTab("adaptive")}
                className="rounded-xl px-4 py-2 text-sm font-semibold transition bg-blue-600 text-white shadow-md shadow-blue-600/20 flex items-center gap-1.5"
              >
                <span>⚡ Adaptive Quiz</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </button>
            )}

            {tab === "adaptive_summary" && (
              <button
                onClick={() => setTab("adaptive_summary")}
                className="rounded-xl px-4 py-2 text-sm font-semibold transition bg-blue-600 text-white shadow-md shadow-blue-600/20"
              >
                Assessment Report
              </button>
            )}

            {activeQuiz && (
              <button
                onClick={() => setTab("active")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  tab === "active"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Standard Quiz {quizResult ? "(Completed)" : ""}
              </button>
            )}

            <button
              onClick={handleOpenHistory}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                tab === "history"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Quiz History
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowKeyModal(true)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition border flex items-center gap-1.5 ${
              aiStatus.configured
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                : "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
            }`}
          >
            <span>{aiStatus.configured ? "●" : "⚙️"}</span>
            <span>{aiStatus.configured ? "Gemini Active" : "Connect AI Key"}</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 flex items-start justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold ml-2">✕</button>
          </div>
        )}

        {/* TAB 1: GENERATE QUIZ / START ADAPTIVE ASSESSMENT */}
        {tab === "new" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
                  Phase 4 • Adaptive Engine
                </span>
                <span className="text-xs text-slate-500">Live dynamic difficulty scaling</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-100">AI Assessment Generator</h1>
              <p className="mt-1 text-sm text-slate-400">
                Choose an adaptive evaluation with dynamic difficulty scaling, a standard topic quiz, or document-based RAG.
              </p>
            </div>

            <form onSubmit={handleGenerate} className="space-y-6">
              {/* Quiz Mode Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Assessment Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setQuizMode("adaptive")}
                    className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                      quizMode === "adaptive"
                        ? "border-blue-500 bg-blue-600/10 text-white shadow-lg shadow-blue-600/10"
                        : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-base font-bold text-blue-300">⚡ Adaptive Quiz</span>
                        <span className="text-[10px] rounded-full bg-blue-500/20 text-blue-300 px-2 py-0.5 font-bold uppercase">Dynamic</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Scales difficulty up or down dynamically based on each response.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuizMode("topic")}
                    className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                      quizMode === "topic"
                        ? "border-blue-500 bg-blue-600/10 text-white shadow-lg shadow-blue-600/10"
                        : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-base font-bold text-slate-200">🎯 Topic Quiz</span>
                        <span className="text-[10px] rounded-full bg-slate-800 text-slate-400 px-2 py-0.5 font-semibold">Standard</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Batch assessment with fixed questions and instant scoring upon completion.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuizMode("document")}
                    className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                      quizMode === "document"
                        ? "border-blue-500 bg-blue-600/10 text-white shadow-lg shadow-blue-600/10"
                        : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-base font-bold text-emerald-300">📄 From Document</span>
                        <span className="text-[10px] rounded-full bg-emerald-500/20 text-emerald-400 px-2 py-0.5 font-bold">RAG</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Evaluates knowledge directly extracted from your uploaded study materials.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {quizMode === "document" ? (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Select Uploaded Study Document
                  </label>
                  {documents.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                      No study materials found.{" "}
                      <Link to="/documents" className="text-blue-400 underline font-semibold">
                        Upload notes in Study Materials
                      </Link>{" "}
                      first to test yourself on your own documents!
                    </div>
                  ) : (
                    <select
                      value={selectedDocId}
                      onChange={(e) => setSelectedDocId(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white outline-none focus:border-blue-500"
                    >
                      <option value="">-- Choose an uploaded document --</option>
                      {documents.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} ({d.file_type.toUpperCase()} · {d.chunk_count} chunks)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Subject
                      </label>
                      <select
                        value={subject}
                        onChange={(e) => {
                          setSubject(e.target.value);
                          setDifficultyRecommendation(null);
                        }}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white outline-none focus:border-blue-500"
                      >
                        {SUBJECTS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Language
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white outline-none focus:border-blue-500"
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Topic or Chapter
                      </label>
                      {quizMode === "adaptive" && topic.trim() && (
                        <button
                          type="button"
                          onClick={handleDetectDifficulty}
                          disabled={detectingDifficulty}
                          className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                        >
                          {detectingDifficulty ? (
                            <span>Analyzing history...</span>
                          ) : (
                            <span>🤖 Auto-Detect Baseline Difficulty</span>
                          )}
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Decision Trees, Dynamic Programming, Photosynthesis, Thermodynamics..."
                      value={topic}
                      onChange={(e) => {
                        setTopic(e.target.value);
                        setDifficultyRecommendation(null);
                      }}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3.5 text-sm text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Adaptive Difficulty Recommendation Banner */}
                  {difficultyRecommendation && (
                    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-300">
                            Recommended Starting Level:
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase border ${
                              DIFFICULTY_CONFIG[difficultyRecommendation.recommended_difficulty]?.badgeClass ||
                              "text-blue-400"
                            }`}
                          >
                            {difficultyRecommendation.recommended_difficulty}
                          </span>
                          {difficultyRecommendation.topic_mastery_percentage !== null && (
                            <span className="text-xs text-slate-400">
                              (Past Mastery: {Math.round(difficultyRecommendation.topic_mastery_percentage)}%)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          {difficultyRecommendation.reason}
                        </p>
                      </div>
                      <span className="text-xs text-emerald-400 font-semibold whitespace-nowrap">✓ Applied</span>
                    </div>
                  )}

                  {/* Initial Difficulty Selection for Adaptive Quiz */}
                  {quizMode === "adaptive" && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Starting Difficulty Tier
                      </label>
                      <div className="grid grid-cols-3 gap-2.5">
                        {["beginner", "intermediate", "advanced"].map((lvl) => {
                          const conf = DIFFICULTY_CONFIG[lvl];
                          const isSel = initialDifficulty === lvl;
                          return (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setInitialDifficulty(lvl)}
                              className={`p-3 rounded-xl border text-center transition ${
                                isSel
                                  ? `border-${conf.color}-500 bg-${conf.color}-500/20 text-white font-semibold ring-1 ring-${conf.color}-500`
                                  : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              <div className="text-xs font-bold capitalize">{lvl}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{conf.weight} multiplier</div>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        Mentora AI will dynamically adjust to harder or easier tiers after every question.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Number of Assessment Questions: {numQuestions}
                </label>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>3 questions (Quick check)</span>
                  <span>5 questions (Standard)</span>
                  <span>10 questions (Deep test)</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || (quizMode === "document" ? !selectedDocId : !topic.trim())}
                className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <LoadingSpinner
                    size="sm"
                    text={quizMode === "adaptive" ? "Building adaptive question engine..." : "Generating quiz..."}
                  />
                ) : quizMode === "adaptive" ? (
                  <span>Start Adaptive Assessment ⚡</span>
                ) : (
                  <span>Generate AI Quiz →</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: ADAPTIVE ACTIVE ASSESSMENT */}
        {tab === "adaptive" && adaptiveQuiz && adaptiveQuestion && (
          <div className="space-y-6">
            {/* Top Stats Banner */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-400">
                      {adaptiveQuiz.subject}
                    </span>
                    <span className="text-xs text-slate-400">⚡ Adaptive Assessment</span>
                  </div>
                  <h1 className="mt-1.5 text-xl font-bold text-slate-100">{adaptiveQuiz.topic}</h1>
                </div>

                <div className="flex items-center gap-3">
                  {/* Current Difficulty Badge */}
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Current Tier</div>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-bold border capitalize ${
                        DIFFICULTY_CONFIG[adaptiveQuestion.difficulty]?.badgeClass || "text-slate-300"
                      }`}
                    >
                      {adaptiveQuestion.difficulty} ({DIFFICULTY_CONFIG[adaptiveQuestion.difficulty]?.weight})
                    </span>
                  </div>

                  {/* Per-Question Stopwatch */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-1.5 text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Timer</div>
                    <div className="text-sm font-mono font-bold text-slate-200">
                      {String(Math.floor(adaptiveTimer / 60)).padStart(2, "0")}:
                      {String(adaptiveTimer % 60).padStart(2, "0")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Question {adaptiveQuestion.question_number || 1} of {adaptiveQuiz.total_questions}
                </span>
                <span className="font-semibold text-blue-400">
                  {Math.round(((adaptiveQuestion.question_number || 1) / adaptiveQuiz.total_questions) * 100)}% Completed
                </span>
              </div>
              <div className="mt-1.5 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${((adaptiveQuestion.question_number || 1) / adaptiveQuiz.total_questions) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {adaptiveQuestion.subtopic && (
                    <span className="inline-block text-xs font-semibold text-blue-400 mb-1.5">
                      Subtopic: {adaptiveQuestion.subtopic}
                    </span>
                  )}
                  <h2 className="text-lg font-semibold text-slate-100 leading-relaxed">
                    {adaptiveQuestion.question}
                  </h2>
                </div>
              </div>

              {/* Options */}
              <div className="grid gap-3">
                {adaptiveQuestion.options.map((opt, optIdx) => {
                  const isSelected = adaptiveSelectedOption === optIdx;
                  let optionStyle = "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800/80";

                  if (adaptiveFeedback) {
                    if (optIdx === adaptiveFeedback.correct_index) {
                      optionStyle = "border-emerald-500 bg-emerald-500/20 text-emerald-200 font-semibold";
                    } else if (isSelected && !adaptiveFeedback.is_correct) {
                      optionStyle = "border-red-500 bg-red-500/20 text-red-200 font-semibold";
                    } else {
                      optionStyle = "border-slate-800 bg-slate-900/30 text-slate-500";
                    }
                  } else if (isSelected) {
                    optionStyle = "border-blue-500 bg-blue-600/20 text-blue-200 font-semibold shadow-md shadow-blue-500/10";
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectAdaptiveOption(optIdx)}
                      disabled={!!adaptiveFeedback || submittingAdaptiveAnswer}
                      className={`flex items-center gap-3.5 rounded-xl border p-4 text-left text-sm transition cursor-pointer disabled:cursor-not-allowed ${optionStyle}`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="flex-1 leading-relaxed">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Feedback Banner after Answer Submission */}
              {adaptiveFeedback && (
                <div
                  className={`rounded-xl border p-4 space-y-3 ${
                    adaptiveFeedback.is_correct
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-red-500/30 bg-red-500/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{adaptiveFeedback.is_correct ? "✅" : "❌"}</span>
                      <span
                        className={`text-sm font-bold ${
                          adaptiveFeedback.is_correct ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {adaptiveFeedback.is_correct ? "Correct Answer!" : "Incorrect"}
                      </span>
                      <span className="text-xs text-slate-400">
                        (+{adaptiveFeedback.earned_points} pts)
                      </span>
                    </div>

                    {/* Difficulty Shift Badge */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      {adaptiveFeedback.direction === "up" && (
                        <span className="rounded bg-purple-500/20 text-purple-300 px-2 py-0.5 border border-purple-500/30">
                          ↑ Difficulty Raised to {adaptiveFeedback.next_difficulty.toUpperCase()}
                        </span>
                      )}
                      {adaptiveFeedback.direction === "down" && (
                        <span className="rounded bg-amber-500/20 text-amber-300 px-2 py-0.5 border border-amber-500/30">
                          ↓ Difficulty Adjusted to {adaptiveFeedback.next_difficulty.toUpperCase()}
                        </span>
                      )}
                      {adaptiveFeedback.direction === "same" && (
                        <span className="rounded bg-blue-500/20 text-blue-300 px-2 py-0.5 border border-blue-500/30">
                          → Difficulty Maintained ({adaptiveFeedback.next_difficulty.toUpperCase()})
                        </span>
                      )}
                    </div>
                  </div>

                  {adaptiveFeedback.explanation && (
                    <div className="text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2.5">
                      <strong className="text-slate-100">Explanation: </strong>
                      {adaptiveFeedback.explanation}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end pt-2">
                {!adaptiveFeedback ? (
                  <button
                    type="button"
                    onClick={handleSubmitAdaptiveAnswer}
                    disabled={adaptiveSelectedOption === null || submittingAdaptiveAnswer}
                    className="rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submittingAdaptiveAnswer ? (
                      <LoadingSpinner size="sm" text="Evaluating..." />
                    ) : (
                      "Submit Answer →"
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextAdaptiveQuestion}
                    className="rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition cursor-pointer"
                  >
                    {adaptiveSummary ? "View Assessment Report 🎯" : "Continue to Next Question →"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADAPTIVE FINAL ASSESSMENT REPORT */}
        {tab === "adaptive_summary" && adaptiveSummary && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                    ⚡ Adaptive Assessment Complete
                  </span>
                  <h1 className="mt-2 text-2xl font-bold text-slate-100">{adaptiveSummary.topic}</h1>
                  <p className="text-xs text-slate-400 mt-1">Subject: {adaptiveSummary.subject}</p>
                </div>

                <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 text-center sm:text-right min-w-[180px]">
                  <p className="text-xs uppercase tracking-wider text-blue-300 font-bold">
                    Weighted Adaptive Score
                  </p>
                  <p className="text-4xl font-extrabold text-blue-400 mt-1">
                    {adaptiveSummary.score_percentage}%
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {adaptiveSummary.earned_points} / {adaptiveSummary.max_possible_points} weighted pts
                  </p>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs text-slate-400 font-medium">Raw Accuracy</div>
                  <div className="text-xl font-bold text-slate-100 mt-1">
                    {adaptiveSummary.accuracy_percentage}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {adaptiveSummary.correct_count} of {adaptiveSummary.total_questions} correct
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs text-slate-400 font-medium">Final Tier Reached</div>
                  <div className="text-xl font-bold text-purple-400 capitalize mt-1">
                    {adaptiveSummary.final_difficulty}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Highest: {adaptiveSummary.highest_difficulty_reached}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs text-slate-400 font-medium">Total Time</div>
                  <div className="text-xl font-bold text-slate-100 mt-1">
                    {Math.round(adaptiveSummary.total_time_seconds)}s
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Avg {Math.round(adaptiveSummary.average_time_per_question)}s / question
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs text-slate-400 font-medium">Topic Mastery Est.</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    {adaptiveSummary.estimated_topic_mastery}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Live updated</div>
                </div>
              </div>

              {/* Difficulty Progression Trail */}
              {adaptiveSummary.difficulty_history && adaptiveSummary.difficulty_history.length > 0 && (
                <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Difficulty Scaling Progression
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {adaptiveSummary.difficulty_history.map((dh, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold border capitalize ${
                            DIFFICULTY_CONFIG[dh.difficulty]?.badgeClass || "text-slate-300"
                          }`}
                        >
                          Q{dh.question_number}: {dh.difficulty}
                        </span>
                        {idx < adaptiveSummary.difficulty_history.length - 1 && (
                          <span className="text-slate-600 text-xs font-bold">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weak Concepts Flagged */}
              {adaptiveSummary.weak_concepts && adaptiveSummary.weak_concepts.length > 0 && (
                <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-400 font-bold text-sm">⚠️ Concepts Requiring Revision:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {adaptiveSummary.weak_concepts.map((wc, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/30 px-3 py-1 text-xs font-semibold"
                      >
                        {wc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Recommendations */}
              {adaptiveSummary.recommendations && adaptiveSummary.recommendations.length > 0 && (
                <div className="mt-6 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Targeted Next Steps
                  </div>
                  <div className="space-y-2">
                    {adaptiveSummary.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300 flex items-start gap-2.5"
                      >
                        <span className="text-blue-400 font-bold">💡</span>
                        <span className="leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-800">
                <button
                  onClick={() => {
                    setTab("new");
                    setAdaptiveQuiz(null);
                    setAdaptiveSummary(null);
                  }}
                  className="w-full sm:w-auto rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500 transition text-sm cursor-pointer"
                >
                  Take Another Assessment
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Link
                    to="/performance"
                    className="flex-1 sm:flex-initial text-center rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800 transition"
                  >
                    View Mastery Radar →
                  </Link>
                  <button
                    onClick={handleOpenHistory}
                    className="flex-1 sm:flex-initial rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                  >
                    Quiz History
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: STANDARD ACTIVE QUIZ */}
        {tab === "active" && activeQuiz && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="rounded bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400">
                    {activeQuiz.subject}
                  </span>
                  <h1 className="mt-2 text-2xl font-bold text-slate-100">{activeQuiz.title}</h1>
                </div>

                {quizResult && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center sm:text-right">
                    <p className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
                      Final Score
                    </p>
                    <p className="text-3xl font-extrabold text-emerald-300">
                      {quizResult.score}%
                    </p>
                    <p className="text-xs text-slate-400">
                      {quizResult.correct} of {quizResult.total} correct
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {activeQuiz.questions.map((q, qIdx) => {
                const questionResult = quizResult?.results?.[qIdx];
                return (
                  <div
                    key={qIdx}
                    className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-base font-semibold text-slate-200">
                        <span className="text-blue-400 mr-2">{qIdx + 1}.</span>
                        {q.question}
                      </h2>
                      {questionResult && (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            questionResult.is_correct
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {questionResult.is_correct ? "✓ Correct" : "✗ Incorrect"}
                        </span>
                      )}
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = selectedAnswers[qIdx] === optIdx;
                        let optionStyle = "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800";

                        if (questionResult) {
                          if (optIdx === questionResult.correct_index) {
                            optionStyle = "border-emerald-500 bg-emerald-500/20 text-emerald-200 font-semibold";
                          } else if (isSelected && !questionResult.is_correct) {
                            optionStyle = "border-red-500 bg-red-500/20 text-red-200";
                          } else {
                            optionStyle = "border-slate-800 bg-slate-900/30 text-slate-500";
                          }
                        } else if (isSelected) {
                          optionStyle = "border-blue-500 bg-blue-600/20 text-blue-200 font-semibold";
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSelectOption(qIdx, optIdx)}
                            disabled={!!quizResult}
                            className={`flex items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition ${optionStyle}`}
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {questionResult && questionResult.explanation && (
                      <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs text-slate-300 leading-relaxed">
                        <strong className="text-blue-400">Explanation: </strong>
                        {questionResult.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!quizResult ? (
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleSubmitStandardQuiz}
                  disabled={loading}
                  className="rounded-xl bg-blue-600 px-8 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition disabled:opacity-50"
                >
                  {loading ? <LoadingSpinner size="sm" text="Grading..." /> : "Submit Quiz →"}
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center pt-4">
                <button
                  onClick={() => setTab("new")}
                  className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500 transition"
                >
                  Take Another Quiz
                </button>
                <button
                  onClick={handleOpenHistory}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm text-slate-300 hover:bg-slate-800 transition"
                >
                  View History
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: QUIZ HISTORY */}
        {tab === "history" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <h1 className="text-2xl font-bold text-slate-100 mb-4">Past Assessments &amp; Quizzes</h1>

            {historyLoading ? (
              <div className="py-16 text-center">
                <LoadingSpinner size="md" text="Loading quiz history..." />
              </div>
            ) : quizHistory.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center">
                <p className="text-slate-400 text-sm">No assessments completed yet.</p>
                <button
                  onClick={() => setTab("new")}
                  className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition cursor-pointer"
                >
                  Start your first assessment
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {quizHistory.map((q) => (
                  <div
                    key={q.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-slate-700"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                          {q.subject}
                        </span>
                        {q.adaptive && (
                          <span className="rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 text-xs font-semibold">
                            ⚡ Adaptive
                          </span>
                        )}
                        <h3 className="font-semibold text-slate-200">{q.topic || q.title}</h3>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {q.num_questions} questions • {new Date(q.created_at).toLocaleDateString()}
                        {q.adaptive && q.final_difficulty && ` • Final: ${q.final_difficulty}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      {q.completed ? (
                        <span
                          className={`rounded-lg px-3 py-1 text-sm font-bold ${
                            q.score >= 80
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : q.score >= 50
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : "bg-red-500/10 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {q.score}%
                        </span>
                      ) : (
                        <span className="rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-400">
                          Incomplete
                        </span>
                      )}

                      <button
                        onClick={() => handleViewQuizReview(q.id)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition cursor-pointer"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: REVIEW SAVED QUIZ */}
        {tab === "review" && reviewQuiz && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <button
                  onClick={() => setTab("history")}
                  className="text-xs text-blue-400 hover:underline mb-1 cursor-pointer"
                >
                  ← Back to History
                </button>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-100">{reviewQuiz.title}</h1>
                  {reviewQuiz.adaptive && (
                    <span className="rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 text-xs font-bold">
                      Adaptive
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {reviewQuiz.subject} • {reviewQuiz.topic} • Score: {reviewQuiz.score}%
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {reviewQuiz.questions.map((q, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-200">
                      <span className="text-blue-400 mr-2">{idx + 1}.</span>
                      {q.question}
                    </h3>
                    {q.difficulty && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border capitalize ${
                          DIFFICULTY_CONFIG[q.difficulty]?.badgeClass || "text-slate-300"
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = optIdx === q.correct_index;
                      const isUserChoice = reviewQuiz.answers && reviewQuiz.answers[idx] === optIdx;

                      let style = "border-slate-800 bg-slate-900/60 text-slate-400";
                      if (isCorrect) {
                        style = "border-emerald-500 bg-emerald-500/20 text-emerald-200 font-medium";
                      } else if (isUserChoice && !isCorrect) {
                        style = "border-red-500 bg-red-500/20 text-red-200";
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`rounded-xl border p-3 text-xs flex items-center justify-between ${style}`}
                        >
                          <span>{opt}</span>
                          {isCorrect && <span className="text-emerald-400 font-bold">✓ Answer</span>}
                          {isUserChoice && !isCorrect && (
                            <span className="text-red-400 font-bold">Your choice</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <p className="text-xs text-slate-400 border-t border-slate-800 pt-2.5">
                      <strong className="text-blue-400">Explanation: </strong>
                      {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* AI Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">✨</span>
                <h2 className="text-lg font-bold text-white">Google Gemini API Setup</h2>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Mentora AI uses <strong>Google Gemini 3.8 Flash</strong> for live quiz generation and adaptive assessments.
            </p>

            <div className="mb-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-200">
              <span>💡 Don't have a key? Get one free in 10 seconds at </span>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="font-bold underline text-blue-300 hover:text-white"
              >
                Google AI Studio →
              </a>
            </div>

            {keyModalError && (
              <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
                {keyModalError}
              </div>
            )}

            {keyModalSuccess && (
              <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
                {keyModalSuccess}
              </div>
            )}

            <form onSubmit={handleSaveAPIKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Select Gemini Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={savingKey}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white outline-none focus:border-blue-500"
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended)</option>
                  <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Fast / High Capacity)</option>
                  <option value="gemini-3.8-pro">gemini-3.8-pro (Deep Reasoning)</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  If one model is temporarily busy (503), you can switch models here and retry.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Paste Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  disabled={savingKey}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  disabled={savingKey}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingKey || !apiKeyInput.trim()}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-50"
                >
                  {savingKey ? "Verifying with Google..." : "Verify & Activate Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default Quiz;
