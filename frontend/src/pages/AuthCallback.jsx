import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      navigate(`/login?error=${error}`, { replace: true });
      return;
    }

    if (token) {
      // Store token and fetch user info
      localStorage.setItem("mentora_token", token);

      // Decode basic info from token (JWT payload)
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        login(token, { id: payload.sub, email: payload.email, name: payload.email.split("@")[0] });
      } catch {
        login(token, {});
      }

      navigate("/dashboard", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [searchParams, navigate, login]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-slate-300">Signing you in...</p>
      </div>
    </div>
  );
}

export default AuthCallback;
