require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

(async () => {
  try {
    const balance = await stripe.balance.retrieve();
    console.log("✅ Stripe connection successful!");
    console.log(balance);
  } catch (error) {
    console.error("❌ Stripe connection failed:", error.message);
  }
})();
