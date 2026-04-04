/**
 * Validation tests for POST /api/invoices — Zod schema and business logic
 */

import { z } from "zod";

// Schema mirrors src/app/api/invoices/route.ts
const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().int().positive(), // cents
  cptCode: z.string().optional(),
});

const invoiceSchema = z.object({
  clientId: z.string(),
  appointmentId: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  tax: z.number().int().default(0),
});

// Business logic mirrors the route
function calculateInvoice(lineItems: z.infer<typeof lineItemSchema>[], tax: number) {
  const enriched = lineItems.map((item) => ({ ...item, total: item.quantity * item.unitPrice }));
  const subtotal = enriched.reduce((sum, item) => sum + item.total, 0);
  return { subtotal, tax, total: subtotal + tax, lineItems: enriched };
}

function generateInvoiceNumber(existingCount: number) {
  return String(existingCount + 1).padStart(5, "0");
}

const validInvoice = {
  clientId: "client-1",
  lineItems: [{ description: "Therapy session", quantity: 1, unitPrice: 15000 }],
  tax: 0,
};

// ── Schema tests ──────────────────────────────────────────────────────────────

describe("Invoice schema validation", () => {
  it("accepts a valid invoice payload", () => {
    expect(invoiceSchema.safeParse(validInvoice).success).toBe(true);
  });

  it("rejects missing clientId", () => {
    const { clientId: _, ...body } = validInvoice;
    expect(invoiceSchema.safeParse(body).success).toBe(false);
  });

  it("rejects empty lineItems array", () => {
    expect(invoiceSchema.safeParse({ ...validInvoice, lineItems: [] }).success).toBe(false);
  });

  it("rejects missing lineItems", () => {
    const { lineItems: _, ...body } = validInvoice;
    expect(invoiceSchema.safeParse(body).success).toBe(false);
  });

  it("rejects line item with zero quantity", () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      lineItems: [{ description: "Session", quantity: 0, unitPrice: 10000 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects line item with zero unitPrice", () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      lineItems: [{ description: "Session", quantity: 1, unitPrice: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      lineItems: [{ description: "Session", quantity: -1, unitPrice: 10000 }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional appointmentId", () => {
    expect(invoiceSchema.safeParse({ ...validInvoice, appointmentId: "appt-1" }).success).toBe(true);
  });

  it("accepts optional dueDate", () => {
    expect(invoiceSchema.safeParse({ ...validInvoice, dueDate: "2026-05-01" }).success).toBe(true);
  });

  it("accepts multiple line items", () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      lineItems: [
        { description: "Session 1", quantity: 1, unitPrice: 10000 },
        { description: "Session 2", quantity: 1, unitPrice: 5000 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts line item with optional cptCode", () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      lineItems: [{ description: "Session", quantity: 1, unitPrice: 15000, cptCode: "90837" }],
    });
    expect(result.success).toBe(true);
  });

  it("defaults tax to 0 when not provided", () => {
    const result = invoiceSchema.safeParse({ clientId: "c-1", lineItems: validInvoice.lineItems });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tax).toBe(0);
  });
});

// ── Business logic tests ──────────────────────────────────────────────────────

describe("Invoice calculation", () => {
  it("calculates correct subtotal for single item", () => {
    const { subtotal } = calculateInvoice([{ description: "Session", quantity: 1, unitPrice: 15000 }], 0);
    expect(subtotal).toBe(15000);
  });

  it("calculates correct subtotal for multiple quantities", () => {
    const { subtotal } = calculateInvoice([{ description: "Session", quantity: 3, unitPrice: 10000 }], 0);
    expect(subtotal).toBe(30000);
  });

  it("adds tax to subtotal for total", () => {
    const { total } = calculateInvoice([{ description: "Session", quantity: 1, unitPrice: 20000 }], 500);
    expect(total).toBe(20500);
  });

  it("sums multiple line items", () => {
    const { subtotal, total } = calculateInvoice(
      [
        { description: "Session 1", quantity: 1, unitPrice: 10000 },
        { description: "Session 2", quantity: 2, unitPrice: 5000 },
      ],
      0
    );
    expect(subtotal).toBe(20000);
    expect(total).toBe(20000);
  });

  it("calculates per-item total on each enriched item", () => {
    const { lineItems } = calculateInvoice([{ description: "Session", quantity: 3, unitPrice: 10000 }], 0);
    expect(lineItems[0].total).toBe(30000);
  });

  it("handles zero tax", () => {
    const { subtotal, total } = calculateInvoice([{ description: "S", quantity: 1, unitPrice: 10000 }], 0);
    expect(total).toBe(subtotal);
  });
});

describe("Invoice number generation", () => {
  it("generates 00001 for the first invoice", () => {
    expect(generateInvoiceNumber(0)).toBe("00001");
  });

  it("pads to 5 digits", () => {
    expect(generateInvoiceNumber(4)).toBe("00005");
  });

  it("does not pad beyond 5 digits for large counts", () => {
    expect(generateInvoiceNumber(99999)).toBe("100000");
  });

  it("generates sequential numbers", () => {
    expect(generateInvoiceNumber(10)).toBe("00011");
    expect(generateInvoiceNumber(100)).toBe("00101");
  });
});
