/**
 * Tests for appointment edit/cancel/reschedule validation helpers.
 * Run: bun test src/lib/__tests__/appointments.test.ts
 */
import { describe, test, expect } from "bun:test";
import {
  sanitizeAppointmentPatch,
  detectTimeConflict,
  isAppointmentStatus,
  APPOINTMENT_STATUSES,
} from "@/lib/appointments";

const slots = [
  { id: "a1", date: "2026-08-10", startTime: "9:00 AM", endTime: "10:00 AM", status: "scheduled" },
  { id: "a2", date: "2026-08-10", startTime: "11:00 AM", endTime: "12:00 PM", status: "scheduled" },
  { id: "a3", date: "2026-08-10", startTime: "9:00 AM", endTime: "10:00 AM", status: "cancelled" },
];

describe("sanitizeAppointmentPatch", () => {
  test("accepts a valid reschedule (date + startTime)", () => {
    const r = sanitizeAppointmentPatch({ date: "2026-08-12", startTime: "2:00 PM" });
    expect(r.errors).toEqual([]);
    expect(r.updates.date).toBe("2026-08-12");
    expect(r.updates.startTime).toBe("2:00 PM");
    expect(r.rescheduling).toBe(true);
  });

  test("rejects reschedule missing startTime", () => {
    const r = sanitizeAppointmentPatch({ date: "2026-08-12" });
    expect(r.errors.length).toBeGreaterThan(0);
  });

  test("rejects bad date and bad time", () => {
    const r = sanitizeAppointmentPatch({ date: "08/12/2026", startTime: "not-a-time" });
    expect(r.errors.length).toBe(2);
  });

  test("rejects endTime before startTime", () => {
    const r = sanitizeAppointmentPatch({ date: "2026-08-12", startTime: "3:00 PM", endTime: "2:00 PM" });
    expect(r.errors.join()).toContain("endTime must be after startTime");
  });

  test("rejects unknown status", () => {
    const r = sanitizeAppointmentPatch({ status: "archived" });
    expect(r.errors.join()).toContain("status must be one of");
  });

  test("accepts cancel with reason", () => {
    const r = sanitizeAppointmentPatch({ status: "cancelled", cancelReason: "customer changed mind" });
    expect(r.errors).toEqual([]);
    expect(r.updates.status).toBe("cancelled");
    expect(r.updates.cancelReason).toBe("customer changed mind");
    expect(r.cancelling).toBe(true);
  });

  test("edits customer fields + notes", () => {
    const r = sanitizeAppointmentPatch({ customerName: "Jane Doe", notes: "bring invoice" });
    expect(r.errors).toEqual([]);
    expect(r.updates.customerName).toBe("Jane Doe");
    expect(r.updates.notes).toBe("bring invoice");
  });

  test("rejects empty customerName", () => {
    const r = sanitizeAppointmentPatch({ customerName: "  " });
    expect(r.errors.join()).toContain("customerName cannot be empty");
  });
});

describe("detectTimeConflict", () => {
  test("detects overlap", () => {
    expect(detectTimeConflict(slots, "2026-08-10", "9:30 AM", "10:30 AM")).toBe(true);
  });
  test("allows adjacent times", () => {
    expect(detectTimeConflict(slots, "2026-08-10", "10:00 AM", "11:00 AM")).toBe(false);
  });
  test("ignores cancelled slots", () => {
    expect(detectTimeConflict([slots[2]], "2026-08-10", "9:30 AM", "10:30 AM")).toBe(false);
  });
  test("no conflict on a different day", () => {
    expect(detectTimeConflict(slots, "2026-08-11", "9:00 AM", "10:00 AM")).toBe(false);
  });
});

describe("isAppointmentStatus", () => {
  test("valid statuses pass", () => {
    for (const s of APPOINTMENT_STATUSES) expect(isAppointmentStatus(s)).toBe(true);
  });
  test("invalid status fails", () => {
    expect(isAppointmentStatus("nope")).toBe(false);
  });
});
