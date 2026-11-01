import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getProgress,
  listConversations,
  listQuizzes,
  getDashboardAnalytics,
  getTeacherDashboard,
  getAdminDashboard,
  getAdminSystemHealth,
  getStudentClasses,
} from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoadingSpinner from "../components/LoadingSpinner";

function Dashboard() {
  const { user } = useAuth();

  // Role perspective: defaults to user's real role, but admin/teacher can toggle
  const userRole = user?.role || "student";
  const [activeRoleView, setActiveRoleView] = useState(
    userRole === "admin" ? "admin" : userRole === "teacher" ? "teacher" : "student"
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Student Data
  const [progress, setProgress] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [studentClasses, setStudentClasses] = useState([]);

  // Teacher Data
  const [teacherData, setTeacherData] = useState(null);

  // Admin Data
  const [adminData, setAdminData] = useState(null);
  const [adminHealth, setAdminHealth] = useState(null);

  // UI state
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const promises = [
          getProgress().catch(() => null),
          getDashboardAnalytics().catch(() => null),
          listConversations().catch(() => ({ conversations: [] })),
          listQuizzes().catch(() => ({ quizzes: [] })),
          getStudentClasses().catch(() => ({ classes: [] })),
        ];

        if (userRole === "teacher" || userRole === "admin") {
          promises.push(getTeacherDashboard().catch(() => null));
        }

        if (userRole === "admin") {
          promises.push(getAdminDashboard().catch(() => null));
          promises.push(getAdminSystemHealth().catch(() => null));
        }

        const results = await Promise.all(promises);

        const progressData = results[0];
        const analyticsData = results[1];
        const convData = results[2];
        const quizData = results[3];
        const stClassesData = results[4];

        if (progressData) setProgress(progressData);
        if (analyticsData) setAnalytics(analyticsData);
        if (convData?.conversations) setConversations(convData.conversations);
        if (quizData?.quizzes) setQuizzes(quizData.quizzes);
        if (stClassesData?.classes) setStudentClasses(stClassesData.classes);

        if (userRole === "teacher" || userRole === "admin") {
          const tData = results[5];
          if (tData) setTeacherData(tData);
        }

        if (userRole === "admin") {
          const aData = results[6];
          const aHealth = results[7];
          if (aData) setAdminData(aData);
          if (aHealth) setAdminHealth(aHealth);
        }
      } catch (err) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userRole]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Student summary metrics
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
  const maxWeeklyCount = Math.max(...weeklyActivity.map((d) => d.total), 1);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between overflow-x-hidden">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6 sm:space-y-8 overflow-x-hidden">
        {/* Top Header & Role Perspective Switcher */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                  activeRoleView === "admin"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : activeRoleView === "teacher"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                }`}
              >
                {activeRoleView === "admin"
                  ? "🛡️ System Governance & Infrastructure"
                  : activeRoleView === "teacher"
                  ? "👨‍🏫 Faculty Operations & Classroom Console"
                  : "🎓 Adaptive Student Learning Telemetry"}
              </span>

              {userRole === "admin" && (
                <span className="text-[11px] text-slate-500 font-medium">
                  Logged in as Administrator (Root)
                </span>
              )}
              {userRole === "teacher" && (
                <span className="text-[11px] text-slate-500 font-medium">
                  Logged in as Faculty Member
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                {user?.name || "User"}
              </span>
              !
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              {activeRoleView === "admin"
                ? "Full-stack multi-tenant platform health, compute infrastructure, and user telemetry."
                : activeRoleView === "teacher"
                ? "Coursework review, class enrollment join codes, and student grading overview."
                : "Your personalized AI study advisor, spaced repetition schedule, and mastery trends."}
            </p>
          </div>

          {/* Perspective Switcher Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* If user is Admin or Teacher, let them switch views */}
            {(userRole === "admin" || userRole === "teacher") && (
              <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-1 shadow-inner">
                {userRole === "admin" && (
                  <button
                    type="button"
                    onClick={() => setActiveRoleView("admin")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      activeRoleView === "admin"
                        ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>🛡️</span>
                    <span>Admin</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveRoleView("teacher")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    activeRoleView === "teacher"
                      ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>👨‍🏫</span>
                  <span>Teacher</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRoleView("student")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    activeRoleView === "student"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>🎓</span>
                  <span>Student</span>
                </button>
              </div>
            )}

            {/* Quick Action Primary Button */}
            {activeRoleView === "admin" ? (
              <Link
                to="/admin-portal"
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-500 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>⚙️ Open Admin Console →</span>
              </Link>
            ) : activeRoleView === "teacher" ? (
              <Link
                to="/teacher-portal"
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>👨‍🏫 Open Teacher Portal →</span>
              </Link>
            ) : (
              <Link
                to="/tutor"
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>✦ Ask AI Tutor →</span>
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs sm:text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center">
            <LoadingSpinner size="lg" text="Loading dashboard telemetry..." />
          </div>
        ) : (
          <>
            {/* ============================================================== */}
            {/* VIEW 1: ADMIN OPERATIONS DASHBOARD                             */}
            {/* ============================================================== */}
            {activeRoleView === "admin" && (
              <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
                {/* Admin System Status Banner */}
                <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-slate-900/60 to-slate-900/80 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <span>Platform Engine Status:</span>
                        <span className="text-emerald-400 uppercase tracking-wider text-xs">
                          All Systems Operational
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Gemini AI:{" "}
                        <strong className="text-slate-200">
                          {adminData?.ai_service?.model_name || "gemini-3.5-flash-lite"}
                        </strong>{" "}
                        • Database:{" "}
                        <strong className="text-slate-200">
                          {adminHealth?.mongodb?.status || "Connected"} (
                          {adminHealth?.mongodb?.latency_ms ?? 1.2}ms)
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <Link
                      to="/admin-portal?tab=users"
                      className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                    >
                      👥 Users
                    </Link>
                    <Link
                      to="/admin-portal?tab=health"
                      className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                    >
                      🩺 Diagnostics
                    </Link>
                    <Link
                      to="/admin-portal?tab=logs"
                      className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                    >
                      📜 Audit Logs
                    </Link>
                    <Link
                      to="/admin-portal?tab=settings"
                      className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                    >
                      ⚙️ Settings
                    </Link>
                  </div>
                </div>

                {/* Admin Platform KPI Grid */}
                <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
                  {/* Total Users */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400 text-xs">
                      <span className="font-semibold uppercase tracking-wider">Total Users</span>
                      <span className="text-base">👥</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-3xl font-extrabold text-white">
                        {adminData?.user_counts?.total_users || 0}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-2">
                        <span className="text-blue-400 font-semibold">
                          {adminData?.user_counts?.students || 0} Students
                        </span>
                        <span>•</span>
                        <span className="text-amber-400 font-semibold">
                          {adminData?.user_counts?.teachers || 0} Faculty
                        </span>
                        <span>•</span>
                        <span className="text-rose-400 font-semibold">
                          {adminData?.user_counts?.admins || 0} Admin
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Classes & Assignments */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400 text-xs">
                      <span className="font-semibold uppercase tracking-wider">Classrooms</span>
                      <span className="text-base">🏫</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-3xl font-extrabold text-amber-400">
                        {adminData?.content_counts?.classes || 0}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {adminData?.content_counts?.assignments || 0} active assignments published
                      </p>
                    </div>
                  </div>

                  {/* Submissions & Quizzes */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400 text-xs">
                      <span className="font-semibold uppercase tracking-wider">Submissions</span>
                      <span className="text-base">📝</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-3xl font-extrabold text-cyan-400">
                        {adminData?.content_counts?.submissions || 0}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {adminData?.content_counts?.quizzes || 0} quizzes completed across platform
                      </p>
                    </div>
                  </div>

                  {/* Indexed RAG Documents */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400 text-xs">
                      <span className="font-semibold uppercase tracking-wider">Knowledge Base</span>
                      <span className="text-base">📚</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-3xl font-extrabold text-emerald-400">
                        {adminData?.content_counts?.documents || 0}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {adminData?.content_counts?.learning_paths || 0} learning paths generated
                      </p>
                    </div>
                  </div>
                </div>

                {/* Admin Platform Audit Events & Multi-Tenant Volume */}
                <div className="grid gap-6 lg:grid-cols-12">
                  {/* Security & Audit Events Stream */}
                  <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                          <span>🛡️</span>
                          <span>Security &amp; Audit Event Stream</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Real-time system telemetry and user authentication events
                        </p>
                      </div>
                      <Link
                        to="/admin-portal?tab=logs"
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                      >
                        All Logs →
                      </Link>
                    </div>

                    <div className="space-y-2.5">
                      {adminData?.recent_logs && adminData.recent_logs.length > 0 ? (
                        adminData.recent_logs.slice(0, 5).map((log, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                  log.level === "error"
                                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                    : log.level === "warn"
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                }`}
                              >
                                {log.action?.replace("_", " ")}
                              </span>
                              <span className="text-slate-300 truncate">
                                {log.actor_email || "System"} •{" "}
                                <span className="text-slate-500 text-[11px]">
                                  {log.details?.status || log.details?.version || "active"}
                                </span>
                              </span>
                            </div>

                            <span className="text-[11px] text-slate-500 shrink-0">
                              {new Date(log.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 py-4 text-center">
                          No audit events recorded yet.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Multi-Tenant Distribution & AI Health */}
                  <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 space-y-4 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <span>🤖</span>
                        <span>AI &amp; Compute Stack</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Runtime configuration &amp; providers
                      </p>

                      <div className="mt-4 space-y-3">
                        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                          <div className="text-[11px] text-slate-400 font-semibold uppercase">
                            LLM Engine
                          </div>
                          <div className="text-sm font-bold text-blue-400 mt-0.5 flex items-center justify-between">
                            <span>{adminData?.ai_service?.model_name || "gemini-3.5-flash-lite"}</span>
                            <span className="rounded bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.2">
                              Ready
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                          <div className="text-[11px] text-slate-400 font-semibold uppercase">
                            Database Cluster
                          </div>
                          <div className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center justify-between">
                            <span>MongoDB Community 8.0</span>
                            <span className="text-xs text-slate-400 font-normal">
                              {adminHealth?.mongodb?.database || "mentora_ai"}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                          <div className="text-[11px] text-slate-400 font-semibold uppercase">
                            FastAPI Gateway
                          </div>
                          <div className="text-sm font-bold text-purple-400 mt-0.5 flex items-center justify-between">
                            <span>Port 8000</span>
                            <span className="text-xs text-slate-400 font-normal">Argon2 + JWT</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Link
                      to="/admin-portal"
                      className="w-full text-center rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-semibold text-slate-200 transition"
                    >
                      Manage Platform Settings →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 2: TEACHER FACULTY DASHBOARD                              */}
            {/* ============================================================== */}
            {activeRoleView === "teacher" && (
              <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
                {/* Teacher Faculty Quick Stats */}
                <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
                  {/* Active Classes */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400 text-xs">
                      <span className="font-semibold uppercase tracking-wider">Active Classes</span>
                      <span className="text-base">🏫</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-3xl font-extrabold text-amber-400">
                        {teacherData?.stats?.total_classes || 0}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {teacherData?.stats?.total_students || 0} students currently enrolled
                      </p>
                    </div>
                  </div>

                  {/* Pending Reviews */}
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-amber-400 text-xs">
                      <span className="font-bold uppercase tracking-wider">Pending Submissions</span>
                      <span className="text-base">⏳</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-3xl font-extrabold text-amber-300">
                        {teacherData?.stats?.pending_submissions || 0}
                      </div>
                      <p className="mt-1 text-[11px] text-amber-400/80">
                        Needs grading &amp; feedback
                      </p>
                    </div>
                  </div>

                  {/* Graded Submissions */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400 text-xs">
                      <span className="font-semibold uppercase tracking-wider">Total Graded</span>
                      <span className="text-base">✅</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-3xl font-extrabold text-emerald-400">
                        {teacherData?.stats?.graded_submissions || 0}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Avg class grade:{" "}
                        <strong className="text-emerald-300">
                          {teacherData?.stats?.average_grade || 0}%
                        </strong>
                      </p>
                    </div>
                  </div>

                  {/* Published Coursework */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400 text-xs">
                      <span className="font-semibold uppercase tracking-wider">Assignments</span>
                      <span className="text-base">📝</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-3xl font-extrabold text-blue-400">
                        {teacherData?.stats?.total_assignments || 0}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {teacherData?.stats?.total_submissions || 0} submissions submitted
                      </p>
                    </div>
                  </div>
                </div>

                {/* Classes & Pending Grading Section */}
                <div className="grid gap-6 lg:grid-cols-12">
                  {/* Active Classes Grid */}
                  <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                          <span>🏫</span>
                          <span>My Classrooms</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Share join code with students to self-enroll
                        </p>
                      </div>

                      <Link
                        to="/teacher-portal"
                        className="rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 text-xs font-semibold hover:bg-amber-500/30 transition"
                      >
                        + Create Class
                      </Link>
                    </div>

                    <div className="space-y-3">
                      {teacherData?.classes && teacherData.classes.length > 0 ? (
                        teacherData.classes.map((cls) => (
                          <div
                            key={cls.id}
                            className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3 hover:border-slate-700 transition"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                                {cls.subject} • {cls.grade_level}
                              </span>

                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-400">Join Code:</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(cls.join_code)}
                                  className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono font-bold text-amber-300 border border-slate-700 hover:border-amber-400/50 transition cursor-pointer flex items-center gap-1"
                                  title="Click to copy join code"
                                >
                                  <span>{cls.join_code}</span>
                                  <span className="text-[10px] text-slate-400">
                                    {copiedCode === cls.join_code ? "✓ Copied" : "📋"}
                                  </span>
                                </button>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-bold text-white">{cls.name}</h4>
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                                {cls.description}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                              <span className="text-slate-400 font-medium">
                                👥 {cls.student_count || cls.student_ids?.length || 0} Students Enrolled
                              </span>

                              <Link
                                to="/teacher-portal"
                                className="text-amber-400 hover:text-amber-300 font-semibold"
                              >
                                View Classroom Console →
                              </Link>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
                          <p>You haven't created any classes yet.</p>
                          <Link
                            to="/teacher-portal"
                            className="mt-3 inline-block rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
                          >
                            Create First Class
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submissions Pending Grading */}
                  <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                          <span>📝</span>
                          <span>Recent Submissions</span>
                        </h3>
                        <Link
                          to="/teacher-portal"
                          className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                        >
                          Grading Hub →
                        </Link>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Student coursework submitted for review
                      </p>

                      <div className="mt-4 space-y-3">
                        {teacherData?.recent_submissions && teacherData.recent_submissions.length > 0 ? (
                          teacherData.recent_submissions.map((sub) => (
                            <div
                              key={sub.id}
                              className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-white">{sub.student_name}</span>
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                    sub.status === "graded"
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : "bg-amber-500/20 text-amber-300"
                                  }`}
                                >
                                  {sub.status === "graded" ? `Score: ${sub.score}` : "Needs Review"}
                                </span>
                              </div>

                              <div className="text-xs text-slate-300 font-medium line-clamp-1">
                                {sub.assignment_title}
                              </div>

                              <p className="text-[11px] text-slate-500 line-clamp-2">
                                "{sub.content}"
                              </p>

                              <div className="flex items-center justify-between pt-1 text-[11px]">
                                <span className="text-slate-500">
                                  {new Date(sub.submitted_at).toLocaleDateString()}
                                </span>
                                <Link
                                  to="/teacher-portal"
                                  className="text-amber-400 hover:underline font-semibold"
                                >
                                  Grade Submission →
                                </Link>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
                            No student submissions pending review.
                          </div>
                        )}
                      </div>
                    </div>

                    <Link
                      to="/teacher-portal"
                      className="w-full text-center rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-semibold text-slate-200 transition mt-4"
                    >
                      Open Full Grading Console →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 3: STUDENT LEARNING DASHBOARD                             */}
            {/* ============================================================== */}
            {activeRoleView === "student" && (
              <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
                {/* Student Enrolled Class Announcement Banner */}
                {studentClasses && studentClasses.length > 0 && (
                  <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-slate-900/80 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-xl border border-blue-500/30">
                        🏫
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                          Enrolled Academic Course
                        </span>
                        <h3 className="text-sm font-bold text-white">
                          {studentClasses[0].name} ({studentClasses[0].subject})
                        </h3>
                        <p className="text-xs text-slate-400">
                          Instructor: {studentClasses[0].teacher_name} • {studentClasses[0].completed_assignments || 0} of {studentClasses[0].total_assignments || 0} assignments submitted
                        </p>
                      </div>
                    </div>

                    <Link
                      to="/student/classes"
                      className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition"
                    >
                      View Classwork &amp; Submissions →
                    </Link>
                  </div>
                )}

                {/* Top KPI Telemetry Grid */}
                <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                  {/* Learning Streak */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400 text-xs">
                      <span>Daily Streak</span>
                      <span className="text-base">🔥</span>
                    </div>
                    <div className="mt-2">
                      <div className="text-2xl font-bold text-amber-400">
                        {summary.streak_days}{" "}
                        <span className="text-xs font-normal text-slate-400">days</span>
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
                        Avg score:{" "}
                        <strong className="text-slate-300">{summary.average_quiz_score}%</strong>
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
                        <div className="text-[11px] font-bold text-blue-400 uppercase">
                          What to Study Next
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {recommendations.what_to_study_next}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-1">
                        <div className="text-[11px] font-bold text-amber-400 uppercase">
                          Topic to Revise
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {recommendations.which_topic_to_revise}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-1">
                        <div className="text-[11px] font-bold text-purple-400 uppercase">
                          Assessment Target
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {recommendations.which_quiz_to_attempt}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-1">
                        <div className="text-[11px] font-bold text-emerald-400 uppercase">
                          Daily Goal
                        </div>
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

                    <div className="flex items-end justify-between gap-2 h-44 pt-6 pb-2 px-2 border-b border-slate-800/80">
                      {weeklyActivity.map((day, idx) => {
                        const heightPercent = Math.max(
                          8,
                          Math.round((day.total / maxWeeklyCount) * 100)
                        );
                        return (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center gap-2 group h-full justify-end"
                          >
                            <div className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition">
                              {day.total}
                            </div>
                            <div
                              className="w-full max-w-[36px] bg-slate-800/80 rounded-t-lg overflow-hidden flex flex-col justify-end"
                              style={{ height: `${heightPercent}%` }}
                            >
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
                      <span>
                        Total events this week:{" "}
                        {weeklyActivity.reduce((acc, d) => acc + d.total, 0)}
                      </span>
                      <span>
                        Daily average:{" "}
                        {Math.round(weeklyActivity.reduce((acc, d) => acc + d.total, 0) / 7)} / day
                      </span>
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

                    <div className="grid grid-cols-6 gap-2 py-2">
                      {monthlyActivity.map((d, idx) => {
                        let cellColor = "bg-slate-800/40 border-slate-800";
                        if (d.level === 1)
                          cellColor =
                            "bg-emerald-900/60 border-emerald-700/50 text-emerald-200";
                        else if (d.level === 2)
                          cellColor = "bg-emerald-700/80 border-emerald-500/60 text-white";
                        else if (d.level === 3)
                          cellColor =
                            "bg-emerald-500 border-emerald-300 text-slate-950 font-bold";

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
                                <span className="text-slate-400">
                                  {subj.quizzes_completed} quizzes
                                </span>
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

                  {/* Quiz Score Trends */}
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

                {/* Strong Topics vs Knowledge Gaps */}
                {topicMastery && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-100">
                          Topic Mastery &amp; Knowledge Gaps
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Evaluated from actual quiz performance telemetry and ML classifier
                        </p>
                      </div>
                      <Link
                        to="/performance"
                        className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                      >
                        Detailed ML Breakdown →
                      </Link>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Strong Topics */}
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                        <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider">
                          💪 Top Strong Concepts (≥ 70% Mastery)
                        </span>

                        {topicMastery.strong_topics.length === 0 ? (
                          <p className="text-xs text-slate-500 py-3">
                            Continue taking assessments to register mastered topics.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {topicMastery.strong_topics.map((t, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800"
                              >
                                <span className="font-semibold text-slate-200">{t.topic}</span>
                                <span className="font-bold text-emerald-400">{t.mastery_score}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Weak Topics */}
                      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                        <span className="text-red-400 font-bold text-xs uppercase tracking-wider">
                          ⚠️ Weak Topics &amp; Knowledge Gaps (&lt; 60%)
                        </span>

                        {topicMastery.weak_topics.length === 0 ? (
                          <p className="text-xs text-slate-400 py-3">
                            No critical knowledge gaps detected! All current topics are above the 60% mastery threshold.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {topicMastery.weak_topics.map((t, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800"
                              >
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
                        <div
                          key={lp.id}
                          className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3"
                        >
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
                            <span>
                              {lp.completed_lessons} of {lp.total_lessons} lessons completed
                            </span>
                            <Link to="/learning-path" className="text-blue-400 hover:underline">
                              Resume →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2-Column Activity: Recent Conversations & Past Quizzes */}
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
                              <h4 className="font-medium text-xs text-slate-200 line-clamp-1">
                                {conv.title}
                              </h4>
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
                                <h4 className="font-medium text-xs text-slate-200">
                                  {q.topic || q.title}
                                </h4>
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
                                <span
                                  className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${
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
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default Dashboard;