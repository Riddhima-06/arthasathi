const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SessionUser {
  id: string;
  full_name: string;
  mobile: string;
  role: string;
  caste_category?: string;
  state?: string;
  district?: string;
  block?: string;
  panchayat?: string;
}

export const session = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  },
  setToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }
  },
  clear() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  },
  getUser(): SessionUser | null {
    if (typeof window === "undefined") return null;
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  },
  setUser(user: SessionUser) {
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(user));
    }
  },
};

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = session.getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${res.status}`);
  }

  return res.json();
}

/**
 * Ensures a valid session token exists in localStorage using seed credentials.
 */
export async function ensureDemoToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  let token = session.getToken();
  if (token) return token;

  try {
    const data = await api<{ access_token: string; user?: SessionUser }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          mobile: "9000000001",
          password: "demo1234",
        }),
      }
    );

    if (data.access_token) {
      session.setToken(data.access_token);
      if (data.user) session.setUser(data.user);
      return data.access_token;
    }
  } catch (err) {
    console.error("Auto-login failed:", err);
  }
  return null;
}

/**
 * Sends queries to the FastAPI /agent/chat LangChain endpoint.
 */
export async function askAdvisorStream(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void
): Promise<string> {
  let token = session.getToken();
  if (!token) {
    token = await ensureDemoToken();
  }

  const lastUserMsg =
    [...messages].reverse().find((m) => m.role === "user")?.content || "";

  const response = await fetch(`${API_BASE}/agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message: lastUserMsg,
    }),
  });

  if (response.status === 401 && typeof window !== "undefined") {
    session.clear();
    token = await ensureDemoToken();
    const retryRes = await fetch(`${API_BASE}/agent/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message: lastUserMsg,
      }),
    });

    if (!retryRes.ok) {
      const err = await retryRes.json().catch(() => ({}));
      throw new Error(err.detail || `Server error (${retryRes.status})`);
    }

    const retryData = await retryRes.json();
    const reply =
      retryData.reply ||
      retryData.response ||
      retryData.message ||
      JSON.stringify(retryData);
    onChunk(reply);
    return reply;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error (${response.status})`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream") && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullReply = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullReply += chunk;
      onChunk(chunk);
    }
    return fullReply;
  }

  const data = await response.json();
  const reply =
    data.reply ||
    data.response ||
    data.message ||
    (typeof data === "string" ? data : JSON.stringify(data));
  onChunk(reply);
  return reply;
}