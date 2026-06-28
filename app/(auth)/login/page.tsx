'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback` } })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-500 rounded-xl mb-4">
            <span className="text-white font-bold text-lg">NB</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">NetworkBrain</h1>
          <p className="text-sm text-gray-500 mt-1">Your relationship intelligence platform</p>
        </div>
        {sent ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
            <div className="text-3xl mb-3">📬</div>
            <h2 className="font-semibold text-gray-900 mb-1">Check your email</h2>
            <p className="text-sm text-gray-500">We sent a magic link to <strong>{email}</strong></p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50">
              {loading ? 'Sending…' : 'Continue with email'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-4">No password needed — we send a magic link</p>
          </form>
        )}
      </div>
    </div>
  )
}
