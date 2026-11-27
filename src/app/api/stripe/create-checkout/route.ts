import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getCurrentUser } from '@/lib/auth'
import { runtimeEnv } from '@/lib/server/runtime-env'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: 'Payments are not configured' }, { status: 503 })
    }
    const stripe = new Stripe(secretKey, { apiVersion: '2025-10-29.clover' })
    // Redirects go to our configured address, never to a caller-supplied origin
    const appUrl = runtimeEnv('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000'

    const body = await request.json()
    const { amount, currency = 'usd', productName = 'Product' } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      )
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: productName,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/stripe/cancel`,
      customer_email: user.email,
      metadata: {
        userId: user.id.toString(),
        userEmail: user.email,
      },
    })

    return NextResponse.json(
      {
        sessionId: session.id,
        url: session.url,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Checkout failed' },
      { status: 500 }
    )
  }
}

