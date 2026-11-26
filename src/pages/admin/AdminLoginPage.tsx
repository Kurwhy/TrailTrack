import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { config } from "../../lib/config";
import { usePageMeta } from "../../lib/usePageMeta";
import { useAuth } from "../../store/AuthContext";
import { Logo } from "../../components/shared/Logo";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Input";
import { InlineError } from "../../components/shared/EmptyState";

interface LocationState {
  from?: string;
}

export function AdminLoginPage() {
  usePageMeta("Login Staf - TrailTrack", true);
  const { isAuthed, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  if (isAuthed) {
    return <Navigate to="/admin/pesanan" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const nextErrors: { email?: string; password?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Masukkan email yang valid.";
    }
    if (password.length < 6) {
      nextErrors.password = "Kata sandi minimal 6 karakter.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.message ?? "Login gagal. Coba lagi.");
      return;
    }
    const state = location.state as LocationState | null;
    navigate(state?.from ?? "/admin/pesanan", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <Logo to="/" />
        </div>
        <Card className="mt-6 p-6 shadow-float sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            Masuk sebagai staf
          </h1>
          <p className="mt-1 text-sm text-muted">
            Kelola pesanan, inventaris, dan penyewa basecamp.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <Field
              label="Email"
              htmlFor="login-email"
              required
              error={fieldErrors.email}
            >
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="staf@trailtrack.example"
                invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                disabled={loading}
              />
            </Field>
            <Field
              label="Kata sandi"
              htmlFor="login-password"
              required
              error={fieldErrors.password}
            >
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Kata sandi"
                invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password ? "login-password-error" : undefined
                }
                disabled={loading}
              />
            </Field>

            {error && <InlineError>{error}</InlineError>}

            <Button type="submit" size="lg" loading={loading} className="w-full">
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Masuk
            </Button>
          </form>

          <div className="mt-6 rounded-card border border-line bg-charcoal/60 p-3 text-xs text-muted">
            <p className="font-semibold text-ink">Akun demo</p>
            <p className="mt-1 tabular">{config.adminEmail}</p>
            <p className="tabular">{config.adminPassword}</p>
          </div>
        </Card>
        <p className="mt-4 text-center text-xs text-muted">
          Halaman ini khusus staf basecamp.
        </p>
      </div>
    </div>
  );
}
