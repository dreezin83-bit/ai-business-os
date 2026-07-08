"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bot, Brain, BookOpen, MessageSquare, Sliders, Gavel,
  Star, Sparkles, Save, RotateCcw, FileText, Variable,
  ChevronDown, Check, X, Plus, Search,
} from "lucide-react";

// ── Tabs ──
const tabs = [
  { key: "prompt", label: "System Prompt", icon: FileText },
  { key: "personality", label: "Personality", icon: Sparkles },
  { key: "creativity", label: "Creativity", icon: Sliders },
  { key: "escalation", label: "Escalation", icon: Gavel },
  { key: "qualification", label: "Lead Qualification", icon: Star },
];

const personalities = [
  { id: "professional", label: "Professional", desc: "Polished, business-appropriate tone", icon: "💼" },
  { id: "friendly", label: "Friendly", desc: "Warm and approachable", icon: "😊" },
  { id: "luxury", label: "Luxury", desc: "Premium, high-end experience", icon: "✨" },
  { id: "casual", label: "Casual", desc: "Relaxed, conversational", icon: "🎯" },
  { id: "corporate", label: "Corporate", desc: "Formal, structured responses", icon: "🏢" },
  { id: "custom", label: "Custom", desc: "Define your own style", icon: "✏️" },
];

const variableTags = [
  { token: "{{Business Name}}", desc: "Your business name" },
  { token: "{{Business Hours}}", desc: "Operating hours" },
  { token: "{{Services}}", desc: "List of your services" },
  { token: "{{Phone}}", desc: "Business phone number" },
  { token: "{{Email}}", desc: "Business email" },
  { token: "{{Address}}", desc: "Business address" },
];

const conversationStyles = [
  { id: "short", label: "Short", desc: "Brief, to-the-point responses" },
  { id: "balanced", label: "Balanced", desc: "Moderate detail, natural flow" },
  { id: "detailed", label: "Detailed", desc: "Comprehensive, thorough responses" },
];

export default function AiBrainPage() {
  const [activeTab, setActiveTab] = useState("prompt");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are {{Business Name}}'s AI assistant. You help customers with inquiries about {{Services}}, scheduling appointments, and answering questions. Our hours are {{Business Hours}}. For urgent matters, please call {{Phone}} or email {{Email}}."
  );
  const [selectedPersonality, setSelectedPersonality] = useState("professional");
  const [conversationStyle, setConversationStyle] = useState("balanced");
  const [creativity, setCreativity] = useState(50);
  const [escalationRules, setEscalationRules] = useState([
    "When customer expresses anger or frustration",
    "When asked about pricing (must verify)",
    "When request is outside business scope",
    "When customer asks to speak to a human",
  ]);
  const [newEscalationRule, setNewEscalationRule] = useState("");

  const [qualificationEnabled, setQualificationEnabled] = useState(true);
  const [qualificationQuestions, setQualificationQuestions] = useState([
    { question: "What service are you looking for?", required: true },
    { question: "What's your preferred appointment time?", required: true },
    { question: "Where is the service location?", required: false },
    { question: "How did you hear about us?", required: false },
  ]);

  // ── Tab Content ──
  const renderTab = () => {
    switch (activeTab) {
      case "prompt":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-1">System Prompt</h3>
              <p className="text-sm text-muted-foreground">Define how your AI behaves and what it knows about your business</p>
            </div>

            {/* Variable Tags */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Variable className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Available Variables</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {variableTags.map((v) => (
                  <button
                    key={v.token}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                    onClick={() => setSystemPrompt((prev) => prev + ` ${v.token}`)}
                  >
                    <Variable className="h-3 w-3" />
                    {v.token}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Prompt Editor</span>
                <span className="text-xs text-muted-foreground">{systemPrompt.length} characters</span>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full h-48 rounded-xl border border-input bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono"
                placeholder="Enter your system prompt..."
              />
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset Default
                  </Button>
                </div>
                <Button size="sm">
                  <Save className="h-3.5 w-3.5 mr-1" /> Save Prompt
                </Button>
              </div>
            </div>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <p className="font-medium mb-2">AI will respond as:</p>
                  <p className="text-muted-foreground leading-relaxed">
                    {systemPrompt
                      .replace("{{Business Name}}", "Premier Plumbing Co.")
                      .replace("{{Business Hours}}", "Mon-Fri 8AM-6PM, Sat 9AM-3PM")
                      .replace("{{Services}}", "plumbing, drain cleaning, water heater repair")
                      .replace("{{Phone}}", "(555) 123-4567")
                      .replace("{{Email}}", "info@premierplumbing.com")
                      .replace("{{Address}}", "123 Main St, City, State")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "personality":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-1">AI Personality</h3>
              <p className="text-sm text-muted-foreground">Choose how your AI sounds to customers</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {personalities.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersonality(p.id)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    selectedPersonality === p.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-2xl mb-2">{p.icon}</div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{p.label}</span>
                    {selectedPersonality === p.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                </button>
              ))}
            </div>

            <div>
              <h4 className="font-medium text-sm mb-3">Conversation Style</h4>
              <div className="flex gap-2">
                {conversationStyles.map((cs) => (
                  <button
                    key={cs.id}
                    onClick={() => setConversationStyle(cs.id)}
                    className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                      conversationStyle === cs.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className="text-sm font-medium">{cs.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{cs.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case "creativity":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-1">Creativity</h3>
              <p className="text-sm text-muted-foreground">Control how strictly or creatively the AI follows instructions</p>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm font-medium">Very Precise</span>
                  <span className="text-sm font-medium">{creativity}%</span>
                  <span className="text-sm font-medium">Very Creative</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={creativity}
                  onChange={(e) => setCreativity(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                />
                <div className="grid grid-cols-5 mt-4 gap-2">
                  {[
                    { val: 0, label: "Precise" },
                    { val: 25, label: "Conservative" },
                    { val: 50, label: "Balanced" },
                    { val: 75, label: "Creative" },
                    { val: 100, label: "Experimental" },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      onClick={() => setCreativity(preset.val)}
                      className={`text-xs py-1.5 rounded-md transition-colors ${
                        creativity === preset.val
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    At {Math.max(0, creativity - 20)}%
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {creativity < 30
                      ? "Strictly follows instructions. Uses exact wording from knowledge base."
                      : creativity < 60
                      ? "Balanced approach. Adapts responses but stays on-brand."
                      : "Highly adaptive. May rephrase and restructure responses creatively."}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    At {Math.min(100, creativity + 20)}%
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {creativity < 30
                      ? "Minimal variation in responses. Predictable and safe."
                      : creativity < 60
                      ? "Some variation. Adds relevant examples and analogies."
                      : "High variation. May suggest innovative solutions and ideas."}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "escalation":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-1">Escalation Rules</h3>
              <p className="text-sm text-muted-foreground">Define when AI should stop and notify human staff</p>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {escalationRules.map((rule, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group">
                      <Gavel className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm flex-1">{rule}</span>
                      <button
                        onClick={() => setEscalationRules(prev => prev.filter((_, idx) => idx !== i))}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="text"
                    value={newEscalationRule}
                    onChange={(e) => setNewEscalationRule(e.target.value)}
                    placeholder="Add escalation rule..."
                    className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newEscalationRule.trim()) {
                        setEscalationRules(prev => [...prev, newEscalationRule.trim()]);
                        setNewEscalationRule("");
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newEscalationRule.trim()) {
                        setEscalationRules(prev => [...prev, newEscalationRule.trim()]);
                        setNewEscalationRule("");
                      }
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded accent-primary" />
                    <span className="text-sm">Email staff when escalation triggered</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded accent-primary" />
                    <span className="text-sm">SMS notification for urgent escalations</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded accent-primary" />
                    <span className="text-sm">Create ticket in CRM automatically</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "qualification":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-1">Lead Qualification</h3>
              <p className="text-sm text-muted-foreground">Set questions AI asks to qualify leads and score priority</p>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl border">
              <div className={`w-12 h-6 rounded-full ${qualificationEnabled ? "bg-primary" : "bg-muted"} relative cursor-pointer`}
                onClick={() => setQualificationEnabled(!qualificationEnabled)}>
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 shadow transition-all ${
                  qualificationEnabled ? "left-6" : "left-0.5"
                }`} />
              </div>
              <div>
                <span className="text-sm font-medium">Lead Qualification {qualificationEnabled ? "Enabled" : "Disabled"}</span>
                <p className="text-xs text-muted-foreground">AI will ask qualifying questions during conversations</p>
              </div>
            </div>

            {qualificationEnabled && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Qualification Questions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {qualificationQuestions.map((q, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group">
                        <Star className={`h-4 w-4 shrink-0 ${q.required ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-sm flex-1">{q.question}</span>
                        <Badge variant={q.required ? "default" : "secondary"} className="text-[10px]">
                          {q.required ? "Required" : "Optional"}
                        </Badge>
                        <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Priority Scoring</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Service type match</span>
                        <span className="text-sm font-medium">+30 pts</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: "30%" }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Urgency level</span>
                        <span className="text-sm font-medium">+25 pts</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: "25%" }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Budget indication</span>
                        <span className="text-sm font-medium">+20 pts</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: "20%" }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Location proximity</span>
                        <span className="text-sm font-medium">+15 pts</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: "15%" }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Referral source</span>
                        <span className="text-sm font-medium">+10 pts</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: "10%" }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            AI Brain
          </h1>
          <p className="text-muted-foreground">Configure your business&apos;s artificial intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
          </Button>
          <Button size="sm">
            <Save className="h-3.5 w-3.5 mr-1" /> Save Changes
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {renderTab()}
      </div>
    </div>
  );
}