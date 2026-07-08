"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Play, MessageSquare, Bot, User, RefreshCw,
  Trash2, Send, Smartphone,
} from "lucide-react";

const sampleMessages = [
  { role: "user", content: "Hi! I need help with my plumbing. My sink is leaking." },
  { role: "assistant", content: "Hello! I'd be happy to help with your leaking sink. I'm Premier Plumbing Co.'s AI assistant. Could you tell me a bit more about the issue?\n\n1. Is it a kitchen or bathroom sink?\n2. How long has it been leaking?\n3. Have you tried any fixes already?" },
  { role: "user", content: "It's the kitchen sink, been leaking for about 2 days. I tried tightening the pipes underneath but it's still dripping." },
  { role: "assistant", content: "Thank you for the details! Based on what you've described, this sounds like it could be a worn-out seal or a loose connection that needs professional attention. \n\nI'd recommend scheduling a service visit. Our plumbers can be there within 2-4 hours for emergency calls. Would you like me to book an appointment for you?\n\n📅 Available slots today:\n- 2:00 PM\n- 4:30 PM\n- 6:00 PM" },
];

export default function AiBrainPlaygroundPage() {
  const [messages, setMessages] = useState(sampleMessages);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: input.trim() }]);
    setInput("");
    setWaiting(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Great question! Let me check that for you. Based on my knowledge base, I can help you with that. Would you like me to look into this further or book a service appointment?",
      }]);
      setWaiting(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Play className="h-8 w-8 text-primary" />
            AI Testing Playground
          </h1>
          <p className="text-muted-foreground">Test how your AI responds to real customer conversations</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Personality: Professional
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Style: Balanced
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Creativity: 50%
          </Badge>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat Area */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Conversation Simulation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[500px] overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-xl p-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === "user" && (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {waiting && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-xl p-3">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border p-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a test message..."
                  className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <Button onClick={handleSend} disabled={waiting || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => setMessages([])}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Test Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Channel Simulation</label>
                <div className="flex gap-2 mt-2">
                  {[
                    { id: "web", label: "Web Chat", icon: MessageSquare },
                    { id: "sms", label: "SMS", icon: Smartphone },
                  ].map((ch) => (
                    <button key={ch.id} className={`flex-1 p-2 rounded-lg border text-xs text-center transition-colors ${
                      ch.id === "web" ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
                    }`}>
                      <ch.icon className="h-4 w-4 mx-auto mb-1" />
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Quick Test Messages</label>
                <div className="space-y-2 mt-2">
                  {[
                    "I need a quote for roof repair",
                    "Do you offer emergency service?",
                    "What are your business hours?",
                    "I want to book an appointment",
                    "How much does plumbing cost?",
                  ].map((msg) => (
                    <button
                      key={msg}
                      onClick={() => setInput(msg)}
                      className="w-full text-left text-xs p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      {msg}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Response Time</span>
                  <span className="font-medium text-green-600">~1.2s simulated</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Tokens Used</span>
                  <span className="font-medium">342</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}