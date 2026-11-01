import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  getStudentPerformance,
  evaluateStudentPerformance,
} from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoadingSpinner from "../components/LoadingSpinner";

export default function PerformanceAnalysis() {
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const fetchPerformance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getStudentPerformance();
      setPerformance(res.performance);
    } catch (err) {
      setError(err.message || "Failed to load performance analysis");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const handleReevaluate = async () => {
    try {
      setEvaluating(true);
      const res = await evaluateStudentPerformance();
      setPerformance(res.performance);
    } catch (err) {
      alert("Evaluation failed: " + err.message);
    } finally {
      setEvaluating(false);
    }
  };

  const getTierBadge = (tier) => {
    switch (tier) {
      case "Mastered":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "Competent":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "Needs Revision":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "Critical Gap":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-slate-700 text-slate-300 border-slate-600";
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case "improving":
        return <span className="text-emerald-400 font-semibold flex items-center gap-1">↗ Improving</span>;
      case "declining":
        return <span className="text-red-400 font-semibold flex items-center gap-1">↘ Declining</span>;
      default:
        return <span className="text-slate-400 flex items-center gap-1">→ Steady</span>;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-purple-500/10 px-2 py-1 text-xs font-semibold text-purple-400 border border-purple-500/20">
                Phase 3 · AI Student Profiling
              </span>
              <span className="text-xs text-slate-400">Random Forest Classifier &amp; Topic Matrix</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Student Weakness Detection &amp; Mastery
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Diagnostic topic mastery tracking, ML exam readiness classification, and knowledge gap remediation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReevaluate}
              disabled={evaluating}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition disabled:opacity-50"
            >
              <span>{evaluating ? "⏳" : "⚡"}</span>
              <span>{evaluating ? "Re-Evaluating..." : "Re-Calculate Profile"}</span>
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
            <LoadingSpinner size="lg" text="Analyzing student telemetry..." />
          </div>
        ) : performance?.cold_start ? (
          /* Cold Start State */
          <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-3xl text-purple-400 border border-purple-500/20">
              📊
            </div>
            <h2 className="mt-4 text-xl font-bold text-white">No Assessment Data Yet</h2>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              Complete practice quizzes or learning path assessments to activate AI weakness detection, topic mastery scoring, and machine learning exam readiness evaluation.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/quiz"
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-500 transition shadow-lg shadow-purple-600/20"
              >
                <span>📝</span>
                <span>Take a Practice Quiz</span>
              </Link>
              <Link
                to="/learning-path"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition"
              >
                <span>🗺️</span>
                <span>View Learning Paths</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Active Performance Analytics View */
          <div className="mt-8 space-y-8">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Overall Accuracy */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>Overall Accuracy</span>
                  <span className="text-blue-400">🎯</span>
                </div>
                <div className="mt-3 text-3xl font-extrabold text-white">
                  {performance.overall_accuracy}%
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Across {performance.total_questions_answered} questions in {performance.total_assessments} quizzes
                </p>
              </div>

              {/* ML Exam Readiness */}
              <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-5">
                <div className="flex items-center justify-between text-xs text-purple-300 font-medium">
                  <span>ML Exam Readiness</span>
                  <span className="text-purple-400">🤖</span>
                </div>
                <div className="mt-3 text-3xl font-extrabold text-purple-300">
                  {performance.ml_insights?.exam_readiness_score || 0}%
                </div>
                <p className="mt-1 text-xs text-purple-400/80">
                  Category: {performance.ml_insights?.predicted_category}
                </p>
              </div>

              {/* Strong Topics */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5">
                <div className="flex items-center justify-between text-xs text-emerald-300 font-medium">
                  <span>Mastered Topics</span>
                  <span className="text-emerald-400">🏆</span>
                </div>
                <div className="mt-3 text-3xl font-extrabold text-emerald-300">
                  {performance.strong_topics?.length || 0}
                </div>
                <p className="mt-1 text-xs text-emerald-400/80">
                  {performance.strong_topics?.slice(0, 2).join(", ") || "No topics >80% yet"}
                </p>
              </div>

              {/* Topics Needing Revision */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5">
                <div className="flex items-center justify-between text-xs text-amber-300 font-medium">
                  <span>Needs Revision</span>
                  <span className="text-amber-400">⚠️</span>
                </div>
                <div className="mt-3 text-3xl font-extrabold text-amber-300">
                  {performance.weak_topics?.length || 0}
                </div>
                <p className="mt-1 text-xs text-amber-400/80">
                  {performance.weak_topics?.slice(0, 2).join(", ") || "No critical gaps"}
                </p>
              </div>
            </div>

            {/* AI Remediation Recommendations Banner */}
            {performance.recommendations?.length > 0 && (
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-950 p-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <span>💡 AI Remediation &amp; Strategic Study Recommendations</span>
                </div>
                <div className="mt-3 space-y-2">
                  {performance.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm text-slate-200">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span className="leading-relaxed">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Topic Mastery Score Matrix */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Topic Mastery Score Matrix</h3>
                  <p className="text-xs text-slate-400">
                    Weighted mastery combining accuracy, practice volume, and historical momentum.
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {performance.topic_matrix?.length || 0} Topics Profiled
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-3">Topic &amp; Domain</th>
                      <th className="py-3 px-3">Attempts</th>
                      <th className="py-3 px-3">Raw Accuracy</th>
                      <th className="py-3 px-3">Mastery Score</th>
                      <th className="py-3 px-3">Trend</th>
                      <th className="py-3 px-3">Classification</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {performance.topic_matrix?.map((row) => (
                      <tr key={row.topic} className="hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-white text-sm">{row.topic}</div>
                          <div className="text-[11px] text-slate-500">{row.subject}</div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-300 font-mono">
                          {row.attempts} quiz{row.attempts > 1 ? "zes" : ""}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-mono text-slate-200">
                            {row.correct_answers}/{row.total_questions} ({row.accuracy_percentage}%)
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white w-10">
                              {row.mastery_score}%
                            </span>
                            <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden hidden sm:block">
                              <div
                                className={`h-2 rounded-full ${
                                  row.mastery_score >= 80
                                    ? "bg-emerald-500"
                                    : row.mastery_score >= 65
                                    ? "bg-blue-500"
                                    : row.mastery_score >= 50
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                                }`}
                                style={{ width: `${Math.min(100, row.mastery_score)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">{getTrendIcon(row.trend)}</td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold ${getTierBadge(
                              row.tier
                            )}`}
                          >
                            {row.tier}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/tutor?subject=${encodeURIComponent(row.subject)}`}
                              className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-400 hover:bg-blue-500/20"
                              title="Ask AI Tutor"
                            >
                              Tutor
                            </Link>
                            <Link
                              to={`/quiz?topic=${encodeURIComponent(row.topic)}`}
                              className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[11px] font-medium text-purple-400 hover:bg-purple-500/20"
                              title="Take Diagnostic Quiz"
                            >
                              Quiz
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Knowledge Gaps & Missed Concepts */}
            {performance.knowledge_gaps?.length > 0 && (
              <div className="rounded-2xl border border-red-500/20 bg-slate-900/60 p-6">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                  <span className="text-red-400 text-lg">⚠️</span>
                  <h3 className="text-base font-bold text-white">
                    Identified Knowledge Gaps &amp; Missed Questions
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {performance.knowledge_gaps.map((gap, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                          {gap.topic}
                        </span>
                        <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                          Gap #{idx + 1}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-200">
                        Q: {gap.concept_query}
                      </p>
                      <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800/80 pt-1.5">
                        <strong className="text-emerald-400">Key Concept:</strong> {gap.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Machine Learning Model Transparency Card */}
            {performance.ml_insights && (
              <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                        ML Engine
                      </span>
                      <span className="text-xs text-emerald-400 font-mono">
                        Status: Trained &amp; Evaluated
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">
                      {performance.ml_insights.model_name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
                    <div>
                      Test Accuracy:{" "}
                      <span className="font-bold text-emerald-400">
                        {Math.round(performance.ml_insights.test_accuracy * 100)}%
                      </span>
                    </div>
                    <div>
                      F1 Score:{" "}
                      <span className="font-bold text-blue-400">
                        {performance.ml_insights.test_f1_score}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Feature Importances Grid */}
                {performance.ml_insights.feature_importances && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                      Feature Weightings &amp; Telemetry Impact
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Object.entries(performance.ml_insights.feature_importances).map(
                        ([feat, weight]) => (
                          <div
                            key={feat}
                            className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
                          >
                            <div className="text-[11px] text-slate-400 truncate" title={feat}>
                              {feat.replace(/_/g, " ")}
                            </div>
                            <div className="text-sm font-bold text-purple-300 font-mono mt-1">
                              {Math.round(weight * 100)}% impact
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Limitations & Verification Notice */}
                {performance.ml_insights.model_limitations?.length > 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Academic Rigor &amp; Model Limitations
                    </h4>
                    <ul className="space-y-1 text-xs text-slate-400 list-disc list-inside">
                      {performance.ml_insights.model_limitations.map((lim, idx) => (
                        <li key={idx}>{lim}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
