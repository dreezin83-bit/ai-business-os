/**
 * Comprehensive US carrier forwarding codes for missed-call forwarding.
 *
 * GSM carriers (AT&T, T-Mobile, and MVNOs): **61*1<number>#
 * CDMA carriers (Verizon and MVNOs):      *71<number>
 */

export interface Carrier {
  name: string;
  code: string;
  type: "gsm" | "cdma";
  note?: string;
}

export const CARRIER_FORWARDING_CODES: Carrier[] = [
  // ── GSM carriers ──────────────────────────────────────────
  {
    name: "AT&T",
    code: "**61*1<number>#",
    type: "gsm",
    note: "Dial this code followed by the AI phone number, then press Call",
  },
  { name: "T-Mobile", code: "**61*1<number>#", type: "gsm" },
  { name: "Mint Mobile", code: "**61*1<number>#", type: "gsm" },
  { name: "Metro by T-Mobile", code: "**61*1<number>#", type: "gsm" },
  { name: "Cricket Wireless", code: "**61*1<number>#", type: "gsm" },
  { name: "Google Fi", code: "**61*1<number>#", type: "gsm" },
  { name: "Boost Mobile", code: "**61*1<number>#", type: "gsm" },
  { name: "Consumer Cellular", code: "**61*1<number>#", type: "gsm" },
  {
    name: "Straight Talk",
    code: "**61*1<number>#",
    type: "gsm",
    note: "For AT&T/T-Mobile SIMs. If on a Verizon SIM, use *71 instead.",
  },
  {
    name: "Tracfone",
    code: "**61*1<number>#",
    type: "gsm",
    note: "Depends on underlying network (AT&T/T-Mobile SIMs). Verizon-based SIMs use *71.",
  },
  { name: "H2O Wireless", code: "**61*1<number>#", type: "gsm" },
  { name: "Red Pocket (GSMA/GSMT)", code: "**61*1<number>#", type: "gsm" },
  { name: "Simple Mobile", code: "**61*1<number>#", type: "gsm" },
  { name: "Ultra Mobile", code: "**61*1<number>#", type: "gsm" },
  { name: "Lycamobile", code: "**61*1<number>#", type: "gsm" },
  { name: "FreedomPop (GSM)", code: "**61*1<number>#", type: "gsm" },
  { name: "Tello", code: "**61*1<number>#", type: "gsm" },
  { name: "Hello Mobile", code: "**61*1<number>#", type: "gsm" },
  { name: "Gen Mobile", code: "**61*1<number>#", type: "gsm" },
  { name: "Wing Alpha", code: "**61*1<number>#", type: "gsm" },
  { name: "Twigby (T-Mobile)", code: "**61*1<number>#", type: "gsm" },

  // ── CDMA carriers ─────────────────────────────────────────
  {
    name: "Verizon",
    code: "*71<number>",
    type: "cdma",
    note: "Dial this code followed by the AI phone number, then press Call",
  },
  { name: "US Cellular", code: "*71<number>", type: "cdma" },
  { name: "Visible", code: "*71<number>", type: "cdma" },
  { name: "Spectrum Mobile", code: "*71<number>", type: "cdma" },
  { name: "Xfinity Mobile", code: "*71<number>", type: "cdma" },
  { name: "Total Wireless", code: "*71<number>", type: "cdma" },
  { name: "Page Plus Cellular", code: "*71<number>", type: "cdma" },
  { name: "Red Pocket (CDMA)", code: "*71<number>", type: "cdma" },
  { name: "Tracfone (Verizon)", code: "*71<number>", type: "cdma" },
  { name: "Straight Talk (Verizon)", code: "*71<number>", type: "cdma" },
  { name: "Selectel Wireless", code: "*71<number>", type: "cdma" },
  { name: "Reach Mobile", code: "*71<number>", type: "cdma" },
  { name: "Credo Mobile", code: "*71<number>", type: "cdma" },
  { name: "Twigby (Verizon)", code: "*71<number>", type: "cdma" },
  { name: "Patriot Mobile", code: "*71<number>", type: "cdma" },
];

/**
 * Return all forwarding codes, optionally filtered by network type.
 */
export function getCarriers(type?: "gsm" | "cdma"): Carrier[] {
  if (!type) return CARRIER_FORWARDING_CODES;
  return CARRIER_FORWARDING_CODES.filter((c) => c.type === type);
}

/**
 * Replace `<number>` placeholder in a code with an actual phone number.
 */
export function formatForwardingCode(carrier: Carrier, phoneNumber: string): string {
  return carrier.code.replace("<number>", phoneNumber);
}
