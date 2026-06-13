/**
 * Tests for markInvoicePaidFromPaymentIntent — shared payment_intent.succeeded handler
 */

import type Stripe from "stripe";

const updateMany = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    invoice: {
      updateMany: (...args: unknown[]) => updateMany(...args),
    },
  },
}));

import { markInvoicePaidFromPaymentIntent } from "@/lib/invoices";

function makePaymentIntent(overrides: Partial<Stripe.PaymentIntent> = {}): Stripe.PaymentIntent {
  return { id: "pi_123", metadata: {}, ...overrides } as unknown as Stripe.PaymentIntent;
}

describe("markInvoicePaidFromPaymentIntent", () => {
  beforeEach(() => {
    updateMany.mockReset();
  });

  it("marks the invoice paid when metadata.invoiceId is present", async () => {
    const pi = makePaymentIntent({ id: "pi_123", metadata: { invoiceId: "inv_1" } });

    await markInvoicePaidFromPaymentIntent(pi);

    expect(updateMany).toHaveBeenCalledTimes(1);
    const [args] = updateMany.mock.calls[0];
    expect(args.where).toEqual({ id: "inv_1" });
    expect(args.data.status).toBe("PAID");
    expect(args.data.stripePaymentIntentId).toBe("pi_123");
    expect(args.data.paidAt).toBeInstanceOf(Date);
  });

  it("does nothing when metadata.invoiceId is missing", async () => {
    const pi = makePaymentIntent({ metadata: {} });

    await markInvoicePaidFromPaymentIntent(pi);

    expect(updateMany).not.toHaveBeenCalled();
  });

  it("does nothing when metadata is undefined", async () => {
    const pi = { id: "pi_456" } as unknown as Stripe.PaymentIntent;

    await markInvoicePaidFromPaymentIntent(pi);

    expect(updateMany).not.toHaveBeenCalled();
  });
});
