/**
 * Tests for alt-payment handle normalization in PATCH /api/settings/organization
 */

// Normalization mirrors src/app/api/settings/organization/route.ts
function normalizeVenmo(value: string | undefined) {
  return value ? value.trim().replace(/^@/, "") : null;
}
function normalizeCashApp(value: string | undefined) {
  return value ? value.trim().replace(/^\$/, "") : null;
}
function normalizeGeneric(value: string | undefined) {
  return value ? value.trim() : null;
}

describe("alt payment handle normalization", () => {
  describe("venmoHandle", () => {
    it("strips a leading @", () => {
      expect(normalizeVenmo("@janedoe")).toBe("janedoe");
    });

    it("leaves a handle without @ unchanged", () => {
      expect(normalizeVenmo("janedoe")).toBe("janedoe");
    });

    it("trims surrounding whitespace", () => {
      expect(normalizeVenmo("  janedoe  ")).toBe("janedoe");
    });

    it("converts an empty string to null", () => {
      expect(normalizeVenmo("")).toBeNull();
    });
  });

  describe("cashAppHandle", () => {
    it("strips a leading $", () => {
      expect(normalizeCashApp("$janedoe")).toBe("janedoe");
    });

    it("leaves a cashtag without $ unchanged", () => {
      expect(normalizeCashApp("janedoe")).toBe("janedoe");
    });

    it("converts an empty string to null", () => {
      expect(normalizeCashApp("")).toBeNull();
    });
  });

  describe("paypalHandle / squareHandle / zelleHandle", () => {
    it("trims surrounding whitespace", () => {
      expect(normalizeGeneric("  janedoe  ")).toBe("janedoe");
    });

    it("converts an empty string to null", () => {
      expect(normalizeGeneric("")).toBeNull();
    });

    it("leaves a full URL unchanged", () => {
      expect(normalizeGeneric("https://square.link/u/abc123")).toBe("https://square.link/u/abc123");
    });
  });
});
