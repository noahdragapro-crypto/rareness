// POST /api/stripe/webhook: Stripe tells us when a subscription starts, renews, changes or ends.
import type Stripe from "stripe";
import { db, env, handle, HttpError, json } from "../_lib/server.js";
import { stripe } from "../_lib/stripe.js";

async function saveSubscription(sub: Stripe.Subscription) {
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const end = sub.items.data[0]?.current_period_end;
  const { error } = await db().from("profile_private").update({
    subscription_status: sub.status,
    subscription_period_end: end ? new Date(end * 1000).toISOString() : null,
  }).eq("stripe_customer_id", customer);
  if (error) throw error;
}

export const POST = handle(async (request) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) throw new HttpError(400, "Missing signature");
  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(await request.text(), signature, env("STRIPE_WEBHOOK_SECRET"));
  } catch {
    throw new HttpError(400, "Invalid signature");
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      const customer = typeof s.customer === "string" ? s.customer : s.customer?.id;
      if (s.client_reference_id && customer) {
        await db().from("profile_private").update({ stripe_customer_id: customer }).eq("id", s.client_reference_id);
      }
      if (typeof s.subscription === "string") await saveSubscription(await stripe().subscriptions.retrieve(s.subscription));
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await saveSubscription(event.data.object);
      break;
  }
  return json({ received: true });
});
