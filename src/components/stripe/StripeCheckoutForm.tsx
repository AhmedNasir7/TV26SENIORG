'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export function StripeCheckoutForm() {
  const { user, loading: authLoading } = useAuth()
  const [amount, setAmount] = useState('')
  const [productName, setProductName] = useState('')
  const [currency, setCurrency] = useState('usd')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (authLoading) {
    return <div className="surface-card p-8 text-sm text-[color:var(--muted)]">Loading...</div>
  }

  // This form also sits on the public home page, so logged-out visitors get a
  // sign-in prompt here instead of being redirected away from the page.
  if (!user) {
    return (
      <div className="surface-card p-7 sm:p-8">
        <p className="eyebrow">Payments</p>
        <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight">Sign in to pay</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Checkout is tied to your account, so sign in before starting a payment.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href="/login" className="btn-primary px-5 py-2.5 text-sm">
            Sign in
          </Link>
          <Link href="/signup" className="btn-secondary px-5 py-2.5 text-sm">
            Create account
          </Link>
        </div>
      </div>
    )
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency,
          productName: productName || 'Product',
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Failed to create checkout session')
        setLoading(false)
        return
      }
      if (data.url) window.location.href = data.url
    } catch {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleInstantTestCheckout = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 10.0,
          currency: 'usd',
          productName: 'Invigil test payment',
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Failed to create checkout session')
        setLoading(false)
        return
      }
      if (data.url) window.location.href = data.url
    } catch {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="surface-card p-7 sm:p-8">
      <div className="mb-6">
        <p className="eyebrow">
          Payments
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create Checkout Session</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Generate a secure Stripe checkout session for one-time payment.
        </p>
        
        <button
          type="button"
          onClick={handleInstantTestCheckout}
          disabled={loading}
          className="btn-primary mt-5 flex w-full items-center justify-center gap-2 px-4 py-3 text-sm disabled:opacity-60"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
          </svg>
          {loading ? 'Creating session...' : 'Instant Test Stripe Checkout ($10.00)'}
        </button>

        <div className="relative my-6 flex items-center">
          <div className="flex-grow border-t border-[var(--border)]"></div>
          <span className="mx-4 flex-shrink text-xs text-[color:var(--muted)]">or custom checkout</span>
          <div className="flex-grow border-t border-[var(--border)]"></div>
        </div>
      </div>

      <form onSubmit={handleCheckout} className="space-y-4">
        {error && (
          <div className="rounded-[var(--radius-sm)] border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--danger)]">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="productName" className="mb-1.5 block text-sm font-medium">
            Product Name
          </label>
          <input
            id="productName"
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="input-clean w-full px-3 py-2.5 text-sm"
            placeholder="Product Name"
          />
        </div>

        <div>
          <label htmlFor="amount" className="mb-1.5 block text-sm font-medium">
            Amount
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="input-clean w-full px-3 py-2.5 text-sm"
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="currency" className="mb-1.5 block text-sm font-medium">
            Currency
          </label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="input-clean w-full px-3 py-2.5 text-sm"
          >
            <option value="usd">USD ($)</option>
            <option value="eur">EUR (€)</option>
            <option value="gbp">GBP (£)</option>
            <option value="inr">INR (₹)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full px-4 py-2.5 text-sm disabled:opacity-60"
        >
          {loading ? 'Creating checkout...' : 'Continue to Stripe'}
        </button>
      </form>
    </div>
  )
}
