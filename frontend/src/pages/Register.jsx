import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser, loginUser, getGoogleLoginUrl } from "../services/api";
import { useAuth } from "../context/AuthContext";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("student");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();
  const { login, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  // Calculate password strength
  const getPasswordStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const pwdStrength = getPasswordStrength(password);
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["bg-red-500", "bg-amber-500", "bg-sky-500", "bg-emerald-500"];

  const handleSubmit = async (e) => {
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
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please choose a password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await registerUser(name.trim(), email.trim(), password, selectedRole);
      setSuccess("Account created successfully! Logging you in...");

      // Automatically log the user in after registration
      const loginData = await loginUser(email.trim(), password);
      login(loginData.access_token, loginData.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = getGoogleLoginUrl();
  };

  return (
    <main className="register-page">
      {/* 1. Distinct Cyber Aurora & Iridescent 3D Wallpaper */}
      <div className="register-bg" aria-hidden="true">
        <img
          src="/register-aurora.jpg"
          alt="Cyber Aurora 3D"
          className="register-bg-img"
        />
        {/* Soft vignette to guarantee crisp readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-slate-950/70" />
      </div>

      <div className="register-shell">
        {/* Left Hero Panel */}
        <section className="login-hero">
          <Link className="brand" to="/">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 text-xl font-extrabold text-white shadow-lg shadow-emerald-500/30 border border-emerald-300/30">
              M
            </div>
            <span>
              Mentora <b className="text-emerald-400">AI</b>
            </span>
          </Link>

          <div className="hero-content">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-slate-950/80 px-3.5 py-1.5 text-xs font-bold text-emerald-300 shadow-md shadow-emerald-500/10 backdrop-blur-md mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>THE CYBER-LEARNING ODYSSEY</span>
            </div>

            <h1 className="text-white font-extrabold text-4xl sm:text-6xl tracking-tight leading-tight">
              Master concepts.
              <br />
              Any language.
              <br />
              <span className="register-gradient-text">Free forever.</span>
            </h1>

            <p className="hero-description text-slate-200">
              Create your account to unlock adaptive AI tutoring, SM-2 memory retention,
              instant multilingual explanations, and trackable milestones.
            </p>

            <div className="feature-list mt-6 space-y-3">
              <div className="register-perk-card">
                <span className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/20 text-emerald-300 text-lg">
                  ✦
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm">Interactive AI Chat</h3>
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 rounded">
                      Gemini Core
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">Real-time conceptual problem solving in your dialect</p>
                </div>
              </div>

              <div className="register-perk-card">
                <span className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/20 text-cyan-300 text-lg">
                  🌐
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm">Multilingual Learning</h3>
                    <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-400/40 px-2 py-0.5 rounded">
                      50+ Languages
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">English, Hindi, Spanish, French, and regional tongues</p>
                </div>
              </div>

              <div className="register-perk-card">
                <span className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/20 text-violet-300 text-lg">
                  🧠
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm">Adaptive Quizzes &amp; SM-2</h3>
                    <span className="text-[10px] font-bold text-violet-300 bg-violet-500/20 border border-violet-400/40 px-2 py-0.5 rounded">
                      Retention Engine
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">Scientific spaced recall to lock concepts in permanently</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 text-xs text-slate-300">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Over 12,000+ students and educators learning today</span>
          </div>
        </section>

        {/* Right Form Panel */}
        <section className="login-form-panel">
          <div className="register-card">
            <div className="form-heading text-center mb-3">
              <h2 className="text-white text-2xl font-extrabold tracking-tight">Create your account</h2>
              <p className="text-slate-300 text-xs">Join Mentora AI to start learning or teaching</p>
            </div>

            {/* Role Selection Chips with Emerald / Amber / Rose Glow */}
            <div className="mb-3">
              <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
                Select your account role:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole("student")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    selectedRole === "student"
                      ? "border-emerald-400 bg-emerald-500/25 text-emerald-200 shadow-sm shadow-emerald-500/25"
                      : "border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                  }`}
                >
                  <span>🎓</span>
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("teacher")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    selectedRole === "teacher"
                      ? "border-amber-400 bg-amber-500/25 text-amber-200 shadow-sm shadow-amber-500/25"
                      : "border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                  }`}
                >
                  <span>👨‍🏫</span>
                  <span>Teacher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("admin")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    selectedRole === "admin"
                      ? "border-rose-400 bg-rose-500/25 text-rose-200 shadow-sm shadow-rose-500/25"
                      : "border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                  }`}
                >
                  <span>👑</span>
                  <span>Admin</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs font-medium text-red-200 shadow-sm shadow-red-500/10">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-3 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-200 shadow-sm shadow-emerald-500/10">
                {success}
              </div>
            )}

            <form className="login-form space-y-2.5" onSubmit={handleSubmit}>
              {/* Row 1: Full Name & Email in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="reg-name" className="text-[11px] font-semibold text-slate-200 mb-1 block">Full name</label>
                  <div className="input-wrap input-wrap-compact">
                    <span>👤</span>
                    <input
                      id="reg-name"
                      type="text"
                      placeholder="Alex Johnson"
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-email" className="text-[11px] font-semibold text-slate-200 mb-1 block">Email address</label>
                  <div className="input-wrap input-wrap-compact">
                    <span>✉</span>
                    <input
                      id="reg-email"
                      type="email"
                      placeholder="name@example.com"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Password & Confirm Password in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="reg-password" className="text-[11px] font-semibold text-slate-200 mb-1 block">
                    Password (8+ chars)
                  </label>
                  <div className="input-wrap input-wrap-compact">
                    <span>🔒</span>
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create password"
                      autoComplete="new-password"
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
                  <label htmlFor="reg-confirm-password" className="text-[11px] font-semibold text-slate-200 mb-1 block">
                    Confirm password
                  </label>
                  <div className="input-wrap input-wrap-compact">
                    <span>✓</span>
                    <input
                      id="reg-confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Password strength mini bar */}
              {password && (
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="flex-1 flex gap-1">
                    {[0, 1, 2, 3].map((step) => (
                      <div
                        key={step}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          step < pwdStrength ? strengthColors[pwdStrength - 1] : "bg-slate-800"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-slate-300">
                    Strength: <b className="text-emerald-400">{strengthLabels[pwdStrength - 1] || "Too short"}</b>
                  </span>
                </div>
              )}

              <button
                className="register-button mt-3"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Account <span>→</span>
                  </>
                )}
              </button>
            </form>

            <div className="divider">
              <span>OR</span>
            </div>

            <div className="social-buttons">
              <button type="button" onClick={handleGoogleLogin} className="hover:border-emerald-500/40 transition">
                <b className="google-mark">G</b>
                Continue with Google
              </button>
              <button
                type="button"
                onClick={() => alert("GitHub OAuth is not configured for this project.")}
                className="hover:border-emerald-500/40 transition"
              >
                <b>●</b>
                Continue with GitHub
              </button>
            </div>

            <p className="signup-text text-center mt-3 text-xs text-slate-400">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-emerald-400 hover:text-emerald-300">
                Sign in here
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Register;