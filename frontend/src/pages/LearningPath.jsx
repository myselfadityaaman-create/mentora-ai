import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  generateLearningPath,
  listLearningPaths,
  getLearningPath,
  updateLessonStatus,
  getNextRecommendedTopic,
  adjustLearningPath,
  deleteLearningPath,
} from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoadingSpinner from "../components/LoadingSpinner";

const POPULAR_SUBJECTS = [
  "Computer Science",
  "Machine Learning & AI",
  "Python Programming",
  "Full-Stack Web Development",
  "Data Structures & Algorithms",
  "Mathematics & Calculus",
  "Database Systems & SQL",
  "Cloud Computing & DevOps",
  "Cybersecurity",
];

const KNOWLEDGE_LEVELS = [
  { level: "Beginner", desc: "Starting from scratch, foundational concepts & syntax" },
  { level: "Intermediate", desc: "Comfortable with basics, aiming for depth & architecture" },
  { level: "Advanced", desc: "Experienced developer targeting mastery, scale & optimization" },
];

const DAILY_TIME_OPTIONS = [30, 45, 60, 90, 120];

export default function LearningPath() {
  const navigate = useNavigate();

  // State
  const [roadmaps, setRoadmaps] = useState([]);
  const [activeRoadmap, setActiveRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [nextTopic, setNextTopic] = useState(null);
  const [expandedDays, setExpandedDays] = useState({ 1: true });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Form State
  const [subject, setSubject] = useState("Computer Science");
  const [customSubject, setCustomSubject] = useState("");
  const [knowledgeLevel, setKnowledgeLevel] = useState("Beginner");
  const [learningGoal, setLearningGoal] = useState("Master core foundations and build practical projects");
  const [targetDate, setTargetDate] = useState("");
  const [dailyTime, setDailyTime] = useState(45);

  // Adjust Form State
  const [adjustPace, setAdjustPace] = useState("maintain");
  const [adjustTime, setAdjustTime] = useState(45);
  const [focusTopic, setFocusTopic] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // Active Lesson Detail Modal
  const [viewingLesson, setViewingLesson] = useState(null);

  // Fetch list of roadmaps
  const fetchRoadmaps = useCallback(async (selectId = null) => {
    try {
      setLoading(true);
      setError(null);
      const res = await listLearningPaths();
      const paths = res.learning_paths || [];
      setRoadmaps(paths);

      if (paths.length > 0) {
        const toSelect = selectId ? paths.find((p) => p.id === selectId) || paths[0] : paths[0];
        await loadRoadmapDetails(toSelect.id);
      } else {
        setActiveRoadmap(null);
        setNextTopic(null);
      }
    } catch (err) {
      setError(err.message || "Failed to load learning paths");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRoadmapDetails = async (pathId) => {
    try {
      const res = await getLearningPath(pathId);
      setActiveRoadmap(res.learning_path);

      // Expand current day by default
      const nextRes = await getNextRecommendedTopic(pathId);
      setNextTopic(nextRes);
      if (nextRes.has_next && nextRes.day_number) {
        setExpandedDays((prev) => ({ ...prev, [nextRes.day_number]: true }));
      }
    } catch (err) {
      setError(err.message || "Failed to load roadmap details");
    }
  };

  useEffect(() => {
    fetchRoadmaps();
  }, [fetchRoadmaps]);

  // Handle Create Roadmap
  const handleGenerateRoadmap = async (e) => {
    e.preventDefault();
    const finalSubject = customSubject.trim() || subject;
    if (!finalSubject) {
      setError("Please select or enter a subject");
      return;
    }
    if (!learningGoal.trim()) {
      setError("Please state your target learning goal");
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      const res = await generateLearningPath(
        finalSubject,
        knowledgeLevel,
        learningGoal.trim(),
        targetDate || null,
        dailyTime
      );
      setShowCreateModal(false);
      await fetchRoadmaps(res.learning_path.id);
    } catch (err) {
      setError(err.message || "Failed to generate learning path");
    } finally {
      setGenerating(false);
    }
  };

  // Toggle Lesson Completion
  const handleToggleLesson = async (lessonId, currentStatus) => {
    if (!activeRoadmap) return;
    try {
      const res = await updateLessonStatus(activeRoadmap.id, lessonId, !currentStatus);
      setActiveRoadmap(res.learning_path);

      // Refresh next topic
      const nextRes = await getNextRecommendedTopic(activeRoadmap.id);
      setNextTopic(nextRes);
    } catch (err) {
      alert("Could not update lesson status: " + err.message);
    }
  };

  // Handle Adjust Pace
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!activeRoadmap) return;
    try {
      setAdjusting(true);
      const res = await adjustLearningPath(
        activeRoadmap.id,
        adjustPace,
        adjustTime,
        focusTopic.trim() || null
      );
      setActiveRoadmap(res.learning_path);
      setShowAdjustModal(false);
      setFocusTopic("");
    } catch (err) {
      alert("Adjustment failed: " + err.message);
    } finally {
      setAdjusting(false);
    }
  };

  // Delete Roadmap
  const handleDeleteRoadmap = async (pathId) => {
    if (!window.confirm("Are you sure you want to delete this learning path?")) return;
    try {
      await deleteLearningPath(pathId);
      await fetchRoadmaps();
    } catch (err) {
      alert("Failed to delete roadmap: " + err.message);
    }
  };

  const toggleDayExpansion = (dayNum) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayNum]: !prev[dayNum],
    }));
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header & Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
                Phase 2 · Intelligent Curriculum
              </span>
              <span className="text-xs text-slate-400">AI Adaptive Roadmap</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Personalized Learning Paths
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Custom-tailored study curriculums, daily lesson plans, practice activities, and automated mastery tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {roadmaps.length > 0 && (
              <select
                value={activeRoadmap?.id || ""}
                onChange={(e) => loadRoadmapDetails(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:border-blue-500"
              >
                {roadmaps.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.subject} ({r.progress_percentage}%)
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition"
            >
              <span>+</span>
              <span>Create New Roadmap</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : !activeRoadmap ? (
          /* Empty State */
          <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-3xl text-blue-400 border border-blue-500/20">
              🗺️
            </div>
            <h2 className="mt-4 text-xl font-bold text-white">No Learning Path Generated Yet</h2>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              Define your subject, target goal, daily study commitment, and current skill level. Mentora AI will generate a structured, day-by-day learning roadmap tailored specifically for you.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:brightness-110 transition"
            >
              <span>🚀</span>
              <span>Generate My First Roadmap</span>
            </button>
          </div>
        ) : (
          /* Active Roadmap View */
          <div className="mt-8 space-y-8">
            {/* Overview Banner Card */}
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 p-6 sm:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-blue-500/20 border border-blue-500/30 px-2.5 py-1 text-xs font-semibold text-blue-300">
                      {activeRoadmap.subject}
                    </span>
                    <span className="rounded-lg bg-purple-500/20 border border-purple-500/30 px-2.5 py-1 text-xs font-semibold text-purple-300">
                      {activeRoadmap.knowledge_level}
                    </span>
                    <span className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                      ⏱ {activeRoadmap.daily_study_time_minutes} min/day
                    </span>
                    {activeRoadmap.target_completion_date && (
                      <span className="rounded-lg bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-300">
                        🎯 Target: {activeRoadmap.target_completion_date}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">{activeRoadmap.title}</h2>
                  <p className="max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {activeRoadmap.description}
                  </p>
                  <p className="text-xs text-slate-400">
                    <span className="font-semibold text-slate-200">Goal:</span> {activeRoadmap.learning_goal}
                  </p>
                </div>

                {/* Progress Metric Circle / Bar */}
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5 min-w-[200px]">
                  <div className="text-3xl font-extrabold text-blue-400">
                    {activeRoadmap.progress_percentage}%
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Overall Completion</div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 mt-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, activeRoadmap.progress_percentage)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    {activeRoadmap.completed_lessons} of {activeRoadmap.total_lessons} lessons completed
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => setShowAdjustModal(true)}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition"
                      title="Adjust roadmap pace or add reinforcement"
                    >
                      ⚙️ Adjust Pace
                    </button>
                    <button
                      onClick={() => handleDeleteRoadmap(activeRoadmap.id)}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 transition"
                      title="Delete roadmap"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Recommended Topic Banner */}
            {nextTopic && nextTopic.has_next ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 to-slate-900 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Up Next: Day {nextTopic.day_number}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      {nextTopic.lesson.title}
                    </h3>
                    <p className="text-xs text-slate-300 max-w-xl">
                      {nextTopic.lesson.content.slice(0, 160)}...
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => setViewingLesson({ ...nextTopic.lesson, dayTitle: nextTopic.day_title })}
                      className="rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                    >
                      📖 Read Lesson
                    </button>
                    <Link
                      to={`/tutor?subject=${encodeURIComponent(activeRoadmap.subject)}`}
                      className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 transition flex items-center gap-1"
                    >
                      <span>🤖 Ask Tutor</span>
                    </Link>
                    <Link
                      to={`/quiz?topic=${encodeURIComponent(nextTopic.lesson.title)}`}
                      className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-xs font-semibold text-purple-400 hover:bg-purple-500/20 transition flex items-center gap-1"
                    >
                      <span>📝 Quiz Me</span>
                    </Link>
                    <button
                      onClick={() => handleToggleLesson(nextTopic.lesson.id, false)}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition"
                    >
                      ✓ Mark Complete
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-6 text-center">
                <span className="text-3xl">🎉</span>
                <h3 className="mt-2 text-lg font-bold text-emerald-300">
                  Congratulations! Roadmap Fully Completed
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  You have finished every lesson in this curriculum. Test your overall knowledge with an adaptive quiz!
                </p>
                <Link
                  to={`/quiz?topic=${encodeURIComponent(activeRoadmap.subject)}`}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition"
                >
                  Take Final Comprehensive Quiz
                </Link>
              </div>
            )}

            {/* Daily Roadmap Timeline */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Daily Study Timeline &amp; Curriculum</h3>
                <div className="text-xs text-slate-400">
                  {activeRoadmap.total_days} Days Planned
                </div>
              </div>

              <div className="space-y-4">
                {activeRoadmap.daily_plans.map((day) => {
                  const dayCompleted = day.lessons.every((l) => l.completed);
                  const isExpanded = !!expandedDays[day.day_number];

                  return (
                    <div
                      key={day.day_number}
                      className={`rounded-2xl border transition ${
                        dayCompleted
                          ? "border-emerald-500/30 bg-slate-900/30"
                          : "border-slate-800 bg-slate-900/60"
                      }`}
                    >
                      {/* Day Header Accordion */}
                      <div
                        onClick={() => toggleDayExpansion(day.day_number)}
                        className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-slate-800/40 rounded-2xl transition"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
                              dayCompleted
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                            }`}
                          >
                            {dayCompleted ? "✓" : `D${day.day_number}`}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Day {day.day_number}
                              </span>
                              {dayCompleted && (
                                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                                  Done
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm sm:text-base font-bold text-slate-100">
                              {day.title}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="hidden sm:inline text-xs text-slate-400">
                            {day.lessons.filter((l) => l.completed).length} / {day.lessons.length} lessons
                          </span>
                          <span className="text-slate-400 text-sm">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </div>
                      </div>

                      {/* Day Content Accordion Body */}
                      {isExpanded && (
                        <div className="border-t border-slate-800/80 p-4 sm:p-6 space-y-6">
                          {/* Learning Objectives */}
                          {day.learning_objectives?.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2">
                                Learning Objectives
                              </h5>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
                                {day.learning_objectives.map((obj, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-blue-400">✦</span>
                                    <span>{obj}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Lessons List */}
                          <div>
                            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                              Day Lessons
                            </h5>
                            <div className="space-y-2.5">
                              {day.lessons.map((lesson) => (
                                <div
                                  key={lesson.id}
                                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 transition ${
                                    lesson.completed
                                      ? "border-emerald-500/20 bg-emerald-950/10"
                                      : "border-slate-800 bg-slate-950/60"
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      checked={lesson.completed}
                                      onChange={() => handleToggleLesson(lesson.id, lesson.completed)}
                                      className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`text-sm font-semibold ${
                                            lesson.completed ? "text-slate-400 line-through" : "text-slate-100"
                                          }`}
                                        >
                                          {lesson.title}
                                        </span>
                                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                                          {lesson.duration_minutes}m
                                        </span>
                                      </div>
                                      <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                                        {lesson.content}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 self-end sm:self-center">
                                    <button
                                      type="button"
                                      onClick={() => setViewingLesson({ ...lesson, dayTitle: day.title })}
                                      className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition"
                                    >
                                      Read Full
                                    </button>
                                    <Link
                                      to={`/tutor?subject=${encodeURIComponent(activeRoadmap.subject)}`}
                                      className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition"
                                      title="Discuss this lesson with AI Tutor"
                                    >
                                      Ask AI
                                    </Link>
                                    <Link
                                      to={`/quiz?topic=${encodeURIComponent(lesson.title)}`}
                                      className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-500/20 transition"
                                      title="Generate quiz on this lesson"
                                    >
                                      Quiz
                                    </Link>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Practice Activity Card */}
                          {day.practice_activity && (
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                                <span>🛠️ Hands-on Practice Exercise</span>
                              </div>
                              <h6 className="mt-1 text-sm font-bold text-slate-100">
                                {day.practice_activity.title}
                              </h6>
                              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                                {day.practice_activity.instructions}
                              </p>
                              {day.practice_activity.deliverable && (
                                <div className="mt-2 text-[11px] text-amber-300/80 font-mono">
                                  Deliverable: {day.practice_activity.deliverable}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Revision & Resources */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {day.revision_schedule && (
                              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                  🔄 Revision Schedule
                                </span>
                                <p className="mt-1 text-xs text-slate-300">
                                  {day.revision_schedule}
                                </p>
                              </div>
                            )}

                            {day.recommended_resources?.length > 0 && (
                              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                  🔗 Recommended Resources
                                </span>
                                <div className="mt-1.5 space-y-1">
                                  {day.recommended_resources.map((res, idx) => (
                                    <a
                                      key={idx}
                                      href={res.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block text-xs text-blue-400 hover:underline truncate"
                                    >
                                      • {res.title} ({res.type})
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Lesson Reader Modal */}
      {viewingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  {viewingLesson.dayTitle}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {viewingLesson.title}
                </h3>
              </div>
              <button
                onClick={() => setViewingLesson(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="my-6 max-h-[60vh] overflow-y-auto pr-2 space-y-4 text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {viewingLesson.content}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-xs text-slate-400">
                Duration: ~{viewingLesson.duration_minutes} minutes
              </span>
              <div className="flex items-center gap-2">
                <Link
                  to={`/tutor?subject=${encodeURIComponent(activeRoadmap.subject)}`}
                  className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-500/20"
                >
                  Discuss with AI Tutor
                </Link>
                <button
                  onClick={() => {
                    handleToggleLesson(viewingLesson.id, viewingLesson.completed);
                    setViewingLesson(null);
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-bold text-white transition ${
                    viewingLesson.completed
                      ? "bg-slate-700 hover:bg-slate-600"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {viewingLesson.completed ? "Mark Incomplete" : "✓ Mark Completed"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Roadmap Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Adjust Roadmap Pace &amp; Schedule</h3>
            <p className="mt-1 text-xs text-slate-400">
              Fine-tune daily study hours or insert targeted remediation topics.
            </p>

            <form onSubmit={handleAdjustSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Learning Pace
                </label>
                <select
                  value={adjustPace}
                  onChange={(e) => setAdjustPace(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white outline-none focus:border-blue-500"
                >
                  <option value="maintain">Maintain Current Cadence</option>
                  <option value="faster">Accelerated (Faster Progression)</option>
                  <option value="slower">Deliberate (More Review &amp; Spacing)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Daily Study Time
                </label>
                <select
                  value={adjustTime}
                  onChange={(e) => setAdjustTime(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white outline-none focus:border-blue-500"
                >
                  {DAILY_TIME_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} minutes per day
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Insert Reinforcement Topic (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Asynchronous closures, Red-black trees"
                  value={focusTopic}
                  onChange={(e) => setFocusTopic(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {adjusting ? "Saving..." : "Save Adjustments"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Roadmap Wizard Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  AI Roadmap Architect
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Design Your Personalized Learning Path
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateRoadmap} className="mt-6 space-y-5">
              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Select Subject or Domain
                </label>
                <select
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    if (e.target.value !== "Custom") setCustomSubject("");
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-blue-500"
                >
                  {POPULAR_SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="Custom">+ Custom Topic / Domain</option>
                </select>

                {subject === "Custom" && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom subject (e.g. Distributed Systems, Rust)"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-blue-500"
                  />
                )}
              </div>

              {/* Knowledge Level */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Your Current Knowledge Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {KNOWLEDGE_LEVELS.map(({ level, desc }) => (
                    <div
                      key={level}
                      onClick={() => setKnowledgeLevel(level)}
                      className={`p-3 rounded-xl border cursor-pointer transition text-left ${
                        knowledgeLevel === level
                          ? "border-blue-500 bg-blue-500/10 text-white"
                          : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="text-xs font-bold text-white">{level}</div>
                      <div className="text-[11px] mt-1 leading-tight text-slate-400">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Learning Goal */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Target Learning Goal
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prepare for technical interviews, build production SaaS backend"
                  value={learningGoal}
                  onChange={(e) => setLearningGoal(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              {/* Time & Target Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Daily Study Commitment
                  </label>
                  <select
                    value={dailyTime}
                    onChange={(e) => setDailyTime(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-blue-500"
                  >
                    {DAILY_TIME_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} minutes per day
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Target Completion Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:brightness-110 disabled:opacity-50"
                >
                  {generating ? "Generating Roadmap..." : "⚡ Build My AI Roadmap"}
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
