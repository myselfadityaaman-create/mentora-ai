import { useState, useEffect, useCallback } from "react";
import {
  getAdminDashboard,
  getAdminUsers,
  updateAdminUserRole,
  deleteAdminUser,
  getAdminLogs,
  getAdminSystemHealth,
  getAdminSettings,
  updateAdminSettings,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoadingSpinner from "../components/LoadingSpinner";

export default function AdminPortal() {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "users" | "health" | "logs" | "settings"

  // Dashboard Data
  const [dashboardData, setDashboardData] = useState(null);

  // User Management
  const [usersList, setUsersList] = useState([]);
  const [userQuery, setUserQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Health Diagnostics
  const [healthData, setHealthData] = useState(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Logs
  const [logsList, setLogsList] = useState([]);
  const [logsLevel, setLogsLevel] = useState("all");
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Settings
  const [settings, setSettings] = useState({
    platform_name: "Mentora AI",
    allow_student_registration: true,
    allow_teacher_registration: true,
    default_ai_model: "gemini-3.8-flash",
    max_upload_size_mb: 25,
    maintenance_mode: false,
    auto_grading_enabled: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Role Change Modal
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("student");
  const [updatingRole, setUpdatingRole] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminDashboard();
      setDashboardData(res);
    } catch (err) {
      setError(err.message || "Failed to load admin console");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const res = await getAdminUsers({
        q: userQuery,
        role: userRoleFilter,
        page: usersPage,
        limit: 15,
      });
      setUsersList(res.users || []);
      setUsersTotal(res.total || 0);
      setUsersTotalPages(res.pages || 1);
    } catch (err) {
      alert("Failed to load users: " + err.message);
    } finally {
      setLoadingUsers(false);
    }
  }, [userQuery, userRoleFilter, usersPage]);

  const fetchHealth = useCallback(async () => {
    try {
      setCheckingHealth(true);
      const res = await getAdminSystemHealth();
      setHealthData(res);
    } catch (err) {
      alert("Health check failed: " + err.message);
    } finally {
      setCheckingHealth(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      const res = await getAdminLogs({ level: logsLevel, limit: 50 });
      setLogsList(res.logs || []);
    } catch (err) {
      alert("Failed to fetch logs: " + err.message);
    } finally {
      setLoadingLogs(false);
    }
  }, [logsLevel]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await getAdminSettings();
      setSettings(res);
    } catch (err) {
      alert("Failed to load settings: " + err.message);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    if (activeTab === "health") fetchHealth();
    if (activeTab === "logs") fetchLogs();
    if (activeTab === "settings") fetchSettings();
  }, [activeTab, fetchUsers, fetchHealth, fetchLogs, fetchSettings]);

  const handleRoleChangeSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setUpdatingRole(true);
      await updateAdminUserRole(editingUser.id, selectedRole);
      setEditingUser(null);
      await fetchUsers();
      await fetchDashboard();
    } catch (err) {
      alert("Role update failed: " + err.message);
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === currentUser?.id) {
      alert("Security constraint: You cannot delete your own administrative account.");
      return;
    }
    if (!window.confirm(`Permanently delete user ${user.email} (${user.name})? This cannot be undone.`)) return;
    try {
      await deleteAdminUser(user.id);
      await fetchUsers();
      await fetchDashboard();
    } catch (err) {
      alert("User deletion failed: " + err.message);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setSettingsSuccess(false);
      const res = await updateAdminSettings(settings);
      setSettings(res.settings);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      alert("Failed to update settings: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-8">
          <LoadingSpinner message="Authenticating Administrator Privileges..." />
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
              <span className="text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Root Governance
              </span>
              <span className="text-xs text-slate-400">Platform Control & AI Engine Operations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">System Administration</h1>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Administrator: <strong className="text-white">{currentUser?.name}</strong></span>
          </div>
        </div>

        {/* Global Platform KPIs */}
        {dashboardData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5 my-6">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400">Total Users</div>
              <div className="text-2xl font-bold text-white mt-1">
                {dashboardData.user_counts.total_users}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {dashboardData.user_counts.students}S • {dashboardData.user_counts.teachers}T • {dashboardData.user_counts.admins}A
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400">Classrooms</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {dashboardData.content_counts.classes}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400">Assignments</div>
              <div className="text-2xl font-bold text-blue-400 mt-1">
                {dashboardData.content_counts.assignments}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400">Quizzes</div>
              <div className="text-2xl font-bold text-purple-400 mt-1">
                {dashboardData.content_counts.quizzes}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400">Flashcards</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {dashboardData.content_counts.flashcards}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400">AI Service</div>
              <div className="text-sm font-bold text-emerald-400 mt-2 truncate">
                {dashboardData.ai_service.model_name || "Gemini Flash"}
              </div>
              <div className="text-[10px] text-slate-500">
                {dashboardData.ai_service.status}
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 mb-6 space-x-6 text-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "overview"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "users"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>User Management</span>
            <span className="text-xs rounded-full px-2 py-0.5 bg-slate-800 text-slate-300">
              {dashboardData?.user_counts.total_users || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("health")}
            className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "health"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>System Health & Diagnostics</span>
            <span className="text-xs rounded px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold">
              Live
            </span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "logs"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Audit Trail</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "settings"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Platform Settings</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW & RECENT ACTIVITY */}
        {activeTab === "overview" && dashboardData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Audit Stream */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Recent Platform Audit Events
                  </h3>
                  <button
                    onClick={() => setActiveTab("logs")}
                    className="text-xs text-rose-400 hover:text-rose-300"
                  >
                    View All Logs →
                  </button>
                </div>
                <div className="space-y-2.5">
                  {dashboardData.recent_logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">
                          {log.action}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          By: {log.actor_email || "System"} • {new Date(log.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          log.level === "warning"
                            ? "bg-amber-500/20 text-amber-400"
                            : log.level === "error"
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {log.level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI & Infrastructure Summary */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                    AI Engine & System Architecture
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">Gemini Generative Engine:</span>
                      <span className="font-bold text-emerald-400">{dashboardData.ai_service.model_name}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">API Key Configuration:</span>
                      <span className="font-semibold text-slate-200">
                        {dashboardData.ai_service.api_key_configured ? "Configured & Active" : "Missing API Key"}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">Database Engine:</span>
                      <span className="font-semibold text-slate-200">MongoDB Distributed Cluster</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">Server Architecture:</span>
                      <span className="font-semibold text-slate-200">Python 3.14 FastAPI Async Core</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Need full diagnostics?</span>
                  <button
                    onClick={() => setActiveTab("health")}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
                  >
                    Run Health Diagnostic
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {activeTab === "users" && (
          <div>
            {/* Filter Bar */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex-1 w-full flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={userQuery}
                  onChange={(e) => {
                    setUserQuery(e.target.value);
                    setUsersPage(1);
                  }}
                  className="w-full sm:max-w-md px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-rose-500"
                />

                <select
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value);
                    setUsersPage(1);
                  }}
                  className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                  <option value="admin">Administrators</option>
                </select>
              </div>

              <div className="text-xs text-slate-400">
                Total: <strong className="text-white">{usersTotal}</strong> users
              </div>
            </div>

            {/* Users Table */}
            {loadingUsers ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner message="Searching directory..." />
              </div>
            ) : usersList.length === 0 ? (
              <div className="p-12 text-center rounded-xl bg-slate-900/50 border border-slate-800">
                <p className="text-sm text-slate-400">No users match the search criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80 mb-4">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Language</th>
                      <th className="p-3">Auth Provider</th>
                      <th className="p-3">Joined Date</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40">
                        <td className="p-3">
                          <div className="font-semibold text-white">{u.name}</div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              u.role === "admin"
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : u.role === "teacher"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{u.preferred_language || "English"}</td>
                        <td className="p-3 text-slate-400 uppercase text-[10px] font-mono">{u.auth_provider || "email"}</td>
                        <td className="p-3 text-slate-400">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setSelectedRole(u.role || "student");
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                          >
                            Change Role
                          </button>
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {usersTotalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
                <div>
                  Page {usersPage} of {usersTotalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={usersPage <= 1}
                    onClick={() => setUsersPage((p) => p - 1)}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={usersPage >= usersTotalPages}
                    onClick={() => setUsersPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SYSTEM HEALTH & DIAGNOSTICS */}
        {activeTab === "health" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Platform Health Diagnostics</h3>
                <p className="text-xs text-slate-400">Real-time latency check and database collection telemetry</p>
              </div>
              <button
                onClick={fetchHealth}
                disabled={checkingHealth}
                className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-semibold text-xs transition disabled:opacity-50"
              >
                {checkingHealth ? "Running Ping..." : "Refresh Diagnostic"}
              </button>
            </div>

            {checkingHealth && !healthData ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner message="Checking platform telemetry..." />
              </div>
            ) : healthData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Database Metrics */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                    <span className="text-xs uppercase font-bold text-emerald-400">Database Engine</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {healthData.database.name}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs mb-4">
                    <div className="flex justify-between p-2 rounded bg-slate-950">
                      <span className="text-slate-400">Connection Status:</span>
                      <span className="font-bold text-emerald-400">{healthData.database.status}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-slate-950">
                      <span className="text-slate-400">Ping Latency:</span>
                      <span className="font-bold text-white">{healthData.database.latency_ms} ms</span>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    MongoDB Collection Records
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(healthData.database.collections || {}).map(([col, cnt]) => (
                      <div key={col} className="p-2 rounded bg-slate-950 flex justify-between">
                        <span className="text-slate-400 capitalize">{col.replace("_", " ")}:</span>
                        <span className="font-bold text-white">{cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Service & Runtime */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                      <span className="text-xs uppercase font-bold text-blue-400">AI Service Health</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {healthData.ai_engine.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs mb-6">
                      <div className="flex justify-between p-2 rounded bg-slate-950">
                        <span className="text-slate-400">Model ID:</span>
                        <span className="font-bold text-white">{healthData.ai_engine.model_id}</span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-slate-950">
                        <span className="text-slate-400">API Key Status:</span>
                        <span className="font-bold text-emerald-400">
                          {healthData.ai_engine.api_key_configured ? "Configured & Verified" : "Not Found"}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Runtime Environment
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between p-2 rounded bg-slate-950">
                        <span className="text-slate-400">Python Version:</span>
                        <span className="font-mono text-white">{healthData.runtime.python_version}</span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-slate-950">
                        <span className="text-slate-400">Operating System:</span>
                        <span className="font-mono text-white">{healthData.runtime.platform}</span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-slate-950">
                        <span className="text-slate-400">HTTP Server:</span>
                        <span className="font-mono text-white">{healthData.runtime.server}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
                    Telemetry generated at: {new Date(healthData.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 4: AUDIT TRAIL LOGS */}
        {activeTab === "logs" && (
          <div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-300">Severity Filter:</span>
                <select
                  value={logsLevel}
                  onChange={(e) => setLogsLevel(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="all">All Levels</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>

              <button
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                {loadingLogs ? "Loading..." : "Refresh Feed"}
              </button>
            </div>

            {loadingLogs ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner message="Fetching audit logs..." />
              </div>
            ) : logsList.length === 0 ? (
              <div className="p-12 text-center rounded-xl bg-slate-900/50 border border-slate-800">
                <p className="text-sm text-slate-400">No logs found matching this filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-sans">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Actor</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Level</th>
                      <th className="p-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {logsList.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40">
                        <td className="p-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="p-3 font-semibold text-rose-300 font-sans">{log.action}</td>
                        <td className="p-3 text-slate-400 text-[11px]">{log.actor_email || "system"}</td>
                        <td className="p-3 uppercase text-[10px]">{log.role || "sys"}</td>
                        <td className="p-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.level === "warning"
                                ? "bg-amber-500/20 text-amber-400"
                                : log.level === "error"
                                ? "bg-rose-500/20 text-rose-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            {log.level}
                          </span>
                        </td>
                        <td className="p-3 max-w-xs truncate text-[11px] text-slate-400">
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PLATFORM SETTINGS */}
        {activeTab === "settings" && (
          <div className="max-w-2xl">
            <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
              <div className="border-b border-slate-800 pb-3 mb-4">
                <h3 className="text-lg font-bold text-white">Platform Configuration</h3>
                <p className="text-xs text-slate-400">Global system constraints and default parameters</p>
              </div>

              {settingsSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs">
                  ✓ Platform settings successfully updated and applied!
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Platform Name
                </label>
                <input
                  type="text"
                  required
                  value={settings.platform_name || ""}
                  onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Default AI Model
                </label>
                <input
                  type="text"
                  required
                  value={settings.default_ai_model || ""}
                  onChange={(e) => setSettings({ ...settings, default_ai_model: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Max Document Upload Size (MB)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.max_upload_size_mb || 25}
                  onChange={(e) => setSettings({ ...settings, max_upload_size_mb: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allow_student_registration || false}
                    onChange={(e) => setSettings({ ...settings, allow_student_registration: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 bg-slate-950 border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white">Allow Public Student Registration</span>
                    <p className="text-[11px] text-slate-400">Permit new learners to self-register accounts</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allow_teacher_registration || false}
                    onChange={(e) => setSettings({ ...settings, allow_teacher_registration: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 bg-slate-950 border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white">Allow Faculty Self-Registration</span>
                    <p className="text-[11px] text-slate-400">Permit instructors to create teacher accounts on register</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.maintenance_mode || false}
                    onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 bg-slate-950 border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-semibold text-amber-400">Maintenance Mode</span>
                    <p className="text-[11px] text-slate-400">Temporarily display maintenance banner across platform</p>
                  </div>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-semibold text-xs transition disabled:opacity-50"
                >
                  {savingSettings ? "Updating Settings..." : "Save Platform Settings"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* MODAL: CHANGE USER ROLE */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Change User Role</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRoleChangeSubmit} className="space-y-4">
              <div>
                <div className="text-xs text-slate-400">Target User:</div>
                <div className="font-semibold text-white">{editingUser.name}</div>
                <div className="text-[11px] text-slate-400 font-mono">{editingUser.email}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assign Privilege Tier
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="student">Student (Learner)</option>
                  <option value="teacher">Teacher (Instructor)</option>
                  <option value="admin">Administrator (Root Governance)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingRole}
                  className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-semibold disabled:opacity-50"
                >
                  {updatingRole ? "Updating..." : "Update Role"}
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
