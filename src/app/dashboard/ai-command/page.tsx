"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Loader2, Send, Sparkles, TrendingUp, Users, DollarSign } from "lucide-react";

export default function AICommandPage() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Hi! I'm your AI business assistant. Ask me anything about your leads, revenue, or what you should focus on today.\n\nTry:\n• \"How many leads this month?\"\n• \"Who should I call first today?\"\n• \"What's my win rate?\"\n• \"Draft an email to my newest lead\"" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/ai/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: text, history: messages.slice(-6) }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.response || "Sorry, I couldn't process that."
      }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> AI Command Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your AI assistant that knows your business data — ask anything
        </p>
      </div>

      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" /> Business Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-[500px] pr-1">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                    <span className="text-xs font-medium">You</span>
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex gap-2">
                <Bot className="h-4 w-4 animate-pulse" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Input
              placeholder="Ask about your business... e.g. who should I call today?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              disabled={sending}
            />
            <Button size="sm" onClick={handleSend} disabled={sending || !input.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}