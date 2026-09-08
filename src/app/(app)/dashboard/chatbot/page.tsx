"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Bot, Copy, Check, Eye, X, User, ChevronDown,
  Code, Loader2, ExternalLink, Hash,
} from "lucide-react";
import { useToast } from "@/components/toaster";

export default function ChatbotPage() {
  const [enabled, setEnabled] = useState(true);
  const [copiedSimple, setCopiedSimple] = useState(false);
  const [copiedAsync, setCopiedAsync] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [businessId, setBusinessId] = useState<string>("YOUR_BUSINESS_ID");
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: "Hello! 👋 How can I help you today?" },
  ]);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : Promise.reject("No settings"))
      .then((data) => {
        if (data?.id) {
          setBusinessId(data.id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const simpleEmbed = `<script src="https://www.sagenifyai.com/api/public/chatbot/widget" data-business-id="${businessId}"></script>`;

  const asyncEmbed = `<script>
  (function(w,d,s,o,f,js,fjs){
    w['AIWidgetConfig']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  })(window,document,'script','aiChatbot','https://www.sagenifyai.com/api/public/chatbot/widget');
  aiChatbot('init', { businessId: '${businessId}' });
</script>`;

  const copyToClipboard = async (text: string, type: "simple" | "async") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "simple") {
        setCopiedSimple(true);
        setTimeout(() => setCopiedSimple(false), 2000);
      } else {
        setCopiedAsync(true);
        setTimeout(() => setCopiedAsync(false), 2000);
      }
      toast("Embed code copied to clipboard", "success");
    } catch {
      toast("Failed to copy", "error");
    }
  };

  const suggestedQuestions = [
    "Book Appointment",
    "What are your hours?",
    "Do you offer emergency service?",
    "How much does it cost?",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-6 w-6" /> AI Chatbot
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your website&apos;s AI chat widget
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Settings */}
        <div className="lg:col-span-3 space-y-6">
          {/* Enable toggle */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-6 rounded-full ${enabled ? "bg-primary" : "bg-muted"} relative cursor-pointer transition-colors`}
                    onClick={() => setEnabled(!enabled)}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 shadow transition-all ${
                      enabled ? "left-5" : "left-0.5"
                    }`} />
                  </div>
                  <div>
                    <span className="text-sm font-medium">Chatbot {enabled ? "Enabled" : "Disabled"}</span>
                    <p className="text-xs text-muted-foreground">Widget will appear on your website</p>
                  </div>
                </div>
                <Badge variant={enabled ? "default" : "secondary"} className="text-[10px]">
                  {enabled ? "Live" : "Off"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Business ID Display */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Hash className="h-4 w-4" /> Your Business ID
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-mono font-medium">{businessId}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Used to identify your business in the embed code
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(businessId);
                      toast("Business ID copied", "success");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy ID
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Simple Embed Code */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Code className="h-4 w-4" /> Simple Embed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Quick and lightweight. Paste this before your closing {"</body>"} tag.
              </p>
              <div className="relative">
                <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                  {simpleEmbed}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(simpleEmbed, "simple")}
                >
                  {copiedSimple ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedSimple ? "Copied!" : "Copy"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Async Embed Code (Recommended) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Code className="h-4 w-4" /> Async Embed <Badge variant="default" className="text-[8px] ml-1">Recommended</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Loads asynchronously for better performance. Includes the business ID pre-configured.
              </p>
              <div className="relative">
                <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {asyncEmbed}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(asyncEmbed, "async")}
                >
                  {copiedAsync ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedAsync ? "Copied!" : "Copy"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Setup Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">1</div>
                <div>
                  <p className="font-medium">Copy the embed code</p>
                  <p className="text-xs text-muted-foreground">
                    Choose either the <strong>Simple</strong> or <strong>Async</strong> embed above. The async version is recommended for better performance.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">2</div>
                <div>
                  <p className="font-medium">Paste in your website</p>
                  <p className="text-xs text-muted-foreground">
                    Add it just before the closing {"</body>"} tag on your website. The business ID is already pre-filled.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">3</div>
                <div>
                  <p className="font-medium">Customize your AI Brain</p>
                  <p className="text-xs text-muted-foreground">
                    Go to <strong>AI Brain</strong> settings to configure your chatbot&apos;s behavior, business info, and knowledge base.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">4</div>
                <div>
                  <p className="font-medium">That&apos;s it!</p>
                  <p className="text-xs text-muted-foreground">
                    The chatbot will appear on your website. Test it below with the live preview.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4" /> Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative bg-muted/30 rounded-lg overflow-hidden" style={{ height: "520px" }}>
                {/* Mock website background */}
                <div className="p-4 space-y-2">
                  <div className="h-3 w-32 bg-muted rounded" />
                  <div className="h-2 w-48 bg-muted rounded mt-2" />
                  <div className="h-20 bg-muted rounded-lg mt-3" />
                  <div className="h-2 w-40 bg-muted rounded mt-2" />
                  <div className="h-2 w-36 bg-muted rounded mt-1" />
                  <div className="h-2 w-44 bg-muted rounded mt-1" />
                </div>

                {/* Chatbot Widget */}
                {enabled && (
                  <div className="absolute bottom-4 right-4 z-10">
                    {!chatOpen ? (
                      <button
                        onClick={() => setChatOpen(true)}
                        className="flex items-center justify-center h-12 w-12 rounded-full bg-primary shadow-lg hover:scale-105 transition-transform"
                      >
                        <MessageSquare className="h-5 w-5 text-primary-foreground" />
                      </button>
                    ) : (
                      <div className="bg-card rounded-2xl shadow-2xl w-72 border border-border overflow-hidden">
                        {/* Header */}
                        <div className="p-3 bg-primary text-primary-foreground flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            <span className="text-sm font-medium">AI Assistant</span>
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
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <Bot className="h-3 w-3 text-primary" />
                                </div>
                              )}
                              <div className={`max-w-[80%] rounded-xl p-2.5 text-xs ${
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}>
                                {msg.content}
                              </div>
                              {msg.role === "user" && (
                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                  <User className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Suggested questions */}
                        <div className="px-3 pb-2 flex flex-wrap gap-1">
                          {suggestedQuestions.map((q) => (
                            <button
                              key={q}
                              onClick={() => {
                                setChatMessages(prev => [...prev,
                                  { role: "user", content: q },
                                  { role: "assistant", content: `Let me help you with that! Based on what you've asked about "${q}", I can assist you right away.` }
                                ]);
                              }}
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
                              id="chatbot-preview-input"
                              placeholder="Type a message..."
                              className="flex-1 h-8 text-xs rounded-lg bg-muted px-3 focus:outline-none"
                              onKeyDown={async (e) => {
                                if (e.key === "Enter" && (e.target as HTMLInputElement).value) {
                                  const val = (e.target as HTMLInputElement).value;
                                  setChatMessages(prev => [...prev, { role: "user", content: val }]);
                                  (e.target as HTMLInputElement).value = "";
                                  try {
                                    const res = await fetch("/api/public/chatbot", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ businessId, message: val }),
                                    });
                                    const data = await res.json();
                                    setChatMessages(prev => [...prev, {
                                      role: "assistant",
                                      content: data.response || "Sorry, something went wrong."
                                    }]);
                                  } catch {
                                    setChatMessages(prev => [...prev, {
                                      role: "assistant",
                                      content: "Sorry, something went wrong."
                                    }]);
                                  }
                                }
                              }}
                            />
                            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                              <ChevronDown className="h-3 w-3 text-primary-foreground rotate-90" />
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