"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen, Loader2, Plus, Trash2, Globe, FileText, Upload,
  Link as LinkIcon,
} from "lucide-react";
import { useToast } from "@/components/toaster";
import { formatDate, generateId } from "@/lib/utils";

interface Document {
  id: string;
  title: string;
  type: string;
  content: string;
  fileUrl: string;
  createdAt: string;
}

export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const [fetching, setFetching] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/knowledge")
      .then((r) => r.ok ? r.json() : Promise.reject("Failed to load"))
      .then((data) => { setDocs(data); setLoading(false); })
      .catch(() => { setError("Failed to load documents"); setLoading(false); });
  }, []);

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    setFetching(true);
    try {
      // Fetch the webpage content for the AI to use
      let content = url;
      try {
        const pageRes = await fetch(`/api/knowledge/fetch-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (pageRes.ok) {
          const pageData = await pageRes.json();
          content = pageData.content || url;
        }
      } catch {
        // Fall back to storing URL as-is
      }

      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: new URL(url).hostname + " - " + url.split("/").pop() || url, type: "url", content }),
      });
      if (!res.ok) throw new Error("Failed");
      const doc = await res.json();
      setDocs((prev) => [doc, ...prev]);
      setUrl("");
      toast("URL added to knowledge base", "success");
    } catch {
      toast("Failed to add URL", "error");
    } finally {
      setFetching(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFetching(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const content = reader.result as string;
        const res = await fetch("/api/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: file.name,
            type: file.name.endsWith(".pdf") ? "pdf" : file.name.endsWith(".docx") ? "docx" : "txt",
            content: content.substring(0, 10000),
          }),
        });
        if (!res.ok) throw new Error("Failed");
        const doc = await res.json();
        setDocs((prev) => [doc, ...prev]);
        toast("File uploaded", "success");
        setFetching(false);
      };
      reader.readAsText(file);
    } catch {
      toast("Failed to upload file", "error");
      setFetching(false);
    }
    e.target.value = "";
  };

  const handleAddContent = async () => {
    if (!pasteContent.trim()) return;
    setFetching(true);
    try {
      const title = pasteContent.split("\n")[0].slice(0, 60) || "Untitled";
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: generateId(), title, type: "txt", content: pasteContent }),
      });
      if (!res.ok) throw new Error("Failed");
      const doc = await res.json();
      setDocs((prev) => [doc, ...prev]);
      setPasteContent("");
      toast("Content added to knowledge base", "success");
    } catch {
      toast("Failed to add content", "error");
    } finally {
      setFetching(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    setDeleting(doc.id);
    try {
      const res = await fetch(`/api/knowledge?id=${doc.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      toast("Document deleted", "success");
    } catch {
      toast("Failed to delete", "error");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6" /> Knowledge Base
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Store documents, FAQs, and resources for your AI assistant
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload area */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Add Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* URL Fetch */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Website URL</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/page"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" variant="outline" onClick={handleFetchUrl} disabled={fetching || !url.trim()}>
                  {fetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {/* Paste Content */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Paste Content</label>
              <Textarea
                placeholder="Paste text, FAQs, or documentation..."
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                rows={6}
              />
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-2"
                onClick={handleAddContent}
                disabled={fetching || !pasteContent.trim()}
              >
                {fetching ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                Add to Knowledge Base
              </Button>
            </div>

            {/* File Upload */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Upload File</label>
              <label className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer block">
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">PDF, TXT, or CSV</p>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.csv,.md"
                  onChange={handleFileUpload}
                  disabled={fetching}
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Document list */}
        <div className="lg:col-span-2 space-y-3">
          {docs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <BookOpen className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm font-medium">No documents yet</p>
                <p className="text-xs mt-1">Add a URL, paste content, or upload a file</p>
              </CardContent>
            </Card>
          ) : (
            docs.map((doc) => (
              <Card key={doc.id} className="hover:bg-accent/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {doc.type === "url" ? (
                          <LinkIcon className="h-4 w-4 text-blue-500" />
                        ) : doc.type === "pdf" ? (
                          <FileText className="h-4 w-4 text-red-500" />
                        ) : (
                          <FileText className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">{doc.type.toUpperCase()}</Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</span>
                        </div>
                        {doc.content && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{doc.content}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(doc)}
                      disabled={deleting === doc.id}
                    >
                      {deleting === doc.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}