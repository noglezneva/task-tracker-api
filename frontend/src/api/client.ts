const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();
export const API_BASE_URL = configuredBaseUrl || "/api";

const TOKEN_KEY = "task-tracker.access-token";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

const backendMessages: Record<string, string> = {
  "Email already registered": "Пользователь с таким email уже зарегистрирован",
  "Incorrect email or password": "Неверный email или пароль",
  "Not authenticated": "Необходимо войти в аккаунт",
  "Could not validate credentials": "Не удалось проверить данные авторизации",
  "Task not found": "Задача не найдена",
};

function translateBackendMessage(message: string): string {
  return backendMessages[message] ?? message;
}

function readErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Что-то пошло не так";
  }

  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string") {
    return translateBackendMessage(detail);
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          const message = String((item as { msg: unknown }).msg);
          if (message.toLowerCase().includes("at least 8 characters")) {
            return "Пароль должен содержать минимум 8 символов";
          }
          if (message.toLowerCase().includes("valid email")) {
            return "Введите корректный email";
          }
          return translateBackendMessage(message);
        }
        return "Проверьте введённые данные";
      })
      .join(". ");
  }

  return "Что-то пошло не так";
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError("Не удалось подключиться к серверу", 0);
  }

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // Бэкенд может вернуть пустой ответ или ошибку не в формате JSON.
    }

    if (response.status === 401) {
      clearToken();
      window.dispatchEvent(new Event("task-tracker:unauthorized"));
    }

    throw new ApiError(readErrorMessage(payload), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
