// POST /api/stripe/webhook: Stripe tells us when the access fee has been paid.
import type Stripe from "stripe";
import { db, env, handle, HttpError, json } from "../_lib/server.js";
import { stripe } from "../_lib/stripe.js";

async function markPaid(s: Stripe.Checkout.Session) {
  const userId = s.client_reference_id || s.metadata?.user_id;
  if (!userId || s.payment_status !== "paid") return;
  const { error } = await db().from("profile_private")
    .update({ paid_at: new Date().toISOString(), stripe_session_id: s.id })
    .eq("id", userId).is("paid_at", null);
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
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await markPaid(event.data.object);
      break;
  }
  return json({ received: true });
});
