import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCurrentUser } from "../services/api";

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    let isCancelled = false;
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true });
      return;
    }

    if (token) {
      localStorage.setItem("mentora_token", token);
      const payload = decodeJwtPayload(token);
      const fallbackUser = {
        id: payload?.sub || "user",
        email: payload?.email || "",
        name: payload?.email ? payload.email.split("@")[0] : "Student",
        role: payload?.role || "student",
      };

      getCurrentUser()
        .then((res) => {
          if (!isCancelled) {
            login(token, res.user || fallbackUser);
            navigate("/dashboard", { replace: true });
          }
        })
        .catch(() => {
          if (!isCancelled) {
            login(token, fallbackUser);
            navigate("/dashboard", { replace: true });
          }
        });
    } else {
      navigate("/login", { replace: true });
    }

    return () => {
      isCancelled = true;
    };
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
