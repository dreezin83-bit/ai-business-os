"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Pencil, Copy, Check, Eye, X,
  Palette, Move, Type, Sun, Moon, Settings, Share2,
  Bot, User, ChevronDown, Sparkles,
} from "lucide-react";

const suggestedQuestions = [
  "Book Appointment",
  "Request Quote",
  "What are your hours?",
  "Do you offer emergency service?",
  "How much does it cost?",
];

export default function ChatbotPage() {
  const [enabled, setEnabled] = useState(true);
  const [primaryColor, setPrimaryColor] = useState("#3B82F6");
  const [position, setPosition] = useState("right");
  const [welcomeMessage, setWelcomeMessage] = useState("Hello! 👋 How can I help you today?");
  const [widgetTitle, setWidgetTitle] = useState("Chat with us");
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: welcomeMessage },
  ]);

  const embedCode = `<script>
  (function() {
    window.AIBotConfig = {
      businessId: "YOUR_BUSINESS_ID",
      primaryColor: "${primaryColor}",
      position: "${position}",
      title: "${widgetTitle}",
      welcomeMessage: "${welcomeMessage}"
    };
    var s = document.createElement('script');
    s.src = "https://app.aibusinessos.com/widget.js";
    s.async = true;
    document.body.appendChild(s);
  })();
</script>`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            AI Chatbot
          </h1>
          <p className="text-muted-foreground">Configure your website&apos;s AI chat widget</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Eye className="h-3.5 w-3.5 mr-1" /> Preview
          </Button>
          <Button size="sm">
            <Save className="h-3.5 w-3.5 mr-1" /> Save
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Settings Panel */}
        <div className="lg:col-span-3 space-y-6">
          {/* Enable/disable */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-6 rounded-full ${enabled ? "bg-primary" : "bg-muted"} relative cursor-pointer transition-colors`}
                    onClick={() => setEnabled(!enabled)}>
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 shadow transition-all ${
                      enabled ? "left-6" : "left-0.5"
                    }`} />
                  </div>
                  <div>
                    <span className="text-sm font-medium">Chatbot {enabled ? "Enabled" : "Disabled"}</span>
                    <p className="text-xs text-muted-foreground">Widget will appear on your website</p>
                  </div>
                </div>
                <Badge variant={enabled ? "success" : "secondary"}>{enabled ? "Live" : "Off"}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" /> Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Primary Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-9 w-9 rounded-lg border border-input cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Widget Title</label>
                  <input
                    type="text"
                    value={widgetTitle}
                    onChange={(e) => setWidgetTitle(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Widget Position</label>
                <div className="flex gap-2 mt-1">
                  {[
                    { id: "left", label: "Bottom Left" },
                    { id: "right", label: "Bottom Right" },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => setPosition(pos.id)}
                      className={`flex-1 p-2.5 rounded-lg border text-sm transition-colors ${
                        position === pos.id
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Welcome Message */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" /> Welcome Message
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="w-full h-24 rounded-xl border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </CardContent>
          </Card>

          {/* Suggested Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Suggested Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q, i) => (
                  <div key={i} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-sm group">
                    <span>{q}</span>
                    <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button className="px-3 py-1.5 rounded-full border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary">
                  + Add
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Lead Capture */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Capture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Name", enabled: true },
                { label: "Phone", enabled: true },
                { label: "Email", enabled: true },
                { label: "Address", enabled: false },
                { label: "Service Requested", enabled: true },
                { label: "Preferred Date", enabled: false },
              ].map((field) => (
                <label key={field.label} className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">{field.label}</span>
                  <div className={`w-10 h-5 rounded-full ${field.enabled ? "bg-primary" : "bg-muted"} relative transition-colors`}>
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow transition-all ${
                      field.enabled ? "left-5" : "left-0.5"
                    }`} />
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Escalation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Escalation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="font-medium mb-1">When to hand off to human</p>
                <p className="text-muted-foreground text-xs">AI will automatically escalate when customer asks for human, expresses frustration, or asks about pricing.</p>
              </div>
              <div className="flex gap-2">
                {["Email", "SMS", "Both"].map((opt) => (
                  <button key={opt} className={`px-3 py-1.5 rounded-lg border text-xs ${
                    opt === "Both" ? "border-primary bg-primary/5 text-primary" : "border-border"
                  }`}>
                    Notify via {opt}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Embed Code */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" /> Embed Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted rounded-xl p-4 text-xs font-mono overflow-x-auto">
                  {embedCode}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={copyEmbed}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Add this code just before the closing {"</body>"} tag on your website.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" /> Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative bg-muted/30 rounded-xl overflow-hidden" style={{ height: "520px" }}>
                {/* Mock website content */}
                <div className="p-4 space-y-2">
                  <div className="h-3 w-32 bg-muted rounded" />
                  <div className="h-2 w-48 bg-muted rounded" />
                  <div className="h-20 bg-muted rounded-lg" />
                  <div className="h-2 w-40 bg-muted rounded" />
                  <div className="h-2 w-36 bg-muted rounded" />
                </div>

                {/* Chatbot Widget */}
                {enabled && (
                  <div className={`absolute bottom-4 ${position === "right" ? "right-4" : "left-4"} z-10`}>
                    {!chatOpen ? (
                      <button
                        onClick={() => setChatOpen(true)}
                        className="flex items-center justify-center h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-105"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <MessageSquare className="h-6 w-6 text-white" />
                      </button>
                    ) : (
                      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-80 border border-border overflow-hidden"
                        style={{ maxHeight: "420px" }}>
                        {/* Header */}
                        <div className="p-3 text-white flex items-center justify-between"
                          style={{ backgroundColor: primaryColor }}>
                          <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            <span className="text-sm font-medium">{widgetTitle}</span>
                          </div>
                          <button onClick={() => setChatOpen(false)}>
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Messages */}
                        <div className="p-3 space-y-3 overflow-y-auto" style={{ height: "260px" }}>
                          {chatMessages.map((msg, i) => (
                            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                              {msg.role === "assistant" && (
                                <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: `${primaryColor}20` }}>
                                  <Bot className="h-3 w-3" style={{ color: primaryColor }} />
                                </div>
                              )}
                              <div className={`max-w-[80%] rounded-xl p-2.5 text-xs ${
                                msg.role === "user"
                                  ? "text-white"
                                  : "bg-muted"
                              }`}
                                style={msg.role === "user" ? { backgroundColor: primaryColor } : {}}>
                                {msg.content}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Suggested questions */}
                        <div className="px-3 pb-2 flex flex-wrap gap-1">
                          {suggestedQuestions.slice(0, 3).map((q) => (
                            <button
                              key={q}
                              onClick={() => setChatMessages(prev => [...prev,
                                { role: "user", content: q },
                                { role: "assistant", content: `Sure! Let me help with that. Based on what you've asked about "${q}", I can assist you right away.` }
                              ])}
                              className="text-[10px] px-2 py-1 rounded-full border border-border hover:bg-muted"
                            >
                              {q}
                            </button>
                          ))}
                        </div>

                        {/* Input */}
                        <div className="border-t border-border p-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Type a message..."
                              className="flex-1 h-8 text-xs rounded-lg bg-muted px-3 focus:outline-none"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.target as HTMLInputElement).value) {
                                  const val = (e.target as HTMLInputElement).value;
                                  setChatMessages(prev => [...prev, { role: "user", content: val }]);
                                  (e.target as HTMLInputElement).value = "";
                                  setTimeout(() => {
                                    setChatMessages(prev => [...prev, {
                                      role: "assistant",
                                      content: "Thanks for your message! Let me check on that for you right away."
                                    }]);
                                  }, 1000);
                                }
                              }}
                            />
                            <div className="h-6 w-6 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: primaryColor }}>
                              <ChevronDown className="h-3 w-3 text-white rotate-90" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Missing Save import
import { Save } from "lucide-react";