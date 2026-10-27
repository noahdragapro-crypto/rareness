// POST /api/stripe/checkout: start a subscription in Stripe Checkout; returns the page to redirect to.
import { appUrl, db, env, handle, json, requireUser } from "../_lib/server.js";
import { stripe } from "../_lib/stripe.js";

export const POST = handle(async (request) => {
  const user = await requireUser(request);
  const { data: profile, error } = await db().from("profile_private").select("stripe_customer_id").eq("id", user.id).single();
  if (error) throw error;

  let customer = profile?.stripe_customer_id as string | null;
  if (!customer) {
    const c = await stripe().customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
    customer = c.id;
    const { error: e2 } = await db().from("profile_private").update({ stripe_customer_id: customer }).eq("id", user.id);
    if (e2) throw e2;
  }
  const trial = Number(process.env.STRIPE_TRIAL_DAYS || 0);
  const base = appUrl(request);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: user.id,
    line_items: [{ price: env("STRIPE_PRICE_ID"), quantity: 1 }],
    subscription_data: trial > 0 ? { trial_period_days: trial, metadata: { user_id: user.id } } : { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    success_url: `${base}/?billing=success`,
    cancel_url: `${base}/?billing=cancelled`,
  });
  return json({ url: session.url });
});
