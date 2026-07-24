import Stripe from "stripe";
import { asyncHandler } from "./asyncHandler";

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

const attachPaymentMethodOnStripe = async (paymentMethodId, stripeCustomerId) => {
  return await stripe.paymentMethods.attach(paymentMethodId, {
    customer: stripeCustomerId,
  });
};

const setDefaultPaymentMethodOnStripe = async(stripeCustomerId, paymentMethodId) => {
  return await stripe.customers.update(stripeCustomerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}


const recordUsage = asyncHandler( async(req, res) => {
  
})

export { createCustomerOnStripe, createSetupIntentOnStripe, attachPaymentMethodOnStripe,
  setDefaultPaymentMethodOnStripe
 };
