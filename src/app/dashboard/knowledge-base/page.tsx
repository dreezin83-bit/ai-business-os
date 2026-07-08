"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, FileText, Search, Upload, Plus, MoreHorizontal,
  FolderOpen, Trash2, Download, Archive, RefreshCw, Filter,
  File, FileSpreadsheet, FileImage,
} from "lucide-react";

const categories = [
  { name: "Company Info", count: 8, color: "bg-blue-500" },
  { name: "Services & Pricing", count: 12, color: "bg-green-500" },
  { name: "Policies", count: 6, color: "bg-purple-500" },
  { name: "FAQs", count: 15, color: "bg-orange-500" },
  { name: "Processes", count: 9, color: "bg-cyan-500" },
  { name: "Uncategorized", count: 3, color: "bg-gray-500" },
];

const documents = [
  { name: "Service Catalog 2026.pdf", type: "PDF", size: "2.4 MB", category: "Services & Pricing", status: "active", updated: "2 days ago" },
  { name: "Company Policy Handbook.docx", type: "DOCX", size: "1.8 MB", category: "Policies", status: "active", updated: "5 days ago" },
  { name: "FAQ - Common Questions.txt", type: "TXT", size: "156 KB", category: "FAQs", status: "active", updated: "1 week ago" },
  { name: "Pricing Sheet 2026.csv", type: "CSV", size: "89 KB", category: "Services & Pricing", status: "active", updated: "1 week ago" },
  { name: "About Us - Company Info.txt", type: "TXT", size: "45 KB", category: "Company Info", status: "active", updated: "2 weeks ago" },
  { name: "Service Area Coverage.pdf", type: "PDF", size: "3.1 MB", category: "Company Info", status: "archived", updated: "1 month ago" },
  { name: "Employee Roster.xlsx", type: "XLSX", size: "425 KB", category: "Processes", status: "active", updated: "3 weeks ago" },
];

const insights = {
  total: 53,
  referenced: 42,
  unused: 11,
  healthScore: 79,
};

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const filteredDocs = documents.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (selectedCategory === "All" || d.category === selectedCategory)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            Knowledge Base
          </h1>
          <p className="text-muted-foreground">Manage documents, FAQs, and content your AI uses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><RefreshCw className="h-3.5 w-3.5 mr-1" /> Sync AI</Button>
          <Button size="sm"><Upload className="h-3.5 w-3.5 mr-1" /> Upload</Button>
        </div>
      </div>

      {/* Insights Bar */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{insights.total}</p>
            <p className="text-xs text-muted-foreground">Total Documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{insights.referenced}</p>
            <p className="text-xs text-muted-foreground">Actively Referenced</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{insights.unused}</p>
            <p className="text-xs text-muted-foreground">Unused Documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <p className="text-2xl font-bold">{insights.healthScore}%</p>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${insights.healthScore > 75 ? "bg-green-500" : insights.healthScore > 50 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${insights.healthScore}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Knowledge Health Score</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Categories Sidebar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Categories</h3>
            <Button variant="ghost" size="sm"><Plus className="h-3.5 w-3.5" /></Button>
          </div>
          <button
            onClick={() => setSelectedCategory("All")}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedCategory === "All" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
            }`}
          >
            All Documents
          </button>
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                selectedCategory === cat.name ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                <span>{cat.name}</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">{cat.count}</Badge>
            </button>
          ))}
        </div>

        {/* Document List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button variant="outline" size="sm"><Filter className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm"><Upload className="h-4 w-4" /></Button>
          </div>

          {/* Document List */}
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {filteredDocs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group">
                    <div className="rounded-lg bg-muted p-2.5">
                      {doc.type === "PDF" ? <FileText className="h-5 w-5 text-red-500" /> :
                       doc.type === "DOCX" ? <FileText className="h-5 w-5 text-blue-500" /> :
                       doc.type === "TXT" ? <FileText className="h-5 w-5 text-gray-500" /> :
                       <FileSpreadsheet className="h-5 w-5 text-green-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{doc.type}</span>
                        <span>{doc.size}</span>
                        <span>{doc.category}</span>
                        <span>Updated {doc.updated}</span>
                      </div>
                    </div>
                    <Badge variant={doc.status === "active" ? "success" : "warning"} className="text-[10px]">
                      {doc.status}
                    </Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm"><Download className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm"><Archive className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}