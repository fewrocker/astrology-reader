import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: '2026-04-22.dahlia' })
  : null as unknown as Stripe

export const PRICE_IDS = {
  basic: process.env.STRIPE_BASIC_PRICE_ID || '',
  advanced: process.env.STRIPE_ADVANCED_PRICE_ID || '',
}

export function getTierFromPriceId(priceId: string): 'basic' | 'advanced' | null {
  if (priceId && priceId === PRICE_IDS.basic) return 'basic'
  if (priceId && priceId === PRICE_IDS.advanced) return 'advanced'
  return null
}

export interface CreateCheckoutSessionParams {
  userId: number
  priceId: string
  customerEmail: string
  stripeCustomerId?: string | null
}

export async function createCheckoutSession({
  userId,
  priceId,
  customerEmail,
  stripeCustomerId,
}: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  const baseUrl = process.env.SERVER_BASE_URL || 'http://localhost:5173'

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/?payment=success`,
    cancel_url: `${baseUrl}/`,
    metadata: { userId: String(userId) },
    subscription_data: {
      metadata: { userId: String(userId) },
    },
  }

  if (stripeCustomerId) {
    params.customer = stripeCustomerId
  } else {
    params.customer_email = customerEmail
  }

  return stripe.checkout.sessions.create(params)
}

export default stripe
