import { useEffect } from "react";
import { Link } from "react-router-dom";
import { checkBackendHealth } from "../services/api";
import { useAuth } from "../context/AuthContext";

function Home() {
  const { user, logout } = useAuth();

  useEffect(() => {
    checkBackendHealth()
      .then((data) => {
        console.log("Backend connected successfully:", data);
      })
      .catch((error) => {
        console.error("Backend connection failed:", error);
      });
  }, []);

  return (
    <div className="relative min-h-screen bg-slate-950 text-white flex flex-col justify-between overflow-hidden selection:bg-sky-500 selection:text-white">
      {/* 1. Cinematic Starry Cosmic Backdrop (Clear & Bright Stars) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <img
          src="/space-galaxy.jpg"
          alt="Cosmic Stars Backdrop"
          className="w-full h-full object-cover opacity-80 filter brightness-105 contrast-110 saturate-115 scale-102"
        />
        {/* Soft edge vignette to keep center stars and typography perfectly clear */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-slate-950/30 to-slate-950/80" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/70" />

        {/* Floating Twinkling Micro-Stars */}
        <div className="star-particle w-1.5 h-1.5 top-[15%] left-[12%] [animation-delay:0.2s]" />
        <div className="star-particle w-2 h-2 top-[22%] right-[18%] [animation-delay:1.1s] shadow-[0_0_8px_#38bdf8]" />
        <div className="star-particle w-1 h-1 top-[35%] left-[24%] [animation-delay:2.3s]" />
        <div className="star-particle w-2 h-2 top-[65%] left-[10%] [animation-delay:0.7s] shadow-[0_0_8px_#c084fc]" />
        <div className="star-particle w-1.5 h-1.5 top-[70%] right-[14%] [animation-delay:1.8s]" />
        <div className="star-particle w-1 h-1 top-[80%] left-[30%] [animation-delay:2.9s]" />
        <div className="star-particle w-2 h-2 top-[18%] left-[75%] [animation-delay:1.4s] shadow-[0_0_8px_#38bdf8]" />

        {/* Sparkling 4-point Star Accent Icons */}
        <span className="sparkle-icon text-xl top-[28%] left-[8%] [animation-delay:0.5s]">✦</span>
        <span className="sparkle-icon text-2xl top-[20%] right-[10%] [animation-delay:1.6s]">✦</span>
        <span className="sparkle-icon text-base top-[72%] right-[22%] [animation-delay:2.2s]">✦</span>
        <span className="sparkle-icon text-lg top-[60%] left-[20%] [animation-delay:1.0s]">✦</span>
      </div>

      <div className="relative z-10 flex flex-col justify-between min-h-screen">
        {/* 2. Clean Modern Header / Navbar */}
        <header className="w-full">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-extrabold text-white shadow-lg shadow-blue-500/30 transition-transform group-hover:scale-105 border border-white/20">
                M
              </div>
              <span className="text-xl font-bold tracking-tight text-white drop-shadow-md">
                Mentora <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">AI</span>
              </span>
            </Link>

            {/* Right Auth Navigation */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 transition hover:text-white hover:bg-slate-900/80 backdrop-blur-sm border border-transparent hover:border-slate-800"
                  >
                    Dashboard
                  </Link>
                  <div className="flex items-center gap-3 pl-3 border-l border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-600/30">
                        {user.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <span className="hidden sm:inline-block text-xs font-semibold text-slate-200">
                        {user.name?.split(" ")[0]}
                      </span>
                      <span className="hidden sm:inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {user.role || "student"}
                      </span>
                    </div>
                    <button
                      onClick={logout}
                      className="rounded-lg border border-rose-500/30 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/25 transition cursor-pointer"
                    >
                      Log out
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 transition hover:text-white hover:bg-slate-900/60 backdrop-blur-sm"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 border border-white/10"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>

        {/* 3. Simple, Modern Hero Section (Minimal with Twinkling Stars) */}
        <main className="flex-1 flex items-center justify-center px-6 py-12 sm:py-20 text-center">
          <div className="max-w-4xl mx-auto relative">
            {/* Glowing Announcement Pill */}
            <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-slate-950/70 px-4 py-1.5 text-xs sm:text-sm font-semibold text-sky-300 shadow-lg shadow-sky-500/15 backdrop-blur-md">
              <span className="text-sky-400 animate-pulse">✦</span>
              <span>Your personal AI-powered multilingual tutor</span>
            </div>

            {/* Bold Gradient Title with Clean High-Contrast Text Shadows */}
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[1.08] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
              Learn smarter.
              <br />
              <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">
                Grow faster.
              </span>
            </h1>

            {/* Description */}
            <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-200 leading-relaxed font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              Meet your multilingual AI learning companion. Ask questions, explore difficult topics,
              practice through quizzes, and get explanations in your preferred language.
            </p>

            {/* Call to Action Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={user ? "/dashboard" : "/register"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-blue-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-blue-500/50 hover:brightness-110 border border-white/10"
              >
                <span>{user ? "Go to Dashboard" : "Start learning for free"}</span>
                <span className="text-lg">→</span>
              </Link>
              <Link
                to={user ? "/tutor" : "/login"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/70 px-7 py-3.5 text-base font-semibold text-slate-200 backdrop-blur-md transition-all duration-200 hover:border-slate-500 hover:bg-slate-900 hover:text-white"
              >
                <span>Explore AI Tutor</span>
              </Link>
            </div>

            {/* Simple Feature Tags Row */}
            <div className="mt-12 sm:mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs sm:text-sm font-semibold text-slate-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
              <span className="flex items-center gap-1.5">
                <span className="text-sky-400">✦</span> AI-assisted learning
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-purple-400">◎</span> Multilingual explanations
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400">⌘</span> Adaptive quizzes &amp; tracking
              </span>
            </div>
          </div>
        </main>

        {/* 4. Simple, Clean Modern Footer */}
        <footer className="border-t border-slate-900/80 px-6 py-6 text-center text-xs text-slate-400 backdrop-blur-xs">
          <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3">
            <p>© {new Date().getFullYear()} Mentora AI</p>
            <p className="text-slate-300">Learn without limits. Grow with AI.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Home;