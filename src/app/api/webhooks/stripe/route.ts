import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
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
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const invoiceId = pi.metadata?.invoiceId;
      if (invoiceId) {
        await db.invoice.updateMany({
          where: { id: invoiceId },
          data: {
            status: "PAID",
            paidAt: new Date(),
            stripePaymentIntentId: pi.id,
          },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await db.organization.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { subscriptionStatus: sub.status },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await db.organization.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { subscriptionStatus: "canceled" },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
