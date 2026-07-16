import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Users, Calendar, MessageSquare, Phone, BookOpen } from "lucide-react";

const features = [
  {
    name: "AI Chatbot",
    description: "Answer customer questions 24/7, capture leads, and book appointments automatically.",
    icon: Bot,
  },
  {
    name: "CRM & Lead Management",
    description: "Every lead automatically enters your pipeline. Track from new to won.",
    icon: Users,
  },
  {
    name: "Appointment Booking",
    description: "Let customers book online. Syncs with Google Calendar. No double bookings.",
    icon: Calendar,
  },
  {
    name: "AI Brain",
    description: "Configure your AI with business info, services, FAQs, and pricing. No coding required.",
    icon: MessageSquare,
  },
  {
    name: "Missed Call Automation",
    description: "Miss a call? Auto-SMS the customer, create a lead, and offer to book.",
    icon: Phone,
  },
  {
    name: "Knowledge Base",
    description: "Upload PDFs, DOCX, or website URLs. Your AI answers using your documents.",
    icon: BookOpen,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
              AI
            </div>
            <span className="font-semibold">AI Business OS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            AI-Powered OS for Your{" "}
            <span className="text-blue-500">Service Business</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Automate customer communication, capture every lead, book appointments,
            and never miss a follow-up — all from one dashboard.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Everything your business needs
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.name}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          AI Business OS &mdash; Run your service business with AI.
        </div>
      </footer>
    </div>
  );
}