import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/** Creates a Stripe Checkout Session on the org's connected account for a publicly-shared invoice. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const ip = getClientIp(req);
  if (!checkRateLimit(`pay-checkout:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const invoice = await db.invoice.findUnique({
    where: { publicToken: token },
    include: {
      organization: { select: { stripeConnectAccountId: true, stripeConnectChargesEnabled: true } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "PAID" || invoice.status === "VOID" || invoice.status === "DRAFT") {
    return NextResponse.json({ error: "This invoice cannot be paid online" }, { status: 400 });
  }

  if (!invoice.organization.stripeConnectChargesEnabled || !invoice.organization.stripeConnectAccountId) {
    return NextResponse.json({ error: "Online card payments aren't available for this invoice" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

  try {
    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: `Invoice #${invoice.number}` },
              unit_amount: invoice.total,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: { metadata: { invoiceId: invoice.id } },
        success_url: `${baseUrl}/pay/${token}?paid=1`,
        cancel_url: `${baseUrl}/pay/${token}`,
      },
      { stripeAccount: invoice.organization.stripeConnectAccountId }
    );

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    console.error("[pay/checkout-session]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
