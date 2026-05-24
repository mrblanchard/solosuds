/**
 * Validation tests for POST /api/clients — Zod schema
 */

import { z } from "zod";

// Schema mirrors src/app/api/clients/route.ts
const optionalPhone = z
  .string()
  .regex(/^[+]?[\d\s()-]{7,20}$/, "Invalid phone number")
  .or(z.literal(""))
  .optional();

const clientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(254).optional().or(z.literal("")),
  phone: optionalPhone,
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
  gender: z.string().max(50).optional(),
  pronouns: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().regex(/^[A-Za-z0-9\s-]{3,10}$/).or(z.literal("")).optional(),
  country: z.string().max(100).optional(),
  emergencyName: z.string().max(200).optional(),
  emergencyPhone: optionalPhone,
  referralSource: z.string().max(200).optional(),
  internalNotes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

const validClient = {
  firstName: "Jax",
  lastName: "Blanchard",
  email: "jax@example.com",
  phone: "802-258-0000",
};

describe("Client schema validation", () => {
  it("accepts a minimal valid client", () => {
    expect(clientSchema.safeParse(validClient).success).toBe(true);
  });

  it("rejects missing firstName", () => {
    const { firstName: _, ...body } = validClient;
    expect(clientSchema.safeParse(body).success).toBe(false);
  });

  it("rejects missing lastName", () => {
    const { lastName: _, ...body } = validClient;
    expect(clientSchema.safeParse(body).success).toBe(false);
  });

  it("rejects firstName exceeding 100 characters", () => {
    expect(clientSchema.safeParse({ ...validClient, firstName: "a".repeat(101) }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(clientSchema.safeParse({ ...validClient, email: "not-an-email" }).success).toBe(false);
  });

  it("accepts empty string email", () => {
    expect(clientSchema.safeParse({ ...validClient, email: "" }).success).toBe(true);
  });

  it("accepts omitted email", () => {
    const { email: _, ...body } = validClient;
    expect(clientSchema.safeParse(body).success).toBe(true);
  });

  it("rejects an invalid phone number (too short)", () => {
    expect(clientSchema.safeParse({ ...validClient, phone: "123" }).success).toBe(false);
  });

  it("accepts empty string phone", () => {
    expect(clientSchema.safeParse({ ...validClient, phone: "" }).success).toBe(true);
  });

  it("accepts international phone number", () => {
    expect(clientSchema.safeParse({ ...validClient, phone: "+18022580000" }).success).toBe(true);
  });

  it("accepts valid dateOfBirth in YYYY-MM-DD format", () => {
    expect(clientSchema.safeParse({ ...validClient, dateOfBirth: "1990-01-15" }).success).toBe(true);
  });

  it("rejects dateOfBirth in MM/DD/YYYY format", () => {
    expect(clientSchema.safeParse({ ...validClient, dateOfBirth: "01/15/1990" }).success).toBe(false);
  });

  it("accepts empty string dateOfBirth", () => {
    expect(clientSchema.safeParse({ ...validClient, dateOfBirth: "" }).success).toBe(true);
  });

  it("rejects gender exceeding 50 characters", () => {
    expect(clientSchema.safeParse({ ...validClient, gender: "a".repeat(51) }).success).toBe(false);
  });

  it("rejects internalNotes exceeding 5000 characters", () => {
    expect(clientSchema.safeParse({ ...validClient, internalNotes: "a".repeat(5001) }).success).toBe(false);
  });

  it("accepts up to 20 tags", () => {
    expect(clientSchema.safeParse({ ...validClient, tags: Array(20).fill("tag") }).success).toBe(true);
  });

  it("rejects more than 20 tags", () => {
    expect(clientSchema.safeParse({ ...validClient, tags: Array(21).fill("tag") }).success).toBe(false);
  });

  it("rejects a tag exceeding 50 characters", () => {
    expect(clientSchema.safeParse({ ...validClient, tags: ["a".repeat(51)] }).success).toBe(false);
  });

  it("accepts valid US zip code", () => {
    expect(clientSchema.safeParse({ ...validClient, zip: "05401" }).success).toBe(true);
  });

  it("accepts ZIP+4 format", () => {
    expect(clientSchema.safeParse({ ...validClient, zip: "05401-1234" }).success).toBe(true);
  });

  it("accepts empty string zip", () => {
    expect(clientSchema.safeParse({ ...validClient, zip: "" }).success).toBe(true);
  });

  it("accepts fully populated client", () => {
    const full = {
      ...validClient,
      dateOfBirth: "1985-06-15",
      gender: "Non-binary",
      pronouns: "they/them",
      address: "123 Main St",
      city: "Burlington",
      state: "VT",
      zip: "05401",
      country: "USA",
      emergencyName: "Pat Blanchard",
      emergencyPhone: "802-999-0000",
      referralSource: "Friend",
      internalNotes: "Prefers afternoon appointments",
      tags: ["new client", "insurance"],
    };
    expect(clientSchema.safeParse(full).success).toBe(true);
  });
});
