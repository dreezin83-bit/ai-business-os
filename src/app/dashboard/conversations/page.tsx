"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessagesSquare, Search, Filter, Download, Phone, Mail,
  MessageSquare, Bot, User, ChevronRight, Clock, MoreHorizontal,
  Smartphone, Globe,
} from "lucide-react";

const conversations = [
  { id: 1, customer: "John Smith", channel: "Web Chat", status: "active", messages: 12, lastMsg: "Can you help with my AC?", time: "2 min ago", unread: 3, assigned: "AI" },
  { id: 2, customer: "Sarah Johnson", channel: "SMS", status: "active", messages: 8, lastMsg: "Is the appointment still for 2pm?", time: "15 min ago", unread: 1, assigned: "AI" },
  { id: 3, customer: "Mike Davis", channel: "Email", status: "resolved", messages: 6, lastMsg: "Thanks for the quick response!", time: "1 hour ago", unread: 0, assigned: "Staff" },
  { id: 4, customer: "Lisa Brown", channel: "Web Chat", status: "active", messages: 5, lastMsg: "I need a quote for roofing", time: "3 hours ago", unread: 0, assigned: "AI" },
  { id: 5, customer: "Robert Taylor", channel: "Phone", status: "archived", messages: 3, lastMsg: "Left voicemail", time: "1 day ago", unread: 0, assigned: "Staff" },
];

const channels = ["All", "Web Chat", "SMS", "Email", "Phone"];
const statuses = ["All", "Active", "Resolved", "Archived"];

const detailMessages = [
  { role: "user", content: "Hi! I need help with my AC unit. It stopped working.", time: "2:30 PM" },
  { role: "assistant", content: "I'm sorry to hear that! Let me help you with your AC issue. Can you tell me when it stopped working and if you've noticed any strange noises?", time: "2:30 PM", agent: "AI" },
  { role: "user", content: "It stopped about an hour ago. No strange noises, just stopped blowing cold air.", time: "2:31 PM" },
  { role: "assistant", content: "Thank you for the details. Based on what you've described, it could be a refrigerant issue or a compressor problem. I'd recommend scheduling a service visit. Our technician can be there within 2-4 hours. Would you like me to book that?", time: "2:31 PM", agent: "AI" },
  { role: "user", content: "Yes please! Can you do tomorrow morning?", time: "2:32 PM" },
];

export default function ConversationsPage() {
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedConv, setSelectedConv] = useState<number | null>(null);

  const filtered = conversations.filter(c =>
    c.customer.toLowerCase().includes(search.toLowerCase()) &&
    (channelFilter === "All" || c.channel === channelFilter) &&
    (statusFilter === "All" || c.status === statusFilter)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <MessagesSquare className="h-8 w-8 text-primary" />
            Conversations
          </h1>
          <p className="text-muted-foreground">View and manage all customer conversations</p>
        </div>
        <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conversation List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search conversations..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex gap-1">
            {channels.map(ch => (
              <button key={ch} onClick={() => setChannelFilter(ch)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${channelFilter === ch ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{ch}</button>
            ))}
          </div>
          <div className="flex gap-1">
            {statuses.map(st => (
              <button key={st} onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${statusFilter === st ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{st}</button>
            ))}
          </div>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {filtered.map((conv) => (
              <button key={conv.id} onClick={() => setSelectedConv(conv.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedConv === conv.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-medium">{conv.customer}</span>
                  <div className="flex items-center gap-1">
                    {conv.unread > 0 && <span className="h-2 w-2 rounded-full bg-primary" />}
                    <span className="text-[10px] text-muted-foreground">{conv.time}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground truncate">{conv.lastMsg}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="secondary" className="text-[8px] px-1 py-0">
                    {conv.channel === "Web Chat" ? <Globe className="h-2.5 w-2.5 mr-0.5 inline" /> :
                     conv.channel === "SMS" ? <Smartphone className="h-2.5 w-2.5 mr-0.5 inline" /> :
                     conv.channel === "Email" ? <Mail className="h-2.5 w-2.5 mr-0.5 inline" /> :
                     <Phone className="h-2.5 w-2.5 mr-0.5 inline" />}
                    {conv.channel}
                  </Badge>
                  <Badge variant={conv.status === "active" ? "success" : conv.status === "resolved" ? "secondary" : "outline"} className="text-[8px] px-1 py-0">{conv.status}</Badge>
                  <Badge variant={conv.assigned === "AI" ? "default" : "secondary"} className="text-[8px] px-1 py-0">{conv.assigned}</Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Detail */}
        <div className="lg:col-span-2">
          {selectedConv ? (
            <Card>
              <CardHeader className="border-b border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {conversations.find(c => c.id === selectedConv)?.customer.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-medium">{conversations.find(c => c.id === selectedConv)?.customer}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{conversations.find(c => c.id === selectedConv)?.channel}</span>
                        <span>•</span>
                        <span>{conversations.find(c => c.id === selectedConv)?.messages} messages</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm"><Phone className="h-3.5 w-3.5" /></Button>
                    <Button variant="outline" size="sm"><Mail className="h-3.5 w-3.5" /></Button>
                    <Button variant="outline" size="sm"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* AI Summary */}
                <div className="p-4 bg-primary/5 border-b border-border">
                  <div className="flex items-start gap-2">
                    <Bot className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-primary mb-0.5">AI Summary</p>
                      <p className="text-xs text-muted-foreground">Customer is experiencing AC issues. AI has gathered details and is recommending a service visit. Lead qualification score: 85/100. Suggested action: schedule appointment.</p>
                    </div>
                  </div>
                </div>
                {/* Messages */}
                <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                  {detailMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                      {msg.role === "assistant" && (
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                      <div className={`max-w-[75%] rounded-xl p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-[10px] mt-1 opacity-60">{msg.time}</p>
                      </div>
                      {msg.role === "user" && (
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Input */}
                <div className="border-t border-border p-4">
                  <div className="flex gap-2">
                    <input type="text" placeholder="Type a reply..." className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    <Button>Send</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <MessagesSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Select a conversation</p>
                <p className="text-sm mt-1">Choose a conversation from the list to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}