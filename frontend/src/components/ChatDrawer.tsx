"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardList, Mic, MicOff, Send, X } from "lucide-react";
import { api } from "@/lib/api";

type TraceStep = { tool: string; args: Record<string, unknown>; output: string };
type Msg = { role: "user" | "assistant"; text: string; trace?: TraceStep[]; mode?: "llm" | "offline" };

const QUICK_PROMPTS = [
  "Which scheme fits my margin of ₹12,000?",
  "Is my DSCR safe?",
  "How crowded is tailoring in my block?",
  "What if I cut monthly expenses?",
];

// Web Speech API is not in lib.dom for all TS versions; keep a minimal local type.
type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: ((e: any) => void) | null;
  start(): void; stop(): void;
};

export default function ChatDrawer({ open, onClose, embedded = false }: { open: boolean; onClose: () => void; embedded?: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechOk, setSpeechOk] = useState(false);
  const [auditFor, setAuditFor] = useState<number | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const W = window as any;
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec: SpeechRec = new Ctor();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => setInput(Array.from(e.results as ArrayLike<any>).map((r) => r[0].transcript).join(" "));
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setSpeechOk(true);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => {
    if (!open || embedded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, embedded, onClose]);

  const toggleMic = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) { rec.stop(); return; }
    setInput("");
    setListening(true);
    rec.start();
  };

  const send = useCallback(async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setMessages((m) => [...m, { role: "user", text: message }]);
    setInput("");
    setBusy(true);
    try {
      const data = await api<{ reply: string; trace?: TraceStep[]; mode: "llm" | "offline" }>("/agent/chat", { method: "POST", body: { message } });
      setMessages((m) => [...m, { role: "assistant", text: data.reply, trace: data.trace, mode: data.mode }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", text: `I couldn't reach the advisor service (${(err as Error).message}). Check your connection and send that again.` }]);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  if (!open && !embedded) return null;
  const audit = auditFor !== null ? messages[auditFor]?.trace ?? [] : null;

  return (
    <aside role={embedded ? "region" : "dialog"} aria-label="ArthaSathi advisor" className={embedded ? "flex h-full min-h-[32rem] w-full flex-col rounded-lg border border-slate-200 bg-white" : "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl"}>
      {!embedded && <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-900">ArthaSathi advisor</h2>
        <button onClick={onClose} aria-label="Close advisor" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
      </header>}

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Ask about schemes, repayment, or whether your plan can carry a loan. Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((p) => (
                <button key={p} onClick={() => send(p)} className="rounded-full border border-emerald-700 px-3 py-1 text-sm text-emerald-900 hover:bg-emerald-50">{p}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-900"}`}>
              {m.text}
              {m.trace && m.trace.length > 0 && (
                <button onClick={() => setAuditFor(auditFor === i ? null : i)} className="mt-2 flex items-center gap-1 text-xs text-emerald-800 underline">
                  <ClipboardList className="h-3.5 w-3.5" aria-hidden /> {auditFor === i ? "Hide" : "Show"} how this was worked out ({m.trace.length})
                </button>
              )}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm text-slate-500">Working on it…</p>}
        {messages.length > 0 && messages[messages.length - 1].mode === "offline" && <p className="text-xs text-slate-500">Demo advisor: rule-based answers from the same calculation tools. Add an LLM key on the server for open conversation.</p>}
        <div ref={endRef} />
      </div>

      {audit && (
        <section aria-label="Audit trail" className="max-h-56 overflow-y-auto border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs">
          <h3 className="mb-2 font-semibold text-slate-700">Tools the advisor used</h3>
          {audit.map((s, i) => (
            <details key={i} className="mb-2 rounded border border-slate-200 bg-white p-2">
              <summary className="cursor-pointer font-medium text-slate-800">{s.tool}</summary>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-slate-600">{JSON.stringify(s.args, null, 2)}</pre>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-slate-900">{s.output}</pre>
            </details>
          ))}
        </section>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 border-t border-slate-200 p-3">
        {speechOk && (
          <button type="button" onClick={toggleMic} aria-pressed={listening} aria-label={listening ? "Stop dictation" : "Start dictation"}
            className={`rounded-full p-2 ${listening ? "bg-amber-100 text-amber-900" : "text-slate-600 hover:bg-slate-100"}`}>
            {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        )}
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={listening ? "Listening…" : "Ask a question"} className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="rounded-md bg-emerald-800 p-2 text-white disabled:opacity-40"><Send className="h-5 w-5" /></button>
      </form>
    </aside>
  );
}
