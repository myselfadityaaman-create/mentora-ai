import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser, registerUser, getGoogleLoginUrl } from "../services/api";

function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, user } = useAuth();

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // Selected Portal: null (shows 3 portals) | "admin" | "student" | "teacher"
  const portalParam = searchParams.get("portal");
  const [selectedPortal, setSelectedPortal] = useState(
    ["admin", "student", "teacher"].includes(portalParam) ? portalParam : null
  );

  // Form Mode: "login" | "register"
  const [formMode, setFormMode] = useState("login");

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (user) {
    return null;
  }

  // Pre-configured default credentials for each portal
  const portalConfig = {
    admin: {
      title: "Administrator",
      tag: "Root System",
      icon: "👑",
      color: "rose",
      borderColor: "border-rose-500/40",
      bgColor: "bg-rose-500/10",
      textColor: "text-rose-400",
      btnBg: "bg-rose-600 hover:bg-rose-500",
      demoEmail: "admin@mentora.ai",
      demoPassword: "Admin@12345",
      description: "Platform governance, user roles, system health & LLM telemetry",
    },
    student: {
      title: "Student",
      tag: "Learning Hub",
      icon: "🎓",
      color: "blue",
      borderColor: "border-blue-500/40",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-400",
      btnBg: "bg-blue-600 hover:bg-blue-500",
      demoEmail: "student@mentora.ai",
      demoPassword: "Student@12345",
      description: "AI-powered tutor, adaptive quizzes, SM-2 flashcards & roadmaps",
    },
    teacher: {
      title: "Teacher / Faculty",
      tag: "Academic Console",
      icon: "👨‍🏫",
      color: "amber",
      borderColor: "border-amber-500/40",
      bgColor: "bg-amber-500/10",
      textColor: "text-amber-400",
      btnBg: "bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold",
      demoEmail: "teacher@mentora.ai",
      demoPassword: "Teacher@12345",
      description: "Classroom rosters, 6-character join codes, coursework & grading",
    },
  };

  const handlePortalSelect = (portalKey) => {
    setSelectedPortal(portalKey);
    setFormMode("login");
    setError("");
    setSuccess("");
    // Pre-fill corresponding credentials for instant convenience
    setEmail(portalConfig[portalKey].demoEmail);
    setPassword(portalConfig[portalKey].demoPassword);
  };

  const handleFillDemo = () => {
    if (!selectedPortal) return;
    setEmail(portalConfig[selectedPortal].demoEmail);
    setPassword(portalConfig[selectedPortal].demoPassword);
    setError("");
  };

  // Submit Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser(email.trim(), password);
      login(data.access_token, data.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Submit Registration (New Account)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // selectedPortal determines the role for student or teacher
      const roleToRegister = selectedPortal === "teacher" ? "teacher" : "student";
      await registerUser(name.trim(), email.trim(), password, roleToRegister);
      setSuccess("Account created successfully! Logging you in...");

      // Automatically sign in upon registration
      const loginData = await loginUser(email.trim(), password);
      login(loginData.access_token, loginData.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed. Email may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = getGoogleLoginUrl();
  };

  return (
    <main className="mentora-background login-page">
      {/* Full-Screen Space Galaxy Background Spanning 100% of the screen */}
      <div className="space-galaxy-bg" aria-hidden="true">
        <img
          src="/space-galaxy.jpg"
          alt="Space Galaxy Cosmos"
          className="space-galaxy-img"
        />
        <div className="space-galaxy-overlay" />
      </div>

      <div className="login-shell">

        {/* Left Hero Panel */}
        <section className="login-hero">
          <Link className="brand" to="/">
            <div className="brand-icon">M</div>
            <span>
              Mentora <b>AI</b>
            </span>
          </Link>

          <div className="hero-content">
            <div className="eyebrow">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>NEXT-GEN AI EDUCATIONAL SUITE</span>
            </div>

            <h1>
              Learn without
              <br />
              limits.
              <br />
              <span>Grow with AI.</span>
            </h1>

            <p className="hero-description">
              Get instant explanations, solve doubts, and master
              new concepts with your personal AI tutor — in your language.
            </p>

            <div className="feature-list">
              <div className="feature">
                <span className="feature-icon border-sky-500/30 bg-sky-500/20 text-sky-300">
                  ✦
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3>Adaptive AI Tutoring</h3>
                    <span className="text-[11px] font-bold text-sky-300 bg-sky-500/20 border border-sky-400/40 px-2 py-0.5 rounded-md">
                      Gemini Core
                    </span>
                  </div>
                  <p>Step-by-step conceptual breakdowns tailored to your pace</p>
                </div>
              </div>

              <div className="feature">
                <span className="feature-icon border-purple-500/30 bg-purple-500/20 text-purple-300">
                  ◎
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3>Multilingual Explanations</h3>
                    <span className="text-[11px] font-bold text-purple-300 bg-purple-500/20 border border-purple-400/40 px-2 py-0.5 rounded-md">
                      50+ Languages
                    </span>
                  </div>
                  <p>Ask questions and learn comfortably in your native tongue</p>
                </div>
              </div>

              <div className="feature">
                <span className="feature-icon border-emerald-500/30 bg-emerald-500/20 text-emerald-300">
                  🗂
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3>SM-2 Spaced Repetition</h3>
                    <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 rounded-md">
                      Retention Engine
                    </span>
                  </div>
                  <p>Scientific memory algorithms to lock in concepts forever</p>
                </div>
              </div>
            </div>
          </div>

          <p className="hero-footer">
            ✦ A smarter way to learn, for a brighter tomorrow.
          </p>
        </section>

        {/* Right Portal Panel */}
        <section className="login-form-panel">
          <div className="login-card">
            {/* ========================================================== */}
            {/* STEP 1: PORTAL SELECTION (When no portal is selected)       */}
            {/* ========================================================== */}
            {!selectedPortal ? (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="form-heading text-center">
                  <h2>Select Portal</h2>
                  <p>Choose your access role to log in or create an account</p>
                </div>

                <div className="space-y-3 pt-2">
                  {/* 1. Admin Portal Card */}
                  <button
                    type="button"
                    onClick={() => handlePortalSelect("admin")}
                    className="portal-glass-card portal-glass-admin group"
                  >
                    <div className="portal-glass-icon border-rose-500/20 text-rose-300">
                      👑
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="portal-glass-title group-hover:text-rose-300">
                          Admin Portal
                        </h3>
                        <span className="portal-glass-badge badge-rose">
                          Root System
                        </span>
                      </div>
                      <p className="portal-glass-desc">
                        Platform governance, user roles &amp; AI service
                      </p>
                    </div>
                  </button>

                  {/* 2. Student Portal Card */}
                  <button
                    type="button"
                    onClick={() => handlePortalSelect("student")}
                    className="portal-glass-card portal-glass-student group"
                  >
                    <div className="portal-glass-icon border-sky-500/20 text-sky-300">
                      🎓
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="portal-glass-title group-hover:text-sky-300">
                          Student Portal
                        </h3>
                        <span className="portal-glass-badge badge-sky">
                          Learning Hub
                        </span>
                      </div>
                      <p className="portal-glass-desc">
                        AI tutor, adaptive quizzes &amp; SM-2 flashcards
                      </p>
                    </div>
                  </button>

                  {/* 3. Teacher Portal Card */}
                  <button
                    type="button"
                    onClick={() => handlePortalSelect("teacher")}
                    className="portal-glass-card portal-glass-teacher group"
                  >
                    <div className="portal-glass-icon border-amber-500/20 text-amber-300">
                      👨‍🏫
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="portal-glass-title group-hover:text-amber-300">
                          Teacher Portal
                        </h3>
                        <span className="portal-glass-badge badge-amber">
                          Faculty Console
                        </span>
                      </div>
                      <p className="portal-glass-desc">
                        Classrooms, coursework &amp; grading console
                      </p>
                    </div>
                  </button>
                </div>

                <div className="pt-2 text-center text-xs font-semibold text-slate-200">
                  Select your role above to proceed to login or registration.
                </div>
              </div>
            ) : (
              /* ========================================================== */
              /* STEP 2: LOGIN / REGISTER FOR SELECTED PORTAL               */
              /* ========================================================== */
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Back Button & Portal Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPortal(null);
                      setError("");
                      setSuccess("");
                    }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span>←</span>
                    <span>All Portals</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{portalConfig[selectedPortal].icon}</span>
                    <span className={`text-xs font-bold uppercase tracking-wider ${portalConfig[selectedPortal].textColor}`}>
                      {portalConfig[selectedPortal].title}
                    </span>
                  </div>
                </div>

                {/* Form Mode Toggle: Login vs Create Account */}
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setFormMode("login");
                      setError("");
                      setSuccess("");
                    }}
                    className={`rounded-lg py-2 text-xs font-semibold transition cursor-pointer ${
                      formMode === "login"
                        ? "bg-slate-800 text-white shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Sign In
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormMode("register");
                      setError("");
                      setSuccess("");
                    }}
                    className={`rounded-lg py-2 text-xs font-semibold transition cursor-pointer ${
                      formMode === "register"
                        ? "bg-slate-800 text-white shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    + New Account
                  </button>
                </div>

                {/* Feedback Alerts */}
                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span>{error}</span>
                    {error.toLowerCase().includes("already exists") && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormMode("login");
                          setError("");
                        }}
                        className="rounded bg-blue-600/40 text-blue-200 hover:bg-blue-600/60 px-2.5 py-1 text-[11px] font-semibold cursor-pointer shrink-0 border border-blue-500/30"
                      >
                        Switch to Sign In →
                      </button>
                    )}
                  </div>
                )}
                {success && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
                    {success}
                  </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* SUB-VIEW A: SIGN IN FORM                             */}
                {/* ---------------------------------------------------- */}
                {formMode === "login" && (
                  <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                    {/* 1-Click Demo Fill Chip */}
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-slate-400">Demo credentials:</span>
                      <button
                        type="button"
                        onClick={handleFillDemo}
                        className="text-xs font-medium text-sky-400 hover:text-sky-300 underline cursor-pointer"
                      >
                        ⚡ Auto-fill {portalConfig[selectedPortal].title}
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="portal-email">
                        Email address
                      </label>
                      <div className="input-wrap">
                        <span>✉</span>
                        <input
                          id="portal-email"
                          type="email"
                          placeholder={`${selectedPortal}@mentora.ai`}
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="portal-password">
                        Password
                      </label>
                      <div className="input-wrap">
                        <span>♙</span>
                        <input
                          id="portal-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="show-password"
                          onClick={() => setShowPassword((prev) => !prev)}
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded border-slate-700 bg-slate-900" />
                        <span>Remember me</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormMode("register")}
                        className="text-blue-400 hover:underline"
                      >
                        Need an account?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full rounded-xl py-3 text-sm font-semibold transition shadow-lg cursor-pointer flex items-center justify-center gap-2 mt-2 ${portalConfig[selectedPortal].btnBg}`}
                    >
                      {loading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In to {portalConfig[selectedPortal].title}</span>
                          <span>→</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* ---------------------------------------------------- */}
                {/* SUB-VIEW B: CREATE NEW ACCOUNT FORM                   */}
                {/* ---------------------------------------------------- */}
                {formMode === "register" && (
                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                    {selectedPortal === "admin" ? (
                      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 space-y-2">
                        <p className="font-semibold">👑 Administrator Account Provisioning</p>
                        <p className="text-slate-300">
                          Root administrator access is restricted and pre-provisioned on server startup.
                          Use the default admin credentials or sign in with an existing administrator email.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setFormMode("login");
                            handleFillDemo();
                          }}
                          className="mt-1 inline-block rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-500 transition"
                        >
                          Use Default Admin Login →
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-lg bg-slate-900/60 border border-slate-800 px-3 py-2 text-xs text-slate-300 flex items-center gap-2">
                          <span>{portalConfig[selectedPortal].icon}</span>
                          <span>
                            Creating a new <strong>{portalConfig[selectedPortal].title}</strong> account.
                          </span>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="reg-name">
                            Full Name
                          </label>
                          <div className="input-wrap">
                            <span>👤</span>
                            <input
                              id="reg-name"
                              type="text"
                              placeholder="Your full name"
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              disabled={loading}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="reg-email">
                            Email address
                          </label>
                          <div className="input-wrap">
                            <span>✉</span>
                            <input
                              id="reg-email"
                              type="email"
                              placeholder="you@domain.com"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              disabled={loading}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="reg-password">
                            Password (minimum 8 characters)
                          </label>
                          <div className="input-wrap">
                            <span>♙</span>
                            <input
                              id="reg-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="At least 8 characters"
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              disabled={loading}
                            />
                            <button
                              type="button"
                              className="show-password"
                              onClick={() => setShowPassword((prev) => !prev)}
                            >
                              {showPassword ? "Hide" : "Show"}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="reg-confirm">
                            Confirm Password
                          </label>
                          <div className="input-wrap">
                            <span>✓</span>
                            <input
                              id="reg-confirm"
                              type={showPassword ? "text" : "password"}
                              placeholder="Repeat password"
                              required
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              disabled={loading}
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className={`w-full rounded-xl py-3 text-sm font-semibold transition shadow-lg cursor-pointer flex items-center justify-center gap-2 mt-2 ${portalConfig[selectedPortal].btnBg}`}
                        >
                          {loading ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              <span>Creating account...</span>
                            </>
                          ) : (
                            <>
                              <span>Create {portalConfig[selectedPortal].title} Account</span>
                              <span>→</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </form>
                )}

                {/* Social Login Divider */}
                <div className="divider">
                  <span>OR</span>
                </div>

                <div className="social-buttons">
                  <button type="button" onClick={handleGoogleLogin}>
                    <b className="google-mark">G</b>
                    Continue with Google
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      alert("GitHub OAuth is not configured for this project.")
                    }
                  >
                    <b>●</b>
                    Continue with GitHub
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;