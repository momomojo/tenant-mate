
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_your_secret_key';
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16', // Use the latest API version
});

// Create a connected account
export const createConnectedAccount = async (email: string, country: string = 'US') => {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
    });
    
    return { success: true, accountId: account.id };
  } catch (error) {
    console.error('Error creating connected account:', error);
    return { success: false, error };
  }
};

// Create an account session for onboarding
export const createAccountSession = async (accountId: string, returnUrl: string) => {
  try {
    const accountSession = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: { enabled: true },
      },
      return_url: returnUrl,
    });
    
    return { success: true, clientSecret: accountSession.client_secret };
  } catch (error) {
    console.error('Error creating account session:', error);
    return { success: false, error };
  }
};
