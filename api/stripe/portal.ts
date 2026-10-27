// POST /api/stripe/portal: Stripe's page for changing card, plan or cancelling.
import { appUrl, db, handle, HttpError, json, requireUser } from "../_lib/server.js";
import { stripe } from "../_lib/stripe.js";

export const POST = handle(async (request) => {
  const user = await requireUser(request);
  const { data } = await db().from("profile_private").select("stripe_customer_id").eq("id", user.id).single();
  if (!data?.stripe_customer_id) throw new HttpError(400, "You don't have a subscription yet.");
  const session = await stripe().billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: `${appUrl(request)}/` });
  return json({ url: session.url });
});
