/**
 * Unit tests for login form validation logic.
 *
 * Since the LoginForm component is wrapped in Suspense and uses useSearchParams,
 * these tests verify the Zod schema and callback URL safety logic directly,
 * matching exactly what the component uses.
 */

import { z } from "zod";

// Replicate the exact schema from login/page.tsx
const schema = z.object({
  email: z.string().email("Invalid email address").max(254, "Email is too long"),
  password: z.string().min(1, "Password is required"),
});

// Replicate the getSafeCallbackUrl function from login/page.tsx
function getSafeCallbackUrl(raw: string | null): string {
  if (!raw) return "/dashboard";
  try {
    const url = new URL(raw, "http://localhost");
    if (url.origin !== "http://localhost") return "/dashboard";
    return url.pathname + url.search;
  } catch {
    return "/dashboard";
  }
}

describe("Login form schema", () => {
  it("accepts valid email and non-empty password", () => {
    const result = schema.safeParse({ email: "user@example.com", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = schema.safeParse({ email: "not-an-email", password: "secret" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Invalid email address");
  });

  it("rejects email over 254 characters", () => {
    const long = "a".repeat(249) + "@example.com"; // 261 chars
    const result = schema.safeParse({ email: long, password: "secret" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Email is too long");
  });

  it("rejects empty password", () => {
    const result = schema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Password is required");
  });

  it("rejects missing email", () => {
    const result = schema.safeParse({ email: "", password: "secret" });
    expect(result.success).toBe(false);
  });
});

describe("getSafeCallbackUrl", () => {
  it("returns /dashboard when raw is null", () => {
    expect(getSafeCallbackUrl(null)).toBe("/dashboard");
  });

  it("returns the relative path when safe", () => {
    expect(getSafeCallbackUrl("/dashboard/clients")).toBe("/dashboard/clients");
  });

  it("preserves query string in relative paths", () => {
    expect(getSafeCallbackUrl("/dashboard?tab=notes")).toBe("/dashboard?tab=notes");
  });

  it("blocks absolute URLs with external origin", () => {
    expect(getSafeCallbackUrl("https://evil.com/steal")).toBe("/dashboard");
  });

  it("blocks protocol-relative URLs", () => {
    expect(getSafeCallbackUrl("//evil.com/steal")).toBe("/dashboard");
  });

  it("blocks javascript: URIs", () => {
    // javascript: causes URL parse to fail or produce unsafe origin
    const result = getSafeCallbackUrl("javascript:alert(1)");
    expect(result).toBe("/dashboard");
  });
});
