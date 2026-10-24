const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Ensures a valid session token exists in localStorage using seed credentials.
 */
export async function ensureDemoToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  let token = localStorage.getItem("token");
  if (token) return token;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mobile: "9000000001",
        password: "demo1234",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      token = data.access_token;
      if (token) {
        localStorage.setItem("token", token);
        return token;
      }
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
  let token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) {
    token = await ensureDemoToken();
  }

  // Get the latest user query from the conversation
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";

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

  // If token expired, clear and retry once
  if (response.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("token");
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
    const reply = retryData.reply || retryData.response || retryData.message || JSON.stringify(retryData);
    onChunk(reply);
    return reply;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error (${response.status})`);
  }

  // Handle stream or regular JSON
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
  const reply = data.reply || data.response || data.message || (typeof data === "string" ? data : JSON.stringify(data));
  onChunk(reply);
  return reply;
}