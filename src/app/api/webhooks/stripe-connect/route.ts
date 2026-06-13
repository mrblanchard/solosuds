import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { markInvoicePaidFromPaymentIntent } from "@/lib/invoices";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      await db.organization.updateMany({
        where: { stripeConnectAccountId: account.id },
        data: {
          stripeConnectChargesEnabled: account.charges_enabled ?? false,
          stripeConnectDetailsSubmitted: account.details_submitted ?? false,
          stripeConnectPayoutsEnabled: account.payouts_enabled ?? false,
        },
      });
      break;
    }

    case "payment_intent.succeeded": {
      await markInvoicePaidFromPaymentIntent(event.data.object as Stripe.PaymentIntent);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
