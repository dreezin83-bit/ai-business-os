import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: "bg-blue-500",
    contacted: "bg-yellow-500",
    appointment_booked: "bg-purple-500",
    quote_sent: "bg-orange-500",
    won: "bg-green-500",
    lost: "bg-red-500",
    scheduled: "bg-blue-500",
    confirmed: "bg-green-500",
    completed: "bg-green-500",
    cancelled: "bg-red-500",
    active: "bg-green-500",
    resolved: "bg-blue-500",
    escalated: "bg-red-500",
  };
  return colors[status] || "bg-gray-500";
}

export function getStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Convert 12-hour or 24-hour time string to minutes since midnight.
 *  Handles: "9:00 AM", "2:30 PM", "10:00", "14:00". Returns -1 if unparseable. */
export function timeToMinutes(time: string): number {
  const t = time.trim().toUpperCase();
  // 24-hour format: "14:00"
  const match24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) return parseInt(match24[1]) * 60 + parseInt(match24[2]);

  // 12-hour format: "9:00 AM", "2:30 PM"
  const match12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    let hour = parseInt(match12[1]);
    const min = parseInt(match12[2]);
    if (match12[3] === "PM" && hour !== 12) hour += 12;
    if (match12[3] === "AM" && hour === 12) hour = 0;
    return hour * 60 + min;
  }

  return -1;
}

/** Add 1 hour to a time string, preserving 12-hour format */
export function computeDefaultEndTime(startTime: string): string {
  const mins = timeToMinutes(startTime);
  if (mins < 0) return "";
  const endMins = mins + 60;
  const h = Math.floor(endMins / 60) % 24;
  const m = endMins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayHour}:${String(m).padStart(2, "0")} ${ampm}`;
}