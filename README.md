# AI Business OS

A **white-label, multi-tenant SaaS platform** for service businesses to automate customer communication, lead management, appointment booking, and support — all from one dashboard.

## Features

- **Multi-Tenant Architecture** — Isolated workspaces per business
- **AI Brain** — Trainable AI with personality, creativity, escalation rules
- **Knowledge Base** — Document management with categories
- **Website Chatbot** — Customizable 24/7 AI chatbot
- **CRM Pipeline** — Kanban with 7 stages, lead scoring, automation
- **Appointment Booking** — Calendar, staff scheduling, reminders
- **SMS Automation** — Campaigns, templates, conversations
- **Email Automation** — Campaigns, templates, analytics
- **Customer Profiles** — AI summaries, activity timeline
- **Reporting** — Charts, filters, AI insights, export
- **Super Admin Panel** — Manage businesses, audit logs, subscriptions
- **Dark/Light Mode** — Full theme support
- **RBAC** — Super Admin, Client Owner, Staff roles

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | PostgreSQL (Neon serverless) |
| ORM | Drizzle ORM |
| Auth | Clerk (multi-tenant, RBAC) |
| File Storage | Uploadthing |
| Charts | Recharts |
| Icons | Lucide React |

## Quick Start

```bash
cp .env.example .env.local
npm install
npx drizzle-kit push
npm run dev
```

Edit `.env.local` with your keys from Clerk, Neon, and Uploadthing.

## Deploy to Vercel

1. Push to GitHub, import in Vercel
2. Add all env vars from `.env.example`
3. Set Framework = Next.js
4. Add Vercel domain to Clerk's allowed origins

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npx drizzle-kit push` | Push schema to DB |
