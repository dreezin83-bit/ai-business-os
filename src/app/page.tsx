import Link from "next/link";
import { Bot } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">AI Business OS</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl mb-6">
            AI-Powered OS for{" "}
            <span className="text-primary">Service Businesses</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Automate customer communication, lead management, appointment booking,
            and support — all from one intelligent dashboard.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/sign-up"
              className="bg-primary text-primary-foreground px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="#features"
              className="bg-muted text-foreground px-8 py-3 rounded-lg text-lg font-medium hover:bg-muted/80 transition-colors border"
            >
              Learn More
            </Link>
          </div>
        </section>

        <section id="features" className="border-t bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Everything you need to run your business</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: "AI Brain", desc: "Train AI on your business knowledge, policies, and services" },
                { title: "Smart CRM", desc: "Track leads, customers, and interactions in one place" },
                { title: "Auto Booking", desc: "AI-powered appointment scheduling and reminders" },
                { title: "SMS & Email", desc: "Automated follow-ups, campaigns, and notifications" },
                { title: "AI Chatbot", desc: "24/7 website chatbot that answers customer questions" },
                { title: "Analytics", desc: "Real-time reports on leads, conversions, and revenue" },
              ].map((feature) => (
                <div key={feature.title} className="bg-background p-6 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}