export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: body !== undefined || method !== "GET" ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : method !== "GET" ? "{}" : undefined,
  });
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/")) {
    window.dispatchEvent(new Event("gt:unauthorized"));
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? `İstek başarısız (${res.status})`, data?.field);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Bir hata oluştu";
}
