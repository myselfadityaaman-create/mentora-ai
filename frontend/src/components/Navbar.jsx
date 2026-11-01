import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const featuresRef = useRef(null);
  const profileRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Close dropdowns on outside click or route change
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (featuresRef.current && !featuresRef.current.contains(e.target)) {
        setFeaturesOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setFeaturesOpen(false);
    setProfileOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;
  const isFeatureActive = ["/learning-path", "/documents", "/performance", "/gamification", "/reports", "/student/classes"].includes(location.pathname);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
        {/* Brand Logo */}
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-base font-extrabold text-white shadow-md shadow-blue-500/25 transition-transform group-hover:scale-105">
            M
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-white">
            Mentora <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">AI</span>
          </span>
        </Link>

        {user ? (
          <>
            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-1.5 xl:gap-2">
              <Link
                to="/dashboard"
                className={`rounded-lg px-2.5 py-1.5 text-xs xl:text-sm font-medium transition ${
                  isActive("/dashboard")
                    ? "bg-blue-600/15 text-blue-400 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-900/60"
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/tutor"
                className={`rounded-lg px-2.5 py-1.5 text-xs xl:text-sm font-medium transition ${
                  isActive("/tutor")
                    ? "bg-blue-600/15 text-blue-400 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-900/60"
                }`}
              >
                AI Tutor
              </Link>
              <Link
                to="/quiz"
                className={`rounded-lg px-2.5 py-1.5 text-xs xl:text-sm font-medium transition ${
                  isActive("/quiz")
                    ? "bg-blue-600/15 text-blue-400 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-900/60"
                }`}
              >
                Quizzes
              </Link>
              <Link
                to="/flashcards"
                className={`rounded-lg px-2.5 py-1.5 text-xs xl:text-sm font-medium transition flex items-center gap-1.5 ${
                  isActive("/flashcards")
                    ? "bg-blue-600/15 text-blue-400 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-900/60"
                }`}
              >
                <span>Flashcards</span>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                  SM-2
                </span>
              </Link>

              {/* More Features Dropdown */}
              <div className="relative" ref={featuresRef}>
                <button
                  type="button"
                  onClick={() => setFeaturesOpen(!featuresOpen)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs xl:text-sm font-medium transition flex items-center gap-1 cursor-pointer ${
                    isFeatureActive || featuresOpen
                      ? "bg-blue-600/15 text-blue-400 font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-slate-900/60"
                  }`}
                >
                  <span>More Tools</span>
                  <svg
                    className={`h-3.5 w-3.5 transition-transform ${featuresOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {featuresOpen && (
                  <div className="absolute left-0 mt-2 w-64 rounded-xl border border-slate-800 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Learning & Analytics
                    </div>

                    <Link
                      to="/learning-path"
                      className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                        isActive("/learning-path") ? "bg-blue-600/20 text-blue-400" : "text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>🗺️</span>
                        <span>Learning Path</span>
                      </div>
                      <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-bold text-blue-400 border border-blue-500/30">
                        AI
                      </span>
                    </Link>

                    <Link
                      to="/documents"
                      className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                        isActive("/documents") ? "bg-blue-600/20 text-blue-400" : "text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>📚</span>
                        <span>Study Materials</span>
                      </div>
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                        RAG
                      </span>
                    </Link>

                    <Link
                      to="/performance"
                      className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                        isActive("/performance") ? "bg-blue-600/20 text-blue-400" : "text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>📊</span>
                        <span>Analytics</span>
                      </div>
                      <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-bold text-purple-400 border border-purple-500/30">
                        ML
                      </span>
                    </Link>

                    <Link
                      to="/gamification"
                      className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                        isActive("/gamification") ? "bg-blue-600/20 text-blue-400" : "text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>🏆</span>
                        <span>XP & Badges</span>
                      </div>
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-500/30">
                        XP
                      </span>
                    </Link>

                    <Link
                      to="/reports"
                      className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                        isActive("/reports") ? "bg-blue-600/20 text-blue-400" : "text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>📜</span>
                        <span>Credentials</span>
                      </div>
                      <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-bold text-blue-400 border border-blue-500/30">
                        PDF
                      </span>
                    </Link>

                    {user.role === "student" && (
                      <Link
                        to="/student/classes"
                        className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                          isActive("/student/classes") ? "bg-blue-600/20 text-blue-400" : "text-slate-200 hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>🏫</span>
                          <span>My Classes</span>
                        </div>
                        <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-bold text-cyan-400 border border-cyan-500/30">
                          Class
                        </span>
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Faculty / Root Portal Badges */}
              {(user.role === "teacher" || user.role === "admin") && (
                <Link
                  to="/teacher-portal"
                  className={`rounded-lg px-2.5 py-1.5 text-xs xl:text-sm font-semibold transition flex items-center gap-1.5 ${
                    isActive("/teacher-portal")
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10"
                  }`}
                >
                  <span>Teacher Portal</span>
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-400">
                    Faculty
                  </span>
                </Link>
              )}

              {user.role === "admin" && (
                <Link
                  to="/admin-portal"
                  className={`rounded-lg px-2.5 py-1.5 text-xs xl:text-sm font-semibold transition flex items-center gap-1.5 ${
                    isActive("/admin-portal")
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : "text-rose-400/90 hover:text-rose-300 hover:bg-rose-500/10"
                  }`}
                >
                  <span>Admin</span>
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-bold text-rose-400">
                    Root
                  </span>
                </Link>
              )}
            </div>

            {/* Right Profile Dropdown & Controls */}
            <div className="flex items-center gap-2.5">
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition cursor-pointer"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-bold text-white shadow-inner">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-xs font-medium text-slate-200 line-clamp-1 max-w-[100px]">
                      {user.name?.split(" ")[0] || "User"}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {user.role || "student"}
                    </span>
                  </div>
                  <svg
                    className={`hidden md:block h-3.5 w-3.5 text-slate-400 transition-transform ${
                      profileOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-800 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-800 mb-1">
                      <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {user.role || "student"}
                      </span>
                    </div>

                    <Link
                      to="/profile"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
                    >
                      <span>👤</span>
                      <span>Account Profile</span>
                    </Link>

                    {user.role === "admin" && (
                      <Link
                        to="/admin-portal"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10 transition"
                      >
                        <span>🛡️</span>
                        <span>Admin Console</span>
                      </Link>
                    )}

                    {(user.role === "teacher" || user.role === "admin") && (
                      <Link
                        to="/teacher-portal"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-amber-300 hover:bg-amber-500/10 transition"
                      >
                        <span>👨‍🏫</span>
                        <span>Teacher Dashboard</span>
                      </Link>
                    )}

                    <div className="border-t border-slate-800 my-1" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition text-left cursor-pointer"
                    >
                      <span>🚪</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Hamburger Button for Mobile / Small or Split Screens */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white transition cursor-pointer"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:text-white"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold transition hover:bg-blue-500 shadow-md shadow-blue-600/20"
            >
              Get started
            </Link>
          </div>
        )}
      </div>

      {/* Mobile / Narrow Screen Drawer */}
      {user && mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800/80 bg-slate-950 px-4 py-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800/60">
            <Link
              to="/dashboard"
              className={`rounded-lg px-3 py-2 text-xs font-medium ${
                isActive("/dashboard") ? "bg-blue-600/20 text-blue-400 font-semibold" : "text-slate-300 bg-slate-900/50"
              }`}
            >
              📊 Dashboard
            </Link>
            <Link
              to="/tutor"
              className={`rounded-lg px-3 py-2 text-xs font-medium ${
                isActive("/tutor") ? "bg-blue-600/20 text-blue-400 font-semibold" : "text-slate-300 bg-slate-900/50"
              }`}
            >
              ✦ AI Tutor
            </Link>
            <Link
              to="/quiz"
              className={`rounded-lg px-3 py-2 text-xs font-medium ${
                isActive("/quiz") ? "bg-blue-600/20 text-blue-400 font-semibold" : "text-slate-300 bg-slate-900/50"
              }`}
            >
              ⚡ Quizzes
            </Link>
            <Link
              to="/flashcards"
              className={`rounded-lg px-3 py-2 text-xs font-medium flex items-center justify-between ${
                isActive("/flashcards") ? "bg-blue-600/20 text-blue-400 font-semibold" : "text-slate-300 bg-slate-900/50"
              }`}
            >
              <span>🗂 Flashcards</span>
              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/20 px-1 rounded">SM-2</span>
            </Link>
            <Link
              to="/learning-path"
              className={`rounded-lg px-3 py-2 text-xs font-medium flex items-center justify-between ${
                isActive("/learning-path") ? "bg-blue-600/20 text-blue-400 font-semibold" : "text-slate-300 bg-slate-900/50"
              }`}
            >
              <span>🗺️ Learning Path</span>
              <span className="text-[9px] font-bold text-blue-400 bg-blue-500/20 px-1 rounded">AI</span>
            </Link>
            <Link
              to="/documents"
              className={`rounded-lg px-3 py-2 text-xs font-medium flex items-center justify-between ${
                isActive("/documents") ? "bg-blue-600/20 text-blue-400 font-semibold" : "text-slate-300 bg-slate-900/50"
              }`}
            >
              <span>📚 Study Materials</span>
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1 rounded">RAG</span>
            </Link>
            <Link
              to="/performance"
              className={`rounded-lg px-3 py-2 text-xs font-medium flex items-center justify-between ${
                isActive("/performance") ? "bg-blue-600/20 text-blue-400 font-semibold" : "text-slate-300 bg-slate-900/50"
              }`}
            >
              <span>📈 Analytics</span>
              <span className="text-[9px] font-bold text-purple-400 bg-purple-500/20 px-1 rounded">ML</span>
            </Link>
            <Link
              to="/gamification"
              className={`rounded-lg px-3 py-2 text-xs font-medium flex items-center justify-between ${
                isActive("/gamification") ? "bg-blue-600/20 text-blue-400 font-semibold" : "text-slate-300 bg-slate-900/50"
              }`}
            >
              <span>🏆 XP & Badges</span>
              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/20 px-1 rounded">XP</span>
            </Link>
            <Link
              to="/reports"
              className={`rounded-lg px-3 py-2 text-xs font-medium flex items-center justify-between ${
                isActive("/reports") ? "bg-blue-600/20 text-blue-400 font-semibold" : "text-slate-300 bg-slate-900/50"
              }`}
            >
              <span>📜 Credentials</span>
              <span className="text-[9px] font-bold text-blue-400 bg-blue-500/20 px-1 rounded">PDF</span>
            </Link>
            {user.role === "student" && (
              <Link
                to="/student/classes"
                className={`rounded-lg px-3 py-2 text-xs font-medium flex items-center justify-between ${
                  isActive("/student/classes") ? "bg-blue-600/20 text-blue-400 font-semibold" : "text-slate-300 bg-slate-900/50"
                }`}
              >
                <span>🏫 My Classes</span>
                <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/20 px-1 rounded">Class</span>
              </Link>
            )}
          </div>

          {/* Portals & Logout in Mobile drawer */}
          <div className="pt-1 flex flex-col gap-1.5">
            {(user.role === "teacher" || user.role === "admin") && (
              <Link
                to="/teacher-portal"
                className="flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-300"
              >
                <span>Teacher Portal</span>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                  Faculty
                </span>
              </Link>
            )}
            {user.role === "admin" && (
              <Link
                to="/admin-portal"
                className="flex items-center justify-between rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-300"
              >
                <span>Admin Console</span>
                <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">
                  Root
                </span>
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-1 w-full flex items-center justify-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
            >
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;