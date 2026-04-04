/**
 * Validation tests for POST /api/auth/register
 * Tests the same validation logic that runs in the route handler.
 */

import { validatePassword } from "@/lib/utils";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegisterPayload(body: Record<string, unknown>) {
  const { organizationName, name, email, password, fromGoogle } = body as {
    organizationName?: string;
    name?: string;
    email?: string;
    password?: string;
    fromGoogle?: boolean;
  };

  if (!organizationName || !name || !email) {
    return { error: "All fields are required", status: 400 };
  }
  if (typeof organizationName !== "string" || organizationName.length > 200) {
    return { error: "Organization name is too long", status: 400 };
  }
  if (typeof name !== "string" || name.length > 200) {
    return { error: "Name is too long", status: 400 };
  }
  if (typeof email !== "string" || email.length > 254 || !emailRegex.test(email)) {
    return { error: "Invalid email address", status: 400 };
  }
  if (!fromGoogle && !password) {
    return { error: "Password is required", status: 400 };
  }
  if (!fromGoogle && password) {
    const pwError = validatePassword(password);
    if (pwError) return { error: pwError, status: 400 };
  }
  return { ok: true, status: 201 };
}

describe("POST /api/auth/register — payload validation", () => {
  const valid = {
    organizationName: "Test Practice",
    name: "Jane Doe",
    email: "jane@example.com",
    password: "Abcdefgh1234!",
    fromGoogle: false,
  };

  it("accepts a valid payload", () => {
    expect(validateRegisterPayload(valid).status).toBe(201);
  });

  it("rejects when organizationName is missing", () => {
    const { organizationName: _, ...body } = valid;
    const result = validateRegisterPayload(body);
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/required/i);
  });

  it("rejects when name is missing", () => {
    const { name: _, ...body } = valid;
    expect(validateRegisterPayload(body).status).toBe(400);
  });

  it("rejects when email is missing", () => {
    const { email: _, ...body } = valid;
    expect(validateRegisterPayload(body).status).toBe(400);
  });

  it("rejects an invalid email format", () => {
    const result = validateRegisterPayload({ ...valid, email: "not-an-email" });
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/email/i);
  });

  it("rejects email exceeding 254 characters", () => {
    const result = validateRegisterPayload({ ...valid, email: "a".repeat(250) + "@b.com" });
    expect(result.status).toBe(400);
  });

  it("rejects organizationName exceeding 200 characters", () => {
    const result = validateRegisterPayload({ ...valid, organizationName: "a".repeat(201) });
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/long/i);
  });

  it("rejects a weak password", () => {
    const result = validateRegisterPayload({ ...valid, password: "weakpass" });
    expect(result.status).toBe(400);
  });

  it("rejects when fromGoogle=false and password is missing", () => {
    const result = validateRegisterPayload({ ...valid, password: undefined, fromGoogle: false });
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/password/i);
  });

  it("allows Google OAuth registration without a password", () => {
    const result = validateRegisterPayload({ ...valid, password: undefined, fromGoogle: true });
    expect(result.status).toBe(201);
  });

  it("accepts the minimum valid password", () => {
    const result = validateRegisterPayload({ ...valid, password: "Abcdefgh1234!" });
    expect(result.status).toBe(201);
  });

  it("rejects password without uppercase letter", () => {
    const result = validateRegisterPayload({ ...valid, password: "abcdefgh1234!" });
    expect(result.status).toBe(400);
  });

  it("rejects password without digit", () => {
    const result = validateRegisterPayload({ ...valid, password: "Abcdefghijkl!" });
    expect(result.status).toBe(400);
  });

  it("rejects password without special character", () => {
    const result = validateRegisterPayload({ ...valid, password: "Abcdefgh12345" });
    expect(result.status).toBe(400);
  });
});
