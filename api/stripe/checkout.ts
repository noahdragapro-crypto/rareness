// POST /api/stripe/checkout: the one-time access fee, paid in Stripe Checkout; returns the page to redirect to.
import { appUrl, db, handle, HttpError, json, requireUser } from "../_lib/server.js";
import { stripe } from "../_lib/stripe.js";

export const POST = handle(async (request) => {
  const user = await requireUser(request);
  const { data: priv, error } = await db().from("profile_private").select("stripe_customer_id,paid_at").eq("id", user.id).single();
  if (error) throw error;
  if (priv?.paid_at) throw new HttpError(400, "You already have access.");

  let customer = priv?.stripe_customer_id as string | null;
  if (!customer) {
    const c = await stripe().customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
    customer = c.id;
    const { error: e2 } = await db().from("profile_private").update({ stripe_customer_id: customer }).eq("id", user.id);
    if (e2) throw e2;
  }
  const base = appUrl(request);
  // A Stripe Price id if you set one up, otherwise a $5 line item defined here
  const lineItem = process.env.STRIPE_PRICE_ID
    ? { price: process.env.STRIPE_PRICE_ID, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: process.env.ACCESS_CURRENCY || "usd",
          unit_amount: Number(process.env.ACCESS_PRICE_CENTS || 500),
          product_data: { name: "Rareness access", description: "One-time payment. Unlocks your Cloud, bumps and chats." },
        },
      };
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer,
    client_reference_id: user.id,
    metadata: { user_id: user.id },
    line_items: [lineItem],
    allow_promotion_codes: true,
    success_url: `${base}/?billing=success`,
    cancel_url: `${base}/?billing=cancelled`,
  });
  return json({ url: session.url });
});
