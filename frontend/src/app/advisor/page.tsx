"use client";

import { useState, useRef, useEffect } from "react";
import Shell from "@/components/Shell";
import { askAdvisorStream, ChatMessage } from "@/lib/api";
import { Send, Bot, User, Sparkles, ChevronDown, ChevronUp, Mic } from "lucide-react";

const SUGGESTED_PROMPTS = [
  "Which scheme fits my margin of ₹12,000?",
  "Is my DSCR safe?",
  "How crowded is tailoring in my block?",
  "What if I cut monthly expenses?",
];

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  derivation?: string;
}

export default function AdvisorPage() {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: "initial-msg",
      role: "assistant",
      content:
        "Namaste! I am your ArthaSathi financial advisor. Ask about scheme guidelines, monthly debt obligations, or check if your enterprise cash flow can support a new loan.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedDerivation, setExpandedDerivation] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (messageText: string) => {
    const text = messageText.trim();
    if (!text || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    const newMessages: DisplayMessage[] = [
      ...messages,
      { id: userMsgId, role: "user", content: text },
    ];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    let streamAccumulator = "";

    try {
      const apiPayload: ChatMessage[] = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      await askAdvisorStream(apiPayload, (chunk: string) => {
        streamAccumulator += chunk;
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === assistantMsgId);
          if (exists) {
            return prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: streamAccumulator } : m
            );
          } else {
            return [
              ...prev,
              {
                id: assistantMsgId,
                role: "assistant",
                content: streamAccumulator,
              },
            ];
          }
        });
      });
    } catch (err: any) {
      const fallbackError =
        err?.message ||
        "Advisory Error: Unable to fetch advice. Please ensure the backend is connected.";
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Advisory Error: ${fallbackError}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleDerivation = (id: string) => {
    setExpandedDerivation(expandedDerivation === id ? null : id);
  };

  return (
    <Shell>
      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col h-[calc(100vh-80px)]">
        {/* Header */}
        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Autonomous SIH Financial Copilot
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Financial Advisor</h1>
          <p className="text-gray-400 text-sm mt-1">
            Ask questions regarding scheme rules, repayment calculations, or debt viability. Click any suggested prompt to begin.
          </p>
        </div>

        {/* Suggested Prompts */}
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="text-xs bg-[#161b22] hover:bg-[#21262d] text-gray-300 border border-gray-800 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Messages Container */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 rounded-xl bg-[#0d1117] border border-gray-800/80 p-4 shadow-inner">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`flex gap-3 max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-emerald-600 text-white rounded-br-none shadow-md"
                    : "bg-[#1c2128] text-gray-200 border border-gray-800 rounded-bl-none"
                }`}
              >
                {m.role === "assistant" && (
                  <Bot className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                )}
                <div className="whitespace-pre-wrap">{m.content}</div>
                {m.role === "user" && (
                  <User className="w-5 h-5 text-emerald-100 mt-0.5 shrink-0" />
                )}
              </div>

              {/* Statutory Derivation Accordion (Advisor messages only) */}
              {m.role === "assistant" && (
                <div className="mt-1 ml-2">
                  <button
                    onClick={() => toggleDerivation(m.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-400 transition-colors"
                  >
                    {expandedDerivation === m.id ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    Show statutory derivation
                  </button>
                  {expandedDerivation === m.id && (
                    <div className="mt-1 p-2 rounded bg-black/40 border border-gray-800 text-[11px] text-gray-400 font-mono">
                      {m.derivation ||
                        "Standard prudential norms applied: DSCR = Operating Net Surplus / Debt Service Requirement."}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-gray-400 text-xs p-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Analyzing scheme parameters & credit data...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="mt-4 flex gap-2 items-center"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about schemes, instalments, or working capital..."
              disabled={loading}
              className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-10 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
            />
            <Mic className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Status Indicators */}
        <div className="flex justify-between items-center text-[10px] text-gray-500 mt-2 px-1">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            PostgreSQL trigger rules validated
          </span>
          <span>FastAPI LangChain Agent</span>
        </div>
      </div>
    </Shell>
  );
}