import Stripe from "stripe";
import { env } from "./server.js";

let client: Stripe | null = null;
export const stripe = () => (client ??= new Stripe(env("STRIPE_SECRET_KEY")));
