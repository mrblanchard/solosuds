import {
  formatPhone,
  stripPhone,
  formatZip,
  titleCase,
  normalizeEmail,
  normalizeWhitespace,
  formatCurrency,
  generateSlug,
  getInitials,
  passwordSchema,
  phoneSchema,
  validatePassword,
} from "@/lib/utils";

// ─── formatPhone ─────────────────────────────────────────────────────────────

describe("formatPhone", () => {
  it("formats a 10-digit US number", () => {
    expect(formatPhone("8022580000")).toBe("802-258-0000");
  });

  it("formats partial input (3 digits)", () => {
    expect(formatPhone("802")).toBe("802");
  });

  it("formats partial input (6 digits)", () => {
    expect(formatPhone("802258")).toBe("802-258");
  });

  it("formats international number with leading +", () => {
    expect(formatPhone("+18022580000")).toBe("+1-802-258-0000");
  });

  it("handles already-truncated digits (> 10) as international", () => {
    expect(formatPhone("18022580000")).toBe("+1-802-258-0000");
  });

  it("returns empty string for empty input", () => {
    expect(formatPhone("")).toBe("");
  });
});

// ─── stripPhone ───────────────────────────────────────────────────────────────

describe("stripPhone", () => {
  it("strips formatting from a formatted US number", () => {
    expect(stripPhone("802-258-0000")).toBe("8022580000");
  });

  it("preserves leading + for international numbers", () => {
    expect(stripPhone("+1-802-258-0000")).toBe("+18022580000");
  });

  it("handles already-stripped input", () => {
    expect(stripPhone("8022580000")).toBe("8022580000");
  });
});

// ─── formatZip ────────────────────────────────────────────────────────────────

describe("formatZip", () => {
  it("returns 5-digit zip as-is", () => {
    expect(formatZip("12345")).toBe("12345");
  });

  it("formats zip+4 with hyphen", () => {
    expect(formatZip("123456789")).toBe("12345-6789");
  });

  it("strips non-alphanumeric before formatting", () => {
    expect(formatZip("12345-6789")).toBe("12345-6789");
  });

  it("handles short input", () => {
    expect(formatZip("123")).toBe("123");
  });
});

// ─── titleCase ────────────────────────────────────────────────────────────────

describe("titleCase", () => {
  it("capitalizes first letter of each word", () => {
    expect(titleCase("john doe")).toBe("John Doe");
  });

  it("handles already-capitalized input", () => {
    expect(titleCase("John Doe")).toBe("John Doe");
  });

  it("handles single word", () => {
    expect(titleCase("alice")).toBe("Alice");
  });

  it("handles hyphenated names", () => {
    expect(titleCase("mary-anne")).toBe("Mary-Anne");
  });
});

// ─── normalizeEmail ───────────────────────────────────────────────────────────

describe("normalizeEmail", () => {
  it("lowercases the email", () => {
    expect(normalizeEmail("TEST@EXAMPLE.COM")).toBe("test@example.com");
  });

  it("trims whitespace", () => {
    expect(normalizeEmail("  test@example.com  ")).toBe("test@example.com");
  });

  it("handles mixed case with spaces", () => {
    expect(normalizeEmail("  User@Domain.COM  ")).toBe("user@domain.com");
  });
});

// ─── normalizeWhitespace ─────────────────────────────────────────────────────

describe("normalizeWhitespace", () => {
  it("collapses multiple spaces into one", () => {
    expect(normalizeWhitespace("hello   world")).toBe("hello world");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeWhitespace("  hello  ")).toBe("hello");
  });

  it("collapses tabs and newlines", () => {
    expect(normalizeWhitespace("hello\t\nworld")).toBe("hello world");
  });
});

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe("formatCurrency", () => {
  it("formats cents as USD", () => {
    expect(formatCurrency(1000)).toBe("$10.00");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats large amount", () => {
    expect(formatCurrency(100000)).toBe("$1,000.00");
  });

  it("formats odd cents", () => {
    expect(formatCurrency(199)).toBe("$1.99");
  });
});

// ─── generateSlug ─────────────────────────────────────────────────────────────

describe("generateSlug", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(generateSlug("My Practice")).toBe("my-practice");
  });

  it("strips special characters", () => {
    // apostrophe in "Smith's" becomes a separator, producing "dr-smith-s-clinic"
    expect(generateSlug("Dr. Smith's Clinic!")).toBe("dr-smith-s-clinic");
  });

  it("collapses multiple separators", () => {
    expect(generateSlug("Hello   World")).toBe("hello-world");
  });

  it("strips leading/trailing hyphens", () => {
    expect(generateSlug("--hello--")).toBe("hello");
  });
});

// ─── getInitials ──────────────────────────────────────────────────────────────

describe("getInitials", () => {
  it("returns initials for two-word name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("caps at 2 characters", () => {
    expect(getInitials("John Michael Doe")).toBe("JM");
  });

  it("handles single name", () => {
    expect(getInitials("Alice")).toBe("A");
  });
});

// ─── passwordSchema ───────────────────────────────────────────────────────────

describe("passwordSchema", () => {
  it("accepts a valid strong password", () => {
    expect(passwordSchema.safeParse("Abcdefgh1234!").success).toBe(true);
  });

  it("rejects passwords shorter than 12 characters", () => {
    const result = passwordSchema.safeParse("Ab1!");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/12/);
  });

  it("rejects passwords without uppercase", () => {
    const result = passwordSchema.safeParse("abcdefgh1234!");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/uppercase/i);
  });

  it("rejects passwords without lowercase", () => {
    const result = passwordSchema.safeParse("ABCDEFGH1234!");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/lowercase/i);
  });

  it("rejects passwords without a digit", () => {
    const result = passwordSchema.safeParse("Abcdefghijkl!");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/digit/i);
  });

  it("rejects passwords without a special character", () => {
    const result = passwordSchema.safeParse("Abcdefgh12345");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/special/i);
  });

  it("rejects passwords longer than 128 characters", () => {
    const result = passwordSchema.safeParse("Aa1!" + "a".repeat(125));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/128/);
  });
});

// ─── validatePassword ─────────────────────────────────────────────────────────

describe("validatePassword", () => {
  it("returns null for a valid password", () => {
    expect(validatePassword("Abcdefgh1234!")).toBeNull();
  });

  it("returns an error message for an invalid password", () => {
    expect(validatePassword("short")).not.toBeNull();
    expect(typeof validatePassword("short")).toBe("string");
  });
});

// ─── phoneSchema ─────────────────────────────────────────────────────────────

describe("phoneSchema", () => {
  it("accepts a standard US formatted number", () => {
    expect(phoneSchema.safeParse("802-258-0000").success).toBe(true);
  });

  it("accepts an international number with +", () => {
    expect(phoneSchema.safeParse("+18022580000").success).toBe(true);
  });

  it("accepts an empty string", () => {
    expect(phoneSchema.safeParse("").success).toBe(true);
  });

  it("rejects a number that is too short", () => {
    expect(phoneSchema.safeParse("123").success).toBe(false);
  });

  it("rejects letters in a phone number", () => {
    expect(phoneSchema.safeParse("abc-defg-hijk").success).toBe(false);
  });
});
