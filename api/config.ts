// Public settings the app needs before sign-in.
import { json, paywallOn } from "./_lib/server.js";

export function GET() {
  return json({
    paywall: paywallOn(),
    price: process.env.PRICE_LABEL || "$5",
  });
}
