'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const msg = searchParams.get('message')
    if (msg) {
      setMessage(msg)
    }
  }, [searchParams])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message || 'Failed to sign in. Please try again.')
        setLoading(false)
      } else {
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      console.error('Sign in error:', err)
      setError(
        err instanceof Error 
          ? err.message 
          : 'Failed to connect to authentication service. Please check your internet connection and try again.'
      )
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black font-sans text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2">Sign In</h1>
        <p className="text-zinc-400 mb-8">
          Sign in to your WealthPath account
        </p>

        <form onSubmit={handleSignIn} className="space-y-4">
          {message && (
            <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded text-white focus:outline-none focus:border-zinc-700"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded text-white focus:outline-none focus:border-zinc-700"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black px-4 py-2 rounded font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Don't have an account?{' '}
          <Link href="/auth/sign-up" className="text-white hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
