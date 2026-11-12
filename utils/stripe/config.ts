import Stripe from "stripe";
let client: Stripe | undefined;
export const stripe = new Proxy({} as Stripe, {
  get(_target, property) {
    if (!client) {
      const key = process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;
      if (!key) throw new Error("Configure a Stripe development key before enabling billing.");
      client = new Stripe(key);
    }
    const value = Reflect.get(client, property);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
