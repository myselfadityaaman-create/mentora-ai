import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold">
            M
          </div>
          <span className="text-lg font-bold tracking-tight">
            Mentora <span className="text-blue-400">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:text-white"
              >
                Dashboard
              </Link>
              <Link
                to="/tutor"
                className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:text-white"
              >
                AI Tutor
              </Link>
              <Link
                to="/quiz"
                className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:text-white"
              >
                Quizzes
              </Link>
              <Link
                to="/flashcards"
                className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:text-white flex items-center gap-1.5"
              >
                <span>Flashcards</span>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">SM-2</span>
              </Link>
              <Link
                to="/learning-path"
                className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:text-white flex items-center gap-1.5"
              >
                <span>Learning Path</span>
                <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">AI</span>
              </Link>
              <Link
                to="/documents"
                className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:text-white flex items-center gap-1.5"
              >
                <span>Study Materials</span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">RAG</span>
              </Link>
              <Link
                to="/performance"
                className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:text-white flex items-center gap-1.5"
              >
                <span>Analytics</span>
                <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-400">ML</span>
              </Link>
              <Link
                to="/gamification"
                className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:text-white flex items-center gap-1.5"
              >
                <span>XP & Badges</span>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">XP</span>
              </Link>
              <Link
                to="/reports"
                className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:text-white flex items-center gap-1.5"
              >
                <span>Credentials</span>
                <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">PDF</span>
              </Link>
              {user.role === "student" && (
                <Link
                  to="/student/classes"
                  className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:text-white flex items-center gap-1.5"
                >
                  <span>My Classes</span>
                  <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-400">Class</span>
                </Link>
              )}
              {(user.role === "teacher" || user.role === "admin") && (
                <Link
                  to="/teacher-portal"
                  className="rounded-lg px-3 py-2 text-sm text-amber-300 transition hover:text-amber-200 flex items-center gap-1.5 font-medium"
                >
                  <span>Teacher Portal</span>
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">Faculty</span>
                </Link>
              )}
              {user.role === "admin" && (
                <Link
                  to="/admin-portal"
                  className="rounded-lg px-3 py-2 text-sm text-rose-300 transition hover:text-rose-200 flex items-center gap-1.5 font-medium"
                >
                  <span>Admin</span>
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-400">Root</span>
                </Link>
              )}
              <div className="ml-2 flex items-center gap-3 border-l border-slate-700 pl-4">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-lg py-1 px-1.5 hover:bg-slate-900 transition"
                  title={`${user.name} (${user.role || "student"})`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline-block text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {user.role || "student"}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:text-red-400"
                >
                  Log out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:text-white"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-blue-500"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
