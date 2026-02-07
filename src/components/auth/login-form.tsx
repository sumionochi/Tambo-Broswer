// components/auth/LoginForm.tsx
// REDESIGNED: Cream/Sage palette, sage CTA, themed inputs, polished layout
'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { alert(error.message); setLoading(false) }
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/auth/callback` } })
    if (error) alert(error.message)
  }

  const inputStyle: React.CSSProperties = { background: 'var(--fs-cream-100)', border: '2px solid var(--fs-border-light)', color: 'var(--fs-text-primary)', transitionDuration: 'var(--fs-duration-fast)' }
  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'var(--fs-sage-400)' }
  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'var(--fs-border-light)' }

  return (
    <div className="w-full max-w-md space-y-8 p-8 fs-animate-in">
      {/* Branding */}
      <div className="text-center">
        <h2 className="text-4xl font-bold" style={{ color: 'var(--fs-sage-700)', fontFamily: "'Fraunces', serif" }}>
          Tambo AI Search
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--fs-text-muted)' }}>
          Search · Action · Workflow
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fs-text-primary)' }}>Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fs-text-primary)' }}>Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors" style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
        </div>

        <button type="submit" disabled={loading}
          className="w-full rounded-xl px-4 py-3 text-white font-medium text-sm transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, var(--fs-sage-600) 0%, var(--fs-sage-700) 100%)', boxShadow: 'var(--fs-shadow-sm)', transitionDuration: 'var(--fs-duration-normal)' }}
          onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.boxShadow = 'var(--fs-shadow-md)' }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--fs-shadow-sm)' }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full" style={{ borderTop: '1px solid var(--fs-border-light)' }} />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 text-xs" style={{ background: 'var(--fs-cream-50)', color: 'var(--fs-text-muted)' }}>Or continue with</span>
        </div>
      </div>

      {/* Google */}
      <button onClick={handleGoogleLogin}
        className="w-full rounded-xl px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2"
        style={{ background: 'var(--fs-cream-50)', border: '2px solid var(--fs-border-light)', color: 'var(--fs-text-primary)', transitionDuration: 'var(--fs-duration-fast)' }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--fs-sage-300)'; e.currentTarget.style.background = 'var(--fs-cream-100)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--fs-border-light)'; e.currentTarget.style.background = 'var(--fs-cream-50)' }}>
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Sign in with Google
      </button>
    </div>
  )
}