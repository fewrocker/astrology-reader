import { Router, Request, Response } from 'express'
import express from 'express'
import type Stripe from 'stripe'
import stripeClient, { PRICE_IDS, getTierFromPriceId, createCheckoutSession } from '../services/stripe.js'
import { getDb } from '../db.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { invalidateUserRateLimit } from '../middleware/gptRateLimit.js'

const router = Router()

// ─── Webhook handler ─────────────────────────────────────────────────────────
// MUST be registered before express.json() in the parent app.
// Uses express.raw() scoped to this handler for Stripe signature verification.

router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string

  let event: Stripe.Event
  try {
    event = stripeClient.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err) {
    res.status(400).send(`Webhook signature failed: ${err}`)
    return
  }

  const db = getDb()

  try {
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      const user = db
        .prepare('SELECT id FROM users WHERE stripe_customer_id = ?')
        .get(customerId) as { id: number } | undefined

      if (user) {
        db.prepare("UPDATE users SET subscription_tier = 'free' WHERE id = ? AND subscription_tier != 'free'")
          .run(user.id)
        invalidateUserRateLimit(user.id)
      }
    }

    if (
      (event.type === 'customer.subscription.updated' ||
        event.type === 'customer.subscription.created') &&
      (event.data.object as Stripe.Subscription).status === 'active'
    ) {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      const priceId = sub.items.data[0]?.price?.id ?? ''
      const tier = getTierFromPriceId(priceId)

      if (tier) {
        // Try matching by stripe_customer_id first
        const userByCustomer = db
          .prepare('SELECT id FROM users WHERE stripe_customer_id = ?')
          .get(customerId) as { id: number } | undefined

        // Also try matching by subscription metadata userId (for first-time subs)
        const metaUserId = sub.metadata?.userId
          ? parseInt(sub.metadata.userId, 10)
          : null

        const targetId = userByCustomer?.id ?? metaUserId

        if (targetId) {
          db.prepare('UPDATE users SET subscription_tier = ?, stripe_customer_id = ? WHERE id = ? AND subscription_tier != ?')
            .run(tier, customerId, targetId, tier)
          invalidateUserRateLimit(targetId)
        }
      }
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const customerId = session.customer as string

      if (session.metadata?.userId) {
        const userId = parseInt(session.metadata.userId, 10)

        // Retrieve subscription to find the price tier
        if (session.subscription) {
          try {
            const sub = await stripeClient.subscriptions.retrieve(session.subscription as string)
            const priceId = sub.items.data[0]?.price?.id ?? ''
            const tier = getTierFromPriceId(priceId)

            if (tier) {
              db.prepare('UPDATE users SET subscription_tier = ?, stripe_customer_id = ? WHERE id = ? AND subscription_tier != ?')
                .run(tier, customerId, userId, tier)
              invalidateUserRateLimit(userId)
            } else {
              // Write customer ID even if tier lookup fails — links user to Stripe
              db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ? AND (stripe_customer_id IS NULL OR stripe_customer_id != ?)')
                .run(customerId, userId, customerId)
            }
          } catch (subErr) {
            console.error('Failed to retrieve subscription in checkout.session.completed:', subErr)
            // Still write stripe_customer_id
            db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ? AND (stripe_customer_id IS NULL OR stripe_customer_id != ?)')
              .run(customerId, userId, customerId)
          }
        }
      }
    }

    res.json({ received: true })
  } catch (dbErr) {
    console.error('Webhook DB error:', dbErr)
    res.status(500).json({ error: 'Internal error processing webhook' })
  }
})

// ─── Create checkout session ──────────────────────────────────────────────────

router.post('/create-checkout-session', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { priceId } = req.body as { priceId?: string }
  const userId = (req as AuthenticatedRequest).userId

  // Validate that priceId is a known price
  const validPriceIds = Object.values(PRICE_IDS).filter(Boolean)
  if (!priceId || !validPriceIds.includes(priceId)) {
    res.status(400).json({ error: 'Invalid or missing priceId' })
    return
  }

  try {
    const db = getDb()
    const user = db
      .prepare('SELECT id, email, stripe_customer_id FROM users WHERE id = ?')
      .get(userId) as { id: number; email: string; stripe_customer_id: string | null } | undefined

    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const session = await createCheckoutSession({
      userId: user.id,
      priceId,
      customerEmail: user.email,
      stripeCustomerId: user.stripe_customer_id,
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error('Create checkout session error:', err)
    res.status(500).json({ error: 'Failed to create checkout session' })
  }
})

export default router
