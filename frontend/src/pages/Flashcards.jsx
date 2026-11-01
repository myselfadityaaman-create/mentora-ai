import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  listFlashcards,
  getFlashcardStats,
  reviewFlashcard,
  createFlashcard,
  generateFlashcardsByTopic,
  generateFlashcardsFromDocument,
  generateFlashcardsFromConversation,
  generateFlashcardsFromLearningPath,
  deleteFlashcard,
  listDocuments,
  listLearningPaths,
} from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoadingSpinner from "../components/LoadingSpinner";

const STATUS_CONFIG = {
  new: { label: "New", badge: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  learning: { label: "Learning", badge: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  reviewing: { label: "Reviewing", badge: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  mastered: { label: "Mastered", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  overdue: { label: "Overdue", badge: "bg-red-500/10 text-red-400 border-red-500/30" },
};

const DIFFICULTY_CONFIG = {
  Beginner: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Intermediate: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Advanced: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

function Flashcards() {
  const [searchParams] = useSearchParams();
  const initialQueue = searchParams.get("queue") || "due";

  const [activeTab, setActiveTab] = useState("study"); // "study" | "all" | "stats"
  const [selectedQueue, setSelectedQueue] = useState(initialQueue); // "due" | "all" | "upcoming" | "overdue"
  const [cards, setCards] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Study Mode State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [studyTimer, setStudyTimer] = useState(0);
  const [sessionCompletedCount, setSessionCompletedCount] = useState(0);
  const [lastReviewFeedback, setLastReviewFeedback] = useState(null);

  // Creation / Generator Modal State
  const [showGenModal, setShowGenModal] = useState(false);
  const [genMode, setGenMode] = useState("topic"); // "topic" | "document" | "conversation" | "learning_path" | "manual"
  const [genSubject, setGenSubject] = useState("Computer Science");
  const [genTopic, setGenTopic] = useState("");
  const [genCount, setGenCount] = useState(5);
  const [genLanguage, setGenLanguage] = useState("English");
  const [genLoading, setGenLoading] = useState(false);
  const [genSuccessMsg, setGenSuccessMsg] = useState("");

  // Manual Card State
  const [manualQuestion, setManualQuestion] = useState("");
  const [manualAnswer, setManualAnswer] = useState("");
  const [manualTopic, setManualTopic] = useState("");
  const [manualSubject, setManualSubject] = useState("Computer Science");
  const [manualDifficulty, setManualDifficulty] = useState("Intermediate");

  // Auxiliary context items for generation
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [learningPaths, setLearningPaths] = useState([]);
  const [selectedPathId, setSelectedPathId] = useState("");

  const timerRef = useRef(null);

  // Study timer: tracks time on current card
  useEffect(() => {
    if (activeTab === "study" && cards.length > 0 && currentIndex < cards.length) {
      timerRef.current = setInterval(() => {
        setStudyTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTab, cards.length, currentIndex]);

  // Load cards and statistics
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [cardsRes, statsRes] = await Promise.all([
        listFlashcards(selectedQueue),
        getFlashcardStats(),
      ]);
      setCards(cardsRes.flashcards || []);
      setStats(statsRes);
      setCurrentIndex(0);
      setIsFlipped(false);
      setStudyTimer(0);
    } catch (err) {
      setError(err.message || "Failed to load flashcards.");
    } finally {
      setLoading(false);
    }
  }, [selectedQueue]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch documents and learning paths for generator modal
  useEffect(() => {
    async function loadAux() {
      try {
        const [docsRes, pathsRes] = await Promise.allSettled([
          listDocuments(),
          listLearningPaths(),
        ]);
        if (docsRes.status === "fulfilled") setDocuments(docsRes.value.documents || []);
        if (pathsRes.status === "fulfilled") setLearningPaths(pathsRes.value.learning_paths || []);
      } catch {
        // Ignored in background
      }
    }
    loadAux();
  }, []);

  // Keyboard Shortcuts for Study Mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeTab !== "study" || cards.length === 0 || currentIndex >= cards.length || showGenModal) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped) {
        if (e.key === "1") handleRateCard("again");
        else if (e.key === "2") handleRateCard("hard");
        else if (e.key === "3") handleRateCard("good");
        else if (e.key === "4") handleRateCard("easy");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, cards, currentIndex, isFlipped, showGenModal]);

  // Handle Spaced Repetition Rating
  const handleRateCard = async (rating) => {
    if (reviewing || currentIndex >= cards.length) return;
    const currentCard = cards[currentIndex];
    setReviewing(true);
    setError(null);

    try {
      const res = await reviewFlashcard(currentCard.id, rating, studyTimer);
      setLastReviewFeedback(res.sm2);
      setSessionCompletedCount((prev) => prev + 1);

      // Advance to next card
      setIsFlipped(false);
      setStudyTimer(0);
      setCurrentIndex((prev) => prev + 1);

      // Refresh stats in background
      getFlashcardStats().then(setStats).catch(() => {});
    } catch (err) {
      setError(err.message || "Failed to log review.");
    } finally {
      setReviewing(false);
    }
  };

  // Handle Card Deletion
  const handleDelete = async (cardId) => {
    if (!confirm("Are you sure you want to delete this flashcard?")) return;
    try {
      await deleteFlashcard(cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      if (stats) {
        setStats((prev) => ({ ...prev, total_cards: Math.max(0, prev.total_cards - 1) }));
      }
    } catch (err) {
      alert(err.message || "Failed to delete card.");
    }
  };

  // Handle Generation & Creation
  const handleCreateOrGenerate = async (e) => {
    e.preventDefault();
    setGenLoading(true);
    setError(null);
    setGenSuccessMsg("");

    try {
      let created = [];
      if (genMode === "topic") {
        if (!genTopic.trim()) throw new Error("Please specify a topic.");
        const res = await generateFlashcardsByTopic(genSubject, genTopic.trim(), genCount, genLanguage);
        created = res.flashcards || [];
        setGenSuccessMsg(`Generated ${created.length} flashcards on "${genTopic}"!`);
      } else if (genMode === "document") {
        if (!selectedDocId) throw new Error("Please select a study document.");
        const res = await generateFlashcardsFromDocument(selectedDocId);
        created = res.flashcards || [];
        setGenSuccessMsg(`Synthesized ${created.length} flashcards from document!`);
      } else if (genMode === "learning_path") {
        if (!selectedPathId) throw new Error("Please select a learning path.");
        const res = await generateFlashcardsFromLearningPath(selectedPathId);
        created = res.flashcards || [];
        setGenSuccessMsg(`Created ${created.length} flashcards from roadmap!`);
      } else if (genMode === "manual") {
        if (!manualQuestion.trim() || !manualAnswer.trim() || !manualTopic.trim()) {
          throw new Error("Question, answer, and topic are required.");
        }
        const res = await createFlashcard(
          manualQuestion.trim(),
          manualAnswer.trim(),
          manualTopic.trim(),
          manualSubject,
          manualDifficulty
        );
        created = [res.flashcard];
        setGenSuccessMsg("Flashcard created successfully!");
        setManualQuestion("");
        setManualAnswer("");
      }

      // Refresh deck list
      await fetchData();
      setTimeout(() => {
        setShowGenModal(false);
        setGenSuccessMsg("");
      }, 1200);
    } catch (err) {
      setError(err.message || "Failed to create flashcards.");
    } finally {
      setGenLoading(false);
    }
  };

  const currentCard = cards[currentIndex];
  const isStudyQueueFinished = cards.length > 0 && currentIndex >= cards.length;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 flex-1 w-full">
        {/* Header & Stats Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
                Phase 5 • Spaced Repetition (SM-2)
              </span>
              <span className="text-xs text-slate-500">SuperMemo memory consolidation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Smart Flashcard Decks</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Review memory cues at mathematically optimized intervals to maximize long-term retention.
            </p>
          </div>

          <button
            onClick={() => {
              setShowGenModal(true);
              setError(null);
            }}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <span>✨ Create / Generate Cards</span>
          </button>
        </div>

        {/* Top Telemetry Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-400">Due Today</div>
              <div className="text-2xl font-bold text-blue-400 mt-1">{stats.due_today}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{stats.overdue} overdue</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-400">Retention Rate</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {stats.retention_rate_percentage}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">SM-2 Good / Easy</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-400">Daily Target</div>
              <div className="text-2xl font-bold text-purple-400 mt-1">
                {stats.reviews_today} / {stats.daily_target}
              </div>
              <div className="mt-1.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${stats.daily_target_progress}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="text-xs text-slate-400">Mastered Cards</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {stats.retention_status_breakdown?.mastered || 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">of {stats.total_cards} total cards</div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 sm:gap-3 border-b border-slate-800 pb-3 mb-6">
          <button
            onClick={() => setActiveTab("study")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "study"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🎯 Study Session</span>
            {stats && stats.due_today > 0 && (
              <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                {stats.due_today} due
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeTab === "all"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            📚 Decks &amp; All Cards ({stats?.total_cards || 0})
          </button>

          <button
            onClick={() => setActiveTab("stats")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeTab === "stats"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            📈 Memory Retention Analytics
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs sm:text-sm text-red-300 flex items-start justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold ml-2">✕</button>
          </div>
        )}

        {/* TAB 1: STUDY SESSION (FLIP CARD INTERFACE) */}
        {activeTab === "study" && (
          <div>
            {loading ? (
              <div className="py-20 text-center">
                <LoadingSpinner size="lg" text="Loading study queue..." />
              </div>
            ) : cards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/20">
                <div className="text-4xl mb-3">🎉</div>
                <h2 className="text-xl font-bold text-slate-100">All caught up!</h2>
                <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">
                  There are no cards due for review right now. Create new cards or generate a deck from your study materials.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedQueue("all");
                      fetchData();
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                  >
                    Practice Any Card
                  </button>
                  <button
                    onClick={() => setShowGenModal(true)}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition"
                  >
                    Generate New Deck →
                  </button>
                </div>
              </div>
            ) : isStudyQueueFinished ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-12 text-center">
                <div className="text-5xl mb-3">🏆</div>
                <h2 className="text-2xl font-bold text-emerald-300">Session Complete!</h2>
                <p className="mt-2 text-sm text-slate-300 max-w-md mx-auto">
                  You reviewed <strong>{sessionCompletedCount}</strong> cards in this session. Your long-term memory consolidation intervals have been updated.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setCurrentIndex(0);
                      setIsFlipped(false);
                      setSessionCompletedCount(0);
                      fetchData();
                    }}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition cursor-pointer"
                  >
                    Review Again
                  </button>
                  <button
                    onClick={() => setActiveTab("stats")}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                  >
                    View Retention Stats
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Session Progress Header */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">
                      Card {currentIndex + 1} of {cards.length}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="capitalize text-blue-400 font-medium">
                      {currentCard?.topic}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400">
                      ⏱ {String(Math.floor(studyTimer / 60)).padStart(2, "0")}:{String(studyTimer % 60).padStart(2, "0")}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                        STATUS_CONFIG[currentCard?.retention_status]?.badge || "text-slate-300"
                      }`}
                    >
                      {STATUS_CONFIG[currentCard?.retention_status]?.label || currentCard?.retention_status}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
                  />
                </div>

                {/* The 3D Interactive Flip Card */}
                <div
                  onClick={() => setIsFlipped((prev) => !prev)}
                  className="group relative min-h-[300px] sm:min-h-[340px] w-full rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-8 sm:p-12 flex flex-col justify-between shadow-2xl transition hover:border-slate-700 cursor-pointer select-none"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                      {isFlipped ? "💡 Solution / Memory Cue" : "❓ Question / Concept Prompt"}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full border ${
                        DIFFICULTY_CONFIG[currentCard?.difficulty] || "text-slate-400"
                      }`}
                    >
                      {currentCard?.difficulty}
                    </span>
                  </div>

                  <div className="py-6 text-center">
                    <div
                      className={`text-lg sm:text-2xl font-semibold leading-relaxed transition-opacity duration-200 ${
                        isFlipped ? "text-emerald-200" : "text-slate-100"
                      }`}
                    >
                      {isFlipped ? currentCard?.answer : currentCard?.question}
                    </div>

                    {!isFlipped && (
                      <p className="mt-6 text-xs text-slate-500 italic">
                        Click card or press <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300 font-mono">Space</kbd> to reveal answer
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-4">
                    <span>Subject: {currentCard?.subject}</span>
                    <span>Interval: {currentCard?.interval_days}d • EF: {currentCard?.easiness_factor}</span>
                  </div>
                </div>

                {/* SM-2 Review Rating Controls */}
                {isFlipped && (
                  <div className="space-y-3 pt-2">
                    <div className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Rate Your Recall (SuperMemo SM-2)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <button
                        type="button"
                        onClick={() => handleRateCard("again")}
                        disabled={reviewing}
                        className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-center hover:bg-red-500/20 transition cursor-pointer"
                      >
                        <div className="text-sm font-bold text-red-400">1. Again</div>
                        <div className="text-xs text-slate-400 mt-1">&lt; 1 Day (Reset)</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">Key [1]</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRateCard("hard")}
                        disabled={reviewing}
                        className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-center hover:bg-amber-500/20 transition cursor-pointer"
                      >
                        <div className="text-sm font-bold text-amber-400">2. Hard</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {Math.max(1, Math.round((currentCard?.interval_days || 1) * 1.2))}d (1.2x)
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">Key [2]</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRateCard("good")}
                        disabled={reviewing}
                        className="rounded-2xl border border-blue-500/40 bg-blue-500/10 p-4 text-center hover:bg-blue-500/20 transition cursor-pointer"
                      >
                        <div className="text-sm font-bold text-blue-400">3. Good</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {currentCard?.repetitions === 0
                            ? "1d"
                            : currentCard?.repetitions === 1
                            ? "6d"
                            : `${Math.round((currentCard?.interval_days || 1) * (currentCard?.easiness_factor || 2.5))}d`}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">Key [3]</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRateCard("easy")}
                        disabled={reviewing}
                        className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center hover:bg-emerald-500/20 transition cursor-pointer"
                      >
                        <div className="text-sm font-bold text-emerald-400">4. Easy</div>
                        <div className="text-xs text-slate-400 mt-1">
                          Bonus Interval (EF ↑)
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">Key [4]</div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DECKS & ALL CARDS */}
        {activeTab === "all" && (
          <div className="space-y-6">
            {/* Filter queue toggles */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {[
                  { id: "all", label: "All Cards" },
                  { id: "due", label: "Due Today" },
                  { id: "overdue", label: "Overdue" },
                  { id: "upcoming", label: "Upcoming" },
                ].map((q) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setSelectedQueue(q.id);
                    }}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      selectedQueue === q.id
                        ? "bg-blue-600 text-white"
                        : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-400">
                Showing {cards.length} cards
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <LoadingSpinner size="md" text="Loading flashcards..." />
              </div>
            ) : cards.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 p-10 text-center text-slate-400 text-sm">
                No flashcards found in this queue.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {cards.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold text-blue-400 truncate">
                          {c.topic}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              STATUS_CONFIG[c.retention_status]?.badge || "text-slate-400"
                            }`}
                          >
                            {STATUS_CONFIG[c.retention_status]?.label || c.retention_status}
                          </span>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-slate-500 hover:text-red-400 text-xs p-1"
                            title="Delete Card"
                          >
                            🗑
                          </button>
                        </div>
                      </div>

                      <div className="text-sm font-semibold text-slate-200">
                        {c.question}
                      </div>

                      <div className="mt-2 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                        {c.answer}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/60 pt-2.5">
                      <span>Reviews: {c.review_count}</span>
                      <span>Next: {new Date(c.next_review_at).toLocaleDateString()}</span>
                      <span>Interval: {c.interval_days}d</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RETENTION & STATISTICS */}
        {activeTab === "stats" && stats && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-100">SuperMemo SM-2 Memory Matrix</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Long-term retention model based on review intervals, repetition counts, and easiness factors.
                </p>
              </div>

              {/* Status Breakdown Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Card Retention Stages</span>
                  <span>{stats.total_cards} Total Cards</span>
                </div>
                <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-800 gap-0.5">
                  <div
                    className="bg-blue-500"
                    style={{
                      width: `${(stats.retention_status_breakdown.new / Math.max(1, stats.total_cards)) * 100}%`,
                    }}
                    title={`New: ${stats.retention_status_breakdown.new}`}
                  />
                  <div
                    className="bg-amber-500"
                    style={{
                      width: `${(stats.retention_status_breakdown.learning / Math.max(1, stats.total_cards)) * 100}%`,
                    }}
                    title={`Learning: ${stats.retention_status_breakdown.learning}`}
                  />
                  <div
                    className="bg-purple-500"
                    style={{
                      width: `${(stats.retention_status_breakdown.reviewing / Math.max(1, stats.total_cards)) * 100}%`,
                    }}
                    title={`Reviewing: ${stats.retention_status_breakdown.reviewing}`}
                  />
                  <div
                    className="bg-emerald-500"
                    style={{
                      width: `${(stats.retention_status_breakdown.mastered / Math.max(1, stats.total_cards)) * 100}%`,
                    }}
                    title={`Mastered: ${stats.retention_status_breakdown.mastered}`}
                  />
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500" /> New ({stats.retention_status_breakdown.new})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Learning ({stats.retention_status_breakdown.learning})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-purple-500" /> Reviewing ({stats.retention_status_breakdown.reviewing})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Mastered ({stats.retention_status_breakdown.mastered})
                  </span>
                </div>
              </div>

              {/* Topic Distribution */}
              {stats.topics_summary && stats.topics_summary.length > 0 && (
                <div className="border-t border-slate-800 pt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
                    Decks by Topic
                  </h3>
                  <div className="space-y-3">
                    {stats.topics_summary.map((t, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-200">{t.topic}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {t.count} cards • {t.mastered} mastered • {t.due} due
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab("study");
                            setSelectedQueue("all");
                          }}
                          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-blue-400 hover:text-white transition"
                        >
                          Review Deck →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: CREATE OR GENERATE FLASHCARDS */}
        {showGenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-white">Create / Generate Flashcards</h2>
                <button
                  onClick={() => setShowGenModal(false)}
                  className="text-slate-400 hover:text-white p-1 text-lg"
                >
                  ✕
                </button>
              </div>

              {/* Source Mode Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                {[
                  { id: "topic", label: "🎯 Topic AI" },
                  { id: "document", label: "📄 Document" },
                  { id: "learning_path", label: "🗺 Roadmap" },
                  { id: "manual", label: "✍️ Manual" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setGenMode(m.id);
                      setError(null);
                    }}
                    className={`py-2 text-xs font-semibold rounded-xl border transition ${
                      genMode === m.id
                        ? "border-blue-500 bg-blue-600/20 text-white"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {genSuccessMsg && (
                <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  {genSuccessMsg}
                </div>
              )}

              <form onSubmit={handleCreateOrGenerate} className="space-y-4">
                {genMode === "topic" && (
                  <>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Subject</label>
                        <input
                          type="text"
                          value={genSubject}
                          onChange={(e) => setGenSubject(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Language</label>
                        <select
                          value={genLanguage}
                          onChange={(e) => setGenLanguage(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white outline-none focus:border-blue-500"
                        >
                          {["English", "Hindi", "Spanish", "French", "German", "Japanese"].map((l) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Topic or Concept</label>
                      <input
                        type="text"
                        placeholder="e.g. Graph Theory, Red-Black Trees, ACID Transactions..."
                        value={genTopic}
                        onChange={(e) => setGenTopic(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Cards Count: {genCount}
                      </label>
                      <input
                        type="range"
                        min="3"
                        max="15"
                        value={genCount}
                        onChange={(e) => setGenCount(Number(e.target.value))}
                        className="w-full accent-blue-500"
                      />
                    </div>
                  </>
                )}

                {genMode === "document" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Select Uploaded Study Material (RAG)
                    </label>
                    {documents.length === 0 ? (
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400">
                        No documents found. Upload notes in Study Materials first.
                      </div>
                    ) : (
                      <select
                        value={selectedDocId}
                        onChange={(e) => setSelectedDocId(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white outline-none focus:border-blue-500"
                      >
                        <option value="">-- Choose document --</option>
                        {documents.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.title} ({d.file_type.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {genMode === "learning_path" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Select Active Learning Path
                    </label>
                    {learningPaths.length === 0 ? (
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400">
                        No learning paths generated yet. Create one in Learning Paths first.
                      </div>
                    ) : (
                      <select
                        value={selectedPathId}
                        onChange={(e) => setSelectedPathId(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white outline-none focus:border-blue-500"
                      >
                        <option value="">-- Choose learning path --</option>
                        {learningPaths.map((lp) => (
                          <option key={lp.id} value={lp.id}>
                            {lp.subject} — {lp.learning_goal}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {genMode === "manual" && (
                  <>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Subject</label>
                        <input
                          type="text"
                          value={manualSubject}
                          onChange={(e) => setManualSubject(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Topic</label>
                        <input
                          type="text"
                          placeholder="e.g. Distributed Systems"
                          value={manualTopic}
                          onChange={(e) => setManualTopic(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Question / Front of Card
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. What is the difference between optimistic and pessimistic locking?"
                        value={manualQuestion}
                        onChange={(e) => setManualQuestion(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white outline-none focus:border-blue-500 leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Answer / Back of Card (Memory Cue)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Optimistic checks for conflict at commit time using version stamps; pessimistic acquires explicit locks beforehand."
                        value={manualAnswer}
                        onChange={(e) => setManualAnswer(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white outline-none focus:border-blue-500 leading-relaxed"
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowGenModal(false)}
                    disabled={genLoading}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={genLoading}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition disabled:opacity-50 cursor-pointer"
                  >
                    {genLoading ? <LoadingSpinner size="sm" text="Synthesizing..." /> : "Generate Cards →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default Flashcards;
