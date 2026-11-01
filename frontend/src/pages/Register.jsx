import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser, loginUser, getGoogleLoginUrl } from "../services/api";
import { useAuth } from "../context/AuthContext";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      await registerUser(name.trim(), email.trim(), password);
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
    <main className="mentora-background login-page">
      <div className="login-shell">
        {/* Left panel */}
        <section className="login-hero">
          <Link className="brand" to="/">
            <span className="brand-icon">M</span>
            <span>
              Mentora <b>AI</b>
            </span>
          </Link>

          <div className="hero-content">
            <p className="eyebrow">START YOUR LEARNING ODYSSEY</p>

            <h1>
              Master concepts.
              <br />
              Any language.
              <br />
              <span>Free forever.</span>
            </h1>

            <p className="hero-description">
              Create your account to unlock interactive AI tutoring, intelligent quizzes,
              multilingual explanations, and trackable learning milestones.
            </p>

            <div className="feature-list">
              <div className="feature">
                <span className="feature-icon">✦</span>
                <div>
                  <h3>Interactive AI Chat</h3>
                  <p>Real-time conversational problem solving</p>
                </div>
              </div>

              <div className="feature">
                <span className="feature-icon">🌐</span>
                <div>
                  <h3>Multilingual Learning</h3>
                  <p>English, Hindi, Spanish, French, and more</p>
                </div>
              </div>

              <div className="feature">
                <span className="feature-icon">📊</span>
                <div>
                  <h3>Adaptive Quizzes</h3>
                  <p>Instant scoring with detailed feedback</p>
                </div>
              </div>
            </div>
          </div>

          <p className="hero-footer">
            Join thousands of lifelong learners mastering new skills every day.
          </p>
        </section>

        {/* Right panel */}
        <section className="login-form-panel">
          <div className="login-card">
            <div className="form-heading">
              <h2>Create an account</h2>
              <p>Sign up to begin learning with Mentora AI</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {success}
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit}>
              <label htmlFor="reg-name">Full name</label>
              <div className="input-wrap">
                <span>👤</span>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <label htmlFor="reg-email">Email address</label>
              <div className="input-wrap">
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

              <label htmlFor="reg-password">Password (minimum 8 characters)</label>
              <div className="input-wrap">
                <span>🔒</span>
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
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

              <label htmlFor="reg-confirm-password">Confirm password</label>
              <div className="input-wrap">
                <span>✓</span>
                <input
                  id="reg-confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button
                className="login-button mt-2"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account <span>→</span>
                  </>
                )}
              </button>
            </form>

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
                onClick={() => alert("GitHub OAuth is not configured for this project.")}
              >
                <b>●</b>
                Continue with GitHub
              </button>
            </div>

            <p className="signup-text">
              Already have an account?{" "}
              <Link to="/login">Sign in here</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Register;
