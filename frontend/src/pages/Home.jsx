import { useEffect } from "react";
import { Link } from "react-router-dom";
import { checkBackendHealth } from "../services/api";
import { useAuth } from "../context/AuthContext";

const features = [
  {
    icon: "✦",
    title: "AI Learning Tutor",
    description:
      "Ask questions and understand difficult concepts in any language with your personal AI tutor.",
    link: "/tutor",
    label: "Start learning",
  },
  {
    icon: "◎",
    title: "Personal Dashboard",
    description:
      "Keep your learning journey organized, track study statistics, and review past quizzes.",
    link: "/dashboard",
    label: "View dashboard",
  },
  {
    icon: "⌘",
    title: "Adaptive Quizzes",
    description:
      "Test your understanding with AI-generated practice questions and instant feedback.",
    link: "/quiz",
    label: "Practice now",
  },
];

function Home() {
  const { user } = useAuth();

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
    <div className="min-h-screen overflow-hidden bg-slate-950 text-white flex flex-col justify-between">
      <div>
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold">
              M
            </div>
            <span className="text-xl font-bold tracking-tight">
              Mentora <span className="text-blue-400">AI</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="rounded-xl px-4 py-2.5 text-sm text-slate-300 transition hover:text-white"
                >
                  Dashboard
                </Link>
                <Link
                  to="/tutor"
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-blue-500"
                >
                  Open Tutor →
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl px-4 py-2.5 text-sm text-slate-300 transition hover:text-white"
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
        </nav>

        <main>
          <section className="relative mx-auto max-w-7xl px-6 pb-20 pt-16 text-center sm:pb-28 sm:pt-24">
            <div className="pointer-events-none absolute left-1/2 top-16 -z-0 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-600/20 blur-[110px]" />

            <div className="relative">
              <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-sm text-blue-300">
                <span>✦</span>
                Your personal AI-powered multilingual tutor
              </div>

              <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                Learn smarter.
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                  Grow faster.
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
                Meet your multilingual AI learning companion. Ask questions, explore difficult topics,
                practice through quizzes, and get explanations in your preferred language.
              </p>

              <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  to={user ? "/dashboard" : "/register"}
                  className="rounded-xl bg-blue-600 px-7 py-4 font-semibold shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-500"
                >
                  {user ? "Go to Dashboard" : "Start learning for free"} <span className="ml-2">→</span>
                </Link>
                <Link
                  to="/tutor"
                  className="rounded-xl border border-slate-700 bg-slate-900 px-7 py-4 font-semibold transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Explore AI Tutor
                </Link>
              </div>

              <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
                <span>✦ AI-assisted learning</span>
                <span>◎ Multilingual explanations</span>
                <span>⌘ Adaptive quizzes & tracking</span>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-6 pb-24">
            <div className="mb-10 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
                Your learning space
              </p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                Everything you need to learn
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-slate-400">
                One unified platform to understand complex concepts, test your recall, and monitor mastery.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-7 transition duration-300 hover:-translate-y-1 hover:border-blue-500/50 hover:bg-slate-900"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-2xl text-blue-400">
                    {feature.icon}
                  </div>

                  <h3 className="mt-6 text-xl font-semibold">
                    {feature.title}
                  </h3>
                  <p className="mt-3 min-h-20 leading-7 text-slate-400">
                    {feature.description}
                  </p>

                  <Link
                    to={feature.link}
                    className="mt-5 inline-flex items-center gap-2 font-medium text-blue-400 transition group-hover:text-blue-300"
                  >
                    {feature.label} <span>→</span>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>

      <footer className="border-t border-slate-800 px-6 py-7">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-sm text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Mentora AI</p>
          <p>Learn without limits. Grow with AI.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
