import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getProgress,
  listConversations,
  listQuizzes,
  getDashboardAnalytics,
} from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoadingSpinner from "../components/LoadingSpinner";

function Dashboard() {
  const { user } = useAuth();
  const [progress, setProgress] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [progressData, analyticsData, convData, quizData] = await Promise.all([
          getProgress().catch(() => null),
          getDashboardAnalytics().catch(() => null),
          listConversations().catch(() => ({ conversations: [] })),
          listQuizzes().catch(() => ({ quizzes: [] })),
        ]);

        if (progressData) setProgress(progressData);
        if (analyticsData) setAnalytics(analyticsData);
        if (convData && convData.conversations) setConversations(convData.conversations);
        if (quizData && quizData.quizzes) setQuizzes(quizData.quizzes);
      } catch (err) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const summary = analytics?.summary || {
    total_conversations: progress?.total_conversations || 0,
    total_messages: progress?.total_messages || 0,
    total_quizzes: progress?.total_quizzes || 0,
    total_documents: progress?.total_documents || 0,
    average_quiz_score: progress?.average_quiz_score || 0,
    streak_days: 0,
    formatted_learning_time: "0m",
  };

  const weeklyActivity = analytics?.weekly_activity || [];
  const monthlyActivity = analytics?.monthly_activity || [];
  const subjectPerformance = analytics?.subject_performance || [];
  const topicMastery = analytics?.topic_mastery || null;
  const quizTrends = analytics?.quiz_score_trends || [];
  const learningPathsOverview = analytics?.learning_paths_overview || null;
  const revisionActivity = analytics?.revision_activity || null;
  const recommendations = analytics?.recommendations || null;

  // Maximum daily activity for relative bar heights in weekly chart
  const maxWeeklyCount = Math.max(...weeklyActivity.map((d) => d.total), 1);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        {/* Personalized Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                Phase 6 • Advanced Analytics
              </span>
              <span className="text-xs text-slate-500">Live telemetry across all learning modules</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, <span className="text-blue-400">{user?.name || "Learner"}</span>!
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Your personalized AI learning console, spaced repetition telemetry, and performance trends.
            </p>
          </div>

          {/* Quick Actions Navigation */}
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/tutor"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition cursor-pointer"
            >
              ✦ Ask AI Tutor
            </Link>
            <Link
              to="/quiz"
              className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs sm:text-sm font-semibold text-blue-400 hover:bg-blue-500/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <span>⚡ Adaptive Quiz</span>
            </Link>
            <Link
              to="/flashcards"
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs sm:text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <span>🗂 Flashcards</span>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold">SM-2</span>
            </Link>
            <Link
              to="/learning-path"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5"
            >
              <span>🗺 Roadmap</span>
            </Link>
            <Link
              to="/performance"
              className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs sm:text-sm font-semibold text-purple-400 hover:bg-purple-500/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <span>📊 ML Insights</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs sm:text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center">
            <LoadingSpinner size="lg" text="Synthesizing learning analytics..." />
          </div>
        ) : (
          <>
            {/* Top KPI Telemetry Grid */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              {/* Learning Streak */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Daily Streak</span>
                  <span className="text-base">🔥</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-amber-400">
                    {summary.streak_days} <span className="text-xs font-normal text-slate-400">days</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {summary.streak_days > 0 ? "Active study streak!" : "Study today to start"}
                  </p>
                </div>
              </div>

              {/* Learning Time */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Learning Time</span>
                  <span className="text-base">⏱</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-blue-400">
                    {summary.formatted_learning_time}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">Total active learning</p>
                </div>
              </div>

              {/* Quizzes Completed */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Quizzes Done</span>
                  <span className="text-base">🎯</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-cyan-400">
                    {summary.total_quizzes}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Avg score: <strong className="text-slate-300">{summary.average_quiz_score}%</strong>
                  </p>
                </div>
              </div>

              {/* Flashcards Reviewed */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>SM-2 Flashcards</span>
                  <span className="text-base">🗂</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-purple-400">
                    {revisionActivity?.flashcard_reviews_total || 0}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {revisionActivity?.cards_due_today || 0} cards due today
                  </p>
                </div>
              </div>

              {/* Study Documents */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Study Notes</span>
                  <span className="text-base">📚</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-emerald-400">
                    {summary.total_documents}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">RAG indexed materials</p>
                </div>
              </div>

              {/* Tutor Messages */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Tutor Sessions</span>
                  <span className="text-base">💬</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-violet-400">
                    {summary.total_conversations}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {summary.total_messages} messages
                  </p>
                </div>
              </div>
            </div>

            {/* Prescriptive Intelligent Recommendation Banner */}
            {recommendations && (
              <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-slate-900/60 to-slate-900/80 p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-blue-300">
                    Mentora AI • Prescriptive Study Advisor
                  </h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-1">
                    <div className="text-[11px] font-bold text-blue-400 uppercase">What to Study Next</div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {recommendations.what_to_study_next}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-1">
                    <div className="text-[11px] font-bold text-amber-400 uppercase">Topic to Revise</div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {recommendations.which_topic_to_revise}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-1">
                    <div className="text-[11px] font-bold text-purple-400 uppercase">Assessment Target</div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {recommendations.which_quiz_to_attempt}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-1">
                    <div className="text-[11px] font-bold text-emerald-400 uppercase">Daily Goal</div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {recommendations.suggested_daily_goal}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Learning Activity: Weekly Chart & 30-Day Heatmap */}
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Weekly Activity Bar Chart (7 days) */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Weekly Learning Activity</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Completed quizzes, tutor queries, flashcards &amp; lessons
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                    Last 7 Days
                  </span>
                </div>

                {/* Bars */}
                <div className="flex items-end justify-between gap-2 h-44 pt-6 pb-2 px-2 border-b border-slate-800/80">
                  {weeklyActivity.map((day, idx) => {
                    const heightPercent = Math.max(8, Math.round((day.total / maxWeeklyCount) * 100));
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                        <div className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition">
                          {day.total}
                        </div>
                        <div className="w-full max-w-[36px] bg-slate-800/80 rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: `${heightPercent}%` }}>
                          <div
                            className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-lg transition-all duration-500 group-hover:brightness-125"
                            style={{ height: "100%" }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-400 mt-1">
                          {day.day_name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Total events this week: {weeklyActivity.reduce((acc, d) => acc + d.total, 0)}</span>
                  <span>Daily average: {Math.round(weeklyActivity.reduce((acc, d) => acc + d.total, 0) / 7)} / day</span>
                </div>
              </div>

              {/* Monthly Activity Heatmap (30 days) */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-100">30-Day Activity Heatmap</h3>
                    <span className="text-xs text-slate-500">Past Month</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Consistency and habit formation matrix
                  </p>
                </div>

                {/* Heatmap Grid */}
                <div className="grid grid-cols-6 gap-2 py-2">
                  {monthlyActivity.map((d, idx) => {
                    let cellColor = "bg-slate-800/40 border-slate-800";
                    if (d.level === 1) cellColor = "bg-emerald-900/60 border-emerald-700/50 text-emerald-200";
                    else if (d.level === 2) cellColor = "bg-emerald-700/80 border-emerald-500/60 text-white";
                    else if (d.level === 3) cellColor = "bg-emerald-500 border-emerald-300 text-slate-950 font-bold";

                    return (
                      <div
                        key={idx}
                        className={`h-9 rounded-lg border flex flex-col items-center justify-center text-[10px] transition cursor-pointer hover:scale-105 ${cellColor}`}
                        title={`${d.date}: ${d.count} study activities`}
                      >
                        <span className="text-[9px] opacity-70">{d.day}</span>
                        {d.count > 0 && <span>{d.count}</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-3">
                  <span>Less</span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-slate-800/40 border border-slate-800" />
                    <span className="h-3 w-3 rounded bg-emerald-900/60 border border-emerald-700/50" />
                    <span className="h-3 w-3 rounded bg-emerald-700/80 border border-emerald-500/60" />
                    <span className="h-3 w-3 rounded bg-emerald-500 border border-emerald-300" />
                  </div>
                  <span>More</span>
                </div>
              </div>
            </div>

            {/* Subject-Wise Performance & Quiz Score Trends */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Subject-Wise Performance */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Subject Performance</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Average quiz evaluation across domains
                    </p>
                  </div>
                  <Link to="/quiz" className="text-xs text-blue-400 hover:text-blue-300">
                    Take Quiz →
                  </Link>
                </div>

                {subjectPerformance.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
                    No subject assessments taken yet. Complete a quiz to see subject accuracy.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {subjectPerformance.map((subj, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">{subj.subject}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">{subj.quizzes_completed} quizzes</span>
                            <span
                              className={`font-bold px-2 py-0.5 rounded ${
                                subj.average_score >= 80
                                  ? "text-emerald-400 bg-emerald-500/10"
                                  : subj.average_score >= 60
                                  ? "text-amber-400 bg-amber-500/10"
                                  : "text-red-400 bg-red-500/10"
                              }`}
                            >
                              {subj.average_score}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              subj.average_score >= 80
                                ? "bg-emerald-500"
                                : subj.average_score >= 60
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${subj.average_score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quiz Score Trends (Last 10 Quizzes) */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Quiz Score Trends</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Chronological progression of completed assessments
                    </p>
                  </div>
                  <Link to="/quiz" className="text-xs text-blue-400 hover:text-blue-300">
                    View History →
                  </Link>
                </div>

                {quizTrends.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
                    No completed quiz telemetry recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {quizTrends.map((q, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-200 truncate">
                              {q.title}
                            </span>
                            {q.adaptive && (
                              <span className="rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 text-[10px] font-bold">
                                Adaptive
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {q.subject} • {q.date}
                          </p>
                        </div>

                        <span
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold shrink-0 ${
                            q.score >= 80
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : q.score >= 50
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : "bg-red-500/10 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {q.score}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Strong Topics vs Knowledge Gaps (Topic Mastery) */}
            {topicMastery && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Topic Mastery &amp; Knowledge Gaps</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Evaluated from actual quiz performance telemetry and ML classifier
                    </p>
                  </div>
                  <Link to="/performance" className="text-xs text-purple-400 hover:text-purple-300 font-semibold">
                    Detailed ML Breakdown →
                  </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Strong Topics */}
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider">
                        💪 Top Strong Concepts (≥ 70% Mastery)
                      </span>
                    </div>

                    {topicMastery.strong_topics.length === 0 ? (
                      <p className="text-xs text-slate-500 py-3">
                        Continue taking assessments to register mastered topics.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {topicMastery.strong_topics.map((t, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                            <span className="font-semibold text-slate-200">{t.topic}</span>
                            <span className="font-bold text-emerald-400">{t.mastery_score}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Weak Topics / Revision Needed */}
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 font-bold text-xs uppercase tracking-wider">
                        ⚠️ Weak Topics &amp; Knowledge Gaps (&lt; 60%)
                      </span>
                    </div>

                    {topicMastery.weak_topics.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3">
                        No critical knowledge gaps detected! All current topics are above the 60% mastery threshold.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {topicMastery.weak_topics.map((t, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                            <span className="font-semibold text-slate-200">{t.topic}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-red-400 font-bold">{t.mastery_score}%</span>
                              <Link
                                to={`/quiz`}
                                className="text-[10px] rounded bg-red-500/20 text-red-300 px-2 py-0.5 hover:bg-red-500/30"
                              >
                                Revise Drill
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Active Learning Paths Progress */}
            {learningPathsOverview && learningPathsOverview.in_progress.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-100">Active Learning Roadmaps</h3>
                  <Link to="/learning-path" className="text-xs text-blue-400 hover:text-blue-300">
                    Open Roadmap →
                  </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {learningPathsOverview.in_progress.map((lp) => (
                    <div key={lp.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400 font-semibold">
                          {lp.subject}
                        </span>
                        <span className="text-xs font-bold text-blue-300">
                          {lp.progress_percentage}% Done
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-200">{lp.learning_goal}</div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full"
                          style={{ width: `${lp.progress_percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>{lp.completed_lessons} of {lp.total_lessons} lessons completed</span>
                        <Link to="/learning-path" className="text-blue-400 hover:underline">
                          Resume →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Subjects Studied Section */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6">
              <h3 className="text-base font-bold text-slate-200 mb-3">Recently Studied Subjects</h3>
              {summary.subjects_studied && summary.subjects_studied.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {summary.subjects_studied.map((subject, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No subjects studied yet. Start asking questions in the AI Tutor or generate a learning path!
                </p>
              )}
            </div>

            {/* Existing 2-Column Activity: Recent Conversations & Past Quizzes */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Recent Conversations */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-200">Recent Tutor Conversations</h3>
                  <Link to="/tutor" className="text-xs text-blue-400 hover:text-blue-300">
                    Open Tutor →
                  </Link>
                </div>

                {conversations.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center">
                    <p className="text-slate-400 text-xs">No conversations yet.</p>
                    <Link
                      to="/tutor"
                      className="mt-3 inline-block rounded-lg bg-blue-600/20 px-4 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-600/30 transition"
                    >
                      Start first conversation
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {conversations.slice(0, 5).map((conv) => (
                      <Link
                        key={conv.id}
                        to={`/tutor?c=${conv.id}`}
                        className="block rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 transition hover:border-slate-700 hover:bg-slate-900"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-xs text-slate-200 line-clamp-1">{conv.title}</h4>
                          {conv.subject && (
                            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                              {conv.subject}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {new Date(conv.updated_at).toLocaleDateString()}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Quizzes List */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-200">Assessment History</h3>
                  <Link to="/quiz" className="text-xs text-blue-400 hover:text-blue-300">
                    Generate Quiz →
                  </Link>
                </div>

                {quizzes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center">
                    <p className="text-slate-400 text-xs">No assessments taken yet.</p>
                    <Link
                      to="/quiz"
                      className="mt-3 inline-block rounded-lg bg-blue-600/20 px-4 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-600/30 transition"
                    >
                      Create your first quiz
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {quizzes.slice(0, 5).map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-3.5"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-xs text-slate-200">{q.topic || q.title}</h4>
                            {q.adaptive && (
                              <span className="rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 text-[9px] font-bold">
                                ⚡ Adaptive
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {q.subject} • {new Date(q.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          {q.completed ? (
                            <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${
                              q.score >= 80
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : q.score >= 50
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                : "bg-red-500/10 text-red-400 border border-red-500/30"
                            }`}>
                              {q.score}%
                            </span>
                          ) : (
                            <span className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-400">
                              Incomplete
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default Dashboard;
