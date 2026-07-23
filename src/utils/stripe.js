import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const createCustomerOnStripe = async ({ name, email }) => {
  try {
    const customer = await stripe.customers.create({
      name: name,
      email: email,
    });

    return customer;
  } catch (error) {
    throw error;
  }
};

const createSetupIntentOnStripe = async (stripeCustomerId) => {
  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomerId,
  });
  return setupIntent;
};

export { createCustomerOnStripe, createSetupIntentOnStripe };
