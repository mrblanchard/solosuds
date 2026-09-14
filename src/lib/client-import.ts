// Shared parsing helpers for the client CSV importer. Both the upload UI
// (src/components/clients/csv-import.tsx) and the import route
// (src/app/api/clients/import/route.ts) pull from here so auto-detection and
// preview always agree with what the server actually accepts.

export const SCHEMA_FIELDS = [
  { value: "", label: "(Skip)" },
  { value: "fullName", label: "Full Name (split automatically)" },
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "dateOfBirth", label: "Date of Birth" },
  { value: "gender", label: "Gender" },
  { value: "pronouns", label: "Pronouns" },
  { value: "address", label: "Address" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "zip", label: "Zip Code" },
  { value: "country", label: "Country" },
  { value: "emergencyName", label: "Emergency Contact Name" },
  { value: "emergencyPhone", label: "Emergency Phone" },
  { value: "referralSource", label: "Referral Source" },
  { value: "internalNotes", label: "Internal Notes" },
];

// Header aliases seen in exports from Acuity, Square, Mindbody, MassageBook,
// Vagaro, Jane, Wix, and Fullslate. Keys are lowercased and trimmed.
export const HEADER_MAP: Record<string, string> = {
  // Name, split automatically when first and last are not separate columns
  name: "fullName",
  "full name": "fullName",
  fullname: "fullName",
  "client name": "fullName",
  "customer name": "fullName",
  "display name": "fullName",
  client: "fullName",

  "first name": "firstName",
  first_name: "firstName",
  firstname: "firstName",
  first: "firstName",
  "given name": "firstName",
  "last name": "lastName",
  last_name: "lastName",
  lastname: "lastName",
  last: "lastName",
  surname: "lastName",
  "family name": "lastName",

  email: "email",
  "email address": "email",
  email_address: "email",
  "e-mail": "email",
  "client email": "email",

  phone: "phone",
  "phone number": "phone",
  phone_number: "phone",
  telephone: "phone",
  "primary phone": "phone",
  "mobile phone": "phone",
  mobile: "phone",
  "cell phone": "phone",
  cell: "phone",
  "home phone": "phone",
  "work phone": "phone",

  "date of birth": "dateOfBirth",
  date_of_birth: "dateOfBirth",
  dob: "dateOfBirth",
  birthday: "dateOfBirth",
  "birth date": "dateOfBirth",
  birthdate: "dateOfBirth",
  birth_date: "dateOfBirth",

  gender: "gender",
  sex: "gender",
  pronouns: "pronouns",

  address: "address",
  "street address": "address",
  "street address 1": "address",
  "address line 1": "address",
  "address 1": "address",
  address_1: "address",
  street: "address",
  street1: "address",

  city: "city",
  state: "state",
  province: "state",
  "state/province": "state",
  region: "state",

  zip: "zip",
  "zip code": "zip",
  zipcode: "zip",
  postal: "zip",
  "postal code": "zip",
  postcode: "zip",
  "zip/postal code": "zip",

  country: "country",

  "emergency contact": "emergencyName",
  "emergency name": "emergencyName",
  emergency_name: "emergencyName",
  "emergency contact name": "emergencyName",
  "emergency phone": "emergencyPhone",
  emergency_phone: "emergencyPhone",
  "emergency contact phone": "emergencyPhone",

  referral: "referralSource",
  "referral source": "referralSource",
  referral_source: "referralSource",
  "referred by": "referralSource",
  source: "referralSource",
  "how did you hear about us": "referralSource",

  notes: "internalNotes",
  note: "internalNotes",
  "internal notes": "internalNotes",
  internal_notes: "internalNotes",
  "client notes": "internalNotes",
  memo: "internalNotes",
  comments: "internalNotes",
};

// When several columns claim the same field (Mindbody exports home, work, and
// mobile phone), the highest priority wins auto-detection. Default is 2.
const HEADER_PRIORITY: Record<string, number> = {
  "mobile phone": 3,
  mobile: 3,
  "cell phone": 3,
  cell: 3,
  "home phone": 1,
  "work phone": 1,
  client: 1,
  source: 1,
};

/** Auto-map CSV headers to schema fields, preferring higher-priority aliases. */
export function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const claimed: Record<string, { header: string; priority: number }> = {};

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    const field = HEADER_MAP[normalized];
    if (!field) continue;

    const priority = HEADER_PRIORITY[normalized] ?? 2;
    const existing = claimed[field];
    if (existing && existing.priority >= priority) continue;

    if (existing) delete mapping[existing.header];
    mapping[header] = field;
    claimed[field] = { header, priority };
  }

  return mapping;
}

/** Split one CSV line, honoring quoted fields and doubled escape quotes. */
export function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

/** Strip a UTF-8 BOM, which Excel prepends to any CSV it saves. */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};

function expandYear(year: number): number {
  if (year >= 1000) return year;
  // Two-digit years are birth dates, so anything past this year is last century.
  const currentTwoDigit = new Date().getUTCFullYear() % 100;
  return year <= currentTwoDigit ? 2000 + year : 1900 + year;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Normalize a date of birth to YYYY-MM-DD, or null when unparseable.
 *
 * Accepts ISO (1980-03-15), US slash and dash (3/15/1980, 03-15-80), dotted
 * (15.03.1980), and written months (March 15, 1980 or 15 Mar 1980). Ambiguous
 * numeric dates default to US month-first unless the first number exceeds 12.
 */
export function parseDate(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  let y: number | undefined;
  let m: number | undefined;
  let d: number | undefined;

  // ISO-ish, year first
  let match = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) {
    y = Number(match[1]);
    m = Number(match[2]);
    d = Number(match[3]);
  }

  // Numeric, year last
  if (y === undefined) {
    match = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (match) {
      const a = Number(match[1]);
      const b = Number(match[2]);
      y = expandYear(Number(match[3]));
      if (a > 12 && b <= 12) {
        d = a;
        m = b;
      } else {
        m = a;
        d = b;
      }
    }
  }

  // Written month first: March 15, 1980
  if (y === undefined) {
    match = raw.match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{2,4})$/);
    if (match) {
      m = MONTHS[match[1].toLowerCase()];
      d = Number(match[2]);
      y = expandYear(Number(match[3]));
    }
  }

  // Written month second: 15 March 1980
  if (y === undefined) {
    match = raw.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\.?,?\s+(\d{2,4})$/);
    if (match) {
      d = Number(match[1]);
      m = MONTHS[match[2].toLowerCase()];
      y = expandYear(Number(match[3]));
    }
  }

  if (y === undefined || m === undefined || d === undefined) return null;
  if (!Number.isFinite(m) || m < 1 || m > 12) return null;
  if (!Number.isFinite(d) || d < 1 || d > 31) return null;

  // Round-trip to reject impossible days like Feb 30
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }

  const thisYear = new Date().getUTCFullYear();
  if (y < 1900 || y > thisYear) return null;

  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * Split a single name column into first and last.
 * Handles "John Smith", "Smith, John", and single-word names.
 */
export function splitFullName(input: string): { firstName: string; lastName: string } {
  const raw = input.trim().replace(/\s+/g, " ");
  if (!raw) return { firstName: "", lastName: "" };

  if (raw.includes(",")) {
    const [last, first] = raw.split(",", 2).map((s) => s.trim());
    if (first) return { firstName: first, lastName: last };
    return { firstName: last, lastName: "" };
  }

  const parts = raw.split(" ");
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/**
 * Accept any phone shape that carries a plausible number of digits. Real
 * exports contain periods, extensions, and country codes, so the digit count
 * is the only thing worth validating.
 */
export function isPlausiblePhone(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 20;
}

/** Digits-only form, used to match phone numbers across formatting differences. */
export function phoneKey(input: string): string {
  return input.replace(/\D/g, "");
}

/** Stable identity key for duplicate detection when no email is present. */
export function identityKey(firstName: string, lastName: string, phone?: string): string {
  const name = `${firstName}|${lastName}`.toLowerCase().trim();
  const digits = phone ? phoneKey(phone) : "";
  return `${name}|${digits}`;
}

export const IMPORT_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  maxRows: 5000,
};
