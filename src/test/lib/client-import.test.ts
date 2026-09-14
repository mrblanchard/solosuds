/**
 * Tests for the client CSV import parsers — date normalization, name splitting,
 * header auto-detection, and phone tolerance.
 */

import {
  autoDetectMapping,
  identityKey,
  isPlausiblePhone,
  parseDate,
  parseLine,
  splitFullName,
  stripBom,
} from "@/lib/client-import";

describe("parseDate", () => {
  it("accepts ISO dates", () => {
    expect(parseDate("1980-03-15")).toBe("1980-03-15");
  });

  it("accepts US month-first dates, which is what Acuity and Square export", () => {
    expect(parseDate("03/15/1980")).toBe("1980-03-15");
    expect(parseDate("3/5/1980")).toBe("1980-03-05");
    expect(parseDate("03-15-1980")).toBe("1980-03-15");
  });

  it("treats a first number above 12 as a day", () => {
    expect(parseDate("15/03/1980")).toBe("1980-03-15");
    expect(parseDate("15.03.1980")).toBe("1980-03-15");
  });

  it("expands two-digit years away from the future", () => {
    expect(parseDate("03/15/80")).toBe("1980-03-15");
    expect(parseDate("03/15/05")).toBe("2005-03-15");
  });

  it("accepts written month names in either order", () => {
    expect(parseDate("March 15, 1980")).toBe("1980-03-15");
    expect(parseDate("Mar 15 1980")).toBe("1980-03-15");
    expect(parseDate("15 March 1980")).toBe("1980-03-15");
    expect(parseDate("15th Mar 1980")).toBe("1980-03-15");
  });

  it("rejects impossible calendar days", () => {
    expect(parseDate("02/30/1980")).toBeNull();
    expect(parseDate("13/13/1980")).toBeNull();
  });

  it("rejects out-of-range and unparseable values", () => {
    expect(parseDate("1880-01-01")).toBeNull();
    expect(parseDate("3000-01-01")).toBeNull();
    expect(parseDate("not a date")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("splitFullName", () => {
  it("splits a simple two-part name", () => {
    expect(splitFullName("John Smith")).toEqual({ firstName: "John", lastName: "Smith" });
  });

  it("handles the comma-reversed form", () => {
    expect(splitFullName("Smith, John")).toEqual({ firstName: "John", lastName: "Smith" });
  });

  it("keeps everything after the first token as the last name", () => {
    expect(splitFullName("Mary Jo Van Der Berg")).toEqual({
      firstName: "Mary",
      lastName: "Jo Van Der Berg",
    });
  });

  it("allows a single-word name without inventing a last name", () => {
    expect(splitFullName("Cher")).toEqual({ firstName: "Cher", lastName: "" });
  });

  it("collapses stray whitespace", () => {
    expect(splitFullName("  John   Smith  ")).toEqual({
      firstName: "John",
      lastName: "Smith",
    });
  });
});

describe("autoDetectMapping", () => {
  it("maps common header spellings", () => {
    expect(autoDetectMapping(["First Name", "Last Name", "Email"])).toEqual({
      "First Name": "firstName",
      "Last Name": "lastName",
      Email: "email",
    });
  });

  it("prefers a mobile number over home and work when all three are present", () => {
    const mapping = autoDetectMapping(["Home Phone", "Work Phone", "Mobile Phone"]);
    expect(mapping).toEqual({ "Mobile Phone": "phone" });
  });

  it("keeps the higher-priority column regardless of column order", () => {
    const mapping = autoDetectMapping(["Mobile Phone", "Home Phone"]);
    expect(mapping).toEqual({ "Mobile Phone": "phone" });
  });

  it("recognizes a single name column", () => {
    expect(autoDetectMapping(["Client Name"])).toEqual({ "Client Name": "fullName" });
  });

  it("ignores unknown headers", () => {
    expect(autoDetectMapping(["Client ID", "Loyalty Points"])).toEqual({});
  });
});

describe("isPlausiblePhone", () => {
  it("accepts the formats real exports actually contain", () => {
    expect(isPlausiblePhone("555-123-4567")).toBe(true);
    expect(isPlausiblePhone("555.123.4567")).toBe(true);
    expect(isPlausiblePhone("(555) 123-4567")).toBe(true);
    expect(isPlausiblePhone("+1 555 123 4567")).toBe(true);
    expect(isPlausiblePhone("555-123-4567 ext 12")).toBe(true);
  });

  it("rejects values without enough digits", () => {
    expect(isPlausiblePhone("n/a")).toBe(false);
    expect(isPlausiblePhone("12345")).toBe(false);
  });
});

describe("identityKey", () => {
  it("matches the same person across phone formatting differences", () => {
    expect(identityKey("John", "Smith", "(555) 123-4567")).toBe(
      identityKey("john", "smith", "555.123.4567")
    );
  });

  it("separates different people", () => {
    expect(identityKey("John", "Smith", "5551234567")).not.toBe(
      identityKey("Jane", "Smith", "5551234567")
    );
  });
});

describe("parseLine", () => {
  it("splits plain comma-separated values", () => {
    expect(parseLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("respects quoted commas", () => {
    expect(parseLine('"Smith, John",jsmith@example.com')).toEqual([
      "Smith, John",
      "jsmith@example.com",
    ]);
  });

  it("unescapes doubled quotes", () => {
    expect(parseLine('"She said ""hi""",x')).toEqual(['She said "hi"', "x"]);
  });
});

describe("stripBom", () => {
  it("removes the BOM Excel writes so the first header still matches", () => {
    expect(stripBom("﻿First Name,Last Name")).toBe("First Name,Last Name");
  });

  it("leaves ordinary text alone", () => {
    expect(stripBom("First Name")).toBe("First Name");
  });
});

describe("realistic vendor exports", () => {
  /** Mirrors how the import route maps one row, so these headers stay covered. */
  function mapRow(headers: string[], values: string[]) {
    const mapping = autoDetectMapping(headers);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      const field = mapping[h];
      if (field && values[i]) row[field] = values[i];
    });
    if (row.fullName) {
      const split = splitFullName(row.fullName);
      row.firstName ||= split.firstName;
      row.lastName ||= split.lastName;
      delete row.fullName;
    }
    if (row.dateOfBirth) {
      row.dateOfBirth = parseDate(row.dateOfBirth) ?? "";
    }
    return row;
  }

  it("handles a Mindbody-shaped export", () => {
    const headers = [
      "Client ID", "First Name", "Last Name", "Email", "Mobile Phone", "Home Phone",
      "Address Line 1", "City", "State", "Postal Code", "Birth Date", "Gender",
      "Referred By", "Notes",
    ];
    const values = [
      "MB-8812", "Dana", "Whitfield", "dana@example.com", "(802) 555-0147",
      "802.555.0100", "14 Elm St", "Burlington", "VT", "05401", "07/22/1978",
      "Female", "Yelp", "Prefers deep tissue",
    ];

    expect(mapRow(headers, values)).toEqual({
      firstName: "Dana",
      lastName: "Whitfield",
      email: "dana@example.com",
      phone: "(802) 555-0147",
      address: "14 Elm St",
      city: "Burlington",
      state: "VT",
      zip: "05401",
      dateOfBirth: "1978-07-22",
      gender: "Female",
      referralSource: "Yelp",
      internalNotes: "Prefers deep tissue",
    });
  });

  it("handles a Square-shaped export with a US birthday", () => {
    const headers = [
      "First Name", "Last Name", "Email Address", "Phone Number",
      "Street Address 1", "City", "State", "Postal Code", "Birthday", "Memo",
    ];
    const values = [
      "Marcus", "Bell", "marcus@example.com", "555.123.4567",
      "9 Oak Ave", "Montpelier", "VT", "05602", "12/03/1991", "New client",
    ];

    const row = mapRow(headers, values);
    expect(row.dateOfBirth).toBe("1991-12-03");
    expect(row.phone).toBe("555.123.4567");
    expect(row.internalNotes).toBe("New client");
  });

  it("splits a Wix-shaped export that only has one name column", () => {
    const row = mapRow(
      ["Name", "Email", "Phone"],
      ["Priya Raghunathan", "priya@example.com", "+1 555 987 6543"]
    );
    expect(row.firstName).toBe("Priya");
    expect(row.lastName).toBe("Raghunathan");
  });
});
