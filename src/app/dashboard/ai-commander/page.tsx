"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Terminal, Sparkles, ArrowUp, Loader2,
  Users, Calendar, Phone, TrendingUp, Mail, MessageSquare,
} from "lucide-react";

const SUGGESTIONS = [
  { icon: Users, label: "How many leads this month?", prompt: "How many leads did we get this month?" },
  { icon: TrendingUp, label: "What's my conversion rate?", prompt: "What is our lead-to-customer conversion rate?" },
  { icon: Calendar, label: "Today's appointments", prompt: "What appointments do we have today?" },
  { icon: Phone, label: "Who should I call first?", prompt: "Which lead should I call first today and why?" },
  { icon: Mail, label: "Draft follow-up email", prompt: "Draft a follow-up email for my newest lead" },
  { icon: MessageSquare, label: "Missed calls summary", prompt: "Give me a summary of recent missed calls" },
];

export default function AiCommanderPage() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    {
      role: "assistant",
      content: "👋 Hey! I'm your AI business assistant. I know everything about your leads, appointments, and communications. Ask me anything — I'm here to help you run your business.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;
    const userMsg = text.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/ai/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: userMsg, history: messages.slice(-10) }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.response || "Sorry, I couldn't process that. Please try again.",
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I ran into a connection error. Please try again.",
      }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isWelcome = messages.length <= 1;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
          <Terminal className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white">AI Commander</h1>
          <p className="text-[11px] text-white/35">{sending ? "Thinking..." : "Online — ready to help"}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              msg.role === "assistant" ? "bg-amber-500/10 border border-amber-500/20" : "bg-blue-500/10 border border-blue-500/20"
            }`}>
              {msg.role === "assistant"
                ? <Sparkles className="h-4 w-4 text-amber-400" />
                : <span className="text-[10px] font-bold text-blue-400">You</span>
              }
            </div>
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-blue-500/15 text-blue-50 rounded-tr-md"
                : "bg-white/[0.03] border border-white/[0.06] text-slate-200 rounded-tl-md"
            }`}>
              {msg.content}
              <div className="text-[10px] text-white/20 mt-1.5 text-right">
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}

        {/* Typing */}
        {sending && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-amber-400/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-amber-400/60 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested prompts */}
      {isWelcome && !sending && (
        <div className="px-4 pb-3 shrink-0">
          <p className="text-[11px] text-white/25 uppercase tracking-wider mb-2.5">Try asking</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => sendMessage(s.prompt)}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-left hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-150"
              >
                <div className="h-7 w-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                  <s.icon className="h-3.5 w-3.5 text-white/40" />
                </div>
                <span className="text-xs text-white/60 leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 shrink-0">
        <div className="flex gap-2 p-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] focus-within:border-white/[0.15] transition-colors">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your business..."
            rows={1}
            disabled={sending}
            className="flex-1 bg-transparent border-0 shadow-none resize-none min-h-0 py-1.5 text-sm placeholder:text-white/20 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={sending || !input.trim()}
            className="h-9 w-9 rounded-xl shrink-0 bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-30"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-white/15 text-center mt-2">
          AI Commander knows your leads, appointments, and business data
        </p>
      </div>
    </div>
  );
}
