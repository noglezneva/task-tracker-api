import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import "./AuthPage.css";

import { login, register } from "../api/auth";
import { useAuth } from "../auth/AuthContext";

interface AuthPageProps {
  mode: "login" | "register";
}

export function AuthPage({ mode }: AuthPageProps) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const { isAuthenticated, signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/tasks" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = isRegister
        ? await register(email.trim(), password)
        : await login(email.trim(), password);

      signIn(response.access_token);
      navigate("/tasks", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось продолжить",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <Link className="brand" to="/">
          <span className="brand-mark">т</span>
          трекер задач
        </Link>

        <div>

          <h1>Задачи, к которым легко вернуться.</h1>

          <p className="auth-intro__copy">
            Без сложных систем и бесконечного планирования.
          </p>
        </div>

        <p className="auth-intro__foot">
          React × TypeScript × FastAPI
        </p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">
            {isRegister ? "Создание аккаунта" : "С возвращением"}
          </p>

          <h2>
            {isRegister
              ? "Начни с чистого списка."
              : "Продолжай с того места, где остановился."}
          </h2>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label>
              <span>Пароль</span>
              <input
                type="password"
                autoComplete={
                  isRegister ? "new-password" : "current-password"
                }
                required
                minLength={isRegister ? 8 : undefined}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  isRegister ? "Минимум 8 символов" : "Твой пароль"
                }
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <button
              className="button button--primary button--wide"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Подождите…"
                : isRegister
                  ? "Создать аккаунт"
                  : "Войти"}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister
              ? "Уже есть аккаунт?"
              : "Ещё нет аккаунта?"}{" "}
            <Link to={isRegister ? "/login" : "/register"}>
              {isRegister ? "Войти" : "Зарегистрироваться"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}