import Stripe from "stripe";
import { db } from "@/lib/db";

/** Marks the invoice referenced by a PaymentIntent's metadata as paid. No-op if metadata.invoiceId is absent. */
export async function markInvoicePaidFromPaymentIntent(pi: Stripe.PaymentIntent) {
  const invoiceId = pi.metadata?.invoiceId;
  if (!invoiceId) return;
  await db.invoice.updateMany({
    where: { id: invoiceId },
    data: {
      status: "PAID",
      paidAt: new Date(),
      stripePaymentIntentId: pi.id,
    },
  });
}
