
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser, getGoogleLoginUrl } from "../services/api";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [searchParams] = useSearchParams();

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  // Check for error params (from OAuth callback)
  const urlError = searchParams.get("error");
  const errorMessages = {
    session_expired: "Your session has expired. Please log in again.",
    google_auth_denied: "Google sign-in was cancelled.",
    google_auth_failed: "Google sign-in failed. Please try again.",
    google_token_failed: "Could not complete Google sign-in. Please try again.",
    google_userinfo_failed: "Could not get your Google profile. Please try again.",
    invalid_state: "Invalid sign-in request. Please try again.",
    google_no_email: "Could not get your email from Google.",
    database_error: "A server error occurred. Please try again.",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

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
      setError(err.message || "Login failed. Please try again.");
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
            <p className="eyebrow">
              YOUR AI LEARNING COMPANION
            </p>

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
                <span className="feature-icon">♧</span>
                <div>
                  <h3>AI-Powered Learning</h3>
                  <p>Understand complex topics easily</p>
                </div>
              </div>

              <div className="feature">
                <span className="feature-icon">◎</span>
                <div>
                  <h3>Multilingual Support</h3>
                  <p>Learn in your preferred language</p>
                </div>
              </div>

              <div className="feature">
                <span className="feature-icon">▥</span>
                <div>
                  <h3>Track Your Progress</h3>
                  <p>Stay consistent and achieve your goals</p>
                </div>
              </div>

              <div className="feature">
                <span className="feature-icon">✧</span>
                <div>
                  <h3>Personalized Experience</h3>
                  <p>Get tailored explanations and resources</p>
                </div>
              </div>
            </div>
          </div>

          <p className="hero-footer">
            A smarter way to learn, for a brighter tomorrow.
          </p>
        </section>

        {/* Right panel */}
        <section className="login-form-panel">
          <div className="login-card">
            <div className="form-heading">
              <h2>Welcome back</h2>
              <p>Log in to continue your learning journey</p>
            </div>

            {/* Error messages */}
            {(error || urlError) && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error || errorMessages[urlError] || "An error occurred."}
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit}>
              <label htmlFor="email">Email address</label>

              <div className="input-wrap">
                <span>✉</span>
                <input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <label htmlFor="password">Password</label>

              <div className="input-wrap">
                <span>♙</span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <div className="form-options">
                <label className="remember">
                  <input type="checkbox" />
                  Remember me
                </label>
              </div>

              <button
                className="login-button"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Logging in...
                  </>
                ) : (
                  <>
                    Login <span>→</span>
                  </>
                )}
              </button>
            </form>

            <div className="divider">
              <span>OR</span>
            </div>

            <div className="social-buttons">
              <button
                type="button"
                onClick={handleGoogleLogin}
              >
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

            <p className="signup-text">
              Don't have an account?{" "}
              <Link to="/register">Create one</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;
