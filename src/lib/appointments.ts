/**
 * Appointment domain helpers — pure functions for validating and
 * sanitizing appointment edits/cancels/reschedules. Kept DB-free so
 * they can be unit-tested without a database connection.
 */
import { timeToMinutes } from "@/lib/utils";

/** Allowed appointment statuses. Anything else is rejected server-side. */
export const APPOINTMENT_STATUSES = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** Edit fields allowed on an appointment (customer info + service). */
export const APPOINTMENT_EDIT_FIELDS = [
  "customerName",
  "customerPhone",
  "customerEmail",
  "service",
] as const;

export function isAppointmentStatus(value: string): value is AppointmentStatus {
  return (APPOINTMENT_STATUSES as readonly string[]).includes(value);
}

/** Basic YYYY-MM-DD shape check (exact calendar validity is left to the client). */
export function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isValidTimeString(value: string): boolean {
  return timeToMinutes(value) >= 0;
}

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

/**
 * True if the given (date, startTime, endTime) overlaps any of the
 * supplied slots. Unparseable times are skipped (fail-open for parsing,
 * consistent with the existing booking route). Callers pass the slots
 * WITHOUT the appointment being edited (self-exclusion happens upstream).
 */
export function detectTimeConflict(
  slots: TimeSlot[],
  date: string,
  startTime: string,
  endTime: string,
): boolean {
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  if (startMins < 0 || endMins < 0) return false;

  return slots.some((slot) => {
    if (slot.date !== date) return false;
    if (slot.status === "cancelled" || slot.status === "no_show") return false;
    const slotStart = timeToMinutes(slot.startTime);
    const slotEnd = timeToMinutes(slot.endTime);
    if (slotStart < 0 || slotEnd < 0) return false;
    return startMins < slotEnd && endMins > slotStart;
  });
}

export interface AppointmentPatchResult {
  updates: Record<string, unknown>;
  errors: string[];
  /** True when a reschedule (date/time change) is requested. */
  rescheduling: boolean;
  /** True when the appointment is being cancelled. */
  cancelling: boolean;
}

/**
 * Sanitize + validate a PATCH body for an appointment.
 * Supported operations (can be combined):
 *  - edit:       customerName, customerPhone, customerEmail, service
 *  - reschedule: date + startTime (+ optional endTime)
 *  - status:     scheduled | confirmed | completed | cancelled | no_show
 *  - notes:      free text
 *  - cancel:     status=cancelled + optional cancelReason
 */
export function sanitizeAppointmentPatch(body: Record<string, unknown>): AppointmentPatchResult {
  const updates: Record<string, unknown> = {};
  const errors: string[] = [];

  // ── Edit fields ──
  for (const field of APPOINTMENT_EDIT_FIELDS) {
    if (body[field] !== undefined) {
      const value = String(body[field] ?? "").trim();
      if (field === "customerName" && !value) {
        errors.push("customerName cannot be empty");
        continue;
      }
      if (field === "service" && !value) {
        errors.push("service cannot be empty");
        continue;
      }
      updates[field] = value;
    }
  }

  // ── Notes ──
  if (body.notes !== undefined) {
    updates.notes = String(body.notes ?? "");
  }

  // ── Reschedule (date + times must move together) ──
  const hasDate = body.date !== undefined;
  const hasStartTime = body.startTime !== undefined;
  const hasEndTime = body.endTime !== undefined;
  const anyRescheduleField = hasDate || hasStartTime || hasEndTime;

  if (anyRescheduleField) {
    if (!hasDate || !hasStartTime) {
      errors.push("Rescheduling requires both date and startTime (endTime optional)");
    } else {
      const date = String(body.date).trim();
      const startTime = String(body.startTime).trim();
      const endTimeRaw = body.endTime !== undefined ? String(body.endTime).trim() : "";

      if (!isValidDateString(date)) {
        errors.push("date must be in YYYY-MM-DD format");
      }
      if (!isValidTimeString(startTime)) {
        errors.push("startTime is not a valid time");
      }
      if (endTimeRaw && !isValidTimeString(endTimeRaw)) {
        errors.push("endTime is not a valid time");
      }
      if (endTimeRaw) {
        const sMins = timeToMinutes(startTime);
        const eMins = timeToMinutes(endTimeRaw);
        if (sMins >= 0 && eMins >= 0 && eMins <= sMins) {
          errors.push("endTime must be after startTime");
        }
      }

      if (errors.length === 0) {
        updates.date = date;
        updates.startTime = startTime;
        if (endTimeRaw) updates.endTime = endTimeRaw;
      }
    }
  }

  // ── Status / cancel ──
  if (body.status !== undefined) {
    const status = String(body.status).trim();
    if (!isAppointmentStatus(status)) {
      errors.push(`status must be one of: ${APPOINTMENT_STATUSES.join(", ")}`);
    } else {
      updates.status = status;
    }
  }

  // ── Cancel reason (only meaningful when cancelling) ──
  if (body.cancelReason !== undefined) {
    const reason = String(body.cancelReason ?? "");
    if (reason.length > 1000) {
      errors.push("cancelReason is too long (max 1000 chars)");
    } else {
      updates.cancelReason = reason;
    }
  }

  return {
    updates,
    errors,
    rescheduling: hasDate || hasStartTime || hasEndTime,
    cancelling: updates.status === "cancelled",
  };
}
