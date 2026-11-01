import { useState, useEffect, useCallback } from "react";
import {
  getGamificationSummary,
  getGamificationLeaderboard,
  triggerGamificationEvaluate,
} from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Gamification() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [activeTab, setActiveTab] = useState("badges"); // "badges" | "leaderboard" | "challenges"

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, leadRes] = await Promise.all([
        getGamificationSummary(),
        getGamificationLeaderboard(),
      ]);
      setSummary(sumRes);
      setLeaderboard(leadRes.leaderboard || []);
      setMyRank(leadRes.my_rank);
    } catch (err) {
      alert("Failed to load gamification: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleManualEvaluate = async () => {
    try {
      setEvaluating(true);
      const res = await triggerGamificationEvaluate();
      if (res.count > 0) {
        alert(`Congratulations! You unlocked ${res.count} new achievement(s)!`);
      }
      await fetchData();
    } catch (err) {
      alert("Evaluation failed: " + err.message);
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-8">
          <LoadingSpinner message="Calculating XP, badges, and learning ranks..." />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Gamified Learning Engine
              </span>
              <span className="text-xs text-slate-400">Milestones, Streaks & Global Rankings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">XP, Badges & Leaderboards</h1>
          </div>

          <button
            onClick={handleManualEvaluate}
            disabled={evaluating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs border border-amber-500/30 transition disabled:opacity-50"
          >
            <span>{evaluating ? "Evaluating..." : "Check Unlocked Achievements ⚡"}</span>
          </button>
        </div>

        {/* Level & XP Hero Banner */}
        {summary && (
          <div className="my-6 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
              {/* Level Circle */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-3xl flex flex-col items-center justify-center shadow-lg shadow-amber-500/20 border-2 border-amber-300">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-900">LVL</span>
                  <span>{summary.level}</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Tier Status</div>
                  <div className="text-lg font-bold text-white">{summary.level_title}</div>
                  <div className="text-xs text-slate-400 mt-0.5 font-mono">
                    <strong className="text-amber-400">{summary.xp_points}</strong> Total XP
                  </div>
                </div>
              </div>

              {/* Progress to Next Level */}
              <div className="md:col-span-2 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Level {summary.level} Progress</span>
                  <span className="font-bold text-amber-400 font-mono">
                    {summary.xp_points} / {summary.xp_for_next_level} XP ({summary.level_progress_percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-700 shadow-md shadow-amber-500/50"
                    style={{ width: `${summary.level_progress_percentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Earn XP by completing quizzes, SM-2 flashcard reviews, lesson modules, and classroom submissions.
                </p>
              </div>

              {/* Streak and Rank Badges */}
              <div className="flex items-center justify-around md:justify-end gap-6 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                <div className="text-center">
                  <div className="text-2xl font-black text-rose-400 flex items-center justify-center gap-1">
                    <span>🔥</span>
                    <span>{summary.streak_days}</span>
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mt-1">
                    Day Streak
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-black text-blue-400 font-mono">
                    #{summary.rank}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mt-1">
                    Platform Rank
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {summary.earned_badges_count} / {summary.total_badges_count}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mt-1">
                    Badges
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 mb-6 space-x-6 text-sm">
          <button
            onClick={() => setActiveTab("badges")}
            className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "badges"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Achievement Badges</span>
            <span className="text-xs rounded-full px-2 py-0.5 bg-slate-800 text-slate-300">
              {summary?.earned_badges_count || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("challenges")}
            className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "challenges"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Weekly Challenges</span>
            <span className="text-xs rounded px-1.5 py-0.5 bg-blue-500/20 text-blue-400 font-bold">
              Active
            </span>
          </button>

          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "leaderboard"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Global Leaderboard</span>
            <span className="text-xs rounded px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold">
              Top 25
            </span>
          </button>
        </div>

        {/* TAB 1: BADGES SHOWCASE */}
        {activeTab === "badges" && summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {summary.badges.map((badge) => (
              <div
                key={badge.badge_id}
                className={`p-5 rounded-2xl border transition relative overflow-hidden flex flex-col justify-between ${
                  badge.earned
                    ? "bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5"
                    : "bg-slate-900/40 border-slate-800/80 opacity-60"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                        badge.earned
                          ? "bg-amber-500/20 border border-amber-500/40"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {badge.icon}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {badge.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        +{badge.xp_reward} XP
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1">{badge.title}</h3>
                  <p className="text-xs text-slate-400">{badge.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs">
                  {badge.earned ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span>✓ Unlocked</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        ({new Date(badge.earned_at).toLocaleDateString()})
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium">🔒 In Progress</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: WEEKLY CHALLENGES */}
        {activeTab === "challenges" && summary && (
          <div className="space-y-4 max-w-3xl">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Weekly challenges refresh every Monday at 00:00 UTC.</span>
              <span className="font-semibold text-amber-400">Bonus XP on completion</span>
            </div>

            {summary.weekly_challenges.map((ch) => {
              const pct = Math.min(100, Math.round((ch.current / ch.target) * 100));
              return (
                <div
                  key={ch.id}
                  className={`p-5 rounded-2xl border transition ${
                    ch.completed
                      ? "bg-emerald-950/20 border-emerald-800/40"
                      : "bg-slate-900/80 border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{ch.icon}</span>
                      <div>
                        <h4 className="text-base font-bold text-white">{ch.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{ch.description}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-amber-400">
                        +{ch.xp_reward} XP
                      </span>
                      {ch.completed && (
                        <div className="text-[11px] font-bold text-emerald-400 uppercase mt-0.5">
                          ✓ Completed
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Progress</span>
                      <span className="font-mono font-bold text-slate-200">
                        {ch.current} / {ch.target} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          ch.completed ? "bg-emerald-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: GLOBAL LEADERBOARD */}
        {activeTab === "leaderboard" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Your current position: <strong className="text-amber-400 font-mono">#{myRank}</strong> on the platform.
              </span>
              <span className="text-slate-500">Rankings updated in real time</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="p-4 text-center w-16">Rank</th>
                    <th className="p-4">Learner</th>
                    <th className="p-4">Level</th>
                    <th className="p-4">Active Streak</th>
                    <th className="p-4">Badges</th>
                    <th className="p-4 text-right">Total XP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {leaderboard.map((item) => (
                    <tr
                      key={item.user_id}
                      className={`hover:bg-slate-800/40 transition ${
                        item.is_current_user ? "bg-amber-500/10 border-l-4 border-amber-500" : ""
                      }`}
                    >
                      <td className="p-4 text-center font-bold">
                        {item.rank === 1 ? (
                          <span className="text-amber-400 text-base">🥇 1</span>
                        ) : item.rank === 2 ? (
                          <span className="text-slate-300 text-base">🥈 2</span>
                        ) : item.rank === 3 ? (
                          <span className="text-amber-600 text-base">🥉 3</span>
                        ) : (
                          <span className="text-slate-400 font-mono">#{item.rank}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span>{item.name}</span>
                          {item.is_current_user && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500 text-slate-950">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-amber-300">
                          Lvl {item.level}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-rose-400 font-semibold">
                          🔥 {item.streak_days} days
                        </span>
                      </td>
                      <td className="p-4 font-mono text-emerald-400">
                        {item.badges_count}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-amber-400 text-sm">
                        {item.xp_points.toLocaleString()} XP
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
