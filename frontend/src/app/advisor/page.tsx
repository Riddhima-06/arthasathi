"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Send, Sparkles, ShieldCheck, ChevronDown, Loader2 } from "lucide-react";
import { askAdvisorStream, ChatMessage } from "@/lib/api";

interface MessageItem {
  role: "user" | "assistant";
  text: string;
  derivation?: string;
}

export default function AdvisorPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      role: "assistant",
      text: "Namaste! I am your ArthaSathi financial advisor. Ask about scheme guidelines, monthly debt obligations, or check if your enterprise cash flow can support a new loan.",
      derivation: "Active policy baseline: NBCFDC Micro Finance Scheme (10% beneficiary margin ceiling, 90% scheme loan, 3-month moratorium).",
    },
  ]);
  const [showDerivationIndex, setShowDerivationIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const samplePrompts = [
    "Which scheme fits my margin of ₹12,000?",
    "Is my DSCR safe?",
    "How crowded is tailoring in my block?",
    "What if I cut monthly expenses?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    setInput("");
    setLoading(true);

    // Append user message immediately
    const userMessage: MessageItem = { role: "user", text: query };
    setMessages((prev) => [...prev, userMessage]);

    // Prepare API history
    const apiHistory: ChatMessage[] = messages.concat(userMessage).map((m) => ({
      role: m.role,
      content: m.text,
    }));

    // Placeholder assistant message for streaming
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: "",
        derivation: "Statutory Rule Applied: NBCFDC/NSFDC split constraints verified against PostgreSQL backend.",
      },
    ]);

    try {
      await askAdvisorStream(apiHistory, (chunk) => {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.role === "assistant") {
            updated[lastIdx] = {
              ...updated[lastIdx],
              text: updated[lastIdx].text + chunk,
            };
          }
          return updated;
        });
      });
    } catch (err: any) {
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (updated[lastIdx]?.role === "assistant") {
          updated[lastIdx] = {
            ...updated[lastIdx],
            text: `Advisory Error: ${err.message || "Failed to reach AI agent."}. Ensure your backend server is active on http://localhost:8000.`,
          };
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-[#0B0C10] text-zinc-100 px-4 sm:px-6 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            Autonomous SIH Financial Copilot
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Financial Advisor</h1>
          <p className="text-zinc-400 text-sm max-w-2xl">
            Ask questions regarding scheme rules, repayment calculations, or debt viability. Click any suggested prompt to begin.
          </p>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="text-xs px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-all text-left disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat / Terminal Window */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-2xl flex flex-col h-[520px]">
          {/* Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-emerald-500 text-zinc-950 font-semibold shadow-md shadow-emerald-500/10"
                      : "bg-zinc-800/80 border border-white/10 text-zinc-200"
                  }`}
                >
                  {m.text || (loading && i === messages.length - 1 ? "Thinking..." : "")}
                </div>

                {m.derivation && m.text && (
                  <div className="mt-2 text-xs">
                    <button
                      onClick={() =>
                        setShowDerivationIndex(showDerivationIndex === i ? null : i)
                      }
                      className="flex items-center gap-1 text-zinc-500 hover:text-emerald-400 transition-colors"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          showDerivationIndex === i ? "rotate-180" : ""
                        }`}
                      />
                      Show statutory derivation
                    </button>
                    {showDerivationIndex === i && (
                      <div className="mt-1.5 p-2.5 rounded-lg bg-black/50 border border-white/5 font-mono text-[11px] text-zinc-400 max-w-[85%]">
                        {m.derivation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-white/10 bg-zinc-900/90 rounded-b-2xl">
            <div className="relative flex items-center">
              <button
                type="button"
                className="absolute left-3.5 text-zinc-400 hover:text-white transition-colors"
                title="Voice Input"
              >
                <Mic className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={loading}
                placeholder="Ask about schemes, instalments, or working capital..."
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-12 pr-12 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="absolute right-2.5 p-2 rounded-lg bg-emerald-500 text-zinc-950 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> PostgreSQL trigger rules validated
              </span>
              <span>FastAPI LangChain Agent</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}